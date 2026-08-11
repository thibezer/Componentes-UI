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
- **Instância Leaflet:** `preferCanvas: true`, `maxZoom: 24`, `scrollWheelZoom: true`.
- **Camadas Base:** Google Satellite Híbrido com controle de opacidade + WMS INCRA/SIGEF (`certificada_sigef_particular_pr`).
- **Arquitetura de Panes com Z-Index estrito:**
  - `sigefPane` (z-index: 390): WMS do acervo fundiário (abaixo das linhas do imóvel).
  - `perimetroPane` (z-index: 450): Linhas de divisas físicas e polilinhas temporárias.
  - `verticesPane` (z-index: 650): Marcadores de vértices clicáveis.
  - `overlayPane` (z-index: 650): Confrontantes e caixas de seleção.
- **Barra Unificada no Canvas:** Botão de Configurações (engrenagem) e Bússola Norte com função de recentralização.

### 2. Motor de Interações Estilo AutoCAD (`CanvasInteracao`)
- **Pan Dinâmico:** Botão do meio (Scroll Wheel Drag) com cursor `grabbing`.
- **Zoom Extents:** Duplo clique na rodinha do mouse (`< 300ms`) executa `fitBounds`.
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

## 💡 Próximos Passos (Web Component Shadow DOM)
Os módulos já estão totalmente desacoplados e prontos para serem encapsulados em `<ui-canvas-cad>` ou integrados ao `<ui-mapa>`, recebendo `pontos` e `segmentos` via atributos/propriedades e disparando `CustomEvents`:
- `gerencigeo:ponto-selecionado`
- `gerencigeo:recenter`
- `gerencigeo:abrir_configuracoes_mapa`
