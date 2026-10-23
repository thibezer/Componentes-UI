# Relatório final — motor das formas (2.9.0)

Fechado em 2026-10-23 com a conferência manual e o benchmark na máquina do dono (GPU, Chrome 155). Origem do trabalho:
`PROMPT_MOTOR_FORMAS_KIT.md`. Branch `feat/motor-formas`. A 2.9.0 também junta a 2.8.2, publicada a partir de uma base
antiga (ver o CHANGELOG).

## Resumo

`<ui-canvas-cad>` ganhou um segundo caminho de desenho das feições, opt-in: `renderizador="canvas"`. Um motor sem DOM
(`src/gerencigeo-canvas/motor/`) decide o que desenhar e um pintor Canvas 2D pinta, sem um objeto Leaflet por feição. O padrão
continua `leaflet`. Mesma API pública, mesmos eventos, mesmos dados. O motor também sai sozinho em
`@thibezer/ui-components-kit/motor`, sem Leaflet.

Na máquina com GPU, o caminho canvas fica de **2 a 6 vezes** abaixo do leaflet em todos os tamanhos medidos (1 mil a 100 mil,
zooms 12/15/18), e as operações pontuais em lote caem uma ordem de grandeza (selecionar 2 000 feições numa camada de 50 mil:
114 contra 1 316 ms). As metas absolutas do prompt para a mudança de vista em zoom 12 **não foram atingidas**: 20 mil em
90–222 ms (meta 60), 50 mil em 224–300 ms (meta 100), 100 mil em 218–375 ms (meta 200). O padrão continua `leaflet` (Fase 4
não feita).

## Por fase

### Fase 0 — benchmark e caracterização
- **Mudou:** `bench/bench-formas.html` (dados sintéticos com semente fixa, rAF por canal de mensagens, `getImageData` para
  esperar a rasterização) e `tests/feicoes-caracterizacao.test.ts` (régua do comportamento do caminho Leaflet).
- **Depois:** o bench ganhou medições intercaladas (`__bench.intercalado`, `__bench.limites`, `__bench.protocoloGPU`) e
  botões; rodadas separadas variaram até 2× nesta máquina, só a intercalada compara.

### Fase 1 — ganhos no caminho Leaflet
- **Mudou:** LOD por diagonal em px (feição < 3 px vira marca de 1–2 px), seleção incremental (O(mudanças)), simplificação em
  px abaixo do zoom 17, clique em marca pelo hit-test central, regra do `check-layers` para módulos puros.
- **Números:** selecionar 1 feição em 100 mil: ~60 → 6–9 ms síncronos. Camadas Leaflet com polígonos pequenos: −25% a −86%
  conforme o tamanho.
- **Correções (Regra #0):** `feicaoNoPonto` estourava a pilha em anel enorme; zoom `NaN` colapsava geometrias; uma feição
  recusada pelo Leaflet derrubava a camada inteira.

### Fase 2 — motor headless
- **Mudou:** `MotorFormas` (`listaDesenho`, `listaSobreposicao`, `consultarCaixa`, seleção, prévia, destaque, clusters), estilo
  resolvido compartilhado, geometria em `Float64Array`, entrypoint `/motor`. Testado em Node, sem DOM.
- **Números (Node, 100 mil):** lista da vista em zoom 12 ~140 ms por mudança de vista (era ~390–450 antes do cache de marcas);
  faixa do pan em zoom 15 ~4,5 ms; hover (`consultarCaixa`) 0,05 ms em média.

### Fase 3 — renderizador Canvas e ponte Leaflet
- **Mudou:** `PintorCanvas2D`, `CanvasFormas` (pan incremental, canvas em branco intocado, repintura com poucos itens),
  ponte com marcadores DOM e curvas, despachante pelo atributo `renderizador`, `estatisticasFeicoes()`.
- **Números (sem GPU, intercalado, canvas / leaflet, ms):** ver `docs/desempenho-feicoes.md`, item 3. Selecionar 2 000 feições
  (20 mil na camada): 12–24 contra 67–185 ms síncronos.
- **Ajustes de desempenho achados medindo:** item da marca em cache por zoom (lista 389 → 137 ms no Node); canvas em branco não
  é mais tocado no pan (piso 130 → 30 ms); camada com até 500 itens repinta em vez de deslocar o bitmap (1 mil formas em
  zoom 12: ~200 → ~60 ms).

### Fase 4 — trocar o padrão para `canvas`
- **Não feita.** O padrão continua `leaflet`. Depende da conferência manual e do benchmark com GPU abaixo.

## Decisões

- **Um canvas por camada + uma sobreposição por mapa**, não 2 canvases no total: mantém z-order, opacidade de grupo e
  visibilidade pelo pane da camada, como no caminho Leaflet, sem composição fora da tela.
- **Forma a forma por grupo de estilo**, não um `stroke` combinado: o caminho combinado era patológico no Canvas 2D (segundos)
  e o forma a forma preserva o escurecimento de preenchimentos translúcidos sobrepostos.
- **Coordenadas projetadas em cache** no lugar de `Path2D` (o ambiente de teste não tem `Path2D`).
- **Pan incremental medido em pixels de mundo** (os pontos de camada do Leaflet mudam a cada `viewreset`).
- **Limite de repintura 500 itens por camada**, escolhido por medição intercalada sem GPU (repintar ganha 3–5× até ~200,
  empata ~650, perde de ~1 500). Com GPU o equilíbrio fica mais baixo: repintar ainda ganha com poucos itens (~10 por camada:
  2 contra 25–26 ms em zoom 18) mas a ~180 por camada deslocar já sai um pouco melhor (67–86 contra 90–96 ms). **Mantido em
  500**: com GPU a diferença nessa faixa é de ~15–20 ms; sem GPU, repintar é 3× melhor. Ajustável em
  `CanvasFormas.limiteRepintar`.

## O que não deu (pendências conhecidas)

- Curvas Bézier continuam como objetos Leaflet (`LinhaCurva`/`PoligonoCurvo`).
- Ícone, texto, cluster e rótulo continuam marcadores DOM.
- A sobreposição ignora a opacidade da camada: a seleção aparece sempre cheia (aceito na conferência manual).
- Painel `ui-camadas` (virtualização, `atualizarContagens`) não foi tocado; é item separado do prompt.
- Fase 4 não feita.

## Conferência manual (`/bench/conferencia-canvas.html`)

Feita pelo dono em 2026-10-23, na máquina com GPU: **todos os itens do roteiro conferem**, e o caminho canvas ficou
visivelmente mais rápido que o leaflet.

| Item | Resultado |
|---|---|
| Animação de zoom | ok |
| Zoom com volume (20 mil) | ok |
| Pan (cena e 50 mil) | ok |
| Edição de vértices | ok |
| Edição + zoom/pan | ok |
| Popup sob demanda | ok |
| Popup automático / desligado | ok |
| Camada com opacidade < 1 | ok |
| Seleção em camada translúcida | ok (seleção cheia aceita) |
| Ícone, texto, círculo, curva | ok |
| Mesma aparência nos dois caminhos | ok |

## Benchmark com GPU (`/bench/bench-formas.html`, "Protocolo completo")

Máquina do dono, Chrome 155, 2026-10-23. Mediana em ms de cada volta, configurações alternadas, 2 voltas.

**Canvas (limiteRepintar = 500) × leaflet:**

| Formas | zoom | itens/camada | canvas | leaflet |
|---|---|---|---|---|
| 1 000 | 12 | 182 | 58, 64 | 247, 197 |
| 1 000 | 15 | 32 | 54, 71 | 211, 171 |
| 1 000 | 18 | 0 | 4, 4 | 195, 151 |
| 20 000 | 12 | 3 055 | 90, 222 | 473, 676 |
| 20 000 | 15 | 651 | 85, 194 | 428, 511 |
| 20 000 | 18 | 12 | 60, 71 | 115, 123 |
| 50 000 | 12 | 7 556 | 300, 224 | 1 418, 1 362 |
| 50 000 | 15 | 1 558 | 285, 325 | 1 251, 1 145 |
| 50 000 | 18 | 31 | 91, 96 | 220, 280 |
| 100 000 | 12 | 15 056 | 375, 218 | 977, 1 003 |
| 100 000 | 15 | 2 930 | 166, 197 | 811, 1 652 |
| 100 000 | 18 | 60 | 94, 109 | 328, 388 |

**Operações pontuais (síncrono, ms, canvas / leaflet):**

| Operação | 20 mil | 50 mil | 100 mil |
|---|---|---|---|
| selecionar 1 | 0,6 / 1,3 | 9,4 / 16,3 | 8,1 / 20,5 |
| selecionar 2 000 | **13** / 242 | **114** / 1 316 | **47** / 398 |
| limpar 2 000 | **1,7** / 212 | **22** / 1 355 | **4,4** / 385 |
| ocultar camada | 2,2 / 42 | 87 / 271 | 17 / 144 |
| exibir camada | 38 / 257 | 1 169 / 1 606 | 207 / 350 |

**Limite de repintura (sempre desloca / sempre repinta / leaflet):**

| Formas | zoom | itens/camada | desloca | repinta | leaflet |
|---|---|---|---|---|---|
| 1 000 | 12 | 182 | 67, 86 | 96, 90 | 230, 249 |
| 1 000 | 18 | 10 | 26, 25 | 2, – | 197, 228 |
| 20 000 | 12 | 3 055 | 171, 81 | 454, 212 | 347, 501 |
| 50 000 | 12 | 7 556 | –, 226 | 1 124, 473 | 1 202, 502 |
| 100 000 | 12 | 15 056 | 238, 408 | 936, 3 231 | 2 696, 2 725 |
| 100 000 | 15 | 2 930 | 191, 507 | 620, 1 599 | 2 155, 2 069 |

Nessa rodada algumas células saíram com **0 ms** (por exemplo 50 mil em zoom 12, "sempre desloca", primeira volta), o que não
é possível com desenho real: provavelmente a janela perdeu o foco ou ficou oculta naquele trecho e o navegador não pintou. Elas
aparecem como "–" acima e não entram na conclusão. A tabela completa, como saiu do bench, está no histórico da conversa de
fechamento.

## Como refazer as medições

1. `npm run dev` na worktree `motor-formas` e abrir `http://localhost:5173/bench/conferencia-canvas.html`. Seguir o roteiro da
   página nos dois renderizadores; preencher a tabela de conferência.
2. Abrir `http://localhost:5173/bench/bench-formas.html` numa janela visível, em foco, sem outras abas pesadas. Recarregar a
   página e clicar "Protocolo completo" (~20 min). Ao fim, "Copiar resultado" e colar na seção acima.
3. Na tabela "Limite de repintura", achar o "itens/camada" em que "sempre desloca" e "sempre repinta" empatam. Se ficar longe
   de 500, ajustar `CanvasFormas.limiteRepintar` em `src/gerencigeo-canvas/renderers/canvas_formas_leaflet.ts` (e o texto no
   CHANGELOG e em `docs/desempenho-feicoes.md`).
4. Rodar os gates e publicar (comandos no `docs/HANDOFF-motor-formas.md`; apagar `dist/` antes do build).
