# GerenciGeo CAD Canvas (Módulo Importado)

Este diretório contém a importação estruturada e desacoplada do ecossistema de mapa e canvas CAD do **GerenciGeo**, preparado para futura transposição para Web Components (`<ui-canvas-cad>` / `<ui-mapa>`).

---

## 🏛️ Arquitetura dos Módulos

```
src/gerencigeo-canvas/
├── types.ts                # Interfaces: Ponto, Segmento, BancoPonto, Confrontante, MapaConfiguracoes
├── utils.ts                # Sanitização e escape HTML (escapeHtml), formatadores
├── mapa_config.ts          # MapaConfigManager (Singleton localStorage gerencigeo_mapa_config)
├── mapa_pontos_shapes.ts   # Gerador de SVGs e formatos vetoriais (circle, cross, square, diamond, circle-dot)
├── mapa_core.ts            # Leaflet, Google Satélite, WMS SIGEF, arquitetura de Panes e Toolbar unificada
├── canvas_interacao.ts     # Mesa CAD: Pan na rodinha, Zoom Extents duplo-clique, Seleção Window/Crossing, ESC
├── mapa_linhas.ts          # Segmentos LA1/LN1, fechamento inteligente multi-matrícula, poligonal homologada
├── mapa_marcadores.ts      # Marcadores Rovers/PPP/Físicos, confrontantes vizinhos e polígonos WKT
├── mapa_controller.ts      # GerenciGeoMapaController (Orquestrador unificado)
├── canvas_styles.css       # Estilização completa: Popups compactos dark glass, toolbar, seleções, panes
├── index.ts                # Ponto de entrada e re-exportação pública
└── README.md               # Esta documentação
```

---

## 🧭 Pilares Técnicos Importados

### 1. Núcleo Cartográfico e Gerenciamento de Panes (`MapaCore`)
- **Instância Leaflet:** `preferCanvas: true`, `maxZoom: 24`, `scrollWheelZoom: true`, zoom em passos finos (`zoomSnap: 0.25`, `zoomDelta: 0.5`, `wheelPxPerZoomLevel: 90`; ver `zoom_opcoes.ts`).
- **Popups sob demanda (`popup_gate.ts`):** o clique seleciona e não abre popup nem move o mapa. O duplo clique sobre a camada (ou `abrirPopupFeicao`) abre, sem auto-pan. Modos `sob-demanda` (padrão), `automatico` (Leaflet original) e `desligado`; atributo `popups` do `<ui-canvas-cad>`.
- **Camadas Base:** Google Satellite Híbrido com controle de opacidade + WMS INCRA/SIGEF (`certificada_sigef_particular_pr`).
- **Arquitetura de Panes com Z-Index estrito:**
  - `sigefPane` (z-index: 390): WMS do acervo fundiário (abaixo das linhas do imóvel).
  - `perimetroPane` (z-index: 450): Linhas de divisas físicas e polilinhas temporárias.
  - `verticesPane` (z-index: 650): Marcadores de vértices clicáveis.
  - `overlayPane` (z-index: 650): Confrontantes e caixas de seleção.
- **Barra Unificada no Canvas:** Botão de Configurações (engrenagem) e Bússola Norte com função de recentralização.

### 2. Motor de Interações Estilo AutoCAD (`CanvasInteracao`)
- **Pan Dinâmico:** Botão do meio (Scroll Wheel Drag) com cursor `grabbing`.
- **Zoom Extents:** Duplo clique na rodinha do mouse (`< 300ms`) executa `fitBounds`. Só vale para dois cliques limpos: dois arrastes seguidos são pan e não enquadram.
- **Toque:** um dedo arrasta (pan); a pinça e o pan de dois dedos são do `touchZoom` do Leaflet (antes havia um segundo tratador que também dava zoom, de 1 em 1 nível).
- **Janelas de Seleção Retangular:**
  - **Window Selection (Esquerda $\to$ Direita):** Caixa Azul Sólida (`#06b6d4`) — apenas vértices 100% contidos.
  - **Crossing Selection (Direita $\to$ Esquerda):** Caixa Verde Tracejada (`#10b981`) — qualquer vértice interceptado.
- **Supressão de Cliques Indesejados:** Desativa temporariamente `pointer-events` nos panes de vértices durante arrasto de seleção.
- **Teclado:** Tecla `ESC` limpa a seleção ativa imediatamente; `Ctrl`/`Cmd` ativa seleção aditiva múltipla.

### 3. Renderizadores Vetoriais (`MapaLinhas` e `MapaMarcadores`)
- **Linhas (`mapa_linhas.ts`):**
  - `plotSegmentos`: Plota divisas reais com tipos de limites SIGEF (`LA1` verde contínuo, `LN1` azul tracejado).
  - `plotPolilinhaTemporaria`: Reconstrói e fecha automaticamente a poligonal $P_n \to P_{n+1} \to P_1$, com agrupamento inteligente por matrícula.
  - `plotPoligonalHomologada`: Plota o perímetro oficial registrado no SIGEF com marcadores âmbar (`H`).
- **Marcadores (`mapa_marcadores.ts` & `mapa_pontos_shapes.ts`):**
  - SVGs dinâmicos via código (`circle`, `cross`, `square`, `circle-dot`, `triangle`) com cores temáticas:
    - Rovers: `bg-mint-vibrant` (`#00f5a0`)
    - Bases PPP: `bg-indigo-500` (`#6366f1`)
    - Bases Físicas: `bg-rose-500` (`#f43f5e`)
  - Confrontantes vizinhos em roxo (`#a855f7`) com ações de "Integrar ao Levantamento" ou "Ocultar".

### 4. Configurações e Preferências (`MapaConfigManager`)
- Singleton persistido no `localStorage` (`gerencigeo_mapa_config`).
- Controla: espessuras das divisas e fechamento, estilos e tamanhos por tipo de marco (M, P, V), opacidade do satélite, mira/crosshair e snap magnético.

### 5. Estrutura DOM & CSS (`canvas_styles.css`)
- Suporte a `.map-container-wrapper` e `#mapa-triagem`.
- Suporte a splitters de redimensionamento (`.row-splitter`, `.col-splitter`) com `--table-area-h` e `--props-panel-w`.
- Responsividade via eventos `invalidateSize()`.

---

## Feições genéricas (migração do MapEngine)

Além de pontos/segmentos/vizinhos, o módulo trata **feições genéricas** (`Feicao`: Point, LineString, Polygon, Circle, Text).
Nada é criado por padrão: o consumidor escolhe as camadas (`definirFeicoes`). Plano, decisões e limitações:
[`docs/plano-migracao-canvas-cad.md`](../../docs/plano-migracao-canvas-cad.md). Equivalência de API:
[`docs/guia-migracao-mapengine.md`](../../docs/guia-migracao-mapengine.md). Eventos: [`docs/canvas-cad-eventos.md`](../../docs/canvas-cad-eventos.md).

| Arquivo | Papel |
|---|---|
| `feature_types.ts`, `feature_adapters.ts` | Modelo `Feicao`, normalização de coordenadas/anéis e adaptadores dos dados antigos |
| `renderers/feicoes_renderer.ts` | Desenho, atualização incremental, seleção visual, culling por viewport, clusters, simplificação por zoom |
| `feature_indice.ts`, `feature_cluster.ts`, `feature_simplificacao.ts` | R-tree (STR) sem dependências, agrupamento por grade de 55 px, Douglas-Peucker |
| `layer_hit_test.ts`, `feature_amostra.ts` | Hit-test unificado (tolerância em px, prioridade, alternância de cliques); feição sob um ponto |
| `feature_selecao.ts`, `feature_caixa.ts`, `feature_popup.ts` | Seleção única/múltipla, caixa Window/Crossing com toque geométrico real, popup único |
| `feature_snap.ts`, `feature_edicao_ops.ts`, `feature_editor_vertices.ts` | Snap (vértice > meio > aresta), operações de vértices, editor com alças e HUD |
| `feature_desenho.ts`, `feature_desenho_controle.ts`, `feature_algoritmos.ts` | 11 ferramentas, caneta Bézier, medição, divisão/junção/buffer/deslocamento, unidades, DD ⇄ DMS |
| `feature_versoes.ts`, `feature_cursores.ts`, `feature_metricas.ts` | Oficial × prévia, cursores remotos, áreas/comprimentos/formatação pt-BR |

Limitações conhecidas: contas geométricas em projeção local (glebas, não escala continental); polígonos com furos não são
editados nem divididos; a junção de polígonos usa ponte (não faz união booleana de áreas sobrepostas); a coordenada (0, 0)
exata é descartada (placeholder de erro, herdado de `parseCoordenada`).

---

## Web Component
O módulo é empacotado em `<ui-canvas-cad>` (`src/components/ui-canvas-cad`), que recebe `pontos` e `segmentos` por propriedades
e dispara `CustomEvent`s: `ui-ponto-selecionado`, `ui-camadas-alteradas` e os eventos `cad-*` das feições.
O evento global `gerencigeo:ponto-selecionado` (window) continua sendo emitido pela mesa CAD antiga.
