# Handoff — motor das formas (`feat/motor-formas`)

> **Estado em 2026-10-23 (fim da 3ª conversa): pronto para publicar a 2.9.0.** Trabalho commitado em `feat/motor-formas`;
> a 2.8.2 (branch `feat/barra-ferramentas-pendencias`, commit `5054a9b`, publicada a partir de uma base 2.6.0) foi mesclada,
> com as mudanças do ribbon e da paleta portadas para os módulos da 2.7.0. `package.json` em 2.9.0. Gates verdes (tsc,
> check:layers, vitest 113 arquivos / 1774 testes, build limpo, test:tipos, `dist/motor.js` sem leaflet). Conferência manual e
> benchmark com GPU feitos pelo dono e registrados em `docs/RELATORIO-motor-formas.md`. Falta só: publicar (dono) e, se
> quiser, enviar os branches ao GitHub. O texto abaixo é o histórico.

Registro do que foi feito e do que falta, para retomar em outra conversa. Origem: `PROMPT_MOTOR_FORMAS_KIT.md` (fica no
checkout principal, não versionado). **Nada foi commitado nem publicado** (a regra do prompt é: commit e npm são do dono).

## Onde estamos

- **Worktree:** `D:\Programação\UI_Componentes\.claude\worktrees\motor-formas`, branch `feat/motor-formas`, criada de `7b912fb`
  (2.8.1). `package.json` ainda diz `2.8.1`. Versão sugerida: **2.9.0**.
- **Não mexer** em `D:\Programação\UI_Componentes` (checkout principal, outra frente) nem fazer merge com `main` ou
  `claude/polish-text-components-1fdd98` (decisão do dono).
- A worktree `focused-elbakyan-7dd9bd` (branch `claude/canvas-motor-formas-kit-ddd7c7`, 2.7.0) só serviu para a revisão
  inicial; não tem nada deste trabalho.
- Dev server do playground: `.claude/launch.json` → `npx vite --port 5173`. Benchmark: `http://localhost:5173/bench/bench-formas.html`.
- Ambiente: o painel do navegador fica escondido (sem GPU de verdade) e os tempos oscilam ±25%; compare sempre A/B na mesma
  sessão. `getImageData` troca o canvas de GPU para CPU na primeira leitura e muda o antialiasing (gera diferença de pixel
  falsa): aqueça antes de comparar pixels.

## Estado dos gates (último ciclo, 2026-10-22, 2ª conversa)

- `npx vitest run`: **111 arquivos, 1734 testes, verde em duas rodadas seguidas**. `npx tsc --noEmit` limpo.
  `npm run check:layers` verde. `npm run build` ok (manifesto regenerado em `dist/custom-elements.json`, `renderizador`
  presente). `npm run test:tipos` ok. `dist/motor.js`/`motor.cjs` e o chunk deles: **0** ocorrências de `leaflet`;
  `dist/motor.d.ts` existe. (Depois disso só mudaram testes e docs; o build não precisa ser refeito para eles.)

## Feito na 2ª conversa

- Gates acima (itens 1 e 5 da lista antiga).
- Teste de desempenho do motor em `tests/feicoes-desempenho.test.ts` (item 6): `listaDesenho` de 100 mil em zoom 12,
  faixa do pan incremental em zoom 15, hover (`consultarCaixa`) ≤ 16 ms em média. Orçamentos com folga de 10× ou mais e
  timeouts explícitos: na 1ª versão o teste de zoom 12 falhou uma vez com a suíte em paralelo (7,3 s, acima do timeout de 5 s).
- Benchmark final canvas × leaflet de 1 mil a 100 mil, zooms 12/15/18 + operações (item 2), registrado em
  `docs/desempenho-feicoes.md` (seção "Renderizador Canvas"), junto com a seção "Regressão" das Fases 2–3.
- CHANGELOG "Não lançado" com as Fases 2–3 e as mudanças de comportamento do caminho canvas (item 3).
- Tabela de arquivos do motor e dos renderizadores no `src/gerencigeo-canvas/README.md` (item 4).

## Feito na 3ª conversa (2026-10-23): otimização das marcas

- Item da marca de LOD em cache por zoom (`motor-formas.ts`: `EntradaGeom.item`, `itemMarca`, caminho rápido no laço de
  `listarCamada`; saiu o `Set` de vistos e o spread final). Node, 100 mil marcas z12: ~389 → ~137 ms por mudança de vista.
  Perfil: script em scratchpad empacotado com esbuild + `node --cpu-prof` (não versionado).
- Canvas em branco intocado (`canvas_formas_leaflet.ts`: `branco`, `QuadroCanvas.branco`, `PintarQuadro`;
  `feicoes_canvas_renderer.ts`: `pintarBase` e sobreposição devolvem se pintaram; `renderizador_formas.ts`: `temItensCanvas`).
  Achado: o "piso de ~100 ms" da rodada final **não era da máquina**, era o caminho canvas tocando canvases vazios a cada pan
  (reenvio ao compositor, sem tarefa longa). 1 000 formas z18: ~130 → ~30 ms.
- Testes novos: 4 em `tests/motor-formas.regressao.test.ts`, 3 em `tests/feicoes-canvas-renderer.test.ts`; 2 testes de pan
  ajustados (faixa sem dados não é mais pintada; destino vazio não chama o pintor). Mutação conferida.
- Gates: tsc, check:layers, vitest (1741) verdes depois das mudanças.
- Medição intercalada canvas × leaflet em `docs/desempenho-feicoes.md` ("Otimização").

**Feito em seguida (3ª conversa):** repintar em vez de deslocar com até `CanvasFormas.limiteRepintar` = 500 itens por camada
(`canvas_formas_leaflet.ts`: contagem `itens`, `PintarQuadro` devolve número; `pintarBase` devolve a contagem;
`contarItensCanvas` em `renderizador_formas.ts`). Limite escolhido por medição intercalada (desloca × repinta × leaflet,
tabela em `docs/desempenho-feicoes.md`, item 3): repintar ganha 3–5× até ~200 itens/camada, empata ~650, perde de ~1 500.
Testes: `pan com poucos itens` (3) em `tests/feicoes-canvas-renderer.test.ts`; o describe do pan incremental roda com
limite 0. Conferir o limite numa máquina com GPU.

**Ambiente de teste para o dono (3ª conversa):** `bench/conferencia-canvas.html` (roteiro da conferência manual com botões:
renderizador, volume, zoom animado, edição, popups, opacidade) e botões no `bench/bench-formas.html` ("Protocolo completo",
"Canvas × leaflet", "Escolher limite", "Teste rápido", "Copiar resultado"; no console `__bench.protocoloGPU()`,
`intercalado()`, `limites()`). Rascunho do relatório final em `docs/RELATORIO-motor-formas.md`, com campos [preencher] e o
passo a passo para fechá-lo.

**Gates no fim da 3ª conversa:** tsc, check:layers, build, test:tipos e `dist/motor*` sem leaflet ok. A suíte inteira deu
1744 verdes duas vezes, mas no fim a máquina ficou mais lenta (suíte em 53–106 s, antes 28–32 s) e testes com orçamento de
tempo anteriores a este trabalho passaram a falhar só em paralelo: `tests/ssr-safety.test.ts` (timeout de 20 s),
`tests/feicoes-lote.test.ts` "lote de 5 mil" (1 s, caminho leaflet, não tocado) e `IndiceEspacial` 100 mil. Isolados,
passam (184 de 184; o de lote, 3 de 3). Falha igual com o limite em 2000, então não é a mudança. Confirmado em 2026-10-23:
o dono rodou `npx vitest run` na worktree com a máquina folgada, **111 arquivos, 1744 testes, tudo verde** (41 s).

**Achado original (resolvido acima):** com poucas formas na vista e camadas com conteúdo (1 000 em z12/z15, 20 000 em z18) o canvas
fica mais lento que o leaflet: o pan desloca bitmaps cheios de 3072×1920 por camada. Testar repintura completa em vez de
deslocamento quando a camada tem poucos itens; medir numa máquina com GPU.

**Achados da 2ª conversa (não corrigidos na época):**
- *(explicado e corrigido na 3ª conversa: era o caminho canvas tocando canvases vazios)* Máquina carregada: piso de ~100 ms por mudança de vista mesmo sem desenho. Os números absolutos da rodada final estão
  inflados; a razão canvas/leaflet (2,3–5×) é o que vale. As metas de 20/50/100 mil em z12 **não foram confirmadas**.
- *(feito na 3ª conversa: ~137 ms)* No Node, `listaDesenho` de 100 mil marcas em z12 custa ~450 ms por mudança de vista (aloca um `ItemDesenho` por marca a
  cada vista). É o maior custo do caminho canvas em zoom baixo com 100 mil; candidato a otimização (reaproveitar a lista de
  marcas por zoom, ou pintar marcas direto de um `Float64Array`).
- "Exibir camada" com 20 mil saiu pior no canvas (228 × 67 ms síncronos), ao contrário da 1ª rodada; medir de novo.
- O "total" das operações pontuais no bench tem picos de 0,5–1,8 s nos dois caminhos: isolado, é coleta de lixo depois de
  carregar 100 mil objetos, não custo da seleção.

## O que foi feito

### Fase 0 — benchmark e caracterização
- `bench/bench-formas.html` + `bench/bench_formas.ts`: dados sintéticos com semente fixa, mudança de vista por `panBy`,
  rAF por canal de mensagens, `getImageData`; `await __bench.rodar({ tamanhos, zooms, repeticoes, operacoes, raioPoligonoM, renderizador })`.
- `tests/feicoes-caracterizacao.test.ts`: régua do comportamento do caminho Leaflet.

### Fase 1 — ganhos no caminho atual
- LOD por diagonal em px (`feature_lod.ts`, `renderers/marcas_lod_layer.ts`): feição < 3 px vira marca de 1–2 px em lote.
- `aplicarSelecao` incremental (O(mudanças), só `setStyle`/`setIcon`).
- Simplificação em px (mais de 8 vértices, abaixo do zoom 17, fator cos(lat)); correções de Regra #0 (`feicaoNoPonto` em anel
  enorme, zoom `NaN`, feição que o Leaflet recusa).
- Clique nas marcas pelo hit-test central (`FonteHit` em `layer_hit_test.ts`).
- Regra do `check-layers`: módulos puros não importam `leaflet` nem usam DOM.

### Fase 2 — motor headless (`src/gerencigeo-canvas/motor/`)
- `tipos.ts`, `estilo.ts` (estilo resolvido e compartilhado pelos dois renderizadores), `geometria-px.ts` (Float64Array,
  projeção própria, Douglas-Peucker em px, círculo em metros), `dados-camada.ts` (loja, índice, oficial × prévia, delta),
  `motor-formas.ts` (`MotorFormas.listaDesenho(vista, { camadas, parte })`, `listaSobreposicao`, `consultarCaixa`, seleção,
  `previsualizar`, `destacar`, clusters).
- Testes em Node (`@vitest-environment node`): `tests/motor-formas.test.ts`, `tests/motor-formas.regressao.test.ts`.
- Entrypoint `src/motor.ts` → `@thibezer/ui-components-kit/motor` (vite `motor`, `exports["./motor"]`); o `check-layers` agora
  garante que nada que ele alcança importa `leaflet`.

### Fase 3 — renderizador Canvas e ponte Leaflet (opt-in `renderizador="canvas"`)
- `renderers/renderizador_formas.ts` (`PintorCanvas2D`, pinta forma a forma por grupo de estilo, `recorte`),
  `renderers/canvas_formas_leaflet.ts` (`CanvasFormas extends L.Canvas`, **pan incremental**: desloca o bitmap em pixels de
  MUNDO e pinta só as faixas expostas), `renderers/feicoes_canvas_renderer.ts` (ponte: canvas por camada + 1 sobreposição por
  mapa, marcadores DOM, curvas híbridas, `FonteHit`), `renderers/feicoes_despachante.ts` (registrado para o tipo `feicoes`;
  escolhe o caminho pelo contexto), `renderers/marcadores_feicoes.ts`, `renderers/selecao_visual.ts`,
  `renderers/renderizador_feicoes_tipos.ts` (contrato `IRenderizadorFeicoes`).
- Componente: atributo/propriedade `renderizador`, `estatisticasFeicoes(camadaId)`; `CanvasLayerManager.recriarCamadasDoTipo`.
- Testes: `tests/renderizador-formas.test.ts`, `tests/feicoes-canvas-renderer.test.ts`, `tests/feicoes-renderizadores-paridade.test.ts`
  (mesma suíte nos dois caminhos + equivalência por sequências aleatórias), `tests/ui-canvas-cad-renderizador.test.ts`,
  `tests/check-layers.test.ts`.
- Doc: `docs/motor-formas.md` (arquitetura, contratos, decisões). README do módulo e do repositório já mencionam.

### Bugs achados e corrigidos no caminho
- Marca de LOD antiga ficava quando a feição virava ponto agrupado (legado, achado pela equivalência).
- Caminho combinado (um `stroke` por estilo) era patológico no Canvas 2D (segundos); trocado por forma a forma.
- Pan incremental media o deslocamento em pontos de camada (muda a cada `viewreset`); passou a medir em pixels de mundo.
- Ícone selecionado/único restante numa célula de cluster sumia (a sobreposição não desenha ícones); agora é marcador DOM.
- A base canvas não depende mais da seleção (ponto de cluster solto é da sobreposição).

## Números medidos (A/B na mesma sessão, ms, mediana; ruído ±25%)

| | Leaflet | Canvas |
|---|---|---|
| 20 mil, zoom 12, mudança de vista | 229–250 | **48–61** |
| 50 mil, zoom 12 | 598–667 | **98–148** |
| 50 mil, zoom 15 | 419–476 | **107–117** |
| Selecionar 1 (síncrono) | 1–2 | <1 |
| Selecionar 2 000 (síncrono, 20 mil) | 182 | 14 |
| Exibir camada (síncrono, 20 mil) | 254 | 112 |

Metas do prompt (50 mil z12 ≤ 100 ms; 20 mil z12 ≤ 60 ms; 100 mil z12 ≤ 200 ms) estão no limite aqui; **100 mil não foi medido
no caminho canvas** e a máquina do dono tem GPU (refazer a tabela lá).

## O que falta

Itens 1–6 feitos na 2ª conversa (ver acima). Continuam abertos: **7** (pendências, já registradas no CHANGELOG e em
`docs/motor-formas.md`), **8** (conferência manual: animação de zoom, edição de vértices com `previsualizar`, popups,
camada com opacidade < 1), **9** (relatório final + publicação pelo dono) e refazer o benchmark numa máquina com GPU e sem carga.

1. *(feito)* **Rodar de novo os gates depois das últimas mudanças** (em ordem): `npx tsc --noEmit`, `npm run check:layers`,
   `npx vitest run`, `npm run build`, `npm run test:tipos`; depois conferir `dist/motor.js` (não pode importar `leaflet`:
   `grep -c leaflet dist/motor.js` deve dar 0) e que `dist/motor.d.ts` existe.
2. *(feito)* **Benchmark final** (canvas × leaflet, 1 mil a 100 mil, zooms 12/15/18, operações pontuais) com a versão final e a tabela
   no `docs/desempenho-feicoes.md`. Hoje o doc só tem a tabela da Fase 1; falta a seção das Fases 2–3 (e atualizar o texto
   que diz que o renderizador Canvas é trabalho futuro, se houver).
3. *(feito)* **CHANGELOG ("Não lançado")**: já descreve a Fase 1. Falta registrar as Fases 2 e 3: atributo `renderizador`,
   `estatisticasFeicoes`, motor + entrypoint `/motor`, `recriarCamadasDoTipo`, correções, e as **Mudanças de comportamento do
   caminho canvas** (preenchimento translúcido forma a forma mantém o escurecimento; ordem por grupo de estilo; canvas por
   camada e não 2 no total; curvas Bézier e ícone/texto/cluster/rótulo seguem como objetos Leaflet).
4. *(feito)* **Documentar no README do módulo** (`src/gerencigeo-canvas/README.md`) a tabela de arquivos novos (motor, renderizadores).
5. *(feito)* **JSDoc/manifesto**: `renderizador` já tem JSDoc; rodar `npm run build` regenera `custom-elements.json` (conferir que o
   atributo aparece e que o git diff dele faz sentido).
6. *(feito)* **Teste de desempenho do motor** em `tests/feicoes-desempenho.test.ts` (orçamentos folgados): `listaDesenho` de 100 mil
   feições, hover/`consultarCaixa` ≤ 16 ms em 100 mil, pan incremental. Ainda não foi escrito.
7. **Pendências conhecidas (marcar como "não feito" no relatório):**
   - Curvas Bézier não são desenhadas no canvas (ficam como `LinhaCurva`/`PoligonoCurvo` do Leaflet).
   - Ícone, texto, cluster e rótulo continuam marcadores DOM.
   - 2 canvases no total não foi atingido: é um canvas por camada + 1 de sobreposição (decisão justificada em `docs/motor-formas.md`).
   - `Path2D` cacheado foi trocado por coordenadas projetadas em cache (o ambiente de teste não tem `Path2D`).
   - Sobreposição compartilhada ignora a opacidade da camada (a seleção sempre aparece cheia).
   - Painel `ui-camadas` (diff/virtualização, `atualizarContagens`) não foi tocado: é item separado do prompt.
   - Fase 4 (trocar o padrão para `canvas`, remover `materializar`/`ligarEventos`) **não foi feita**: só depois de validar a
     suíte e o benchmark nos dois caminhos; o padrão continua `leaflet`.
8. **Verificação visual** no navegador do caminho canvas já foi feita (cena, marcas, clique, pan incremental vs repintura
   completa: 0,2–1,5% de pixels de borda diferentes). Falta conferir manualmente: animação de zoom (escala do canvas),
   edição de vértices com `previsualizar`, popups, e uma camada com opacidade < 1.
9. **Relatório final** pedido pelo prompt (por fase: o que mudou, números, decisões, o que não deu) + comandos de publicação.
   Só **depois** de tudo verde, o dono publica:

   ```bash
   # o build não limpa dist/ (ficaram chunks antigos do motor) e dist/ inteiro vai no pacote: apague antes
   rm -rf dist
   npm version 2.9.0 --no-git-tag-version
   npm run gate        # check:layers + tsc + vitest
   npm run build && npm run test:tipos
   npm publish --access public
   ```

   No app: `npm install @thibezer/ui-components-kit@2.9.0` (e, para testar, `renderizador="canvas"` no `<ui-canvas-cad>`).
   O dono combinou publicar **só ao final de tudo**.

## Pegadinhas para quem continuar

- Escrever arquivos em outra worktree é bloqueado por hook; a sessão está **dentro** de `motor-formas` (`EnterWorktree`).
- Heredocs longos no Bash às vezes quebram; use a ferramenta de escrita ou um `.py` no diretório de scratchpad.
- Não edite `src/` com o benchmark rodando no navegador: o HMR recarrega a página e derruba a execução.
- `tests/setup.ts` tem um Canvas 2D falso (agora com `setLineDash`); os testes de pintura usam um contexto que grava chamadas.
- Prototype patch no navegador não funciona com módulos Vite com `?t=`: use a URL exata de `performance.getEntriesByType('resource')`.
