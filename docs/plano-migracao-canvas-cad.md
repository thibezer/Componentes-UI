# Plano de migração do MapEngine para o `<ui-canvas-cad>`

Origem: especificação do MapEngine do GerenciGeo (seções 1–12) e mapa de migração.
Estado de partida: `src/gerencigeo-canvas/layer_hit_test.ts` já resolve o clique de forma central (zIndex decrescente, prioridade por sub-pane), mas sem tolerância em pixels, sem alternância de cliques repetidos e sem uso em hover/menu/conta-gotas.

## Princípios

- Cada fase entrega algo utilizável e testável sozinho; o componente atual continua funcionando.
- Tudo novo entra por um modelo único de **Feature**. Pontos, segmentos e vizinhos viram adaptadores sobre ele.
- Cada fase termina com testes (vitest), uma página no playground e README atualizado.
- O módulo permanece independente do app GerenciGeo. Callbacks do MapEngine viram `CustomEvent` do componente.

## Fase 0 — Fundação e decisões — CONCLUÍDA

1. Modelo `Feature` em `src/gerencigeo-canvas/feature_types.ts`: `id`, `layerId`, `type` (Point | LineString | Polygon | Circle | Text), geometria normalizada, `style`, `properties`, `locked`, `status` (oficial | previa), `deleted`.
2. Arquitetura: o MapEngine vira serviços internos em `gerencigeo-canvas/` (renderer, seleção, edição); o `ui-canvas-cad` só orquestra.
3. Mapeamento de callbacks para eventos (ver `docs/canvas-cad-eventos.md`).
4. Adaptadores dos dados atuais (`Ponto`, `Segmento`, `Confrontante`/WKT) para `Feature`.
5. Critério de pronto global: paridade com as seções 1–11, preservando panes e zIndex por camada.

## Fase 1 — Hit-test unificado (completar o existente) — CONCLUÍDA

Implementada em `layer_hit_test.ts` (`consultarFeicoesNoPonto`, `resolverCliqueCentral`, `feicaoNoTopo`). Hover (`cad-feicao-hover`) e menu de contexto (`cad-feicao-menu`) foram ligados na Fase 7; o conta-gotas, na Fase 6. Respeitar `locked` por feição fica para a Fase 3/5, quando seleção e edição existirem; hoje só o bloqueio por camada vale.

- Tolerância em pixels por tipo (6 px linha, 4 px ponto).
- Prioridade ponto/texto > linha > área; desempate: camada do topo (ponto, linha) ou menor área (polígono).
- Alternância de cliques repetidos no mesmo lugar entre feições empilhadas.
- API para hover, menu de contexto e conta-gotas.
- Respeitar `locked`, visibilidade e versão de geometria.
- Testes: empilhamento, tolerância e alternância em `layer_hit_test.test.ts`.

## Fase 2 — Feições genéricas e estilo — CONCLUÍDA

Implementada em `renderers/feicoes_renderer.ts`, `feature_metricas.ts` e `components/ui-canvas-cad/cad-feicoes.ts`. API do componente: `definirFeicoes`, `adicionarFeicao`, `atualizarFeicao`, `removerFeicao`, `obterFeicoes`. Nenhuma camada de feições existe até o consumidor criá-la. Eventos: `cad-feicao-clique`, `cad-feicao-atualizada` (texto arrastado). Pendente desta fase: popup/rótulo de atributos completos (Fase 3) e `opacidade da feição × camada` já resolvida pelo pane da camada.

- Renderizadores de Circle (metros) e Text (`divIcon`, rótulo arrastável, halo).
- Estilo por feição (fill, opacidade × camada, stroke, dash, ícone, tamanho, rotação, rótulo).
- Ícones SVG de marcador (reaproveitar `mapa_pontos_shapes.ts`).
- Patching in-place em vez de recriar camadas.
- Normalização de coordenadas (`[lat,lng]`, `{lat,lng}`, `{latitude,longitude}`, NaN/Infinity, anel duplicado, multianel).
- Rótulos permanentes (nome, categoria, área em ha, extensão).
- Entrega: `renderFeatures/addFeature/updateFeature/removeFeature` na API do componente.

## Fase 3 — Seleção e popup de feição — CONCLUÍDA (feições genéricas)

Implementada em `feature_selecao.ts`, `feature_caixa.ts`, `feature_popup.ts`, `renderers/feicoes_renderer.ts` (`aplicarSelecao`) e `cad-feicoes.ts`. Eventos: `cad-selecao` (sempre), `cad-feicao-selecionada` (só com ≤ 1), `cad-feicao-acao`. API: `selecionarFeicao(s)`, `alternarSelecaoFeicao`, `limparSelecaoFeicoes`, `obterFeicoesSelecionadas`, `zoomParaFeicao`, `fecharPopupFeicao`, `definirMargensPopup`.

Decisões e pendências:
- Ctrl/Cmd/Shift+clique no vazio **não** limpa mais a seleção (modo aditivo), vale também para os pontos antigos.
- Clique em marcador DOM (ícone/texto) não é mais repassado às feições do canvas por baixo.
- Os pontos antigos (`ui-ponto-selecionado`, popups de ponto) **não** foram migrados para o popup de feição; seguem como estão. A migração deles fica para a Fase 8, junto com os consumidores.
- Zoom do popup é a versão simples; `zoomToFeatures`, `fitAll`, `fitLayer` ficam na Fase 7.

- Seleção única e múltipla; `onFeatureSelected` só com ≤ 1 feição.
- Caixa Window/Crossing seleciona qualquer feição, com narrow-phase geométrico real.
- Visual de seleção, com lotes quando passa de 150 mudanças.
- Popup único sob demanda (métricas, atributos, ações) com auto-pan que desvia dos painéis.
- Migrar `ui-ponto-selecionado` e popups de ponto sem quebrar o consumo atual.
- Entrega: reativar a caixa de seleção hoje desligada.

## Fase 4 — Desempenho — CONCLUÍDA

Implementada em `feature_indice.ts`, `feature_simplificacao.ts`, `feature_cluster.ts` e no `renderers/feicoes_renderer.ts` (que agora guarda todas as feições numa loja e só materializa como camada Leaflet as que estão perto da tela).

Decisões:
- **Índice próprio, sem `rbush`**: a biblioteca não tem dependências de runtime, então o índice é uma R-tree empacotada (STR) com delta para inserção/atualização/remoção, remontada quando o delta passa de 10%. Consulta validada contra força bruta.
- Até 300 feições: tudo carregado. Acima: consulta o índice com a viewport + 75% de folga (selecionadas sempre entram).
- Clusters: grade absoluta de 55 px (não "dança" ao arrastar), cache por revisão dos dados + zoom, desmembra a partir do zoom 17 ou com ≤ 8 pontos na camada; selecionados saem do cluster e voltam ao desmarcar. Clique no cluster dá `fitBounds` com folga; tooltip "N feições agrupadas".
- Simplificação Douglas-Peucker (iterativa) só abaixo do zoom 12 e só para o desenho; só redesenha quando o zoom muda e algum dos lados é < 12.
- Medido no playground: 100 mil pontos entram em ~0,5 s (42 camadas Leaflet/clusters na tela); 300 linhas de 2000 vértices a 2 vértices no zoom 10. Reduzir o zoom com 600 mil vértices leva ~1 s (cache de simplificação por zoom é uma otimização possível, hoje não necessária).
- Meta usada: 100 mil feições (mesma do MapEngine).

- Índice espacial (`rbush`), validado com 100 mil feições.
- Culling por viewport (tudo até 300 feições; acima, buffer de 75%).
- Clusters de pontos (grade de 55 px, desmembra a partir do zoom 17; selecionados e em edição ficam fora).
- Simplificação Douglas-Peucker por zoom, não destrutiva.
- Agendamento em `requestAnimationFrame` e cache por revisão e zoom.

## Fase 5 — Snapping e edição de vértices — CONCLUÍDA

Implementada em `feature_snap.ts` (motor puro), `feature_edicao_ops.ts` (operações puras), `feature_editor_vertices.ts` (editor Leaflet + HUD `#cm-vertex-edit-hud`), `components/ui-canvas-cad/cad-snap.ts` (estado/teclado) e `cad-feicoes.ts`.

- **Snap**: vértice > ponto médio > aresta, tolerância 10 px, candidatas vindas do índice espacial das camadas de feições visíveis. `S` e o botão da barra alternam; `Alt` desliga só enquanto segurado (e é solto ao perder o foco da janela). Marcador visual `cm-snap`. API: `definirSnap`, `alternarSnap`, `snapLigado`.
- **Edição**: ponto (1 alça), linha e polígono de um anel (alça por vértice, fantasmas nos pontos médios que inserem ao clicar, botão direito exclui; mínimos 3 e 2). Recusas viram `cad-edicao-recusada` com motivo: `bloqueada` (feição ou camada), `tipo-nao-suportado` (círculo/texto), `poligono-com-furos` (vai para a tabela de vértices), `muitos-vertices` (> 5000 alças).
- **Fluxo**: botão "Vértices" do popup ou `editarVertices(camadaId, id)`. Esc, clique no vazio ou "Concluir" encerram (Esc na edição só encerra; o segundo Esc limpa a seleção). Selecionar outra feição, remover a feição ou apagá-la encerra. O popup fecha durante a edição e volta ao concluir.
- **Eventos**: `cad-edicao-iniciada`, `cad-edicao-concluida`, `cad-edicao-recusada`, `cad-feicao-atualizada` (fim de cada gesto), `cad-snap`.
- A pré-visualização durante o arrasto remenda só a camada Leaflet da feição (`previsualizar`), sem tocar nos dados nem no índice; a gravação acontece no fim do gesto.
- O `magnetSnap` antigo (`MapaConfiguracoes`) não foi removido nem ligado: ficou sem uso e sai na Fase 8.

- Snap por índice espacial (vértice, ponto médio, aresta) no lugar do `magnetSnap`; `Alt` desliga, `S` alterna, marcador visual.
- VertexEditor: alça por vértice, alças-fantasma nos pontos médios, botão direito exclui (mínimos 3 e 2), HUD ao vivo.
- Recusar polígonos com furos ou multipartes; respeitar `locked`.

## Fase 6 — Ferramentas de desenho e medição — CONCLUÍDA

Implementada em `feature_desenho.ts` (máquina de estados pura), `feature_desenho_controle.ts` (mouse/teclado, prévia, HUD `#cm-draw-hud`, snap), `feature_algoritmos.ts`, `feature_amostra.ts`, `components/ui-canvas-cad/cad-ferramentas-barra.ts` e `cad-feicoes.ts`.

- **As 11 ferramentas** (a lista não constava no trecho da especificação que recebi; esta é a escolha feita, fácil de ajustar em `FERRAMENTAS`): `ponto`, `linha`, `poligono`, `retangulo`, `circulo`, `texto`, `caneta` (Bézier), `medir-distancia`, `medir-area`, `dividir`, `conta-gotas`.
- **Camada de desenho**: não existe padrão. `definirCamadaDesenho(id)` é obrigatório para as ferramentas que criam feições (recusa com `sem-camada`, `camada-invalida` ou `camada-bloqueada`); a camada é criada na primeira feição. Medir, dividir e conta-gotas não precisam dela.
- **Barra de ferramentas**: opcional, só aparece com o atributo `ferramentas` (`"todas"` ou lista). Sem o atributo, as ferramentas ficam só na API.
- **Teclado**: Enter ou duplo clique conclui; Backspace/Ctrl+Z desfaz o último vértice; Esc cancela o desenho em andamento e, sem nada em andamento, desativa a ferramenta. Snap vale no desenho (S, Alt, botão).
- **Caneta**: clicar e arrastar cria a alça de saída (a de entrada é o espelho); a curva cúbica é amostrada em 16 pontos por trecho. `definirFerramenta('caneta', { fechar: true })` gera polígono.
- **Medição**: rótulo por trecho, total no HUD e evento `cad-medicao` (distância; área + perímetro). Nada é criado.
- **Dividir**: alvo = polígonos selecionados; sem seleção, o primeiro polígono (camada visível, interativa, desbloqueada) que a linha corta. Partes recebem id `<id>-1`, `<id>-2`… e herdam estilo e propriedades.
- **Conta-gotas**: copia traço, preenchimento, espessura, opacidade e tracejado da feição sob o clique para o estilo de desenho (`definirEstiloDesenho`/`obterEstiloDesenho`).
- **Algoritmos** (projeção local equiretangular; servem para glebas, não para escala continental): `dividirPoligonoComLinha` (várias travessias; sem furos), `juntarLinhas` (encadeia, inverte, ponte dentro da tolerância), `juntarPoligonos` (**ponte** entre vértices próximos; recusa bordas que se cruzam, ou seja, **não** faz união booleana de áreas sobrepostas), `gerarBuffer` (meia-esquadria; pode se auto-intersectar em polígono côncavo com distância grande), `deslocarGeometria`, conversões de comprimento/área (alqueire paulista = 24.200 m²), `ddParaDms`/`dmsParaDd`, `pontoNoPoligono`.
- **API do componente**: `definirFerramenta`, `ferramentaAtiva`, `definirCamadaDesenho`, `definirEstiloDesenho`, `limparMedicao`, `gerarBuffer`, `duplicarFeicao`, `juntarFeicoes`.
- **Eventos**: `cad-ferramenta`, `cad-feicao-criada`, `cad-medicao`, `cad-desenho-recusado`, `cad-feicao-dividida`, `cad-divisao-falhou`, `cad-conta-gotas`, `cad-feicao-unida`, `cad-uniao-falhou`.
- Com uma ferramenta ativa, o clique numa feição não seleciona, o mouse não inicia caixa de seleção e os marcadores DOM ficam transparentes ao clique (para o desenho passar por cima).

- As 11 ferramentas, caneta Bézier e medição, em máquina de estados (Esc, desfazer, concluir).
- Integração com snap e estilo ativo.
- Algoritmos espaciais (split, join, buffer, offset, DD ⇄ DMS, unidades).
- Decidir se ficam no componente ou em módulo à parte.

## Fase 7 — Versões de geometria e colaboração — CONCLUÍDA

Implementada em `feature_versoes.ts`, `feature_cursores.ts` e `cad-feicoes.ts`.

- **Oficial × prévia**: `status` (ou `propriedades.status`/`tipo_geometria`: previa, preview, rascunho, draft, proposta) e `entidadeId` (campo ou propriedade) agrupam as versões; sem `entidadeId` a feição é a própria entidade. A oficial sempre aparece; a prévia só aparece se a entidade não tem oficial, ou se foi pedida (global: `definirPreviasGlobais`/`alternarPreviasGlobais`; individual: `alternarPrevia` + `previaSolicitada`). Prévia mostrada ao lado da oficial é desenhada tracejada. A regra vale para desenho, clusters, caixa de seleção, hover, snap, divisão e enquadramento; prévia escondida sai da seleção. Evento `cad-previas`.
- **Cursores remotos**: `atualizarCursorRemoto`, `removerCursorRemoto`, `limparCursoresRemotos`; ícone com nome (`textContent`) e cor (só `#hex`; qualquer outra vira cinza).
- **Câmera**: `zoomParaFeicao` (ponto voa até z ≥ 17; demais `fitBounds` com folga de 60 px e `maxZoom` 18), `zoomParaFeicoes`, `ajustarTudo`, `ajustarCamada`; todos ligam a camada oculta e a prévia escondida.
- **Hover e menu de contexto**: `cad-feicao-hover` (uma checagem por quadro, só quando a feição muda) e `cad-feicao-menu` (botão direito). Ficam quietos durante arrasto, edição de vértices e ferramentas.
- Correção feita no caminho: a seleção visual do renderizador passou a ser guardada por definição de camada (antes era por id, o que misturaria dois componentes com camadas de mesmo id).


## Fase 8 — Consolidação — CONCLUÍDA (no que está neste repositório)

- Hooks do MapEngine (`onSplitFailed`, `onFeatureSplit`, `onEyedropperSampled`, `onSnappingChange`...) viraram eventos: tabela completa em `docs/canvas-cad-eventos.md`.
- Guia de migração com a equivalência método a método e exemplo: `docs/guia-migracao-mapengine.md`.
- README do módulo, README raiz e CHANGELOG atualizados; `MapaConfiguracoes.magnetSnap` marcado `@deprecated` (sem efeito; não foi removido para não quebrar quem o grava na configuração salva).
- Demo no playground (card "Mesa CAD") com feições de exemplo, ferramentas, prévias, cursor remoto e enquadramento.

Fora deste repositório (código do app GerenciGeo): trocar as chamadas nos consumidores (`AppComponentsBuilder`, `AppBootstrapSync`, `AppGeometryCoordinator`, `AppModalsBuilder`, `FeatureSyncController`, `ProjectActionsController`, `ShortcutsController`, `ContextMenu`, `AdvancedSearchPanel`, `FeaturePropertiesAdapter`, `MapImageExporter`) e só então remover o `MapEngine` antigo. O guia de migração é o roteiro. O popup/eventos dos pontos antigos (`ui-ponto-selecionado`) continuam como estão, por decisão: as duas APIs convivem.

## Dependências e riscos

| Fase | Depende de | Risco principal |
|---|---|---|
| 0 | — | Modelo de `Feature` mal definido contamina tudo |
| 1 | 0 | Baixo |
| 2 | 0 | Divergência entre camadas atuais e genéricas |
| 3 | 1, 2 | Caixa de seleção sobre feições genéricas |
| 4 | 2 | Regressão de desempenho com muitos canvases |
| 5 | 4 | Snap lento sem o índice |
| 6 | 5 | Escopo grande |
| 7 | 2, 3 | Baixo |
| 8 | todas | Migração dos consumidores |

Fases 1 e 2 podem andar em paralelo; 3 e 4 também, após a 2.

## Decisões registradas

- **Coordenada (0, 0)**: `parseCoordenada` rejeita (0, 0) exato como placeholder de erro, e os adaptadores/`normalizarFeicaoEntrada` herdam isso. Quem tem dados reais ali liga `aceitar-origem` (2.1.0); o padrão continua rejeitando.
- **Sem camadas genéricas pré-carregadas**: o componente não cria camadas de feições por conta própria. O usuário final (quem consome o componente) decide se quer e quais camadas existem, criando-as pela API (`definirFeicoes` etc.). Camadas só surgem sob demanda.

## Pontos em aberto (todos resolvidos)

1. ~~Camadas atuais convivem com as genéricas?~~ Resolvido: camadas de feições existem só se o consumidor as criar.
2. ~~`SpatialAlgorithms`~~ Resolvido: reimplementados aqui, sem dependências (`feature_algoritmos.ts`), com as limitações listadas na Fase 6.
3. ~~Meta de desempenho~~ Resolvido: 100 mil feições.

## Fase 9 — Pendências da integração com o app (2.1.0) — CONCLUÍDA

Tudo opt-in; detalhes no `CHANGELOG.md` (2.1.0) e em `docs/guia-migracao-mapengine.md`.

- Inicialização síncrona (`inicializarAgora`) e atributos para esconder os padrões do kit (`sem-camadas-padrao`, `sem-painel-camadas`, `sem-barra-rapida`, `sem-atalho-snap`); `definirEstilosExternos`.
- Margens dos HUDs (`definirMargensHud`, `--cad-hud-*`), mesma regra para desenho e edição.
- Linha multiparte como extensão de `LineString` (`partes`); recusas com motivo `multiparte` na edição, junção e divisão.
- `aplicarLote`, ordem preservada na substituição, `substituirPropriedades`; renderizador incremental (100 mil feições: ~0,5 ms por edição, `docs/desempenho-feicoes.md`).
- `Feicao.oculta` ≠ `excluida`; selo de texto e contorno de ponto; régua com área/perímetro, raio mínimo do círculo, `cad-texto-solicitado`, opção de cópia do popup, garantias de ordem dos eventos das ferramentas; `aceitar-origem`.
