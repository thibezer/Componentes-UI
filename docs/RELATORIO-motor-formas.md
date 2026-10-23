# Relatório final — motor das formas (2.9.0)

Rascunho. Os campos marcados **[preencher]** dependem da conferência manual e do benchmark na máquina com GPU (passo a
passo na seção "Como fechar o relatório"). Origem do trabalho: `PROMPT_MOTOR_FORMAS_KIT.md`. Branch `feat/motor-formas`.

## Resumo

`<ui-canvas-cad>` ganhou um segundo caminho de desenho das feições, opt-in: `renderizador="canvas"`. Um motor sem DOM
(`src/gerencigeo-canvas/motor/`) decide o que desenhar e um pintor Canvas 2D pinta, sem um objeto Leaflet por feição. O padrão
continua `leaflet`. Mesma API pública, mesmos eventos, mesmos dados. O motor também sai sozinho em
`@thibezer/ui-components-kit/motor`, sem Leaflet.

Medido sem GPU, o caminho canvas fica de 2 a 8 vezes abaixo do leaflet de 50 mil formas para cima (100 mil em zoom 12:
~200–440 ms contra ~840–2 100 ms), de empate a ~1,5× em 20 mil, e não perde mais nos casos de poucas formas. As metas absolutas do prompt **[preencher: confirmadas ou
não na máquina com GPU]**.

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
  empata ~650, perde de ~1 500). **[preencher: confirmado ou ajustado com GPU]**

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

[preencher: colar aqui as duas tabelas que o botão "Copiar resultado" copia]

## Como fechar o relatório

1. `npm run dev` na worktree `motor-formas` e abrir `http://localhost:5173/bench/conferencia-canvas.html`. Seguir o roteiro da
   página nos dois renderizadores; preencher a tabela de conferência.
2. Abrir `http://localhost:5173/bench/bench-formas.html` numa janela visível, em foco, sem outras abas pesadas. Recarregar a
   página e clicar "Protocolo completo" (~20 min). Ao fim, "Copiar resultado" e colar na seção acima.
3. Na tabela "Limite de repintura", achar o "itens/camada" em que "sempre desloca" e "sempre repinta" empatam. Se ficar longe
   de 500, ajustar `CanvasFormas.limiteRepintar` em `src/gerencigeo-canvas/renderers/canvas_formas_leaflet.ts` (e o texto no
   CHANGELOG e em `docs/desempenho-feicoes.md`).
4. Rodar os gates e publicar (comandos no `docs/HANDOFF-motor-formas.md`; apagar `dist/` antes do build).
