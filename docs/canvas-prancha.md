# Canvas de elementos gráficos (`<ui-canvas-prancha>`)

Folha plana em **mm** (eixo Y para baixo, origem no canto superior esquerdo), com ferramentas no nível de um editor vetorial,
para a moldura e os elementos da página de layout de impressão. Sem Leaflet. Reaproveita o núcleo de formas do
`<ui-canvas-cad>` em vez de copiá-lo: corrigir um algoritmo vale para o mapa e para a prancha ao mesmo tempo.

```
 L2  núcleo puro (sem DOM, sem Leaflet)         geometria, formas, curvas, edição, snap, índice,
     espaço: geográfico | plano (mm)            histórico, estilo, transformações, pintor 2D
        │
        ├── ui-canvas-cad     (L4, Leaflet, espaço geográfico)   ← já existe; comportamento inalterado
        └── ui-canvas-prancha (L4, sem Leaflet, espaço plano)    ← novo
```

Estado: **Fases 0 a 6 concluídas** (Fase 6: painéis do kit e guia de migração do app). Fase 5: Pathfinder, mesclagem e sombra. Fase 4: organização e operações (e as pendências da Fase 3). Fase 3: o componente. Fase 2: aparência, pintor e SVG. Fase 1: núcleo plano. Fase 0: orientação e rede de segurança.

---

## Nomes (proposta da Fase 0)

| O quê | Nome |
|---|---|
| Componente (L4) | `<ui-canvas-prancha>`, em `src/components/ui-canvas-prancha/` (orquestração em `prancha-*.ts`) |
| Entrypoint (L5) | `src/prancha.ts` → `@thibezer/ui-components-kit/prancha` |
| Núcleo de espaço (L2, puro) | `src/gerencigeo-canvas/espaco/` (`espaco_tipos.ts`, `espaco_geografico.ts`, `espaco_plano.ts`, `espaco_matriz.ts`) |
| Modelo e operações da prancha (L2, puro) | `src/gerencigeo-canvas/prancha/` (elemento gráfico, formas paramétricas, aparência, pintor `desenharElementos`, SVG) |
| Eventos | prefixo `prancha-` (documentados em `docs/canvas-prancha-eventos.md`, a partir da Fase 3) |

---

## Decisão de modelagem: opção 1, `Par` + `Espaco` nos módulos existentes

**Decidido:** generalizar o par de coordenadas e as métricas nos módulos que já existem. O padrão continua sendo o espaço
geográfico, então quem chama sem informar o espaço tem exatamente o comportamento de hoje.

- `Par = [number, number]`. `LatLonPar` passa a ser um apelido de `Par` (o tipo público não muda para o app).
  Semântica por espaço: no geográfico `[lat, lon]` (como hoje); no plano `[x, y]` em mm.
- `Espaco` fornece, **na unidade dele**, tudo o que hoje é geodésico: distância, comprimento, área, plano local para os
  algoritmos (dividir, juntar, buffer, deslocar), deslocamento por (dx, dy), ponto da borda e envelope do círculo, fator de
  eixo das formas regulares (o `cos(lat)`). No plano: distância euclidiana, área de Gauss, plano local = identidade,
  fator = 1.
- As funções recebem `espaco` como último parâmetro opcional, com padrão `ESPACO_GEOGRAFICO`. As assinaturas atuais
  continuam válidas.

### Evidência (da auditoria abaixo)

1. **A maior parte do núcleo já é aritmética de pares, sem métrica:** curvas, edição de nós e alças, snap, caixa e laço
   (via `Projetor`), hit-test de `feature_amostra`, máquina de desenho (exceto círculo e medida), índice e versões. Para
   esses módulos generalizar é **só trocar o tipo** (`LatLonPar` → `Par`), sem mudar uma instrução em runtime.
2. **Os algoritmos geométricos já trabalham num plano:** `feature_algoritmos` projeta para XY local em metros
   (`planoEm`/`paraXY`/`deXY`), calcula e volta. No espaço plano o plano local é a identidade em mm: o mesmo algoritmo,
   sem duplicação.
3. **As métricas estão concentradas em poucos pontos** (lista exata abaixo). Isolá-los atrás do `Espaco` é pequeno e
   verificável.
4. **A opção 2** (tipos paralelos) duplicaria os mesmos ~2 mil linhas de algoritmo, quebrando o princípio de que uma
   correção vale para todos. **A opção 3** (fingir lat/lon com mm) é proibida: `distanciaMetros`, `areaMetros2`,
   `metrosPorGrau` e os `cos(lat)` dariam resultados errados (ex.: um "polígono regular" em y = 60 mm sairia esticado
   1/cos(60°) = 2× na horizontal).

### Garantia de "bit a bit igual"

O espaço geográfico precisa reproduzir **cada** caminho de hoje, inclusive as inconsistências entre módulos (corrigi-las seria
mudança de comportamento, fora do escopo):

| Onde | Método atual (preservado no `ESPACO_GEOGRAFICO`) |
|---|---|
| `distanciaMetros`, `comprimentoMetros` | GRS80: escala local M·N até 0,1°, Vincenty acima |
| `areaMetros2` | GRS80, M·N na latitude média do anel |
| `feature_algoritmos` (`planoEm`, `deslocarGeometria`) | `metrosPorGrau` (GRS80), `lng` limitado a ≥ 1 |
| `pontoDaBordaDoCirculo` | `metrosPorGrau(lat).lng` limitado a ≥ 1 (no polo a borda fica a 50° de longitude) |
| `limitesDaGeometria` (círculo) | esférico: 111 320 m/°, `cos(lat)` limitado a ≥ 0,01 |
| `feature_caixa.raioEmPx`, `feature_amostra` (círculo) | 111 320 m/° medido **para o norte** |
| `feature_formas` (polígono regular, estrela) | `cos(lat)` esférico; a elipse usa raios em graus, sem correção |
| `feature_simplificacao` | tolerância em graus de longitude; `escalaLatitude` com `cos` limitado a ≥ 0,05 |
| `motor/geometria-px`, `feature_lod` | Web Mercator, tiles de 256 px |

A prova é o teste golden `tests/espaco-geografico.caracterizacao.test.ts` (39 grupos de casos, saídas exatas em
`tests/fixtures/espaco-geografico.golden.json`) mais a suíte inteira existente, que não é editada.

---

## Auditoria (Fase 0)

Legenda: **puro** = já é L2 sem Leaflet/DOM, reaproveitado como está; **generalizar** = puro, mas tem métrica ou unidade
geográfica a passar pelo `Espaco`; **separar** = mistura lógica pura com Leaflet/DOM: a lógica pura sai para um módulo L2 e a
casca Leaflet fica para o `ui-canvas-cad`.

### Tipos e métricas

| Item | Onde | Classificação | Nota |
|---|---|---|---|
| `LatLonPar` | `feature_types.ts` | generalizar | Vira apelido de `Par`. `GeometriaFeicao.Circle.raioMetros` fica com o nome (no plano o raio é na unidade do espaço; documentado), ou ganha `raio` paralelo. Decisão final na Fase 1 |
| `metrosPorGrau` | `feature_metricas.ts` | generalizar | Só o espaço geográfico usa |
| `distanciaMetros`, `comprimentoMetros` | `feature_metricas.ts` | generalizar | → `espaco.distancia`, `espaco.comprimento` |
| `areaMetros2`, `areaDaGeometria`, `extensaoDaGeometria` | `feature_metricas.ts` | generalizar | → `espaco.area`; formatação (`ha`, `km`) fica geográfica |
| `limitesDaGeometria` | `feature_metricas.ts` | generalizar | Só o círculo depende do espaço |
| `textoRotulo` | `feature_metricas.ts` | puro | Depende das métricas acima |
| `CaixaGeo` / `IndiceEspacial` | `feature_indice.ts` | puro | Os nomes `minLat/minLon` são só rótulos de eixo (0 e 1); o índice funciona igual em mm |

### Formas e algoritmos

| Item | Onde | Classificação | Nota |
|---|---|---|---|
| `gerarElipse` | `feature_formas.ts` | puro | Aritmética de pares |
| `gerarPoligonoRegular`, `gerarEstrela` | `feature_formas.ts` | generalizar | `cos(lat)` → `espaco.fatorEixo(ref)` (1 no plano) |
| `pontoNoPoligono`, `dividirPoligonoComLinha`, `juntarLinhas`, `juntarPoligonos` | `feature_algoritmos.ts` | generalizar | Plano local `planoEm` → `espaco.planoLocal(ref)` (identidade no plano). Tolerâncias em unidade do espaço |
| `gerarBuffer` | `feature_algoritmos.ts` | generalizar | Idem; o círculo de 64 lados e o sentido (anti-horário) dependem da orientação do eixo Y do espaço |
| `deslocarGeometria(leste, norte)` | `feature_algoritmos.ts` | generalizar | → `espaco.deslocar(p, dx, dy)` (no plano, +y é para baixo) |
| `converterComprimento/Area`, `ddParaDms/dmsParaDd` | `feature_algoritmos.ts` | puro | Utilitários; DMS não se aplica ao plano |
| `feature_curvas.ts` (amostrar, passos, SVG, normalizar, mover) | — | puro | Só o tipo |
| `feature_simplificacao.ts` | — | generalizar | Tolerância por zoom é geográfica; no plano a tolerância vem em mm por px da vista |
| `motor/geometria-px.ts`, `feature_lod.ts` (`Projetor` Mercator) | — | puro (geográfico) | A prancha usa outra projeção: matriz afim mm → px (`espaco_matriz.ts`) |
| `motor/tipos-linha.ts` (`dashTipoLinha`) | — | generalizar | Padrões em **px** na espessura 1, crescem com `max(1, peso/2)`. Em mm/pt precisam de unidade base; a função atual fica igual e a prancha ganha uma variante com unidade |
| `motor/estilo.ts` | — | puro | Resolve estilo de feição para o pintor |

### Edição, snap, seleção e desenho

| Item | Onde | Classificação | Nota |
|---|---|---|---|
| Vértices, nós, alças (`moverAlca`, `alternarSuavidade`, `inserirPonto`...) | `feature_edicao_ops.ts` | puro | Aritmética de pares |
| `pontoDaBordaDoCirculo`, `comPontos` (círculo), `RAIO_MINIMO_EDICAO_CIRCULO_M` | `feature_edicao_ops.ts` | generalizar | Raio em metros → `espaco` |
| `buscarSnap` | `feature_snap.ts` | puro | Recebe `Projetor`; faltam (Fase 1) centro/cantos de elementos, grade e guias |
| `feicaoNaCaixa`, `feicaoNoLaco` | `feature_caixa.ts` | generalizar | Só `raioEmPx` (111 320 m/°). Atenção: a variável local `window` e o valor `'window'` de `ModoCaixa` fazem a regex de globais do `check-layers` dar falso positivo (ver pendências) |
| `feicaoNoPonto` | `feature_amostra.ts` | generalizar | Hit-test puro (ponto > linha > área); só o raio do círculo é geográfico |
| `SessaoDesenho` (15 ferramentas, caneta Bézier) | `feature_desenho.ts` | generalizar | Raio mínimo do círculo (2 m), `distanciaMetros` e `comprimentoMetros`; mensagem do retângulo fala em "latitude e longitude" |
| `RegraVersoes`, `statusDe`, `entidadeDe` | `feature_versoes.ts` | puro | **É oficial × prévia, não é Undo/Redo** (ver abaixo) |
| `Projetor`, `PontoPx`, `CaixaPx` | `feature_caixa.ts` | puro | Já é a abstração certa: a prancha passa a matriz da vista |

### O que importa Leaflet

| Módulo | Classificação | Parte pura a extrair (Fase 1) | Parte que fica no `ui-canvas-cad` |
|---|---|---|---|
| `feature_desenho_controle.ts` (604 linhas) | separar | Clique repetido (4 px / 450 ms), fechar no primeiro vértice (10 px), pegar alça (8 px), escolha da coordenada com snap, textos de nome/dica das ferramentas | `L.layerGroup`, prévia em `L.polygon`/`L.circle`, marcador de snap `L.divIcon`, HUD por `L.DomEvent` |
| `feature_editor_vertices.ts` (891 linhas) | separar | **Histórico de gestos** (pilha de 100, desfazer/refazer, recomeça se a geometria muda de fora), retângulo alinhado (`detectarRetangulo`, `moverCantoDoRetangulo`), centro do círculo arrasta a borda, fantasma só em segmento ≥ 24 px | `L.Marker` arrastáveis, ícones, eventos de mapa |
| `layer_hit_test.ts` | separar | Regra de empilhamento: prioridade ponto/texto > linha > área, camada do topo, menor área, alternância em cliques repetidos (4 px) | Leitura de `_paneRenderers`, `L.LineUtil`, disparo de evento Leaflet |
| `feature_popup.ts` | separar (baixa prioridade) | `coordenadaDeReferencia`, métricas do popup | `L.popup` |
| `feature_cursores.ts` | separar (baixa prioridade) | `corHexSegura` | `L.marker` dos cursores remotos |

### Pintura

`renderers/renderizador_formas.ts` (`PintorCanvas2D`, `ContextoFormas2D`) é puro e serve de modelo. O contrato atual **não**
tem `bezierCurveTo`, `translate/rotate/scale`, `strokeRect` nem `miterLimit`; o `ContextoPrancha2D` da Fase 2 é um superconjunto
pequeno, alinhado ao que o PDF vetorial do app suporta (`save/restore/translate/scale/rotate/setTransform`,
`moveTo/lineTo/bezierCurveTo/arc/rect/closePath`, `fill/stroke/clip`, `setLineDash`, `fillRect/strokeRect`). Gradiente,
padrão, sombra e mesclagem serão capacidades opcionais detectadas.

### Correção de premissa: histórico

O pedido cita `feature_versoes.ts` como o histórico determinístico (Undo/Redo). Na verdade ele trata **oficial × prévia** (qual
versão de uma entidade aparece). O Undo/Redo de hoje mora dentro do `EditorVertices` (Leaflet), por gesto, sem rajadas. A
Fase 1 cria um histórico puro de comandos/snapshots em L2 (com agrupamento de rajadas no mesmo campo) e o `EditorVertices` pode
passar a usá-lo sem mudar de comportamento.

---

## Rede de segurança (testes da Fase 0)

| Arquivo | O que trava |
|---|---|
| `tests/espaco-geografico.caracterizacao.test.ts` | Saída exata (golden) de métricas, formas, algoritmos, curvas, edição, caixa, laço, snap, hit-test, desenho, índice, simplificação, Mercator e tipos de linha, em Node; idempotência; entradas não mutadas |
| `tests/fixtures/espaco-geografico.golden.json` | Os valores de referência (gerados da 2.18.0) |
| `tests/espaco-auditoria-pureza.test.ts` | Os módulos do núcleo (20 da Fase 0 + os novos da Fase 1) seguem sem `leaflet` e sem globais de navegador e só importam uns aos outros; os 5 acoplados ainda importam Leaflet; o falso positivo de `feature_caixa.ts` (resolvido na Fase 1) |

Regravar o golden só quando a mudança no espaço geográfico for intencional (e registrada no `CHANGELOG`):

```bash
ATUALIZAR_GOLDEN=1 npx vitest run tests/espaco-geografico.caracterizacao.test.ts
```

## Fase 1: núcleo plano (L2, puro)

Tudo em `src/gerencigeo-canvas/espaco/`, `src/gerencigeo-canvas/prancha/` e `feature_historico.ts`, sem `window`, `document`
nem `leaflet` (garantido pelo `check-layers`, `PUROS_SEM_DOM`). Roda em Node/SSR e em Web Worker.

### Espaço (`espaco/`)

```ts
import { ESPACO_GEOGRAFICO, ESPACO_PLANO } from '.../espaco';

ESPACO_PLANO.distancia([0, 0], [3, 4]);          // 5 (mm)
ESPACO_PLANO.area([[[0, 0], [100, 0], [100, 50], [0, 50]]]); // 5000 (mm²)
gerarBuffer(geometria, 2, ESPACO_PLANO);         // offset de 2 mm
new SessaoDesenho('estrela', false, { espaco: ESPACO_PLANO, pontasEstrela: 7, proporcaoInternaEstrela: 0.3 });
```

| Módulo generalizado | Parâmetro novo (opcional, padrão geográfico) |
|---|---|
| `feature_metricas` | `areaDaGeometria(g, espaco?)`, `extensaoDaGeometria(g, espaco?)`, `limitesDaGeometria(g, espaco?)` |
| `feature_formas` | `gerarPoligonoRegular(c, b, lados, espaco)`, `gerarEstrela(c, b, pontas, espaco, proporcaoInterna)` |
| `feature_algoritmos` | `espaco` no fim de `dividirPoligonoComLinha`, `juntarLinhas`, `juntarPoligonos`, `gerarBuffer`, `deslocarGeometria`, `distanciaEntre` |
| `feature_edicao_ops` | `pontoDaBordaDoCirculo`, `pontosDe`, `comPontos` |
| `feature_caixa`, `feature_amostra` | `feicaoNaCaixa(..., espaco)`, `feicaoNoPonto(..., tolerancia, espaco)` |
| `feature_indice` | `caixaDaFeicao(f, espaco?)`, `new IndiceEspacial(espaco?)` |
| `feature_desenho` | `new SessaoDesenho(ferramenta, fechar, { espaco, raioMinimoCirculo, ladosPoligono, pontasEstrela, proporcaoInternaEstrela })` |

No plano, `raioMetros` do círculo é o raio **na unidade do espaço** (mm): o nome foi mantido para não duplicar o tipo.
`unidades`: `paraMm(valor, 'pt' | 'cm' | 'pol' | 'px')`, `deMm`. Orientação: no plano local da folha os algoritmos fazem as
contas no próprio referencial (y para baixo); a orientação dos anéis é tratada de forma algébrica (buffer de anel horário e
anti-horário dá o mesmo resultado, testado), então o `Espaco` não precisou de um campo de orientação.

`espaco_matriz.ts`: matriz afim 2D na convenção do Canvas (`setTransform(a, b, c, d, e, f)`): `translacao`, `escala`,
`rotacao`, `cisalhamento`, `espelhamento` (todas com pivô opcional), `multiplicar` (aplica o segundo primeiro), `compor` (na
ordem de aplicação), `inverter` (`null` se singular), `aplicar`, `decompor`/`recompor`, `saneada` (não finita → identidade).

### Elemento gráfico (`prancha/`)

| Módulo | Papel |
|---|---|
| `tipos.ts` | `ElementoGrafico` (id, geometria local, `transformacao`, `pivo`, `aparencia`, `bloqueado`, `oculto`, `camadaId`, `grupoId`, `ordem`, `propriedades`), `GeometriaElemento`, `AparenciaElemento` (traço com tipo de linha CAD, pontas de seta, preenchimento) |
| `elemento_geometria.ts` | Contorno local de cada forma (retângulo com cantos independentes "ao vivo", elipse/arco aberto/corda/fatia em Bézier exata, polígono regular, estrela, linha, caminho, caixa aproximada do texto) e contorno/limites na folha, em cache |
| `elemento_criacao.ts` | `criarRetangulo`, `criarElipse`, `criarPoligonoRegular`, `criarEstrela`, `criarLinha`, `criarCaminho`, `criarTexto` |
| `elemento_transformacao.ts` | Caixa orientada, 8 alças + rotação, matrizes de escala (Shift proporcional, Alt do centro), rotação por arrasto (passo de 45°), cisalhamento, espelhar, girar, mover |
| `elemento_consulta.ts` | Hit-test (o mais à frente primeiro), caixa Window/Crossing e laço (reaproveitam `feature_caixa`), `IndicePrancha` (R-tree do kit) |
| `elemento_snap.ts` | Snap: vértice > canto > centro > meio > guia > aresta > grade (reaproveita `buscarSnap`) |
| `elemento_edicao.ts` | Seleção direta: mover/adicionar/excluir/converter âncora e mover alça (reaproveita `feature_edicao_ops`) |
| `elemento_predefinicoes.ts` | Pré-definições do app e quadro ABNT (NBR 10068) |
| `elemento_validacao.ts` | Entrada hostil: `normalizarElemento(s)`, `analisarElemento` (motivo da recusa) |
| `../feature_historico.ts` | `Historico<T>`: desfazer/refazer por instantâneos, rajadas pela chave dentro de uma janela de tempo injetada |

Convenções: a geometria paramétrica é **centrada na origem local**, e a translação da matriz é o centro na folha (rotação e
escala acontecem em torno do centro por padrão). Ângulos crescem de +x para +y (horário na tela). Elementos e geometrias são
**imutáveis**: os caches são `WeakMap` por objeto, então altere criando um objeto novo (`{ ...el, transformacao }` mantém o
mesmo objeto de geometria e reaproveita o contorno local).

### Decisões da Fase 1

1. **Formas centradas na origem local** e matriz = posição do centro: transformar não muda a geometria paramétrica (o
   retângulo continua com cantos "ao vivo" depois de girado ou escalado).
2. **Elipse e cantos em Bézier exata** (κ = 0,5523 por quarto; arcos em trechos ≤ 90°): pinta igual em tela, PDF e SVG; os
   vértices amostrados (24 por trecho) só medem e testam.
3. **Índice pelo envelope conservador** (os 4 cantos da caixa local transformados): arrastar 2 mil elementos não recalcula
   contornos; hit-test e caixa fazem o teste fino. `atualizarVarios` remonta de uma vez acima de 10% do índice.
4. **Seleção**: oculto nunca; bloqueado só com `incluirBloqueados`. Sem preenchimento, só o traço é clicável (tolerância +
   meia espessura).
5. **Texto**: caixa aproximada (0,55 do corpo por caractere, entrelinha 1,2) até a Fase 3 medir com a fonte real.
6. **Matriz não finita vira identidade** na normalização; matriz singular é aceita, o elemento some do desenho e a edição de
   âncoras é recusada até a matriz voltar a ser inversível.
7. **Moldura ABNT**: margens da NBR 10068 (esquerda 25 mm; demais 10 mm em A0/A1 e 7 mm em A2–A4) como padrão
   sobrescrevível. Confira com a revisão da norma usada pelo projeto.

### Testes da Fase 1

| Arquivo | Camada | O que cobre |
|---|---|---|
| `tests/espaco-plano.test.ts` | A | Medidas em mm, unidades, equivalência "sem espaço = geográfico", módulos generalizados no plano |
| `tests/espaco-matriz.test.ts` | A | Propriedades (inversa, associatividade, determinante), decompor/recompor, pivô, entrada hostil |
| `tests/prancha-elementos.test.ts` | A | Formas (áreas e perímetros conhecidos), criação, alças e transformações, pré-definições, quadro ABNT |
| `tests/prancha-consulta.test.ts` | A | Hit-test, caixa, laço, índice × varredura (propriedade), snap, edição de âncoras, histórico |
| `tests/prancha.regressao.test.ts` | C | `null`, `NaN`, `Infinity`, degenerados, ids duplicados, matriz singular, texto com HTML, `__proto__` |
| `tests/ssr-safety.test.ts` (novo caso) | D | Núcleo plano importável e usável em Node |
| `tests/check-layers.test.ts` (novos casos) | D | `espaco/`, `prancha/` e o núcleo em `PUROS_SEM_DOM`; texto `'window'` não é o global |
| `tests/prancha-desempenho.test.ts` | E | ≤ 16 ms com 2 mil elementos: hover, snap, caixa, zoom, arrasto (números em `docs/desempenho-feicoes.md`) |

### Pendências

- **Fonte única com o `ui-canvas-cad`**: o histórico, o hit-test e a edição de âncoras da prancha são módulos puros novos.
  O `EditorVertices` (histórico próprio) e o `layer_hit_test` (regra de empilhamento) **ainda não** os usam. A troca
  mudaria código do mapa, então fica para depois da Fase 3, com a paridade testada.
- **Partes puras do `feature_desenho_controle`** (clique repetido, fechar no primeiro vértice, pegar alça) seguem dentro
  dele. A Fase 3 extrai essas partes ao montar a interação da prancha, e as duas cascas passam a consumi-las.
- ~~Tipo de linha em mm~~: feito na Fase 2 (`padraoTipoLinhaMm`).
- **Medida real do texto**: na Fase 3, com `measureText` opcional.

## Fase 2: aparência e pintor (L2, puro)

```
 ElementoGrafico ──► aparenciaDe (estilo resolvido) ──► planoDe (caminhos na folha + estilo) ──┬─► desenharElementos(ctx)  tela, PDF, PNG
                       aparencia_estilo.ts                pintura_plano.ts                       │     pintura_canvas.ts
                       (também usado pelo hit-test)                                               └─► exportarSvg()          string SVG
                                                                                                        exportar_svg.ts
```

**Fonte única:** a cor, a espessura, o tracejado, as pontas, a hachura e o gradiente são decididos UMA vez
(`resolverAparencia`, `planejarElemento`). O pintor Canvas e o SVG só executam o plano. O hit-test usa a mesma aparência
resolvida, então o clicável é o que foi pintado.

### Modelo de aparência

| Campo | O que faz |
|---|---|
| `traco` | `cor`, `espessura` (mm, padrão 0,25), `opacidade`, `tipoLinha` (CAD) + `escalaTipoLinha`, `terminacao` (padrão reta), `juncao` (padrão angular), `limitePonta` (padrão 4), `alinhamento` centro/dentro/fora (fechadas), `pontaInicio`/`pontaFim` (abertas) |
| `preenchimento` | `cor`, `opacidade`, `regra` (nonzero; evenodd automático com furos), `gradiente` linear ou radial |
| `hachura` | `angulo` (graus, gira com o elemento), `espacamento` (mm da folha), `cor`, `espessura`, `opacidade`, `cruzada` |
| `opacidade` | Do elemento inteiro |

- **Tracejado em mm**: `padraoTipoLinhaMm` reaproveita o `dashTipoLinha` do mapa (px a 96 dpi convertidos para mm). Por
  exemplo, a tracejada de 0,35 mm fica com 3,2 mm de traço e 1,6 mm de vão. Ela cresce com a espessura e com o LTSCALE.
- **Pontas de seta**: `triangulo`, `triangulo-aberto`, `aberta`, `circulo`, `quadrado`, `losango`, `barra`. O comprimento é
  5× a espessura, com mínimo de 2 mm, vezes `escala`; a largura é 0,8× o comprimento. Num trecho reto a linha recua para
  a ponta cobrir o fim do traço.
- **Gradiente**: coordenadas relativas à caixa local (`[0,0]` a `[1,1]`, como o `objectBoundingBox` do SVG); acompanha
  rotação, escala e espelho.
- **Traço dentro/fora**: o contorno é deslocado meia espessura com o `gerarBuffer` do kit e funciona em qualquer contexto.

### Contrato do contexto (`ContextoPrancha2D`)

Obrigatório (é o que o PDF vetorial do app tem): `save`, `restore`, `setTransform`, `beginPath`, `moveTo`, `lineTo`,
`bezierCurveTo`, `closePath`, `fill(regra?)`, `stroke`, `clip(regra?)`, `setLineDash`, `fillRect`; propriedades `fillStyle`,
`strokeStyle`, `lineWidth`, `lineCap`, `lineJoin`, `globalAlpha` e `miterLimit` (opcional). Sem `Path2D`, `transform`,
`translate`, `rotate` nem `arc` (o pintor compõe as matrizes e usa só `setTransform`). O `CanvasRenderingContext2D` do
navegador atende ao contrato (checado pelo `tsc` nos testes).

| Capacidade opcional | Detecção | Sem ela |
|---|---|---|
| Gradiente | `typeof ctx.createLinearGradient / createRadialGradient === 'function'` | Cor sólida: `preenchimento.cor`, senão a parada mais perto do meio (`degradacoes.gradiente`) |
| Texto | `typeof ctx.fillText === 'function'` | Não pinta (`degradacoes.texto`); o app desenha o texto no PDF |
| Hachura | — (só `clip` + linhas) | Funciona em qualquer contexto |

```ts
// tela (zoom e pan em px, retina):
desenharElementos(ctx, elementos, { matriz: compor(escala(pxPorMm), translacao(panX, panY), escala(dpr)), fundo: { cor: '#fff', largura: 210, altura: 297 } });
// PDF vetorial do app (pontos):
desenharElementos(pdfCtx, elementos, { matriz: escala(72 / 25.4) });
// SVG:
const svg = exportarSvg(elementos, { largura: 210, altura: 297, fundo: '#ffffff', titulo: 'Prancha 1' });
```

### SVG

O SVG vem do mesmo plano. A folha é em mm (`width="210mm"`, `viewBox` em mm). Gradientes e recortes vão em `<defs>`, com
ids gerados (`pr-g0`, `pr-c1`), e o texto sai em `<tspan>`. A opacidade do elemento é de grupo. Saneamento: cores só pelo
`corSegura`, família de fonte por lista de caracteres permitidos, texto e ids escapados (`escaparHtml`), nenhum id vindo
do dado.

### Decisões da Fase 2

1. **Padrões de prancha** (diferentes do mapa): ponta reta e junção angular com limite 4, para as molduras terem cantos
   vivos. O padrão do mapa (arredondado) não muda.
2. **Opacidade do elemento no Canvas** é multiplicada em cada parte (preenchimento, hachura, traço). Onde o traço passa
   sobre o preenchimento, a sobreposição fica um pouco mais escura que no SVG, onde a opacidade é de grupo e exata.
   Composição exata no Canvas exigiria uma camada fora da tela, que não está no contrato.
3. **Hachura em mm da folha**: o espaçamento não muda com a escala do elemento (estilo CAD); o ângulo gira com ele.
4. **Opacidade por parada de gradiente** no Canvas só para cores hex (`corComOpacidade`). O SVG respeita sempre
   (`stop-opacity`).
5. **Seta em trecho curvo** (fim de caminho Bézier) não recua a linha: o recuo exigiria dividir a curva.
6. **Texto sem contorno** nesta fase: o traço de texto fica para quando a Fase 3 medir a fonte.

### Testes da Fase 2

| Arquivo | O que cobre |
|---|---|
| `tests/prancha-contextos.ts` | `ContextoGravador` (todas as capacidades, grava chamadas) e `contextoMinimo()` (só o contrato, vigiado por Proxy) |
| `tests/prancha-pintura.test.ts` | Estilo resolvido, tracejado em mm, pontas, hachura, gradiente, texto, dentro/fora, evenodd, fundo, contrato mínimo, paridade tela × PDF × SVG, saneamento do SVG |
| `tests/prancha-pintura.regressao.test.ts` | Lista hostil, contexto que falha no meio, matriz não finita, hachura minúscula, cores e fontes hostis |
| `tests/prancha-desempenho.test.ts` (novos casos) | Pintar 2 mil ≤ 16 ms (medido 2,7 ms); plano frio 11 ms; SVG da A0 18 ms |
| `tests/ssr-safety.test.ts` (novo caso) | Pintor e SVG em Node |

## Fase 3: o componente `<ui-canvas-prancha>` (L4, casca fina)

`src/components/ui-canvas-prancha/` (anatomia no README do componente) e o entrypoint `@thibezer/ui-components-kit/prancha`
(`src/prancha.ts`: componente + núcleo `espaco/` e `prancha/`). Eventos, atributos, métodos, teclado e ponteiro em
[`canvas-prancha-eventos.md`](canvas-prancha-eventos.md).

O que tem: folha em mm com mesa, réguas na unidade de exibição, guias puxadas das réguas, grade, zoom e pan (roda, espaço,
mão, botão do meio, Ctrl+0/1), seleção (V) com caixa Window/Crossing, caixa de transformação (escala com Shift e Alt,
rotação com passo de 45°, cisalhamento com Ctrl, pivô movível) e seleção direta (A) de âncoras e alças Bézier. Ferramentas:
retângulo com cantos arredondados (`raioCantos`), elipse, polígono regular, estrela, linha, seta, polilinha, polígono,
caneta e texto. Snap em vértice, canto, centro, meio, guia, aresta e grade; guias inteligentes com distância; histórico
(Ctrl+Z, rajadas); API programática, eventos `prancha-*` e comandos pelo `ui-bus`; `::part()`, tokens e ARIA.

### Arquitetura

- `check-layers`: `ui-canvas-prancha` é L4 e **não pode importar `leaflet` nem outro componente L4** (regra nova,
  `L4_SEM_LEAFLET_ISOLADOS`); `prancha.ts` é L5 e está em `ENTRADAS_SEM_LEAFLET` (nada que ele alcança importa Leaflet).
- O documento (`prancha-documento.ts`) e a vista (`prancha-vista.ts`) não usam DOM. Os gestos não mudam o documento
  durante o arrasto: os elementos transformados ficam em `ui.substitutos` e, ao soltar, entra **uma** mudança no
  histórico, com **um** evento.
- A base (mesa, folha, grade e elementos) é pintada com o mesmo `desenharElementos` da exportação e só é repintada quando
  algo dela muda (documento, vista, folha, grade, cores). Durante um gesto, a base fica sem os elementos em movimento (e não
  muda); eles são pintados na sobreposição, por cima, com o mesmo pintor. A sobreposição e as réguas são repintadas a cada
  quadro agendado.
- As cores da interface vêm de `--ui-prancha-*` (mapeadas para tokens no `:host`), lidas uma vez por `getComputedStyle` e
  relidas em `tema:alterado`. Tokens novos: `--ui-cor-papel`, `--ui-cor-guia`, `--ui-cor-guia-inteligente`,
  `--ui-cor-grade-papel` (iguais nos dois temas: o papel é branco).
- O manifesto (`custom-elements-manifest.config.mjs`) passa a aceitar eventos `prancha-*` (antes só `ui-*`), então
  atributos, propriedades e eventos chegam aos tipos React e Vue.

### Decisões da Fase 3

1. **Mesmo contrato do CAD**: gestos e comandos emitem `prancha-elemento-*`; a sincronização do app (`definirElementos`,
   `aplicarLote`...) não emite. `definirElementos` recomeça o histórico; as demais chamadas entram nele (opção
   `{ historico: false }`). O id provisório vem de `gerarId` e o app troca com `renomearElemento`, que reescreve também o
   histórico (`Historico.transformar`, novo no núcleo).
2. **A forma desenhada fica selecionada**, como nos editores vetoriais (no CAD, criar não seleciona).
3. **Snap pelo ponto agarrado**: ao começar a mover perto de um vértice, canto ou centro do próprio elemento, é esse ponto
   que encaixa no alvo. Prioridade no arrasto: snap de ponto → guias inteligentes → grade.
4. **Teclado com o foco na prancha tem prioridade** sobre atalhos globais da página: a prancha escuta na própria área de
   desenho, que recebe o evento antes do `window`. No playground, a paleta de ferramentas capturava M, L, P, V, H e T.
5. **Duplo clique** (sem Shift) entra na seleção direta; Shift + cliques rápidos alternam a seleção.
6. **Alvo de toque**: alças, âncoras e pivô aceitam 19 px de raio no toque (alvo de 38 px) e 6 px no mouse; a régua fica
   com 24 px em telas de toque.
7. **Sem contenção de tamanho** no host (`contain: layout paint`): no navegador real, `contain: strict` zerava a largura
   num contêiner flex centralizado (achado na verificação no navegador).

### Testes da Fase 3

| Arquivo | Camada | O que cobre |
|---|---|---|
| `tests/ui-canvas-prancha.test.ts` | B, D | Ciclo de vida sem vazar listeners, pintura, API de dados, desenho (arrasto, Shift, Alt, polilinha, polígono, caneta, texto), seleção, caixa, mover, alças, rotação, seleção direta, snap, guias inteligentes, teclado (e campo de texto), zoom, guias, `ui-bus`, exportação, ARIA, parts, tokens |
| `tests/ui-canvas-prancha.regressao.test.ts` | C | API com argumentos hostis, atributos inválidos, bloqueado, texto com HTML, desconectar no meio do gesto, `pointercancel`, reconexões seguidas, contexto que lança, cliques rápidos |
| `tests/ui-canvas-prancha-desempenho.test.ts` | E | Por quadro, com 2 mil elementos (evento + gesto + pintura): hover 0,7 ms, arrastar 0,9 ms, caixa 0,6 ms (soltar 5 ms), zoom 8 ms |
| `tests/check-layers.test.ts`, `tests/ssr-safety.test.ts`, `tests/tipos/*` (casos novos) | D | Regras L4 sem Leaflet e isolado, entrypoint em Node, tipos React/Vue |

Verificado também no navegador real (Chrome do playground, Canvas 2D de verdade): folha, réguas, grade, moldura dupla,
desenho de retângulo com o mouse, caixa de transformação com alças e rotação pela alça.

### Pendências

- ~~Medida real do texto~~: resolvida (ver "Pendências da Fase 3, resolvidas").
- ~~Cantos arredondados ao vivo na tela~~: resolvido (ver "Pendências da Fase 3, resolvidas").
- **Fonte única com o `ui-canvas-cad`** (histórico, regra de clique, partes puras do `feature_desenho_controle`): a prancha
  tem os equivalentes puros. Trocar no CAD mexe no comportamento do mapa; fica para uma etapa própria, com paridade
  testada.

## Pendências da Fase 3, resolvidas

- **Medida real do texto.** O núcleo continua puro: `definirMedidorTexto(fn)` (em `elemento_geometria.ts`) registra quem
  mede, e os caches de contorno e limites se invalidam sozinhos (são versionados). O componente registra, uma vez por
  página, um medidor feito com `measureText` de um canvas fora da tela (`prancha-medidor-texto.ts`): mede num corpo de
  100 px e escala para o corpo em mm, com cache por fonte e texto. Sem Canvas 2D (SSR, Worker, testes), vale a estimativa
  de sempre. Ao registrar, o índice é refeito (as caixas de texto mudaram).
- **Cantos arredondados ao vivo.** Com um retângulo selecionado (ferramenta de seleção), quatro marcas aparecem dentro
  dos cantos, no centro do arco (ou a 14 px do canto, sem raio). Arrastar a marca para dentro aumenta o raio dos quatro
  cantos; com Alt, só daquele. O raio fica entre 0 e metade do menor lado; um gesto = um passo no histórico (motivo
  `cantos`). Pela API e pelo `ui-bus`: `definirRaiosCantos(raio | [4 raios])`. Núcleo: `prancha/cantos_vivos.ts`.

## Fase 4: organização e operações

### Núcleo (L2, puro)

| Módulo | O que faz |
|---|---|
| `prancha/camadas.ts` | `CamadaPrancha` (`id`, `nome`, `visivel`, `bloqueada`, `opacidade`): a ordem da lista é o empilhamento; camada oculta não é pintada, exportada nem selecionada; bloqueada não é selecionada. Elementos sem camada ficam por cima |
| `prancha/organizacao.ts` | `reordenar` (frente, trás, avançar, recuar, dentro da camada), `agrupar`/`desagrupar`/`expandirGrupos`, `alinhar` (à seleção, ao objeto-chave, a uma caixa), `distribuir` (centros, espaços iguais ou fixos), `duplicarElementos` (ids, grupos e máscaras remapeados), `aplicarAparencia` |
| `prancha/operacoes_caminho.ts` | `unirCaminhos`, `dividirComLinha`, `deslocarCaminho` (offset), `simplificarCaminho`, `contornoDoTraco`, `criarMascara`/`liberarMascara`, `ancoraMaisProxima`/`trechoMaisProximo` |

As camadas e as máscaras são **dados**: a mesma regra vale na tela, no PDF (`desenharElementos(ctx, els, { camadas })`), no
SVG (`exportarSvg(els, { camadas })`) e nas consultas (`OpcoesConsulta.camadas`). Máscara: o elemento com `mascara: true`
não é pintado nem selecionado diretamente; os que o apontam em `recorteId` são pintados só dentro dele (`clip` no Canvas,
`clipPath` no SVG).

### Componente

| Ação | Teclado | API / `ui-bus` |
|---|---|---|
| Frente · trás · avançar · recuar | Ctrl+Shift+] · Ctrl+Shift+[ · Ctrl+] · Ctrl+[ | `trazerParaFrente`, `enviarParaTras`, `avancar`, `recuar`, `ordenarSelecao` |
| Agrupar · desagrupar | Ctrl+G · Ctrl+Shift+G | `agruparSelecao`, `desagruparSelecao` |
| Isolar grupo | duplo clique no grupo; Esc ou duplo clique no vazio sai | `isolarGrupo(id \| null)` |
| Bloquear · desbloquear tudo | Ctrl+2 · Ctrl+Alt+2 | `bloquearSelecao`, `desbloquearTudo` |
| Ocultar · mostrar tudo | Ctrl+3 · Ctrl+Alt+3 | `ocultarSelecao`, `mostrarTudo` |
| Alinhar · distribuir | — | `alinharSelecao(alinhamento, 'selecao' \| 'folha' \| 'chave' \| caixa)`, `distribuirSelecao(eixo, modo, espacamento?)` |
| Duplicar · transformar de novo | Alt + arrastar · Ctrl+D | `duplicarSelecao`, `transformarDeNovo` |
| Copiar · recortar · colar · colar no lugar | Ctrl+C · Ctrl+X · Ctrl+V · Ctrl+Shift+V | `copiar`, `recortar`, `colar(noLugar)` |
| Conta-gotas | I | `aplicarAparencia` |
| Máscara · liberar | Ctrl+7 · Ctrl+Alt+7 | `criarMascara`, `liberarMascara` |
| Unir · dividir · deslocar · simplificar · contorno do traço · converter em caminho | Ctrl+J | `unirSelecao`, `dividirSelecao`, `deslocarCaminho`, `simplificarSelecao`, `contornarTraco`, `converterEmCaminho` |
| Adicionar · excluir · converter âncora | + · − · Shift+C | ferramentas `adicionar-ancora`, `excluir-ancora`, `converter-ancora` |
| Camadas | — | `definirCamadas`, `obterCamadas`, `definirCamadaAtiva`, `moverSelecaoParaCamada` |

Eventos novos: `prancha-ordem` (a ordem de empilhamento mudou), `prancha-camadas`, `prancha-isolamento`,
`prancha-conta-gotas`. A casca foi dividida em `ui-canvas-prancha-base.ts` (ciclo de vida, dados, vista, Fase 3) e
`ui-canvas-prancha.ts` (o elemento registrado, com a Fase 4), para nenhum arquivo passar de ~400 linhas.

### Decisões da Fase 4

1. **Camadas são dados do documento**, não só da tela: a exportação respeita as mesmas camadas que a tela.
2. **Grupos de um nível** (`grupoId`): clicar num membro seleciona o grupo; duplo clique isola o grupo (o resto esmaecido);
   grupos aninhados ficam pendentes.
3. **Reordenar usa a posição na lista** e remove o campo `ordem` de quem o tinha (o app recebe `prancha-ordem` com a ordem
   nova e `prancha-elemento-atualizado` para quem perdeu o campo).
4. **Alt + arrastar duplica** (como nos editores vetoriais), e o snap continua ligado; antes, Alt no arrasto desligava o
   snap. Sem duplicar, Alt continua desligando o snap nas ferramentas.
5. **Área de transferência** compartilhada entre as pranchas da página (cópias profundas). O JSON também vai para a área do
   sistema por melhor esforço (`navigator.clipboard`, pode ser negado). Colar lendo a área do sistema fica pendente.
6. **Conta-gotas sem seleção** guarda a aparência para as formas novas (opções da ferramenta).
7. **Operações de caminho são poligonais** (curvas entram pelos vértices amostrados), como no mapa. Unir dois polígonos é
   pela ponte do `juntarPoligonos` (não é união booleana: é a Fase 5).
8. **Hit-test pela ordem do documento**: o índice espacial devolve os candidatos em outra ordem, e o desempate do
   empilhamento usava essa ordem. Corrigido: os candidatos voltam à ordem do documento (`naOrdemDoDocumento`). Teste com
   300 elementos sobrepostos.

### Testes da Fase 4

| Arquivo | Camada | O que cobre |
|---|---|---|
| `tests/prancha-texto-cantos.test.ts` | A, B | Medidor de texto (registro, invalidação, entrada hostil, canvas), cantos vivos no núcleo e no componente |
| `tests/prancha-organizacao.test.ts` | A, C | Camadas, ordem, grupos, alinhar/distribuir, duplicar, conta-gotas, unir, dividir, deslocar, simplificar, contorno do traço, máscara (pintura e SVG), âncora/trecho mais perto |
| `tests/ui-canvas-prancha-organizacao.test.ts` | B, C | Os mesmos pelo componente: ponteiro, teclado, API, `ui-bus`, hit-test com 300 sobrepostos, somente-leitura e argumentos hostis |
| `tests/prancha-desempenho.test.ts` (novo caso) | E | Com 2 mil elementos: reordenar 1,3 ms, agrupar 0,9 ms, alinhar 500 2,2 ms, distribuir 500 2,1 ms, duplicar 200 1,9 ms, planejar com camadas 2,0 ms |

Verificado também no Chrome real: máscara de recorte (gradiente recortado pelo círculo), isolamento de grupo
(esmaecimento) e marcas de canto.

### Pendências

- **Grupos aninhados** (grupo dentro de grupo).
- **Colar da área de transferência do sistema** (ler JSON colado de outra aba/app).
- **Pathfinder** (união, subtração, interseção e exclusão booleanas): é a Fase 5.
- **Fonte única com o `ui-canvas-cad`** (histórico, regra de clique): segue pendente, como registrado na Fase 3.

## Requisição do ConecteMapas (kit 2.23): o que a migração real ensinou

Detalhes de uso em [`guia-migracao-prancha.md`](./guia-migracao-prancha.md). Resumo das decisões:

- **Contexto de pintura.** O pintor usa `setTransform` absoluto; sem ele usa o modo relativo (`transform` com
  `inverse(atual) · M`, `adaptarContextoRelativo`), e sem nenhum dos dois não pinta, conta `falhas` e avisa uma vez (antes era
  um PDF em branco sem erro). `diagnosticarContexto(ctx)` verifica o contrato. Fixture reutilizável:
  `tests/fixtures/contexto-pdf-vetorial.ts`.
- **Plano reutilizável.** `planejar` + `desenharPlano`; `desenharElementos` passou a ser a composição dos dois. O plano não
  depende da matriz (zoom, resolução, exportação), só dos elementos e das camadas.
- **Envelope visual** (`envelopeVisual`): medido sobre o próprio plano de pintura (fonte única), incluindo a **ponta real**
  da junção angular (até o `limitePonta`), terminação quadrada, pontas de seta, sombra deslocada e desfocada (3 desvios) e a
  caixa do texto.
- **Ajuste a caixa** (`ajustarElementosACaixa`, `normalizarParaOrigem`) e **aparência em lote** (`ajustarAparenciaEmLote`,
  `resumirAparencia`, `ESTILO_DO_TIPO_LINHA`): L2 puros. O traço é em mm da folha, então a escala não o muda (garantia testada).
- **Pré-definições:** `ROTULOS_PREDEFINICOES`, `ITENS_PREDEFINICOES`, opções `opacidadePreenchimento`, `opacidadeTraco`,
  `semTraco`, `preenchimentoNa`, `alinhamentoTraco` (o pintor **implementa** `alinhamento: 'dentro' | 'fora'`; o envelope o
  respeita) e `recuo`. `caixaDoQuadro(largura, altura, margens)` para folhas e margens quaisquer.
- **Núcleo sem o componente:** entrypoint `./prancha/nucleo` (`src/prancha-nucleo.ts`, L5): só o L2 puro, seguro em
  Node/SSR/Worker. `tests/check-layers.test.ts` garante que nada de `components/ui-*` é alcançável a partir dele.
- **Editor:** `<ui-editor-prancha>` (L4, casca fina) + `ligarPaineisPrancha`. O editor importa só a prancha; a paleta, as
  camadas e as propriedades são compostas por tag e registradas pelo entrypoint `./prancha` (a prancha continua sem importar
  outro L4).
- **Teclado:** tecla tratada = `preventDefault` + `stopPropagation` + marca (`eventoTratadoPelaPrancha`); `teclado="exclusivo"`
  captura em fase de captura; `prancha-esc-sem-efeito` fecha a cadeia do Esc.
- **Tags de propriedades:** `<ui-tabela-propriedades>` é a oficial; `<ui-painel-propriedades>` e `<ui-propriedades>` são
  aliases suportados por contrato.
- **Texto no PDF:** `font = "<corpo em mm>px <fonte>"` nas unidades do transform; `texto.largura` só dimensiona a caixa (não
  quebra linha). Teste de paridade em `tests/prancha-contexto.regressao.test.ts`.
- **Gradiente em faixas** (opcional, `gradienteEmFaixas`): `pintura_gradiente_faixas.ts`.

## Fase 5: Pathfinder e efeitos

### Booleanas (L2, `src/gerencigeo-canvas/booleanas/`)

Algoritmo próprio e puro, **genérico** (coordenadas planas sem unidade: serve à prancha em mm e a qualquer módulo plano,
inclusive o mapa em áreas pequenas). `operacaoBooleana(regioes, 'uniao' | 'subtracao' | 'intersecao' | 'exclusao')`:

1. **Vértices canônicos** (`segmentos.ts`): todo ponto passa por um registro em grade que funde pontos a menos de `q`
   (relativo ao tamanho das entradas, padrão 1e-9). Os vértices de entrada guardam a coordenada original (saem bit a bit).
2. **Divisão das arestas**: varredura em x; cada par que se toca ganha os cortes (cruzamento, ponta no meio da outra,
   trecho colinear sobreposto). Os pedaços só se encontram nas pontas; pedaços repetidos entram uma vez.
3. **Classificação** (`classificacao.ts`): um ponto logo à esquerda e outro logo à direita do meio de cada pedaço; em cada
   operando, o número de voltas (índice por faixas horizontais, ordenadas pelo x máximo) e a regra (`nonzero`/`evenodd`)
   dizem se o ponto está dentro; a operação diz se está no resultado. Se só um lado está, o pedaço é borda, orientado com
   o resultado à esquerda.
4. **Montagem** (`montagem.ts`): as bordas se encadeiam (no vértice com várias saídas, a curva mais à esquerda); área
   positiva = externo, negativa = furo, e cada furo vai para o menor externo que o contém (o mesmo índice por faixas).

Por que este algoritmo: não depende do sentido dos anéis nem de casos especiais, então aceita anéis que se cruzam, furos,
arestas comuns, toques numa quina, quadrados idênticos e qualquer número de operandos numa passada só (a exclusão de três
conta a sobreposição tripla como dentro, como no Illustrator). A união de uma região consigo mesma limpa cruzamentos.

### Pathfinder na prancha (`prancha/pathfinder.ts`, componente)

- `aplicarPathfinder(elementosNaOrdem, operacao)`: unir, interseção e excluir ficam com o id e a aparência do mais à
  frente; subtrair ("menos frente") é o mais atrás menos os outros, com o id e a aparência dele. O resultado é um caminho
  composto (externos e furos num elemento, preenchido por par-ímpar). Linhas, textos e máscaras não entram.
- Componente: `pathfinder(op)`, `unirFormas`, `subtrairFrente`, `intersectarFormas`, `excluirSobreposicao` (API e `ui-bus`),
  Ctrl+Alt+Shift+1/2/3/4. Um passo no histórico (motivo `pathfinder`); resultado vazio é recusado (`resultado-vazio`).

### Efeitos (aparência)

- `mesclagem`: os 16 modos do Illustrator/Photoshop (`multiplicar`, `tela`, `sobrepor`...). Canvas: `globalCompositeOperation`;
  SVG: `mix-blend-mode` no grupo; sem a capacidade (PDF vetorial do app): normal (`degradacoes.mesclagem`).
- `sombra`: `{ deslocamento: [x, y] mm na folha, desfoque (desvio-padrão em mm), cor, opacidade }`. A silhueta é
  **vetorial** (aparece no PDF): forma com preenchimento e traço vira UMA área (o contorno alargado pelo traço, sem
  partes semitransparentes sobrepostas); só traço ou linha, o traço e as pontas; texto, o próprio texto. O desfoque usa o
  `filter` do Canvas (`blur(px)`, convertido pela escala) e `feGaussianBlur` no SVG; sem `filter`, a sombra sai nítida
  (`degradacoes.desfoque`).

### Decisões da Fase 5

1. **Booleanas no núcleo genérico** (`gerencigeo-canvas/booleanas`), não na prancha: pelo princípio do kit, o mapa pode
   usá-las depois sem cópia. A prancha só adapta elementos.
2. **Divisão e classificação por número de voltas** em vez de Greiner-Hormann ou Martinez: menos casos especiais e
   robusto aos degenerados que mais aparecem em desenho (arestas comuns, encaixes exatos, formas idênticas).
3. **Resultado poligonal**: curvas entram pelos vértices amostrados (24 por trecho), como nas operações de caminho.
4. **Pathfinder sem teclas do Illustrator** (ele não tem atalho padrão): Ctrl+Alt+Shift+1 a 4, sem colidir com Ctrl+2/3 e
   Ctrl+Alt+2/3 nem com as capturas de tela do macOS (Cmd+Shift+3/4).
5. **Sombra sempre vetorial, desfoque opcional**: paridade tela × PDF na forma e na posição; só a suavidade depende do
   contexto.
6. **Mesclagem no Canvas vale por operação de desenho** (preenchimento e traço se mesclam separados); no SVG vale pelo
   grupo. A diferença só aparece onde o traço cobre o preenchimento do mesmo elemento.
7. **`degradacoes.mesclagem`/`desfoque` só aparecem quando houve** (o formato das estatísticas da Fase 2 não muda).
8. **Pathfinder é comando, não gesto**: orçamento de operação única (50 ms) para casos pesados; os comuns cabem no quadro.

### Testes da Fase 5

| Arquivo | Camada | O que cobre |
|---|---|---|
| `tests/booleanas.test.ts` | A | Áreas exatas, furos, sentido dos anéis, `evenodd`/`nonzero`, laço em 8, arestas comuns, quina, idempotência, inclusão-exclusão |
| `tests/booleanas.robustez.test.ts` | C, E | Entrada hostil (15 casos × 4 operações), quase coincidências (1e-12), escalas de µm a UTM, grade de 100 quadrados; orçamento |
| `tests/prancha-pathfinder-efeitos.test.ts` | A, C | Pathfinder com elementos (ordem, aparência, furo, curvas, recusas) e efeitos (resolução, validação, silhueta, Canvas, contexto mínimo, SVG, paridade) |
| `tests/ui-canvas-prancha-pathfinder.test.ts` | B, C | API, teclado, `ui-bus`, histórico, recusas, bloqueados e efeitos pela base do componente |
| `tests/prancha-desempenho.test.ts`, `tests/ssr-safety.test.ts` (casos novos) | E, D | Orçamento do Pathfinder e da pintura com efeitos; booleanas e efeitos em Node |

Números (isolado): união, subtração, interseção e exclusão de dois círculos de 1000 vértices 2,7 a 4,1 ms; união de 100
estrelas sobrepostas (2000 arestas, 4680 cortes) ~20 ms (operação única); unir 50 retângulos 3,3 ms; subtrair uma elipse de
um retângulo 0,3 ms; planejar a frio 2 mil elementos com sombra 22,7 ms (7,7 ms sem efeitos; depois fica em cache).

Verificado no Chrome real: união (aparência do da frente), subtração com furo, sombra desfocada e mesclagem multiplicar.

### Pendências

- **Pathfinder preservando curvas** (o resultado hoje é poligonal).
- **Divisões do Pathfinder** ("dividir", "aparar", "mesclar", "cortar") e o construtor de formas: fora do escopo pedido.
- **Sombra interna, brilho e outros efeitos**; **mesclagem de grupo** (isolar a mescla de um grupo) no Canvas.
- Seguem as da Fase 4: grupos aninhados, colar da área do sistema, fonte única com o `ui-canvas-cad`.

## Fase 6: integração e fechamento

### Os painéis do kit, sem acoplamento

A prancha não importa outro componente L4. Ela fornece **dados no formato de cada painel** e **comandos de usuário**; a
composição (ligar os eventos) fica no app ou no playground (a página `prancha.html` com `pagina_prancha.ts` é a referência).

| Painel | Dados (puros, sem DOM) | Volta (comando da prancha) |
|---|---|---|
| `<ui-paleta-ferramentas>` | `FERRAMENTAS_PALETA_PRANCHA` (flyouts: caneta e âncoras, linhas, formas; atalhos; ícones SVG fixos) | `ui-change` → `definirFerramenta(ferramentaDaPaleta(valor))`; `prancha-ferramenta` → `paleta.valor` |
| `<ui-tabela-propriedades>` | `prancha.categoriasDePropriedades()` (Elemento, Posição e tamanho, Traço, Preenchimento, Hachura, Efeitos; valores mistos na seleção múltipla) | `ui-propriedade-alterada` → `aplicarPropriedade(id, valor)` |
| `<ui-camadas>` (densidade compacta) | `prancha.dadosParaPainelDeCamadas()` (camadas da frente para trás, camada sintética "Sem camada", elementos com nome, visibilidade e trava) | visibilidade/trava/opacidade/nome da camada → `definirCamadas(camadasComMudanca(...))`; reordenar → `camadasNaOrdemDoPainel`; feição oculta/travada/renomeada/movida → `alterarElementos(ids, mudanca)`; seleção nos dois sentidos |

O núcleo L2 ganhou `prancha/propriedades.ts`: o id de cada campo (`IDS_PROPRIEDADES_PRANCHA`), o valor de exibição
(`valorDaPropriedade`) e a troca validada (`comPropriedade`). É a fonte única para qualquer painel, do kit ou do app.

`aplicarPropriedade` e `alterarElementos` são ações do usuário: entram no histórico (rajada no mesmo campo vira um passo)
e saem em `prancha-elemento-atualizado` com motivo `propriedades`. Os campos `geometria.*` transformam a seleção:
- X e Y movem a caixa da seleção;
- largura e altura escalam a partir do canto superior esquerdo;
- a rotação gira cada elemento em torno do próprio centro até o ângulo pedido;
- o raio arredonda os cantos dos retângulos.

### Guia de migração do app

[`docs/guia-migracao-prancha.md`](guia-migracao-prancha.md) cobre:
- o que muda no `PrintComposer`;
- o que o app fornece: ids e nomes, persistência pelos eventos e o contexto de PDF com `desenharEm`;
- o mapa `shapeType`/`strokeStyle`/`fillColor`/`borderRadius`/`rotation`/`arrowHead` → pré-definições e aparência;
- um conversor de exemplo;
- a migração preguiçosa das pranchas salvas.

O código do app não estava nesta máquina: os valores dos campos antigos precisam ser conferidos no app.

### Decisões da Fase 6

1. **Dados + comandos, não "ligadores" no kit**: o pedido põe a composição no app/playground; o kit dá tudo que é
   reutilizável (formato dos painéis, regra de cada campo, comandos com histórico). Assim a prancha continua sem importar
   outros L4.
2. **Os tipos dos adaptadores são estruturais** (`CategoriaPainelPrancha`, `CamadaPainelPrancha`, `FerramentaPaletaPrancha`).
   Os testes provam, pelo `tsc`, que cabem em `CategoriaPropriedades`, `CamadaItem`/`FeicaoItem` e `FerramentaItem`.
3. **Painel de camadas da frente para trás**, como os editores vetoriais; a prancha guarda de trás para a frente. Os
   adaptadores fazem a inversão nos dois sentidos.
4. **Posição e tamanho são da caixa da seleção** (painel Transformar do Illustrator); a rotação é por elemento.
5. **Ligar o preenchimento sem cor usa branco** (o que o painel mostra), não o preto padrão da resolução.
6. **O conversor do formato antigo fica no app**: é dado do produto, não capacidade reutilizável.

### Testes da Fase 6

| Arquivo | Camada | O que cobre |
|---|---|---|
| `tests/prancha-integracao.test.ts` | A, B, C | Propriedades (leitura, troca validada, entrada hostil), categorias (uma seleção, várias, linha, texto, vazio), camadas (ordem, sintética, mudanças, reordenação), paleta (cobertura das ferramentas), `aplicarPropriedade` (aparência com histórico, geometria, recusas) e `alterarElementos`; contratos dos três painéis checados pelo `tsc` |

Verificado no Chrome real (playground):
- a paleta troca a ferramenta e acompanha a prancha;
- digitar a espessura no painel muda o elemento, com histórico;
- ligar o preenchimento, a cor e a sombra pelo painel funciona;
- o olho do painel de camadas oculta o elemento;
- a seleção fica sincronizada entre prancha, camadas e propriedades;
- nenhum erro no console.

## Estado final (Fases 0 a 6)

Fases concluídas e o que cada uma trouxe:
- **Fase 0:** a rede de segurança.
- **Fase 1:** o núcleo plano.
- **Fase 2:** a aparência e o pintor único (tela = PDF = SVG).
- **Fase 3:** o componente.
- **Fase 4:** a organização e as operações.
- **Fase 5:** o Pathfinder e os efeitos.
- **Fase 6:** os painéis e a migração.

O `ui-canvas-cad` segue com o comportamento idêntico: a suíte antiga passa sem um teste editado.

### Pendências finais (e por quê)

- **Fonte única de histórico e regra de clique com o `ui-canvas-cad`**: o núcleo já é comum (espaço, formas, snap,
  índice, booleanas); unificar o histórico mexe no contrato do mapa que o app usa hoje. Vale uma tarefa própria, com os
  testes do mapa como trava.
- **Pathfinder preservando curvas**; **dividir/aparar/mesclar** do Pathfinder; **sombra interna e brilho**.
- **Grupos aninhados**; **colar do que foi copiado em outra aba**.
- **Conversor do formato antigo**: depende dos valores reais do `PrintComposer` (o app não estava disponível aqui).
