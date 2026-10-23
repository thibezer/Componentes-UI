# Desempenho das camadas de feições

Meta do kit: camadas de **100 mil feições** com edição fluida. Esta página registra o que foi medido e o que mudou na 2.1.0.

## O que mudou

Antes, `adicionarFeicao`, `atualizarFeicao` e `removerFeicao` copiavam a lista inteira, e o renderizador diferenciava a
camada inteira contra a anterior (um `Set`, um `Map`, o índice de oficiais e, com pontos, o agrupamento em clusters
refeitos a cada edição). O custo era proporcional ao tamanho da camada.

Agora toda mudança passa por `aplicarLote` (as operações unitárias são lotes de um item) e o gerenciador manda ao
renderizador **só a diferença** (`mudadas` + `removidas`) junto com os dados:

- o índice espacial, a loja de feições e a contagem de oficiais são atualizados item a item;
- só as feições tocadas são recriadas ou remendadas na tela;
- os clusters de pontos são mantidos **por célula** (`AgrupadorCluster`): um ponto que entra, sai ou se move reavalia só
  as células afetadas;
- a busca por id é O(1) (índice de posições mantido pelo gerenciador), em vez de varrer a lista a cada consulta de
  seleção, popup ou edição;
- o renderizador desiste do caminho incremental e reconcilia a camada toda quando muda o **conjunto**: a regra oficial ×
  prévia (com prévias na camada), a entrada/saída do corte por viewport (300 feições) ou do agrupamento, ou quando a lista
  foi trocada por fora (`definirFeicoes`).

## Números (100 mil feições, uma camada)

Medidos em Node + happy-dom (sem GPU nem layout real; o custo de desenhar no navegador fica por conta do Leaflet e só
envolve as feições na tela). Máquina de desenvolvimento, valores em ms; use como ordem de grandeza.

| Operação | Pontos (zoom 16, com clusters) | Pontos (zoom 17) | Linhas | Polígonos |
|---|---|---|---|---|
| `definirFeicoes` (100 mil) | ~830 | ~480 | ~610 | ~610 |
| `atualizarFeicao` (1) | **0,5** | 0,3 | 0,5 | 0,3 |
| `adicionarFeicao` (1) | 3,9 | 1,1 | 2,6 | 2,2 |
| `removerFeicao` (1) | 3,0 | 1,9 | 2,2 | 2,2 |
| `aplicarLote` 1 000 atualizações | 29 | 14 | 15 | 23 |
| `aplicarLote` 5 000 mistos (1 000 remoções + 2 000 atualizações + 2 000 adições) | 98 | 33 | 39 | 58 |

Antes da mudança, na mesma camada: `atualizarFeicao` de **60 a 250 ms** (linhas ~60–100 ms, pontos ~230 ms) e
`removerFeicao` de **160 a 420 ms**. Uma edição passou de "proporcional à camada" a "milissegundos", com folga em relação
ao quadro de 16 ms (adicionar/remover custam um pouco mais porque copiam a lista de referências).

O que continua proporcional ao tamanho da camada: `definirFeicoes` (troca total), a primeira consulta por id depois de
uma **remoção** (o índice de posições é refeito sob demanda, numa varredura da lista) e a reconciliação completa que roda
quando o conjunto muda (mudança de zoom com clusters, regra de versões).

## Desenhar e reconciliar a vista (motor de formas, Fases 0 e 1)

Os números acima são de **dados** (Node + happy-dom, sem canvas). O que o operador sente com milhares de formas na tela é
o custo de **mudar a vista** (pan + reconciliação + redesenho dos canvases do Leaflet). Ele passou a ser medido no
navegador, em `bench/bench-formas.html` (`npm run dev`, depois `await __bench.rodar({ tamanhos: [20000], zooms: [12, 15, 18] })`).

**Metodologia.** Dados sintéticos com semente fixa: 50% polígonos de 14 vértices (63–90 m), 25% linhas de 8 vértices, 25%
pontos, 5 camadas, bloco de ~13 km, sem mapa base, canvas 1280×800. A mudança de vista é um `panBy` de 120 px (alternando o
sentido), com **redesenho forçado de forma síncrona**: `requestAnimationFrame` trocado por canal de mensagens (o painel
estrangula o rAF quando a janela perde o foco) e `getImageData` em cada canvas para esperar a rasterização. Mediana de 3–5
repetições depois de 2 de aquecimento. Colunas `camadas Leaflet` (`map._layers`) e `canvases` são contadores, sem ruído.

**Ressalva importante sobre ruído.** Medi com o painel do navegador escondido (sem GPU de verdade no raster) e a máquina
variando de carga: a mesma versão oscilou ±25% entre execuções (20 mil formas, zoom 12: 167–361 ms). Diferenças dentro dessa
faixa **não** são ganho nem perda. Os contadores (camadas Leaflet) e as operações pontuais são confiáveis; os tempos de vista
servem como ordem de grandeza e como comparação A/B na mesma sessão. O custo de pintura é maior em máquina com GPU
(medição do app: ~1,4 s para 20 mil formas em zoom 12), e esta tabela deve ser refeita lá.

**Antes (2.8.1, caminho Leaflet puro), mediana em ms, `__bench`:**

| Formas | zoom 12 | zoom 15 | zoom 18 | camadas Leaflet (z12) |
|---|---|---|---|---|
| 1 000 | 29 | 22 | 16 | 932 |
| 5 000 | 58–115 | 43–82 | 14 | 4 029 |
| 20 000 | 155–191 | 111–126 | 22–66 | 15 293 |
| 50 000 | 614–715 | 441–583 | 59–116 | 37 794 |
| 100 000 | 1 241 | 932 | 115 | 75 295 |

**Depois da Fase 1 (LOD em px, seleção incremental, simplificação em px), mesma metodologia:**

| Formas | zoom 12 | zoom 15 | zoom 18 | camadas Leaflet (z12) |
|---|---|---|---|---|
| 1 000 | 34 | 20 | 17 | 742 |
| 5 000 | 75–95 | 57 | 12–15 | 3 102 |
| 20 000 | 167–206 | 129–169 | 21–77 | 11 513 |
| 50 000 | 464–635 | 535–597 | 63–125 | 28 302 |
| 100 000 | 1 252 | 793 | 95 | 56 184 |

Leitura honesta: com a diagonal de **3 px** como limite, só ~40% dos polígonos deste gerador (diâmetro de 63 a 90 m, diagonal
da caixa de 89 a 127 m, contra ~105 m = 3 px em zoom 12 a 23,5° S) ficam abaixo dele. Por isso as camadas Leaflet caem
**25%** (15 293 → 11 513) e o tempo de vista fica dentro do ruído. O ganho depende de quanto da camada é pequeno na
tela. Com polígonos de ~50 m (`raioPoligonoM: 25`, diagonal ~70 m, todos abaixo de 3 px em zoom 12), as camadas Leaflet
caem **86%** (15 293 → 2 116) e a mudança de vista de 20 mil formas em zoom 12 cai de ~280 ms para ~160 ms (A/B na mesma
sessão, duas rodadas cada).

**Onde está o resto do custo.** Medido em 20 mil formas, zoom 12 (~190 ms): `panBy` é síncrono por ~80 ms (os canvases do
Leaflet reprojetam e repintam todas as camadas vetoriais no `moveend`), a nossa reconciliação soma ~45 ms (5 camadas × ~9 ms)
e o redesenho agendado pelo Leaflet no quadro seguinte, ~70 ms. Ou seja, cerca de 80% do tempo é o Leaflet pintando objetos
por feição: só tirar objetos da tela (LOD) ou sair do Leaflet mexe nesse custo. Sair do Leaflet é o renderizador Canvas
(seção seguinte): um canvas por camada e coordenadas projetadas em cache no lugar de `Path2D`.

**Operações pontuais** (tempo **síncrono** da chamada, ms; antes → depois):

| Operação | 20 mil | 50 mil | 100 mil |
|---|---|---|---|
| selecionar 1 feição | 5–8 → **1–2** | 24–31 → **2** | 60 → **6–9** |
| limpar a seleção de 1 | 5,5 → **0,3** | 30 → **0,2** | 115 → **0,5** |
| selecionar 2 000 | 104–190 → 122–165 | 400–430 → 156–221 | 766 → 425–533 |
| limpar 2 000 | 73–108 → 102–158 | 357–474 → 278–400 | 732 → 428 |

`aplicarSelecao` deixou de reconciliar a camada inteira (era O(visíveis)): selecionar/limpar 1 feição é O(1) em relação ao
tamanho da camada, e só troca o estilo (`setStyle`/`setIcon`, sem `setLatLngs`). Selecionar muitas ainda é O(mudanças) com
custo do Leaflet por forma (meta de 30 ms para 2 000 fica para o renderizador Canvas). Meta da Fase 1 de "selecionar 1 feição
≤ 20 ms síncronos": **cumprida** (1–9 ms aqui). A meta de "20 mil formas, zoom 12, mudança de vista ≤ 250 ms" **não pôde ser
confirmada nesta máquina** (ver o ruído acima): ela depende de o app ter polígonos pequenos o bastante para o LOD pegar.

`tests/feicoes-desempenho.test.ts` ganhou orçamentos para o LOD (20 mil polígonos de 40 m em zoom 12 = 20 mil marcas e zero
objetos Leaflet; pan sem reavaliar o LOD) e para a seleção (1 feição sem `reconciliar`; custo igual com 2 mil ou 20 mil).

## Renderizador Canvas (motor de formas, Fases 2 e 3)

Com `renderizador="canvas"`, as camadas de feições deixam de ter um objeto Leaflet por feição: o motor
(`src/gerencigeo-canvas/motor/`) monta a lista de desenho da vista e o `PintorCanvas2D` a pinta num canvas por camada, com
**pan incremental** (o bitmap é deslocado e só as faixas expostas são listadas e pintadas). Arquitetura em
[`docs/motor-formas.md`](motor-formas.md). Mesma metodologia e mesmo gerador da seção anterior.

**Primeira rodada (painel do navegador escondido, máquina mais folgada), A/B na mesma sessão, mediana em ms:**

| | Leaflet | Canvas |
|---|---|---|
| 20 mil, zoom 12, mudança de vista | 229–250 | **48–61** |
| 50 mil, zoom 12 | 598–667 | **98–148** |
| 50 mil, zoom 15 | 419–476 | **107–117** |
| selecionar 1 (síncrono) | 1–2 | <1 |
| selecionar 2 000 (síncrono, 20 mil) | 182 | 14 |
| exibir camada (síncrono, 20 mil) | 254 | 112 |

**Rodada final (versão final, painel visível, máquina carregada), canvas × leaflet na mesma sessão, mediana em ms.** Nesta
rodada há um **piso de ~100 ms** que não é desenho: 1 000 formas em zoom 18, com zero itens pintados, já custam 95–130 ms no
caminho canvas. Os valores absolutos estão inflados; vale a razão entre as colunas e os contadores. (Depois explicado e
corrigido: o piso era do próprio caminho canvas, que tocava canvases em branco a cada pan; ver "Otimização" abaixo.)

| Formas | zoom 12 (canvas / leaflet) | zoom 15 | zoom 18 | camadas Leaflet z12 (canvas / leaflet) | canvases |
|---|---|---|---|---|---|
| 1 000 | 184 / 323 | 117 / 255 | 131 / 239 | 79 / 742 | 6 / 20 |
| 20 000 | **143** / 396 | **164** / 470 | **95** / 229 | 275 / 11 513 | 6 / 20 |
| 50 000 | **234** / 548 | **223** / 715 | **101** / 535 | 290 / 28 302 | 6 / 15 |
| 100 000 | **298** / 844 | **266** / 1 382 | **170** / 643 | 291 / 56 184 | 6 / 15 |

As "camadas Leaflet" que sobram no caminho canvas são os marcadores DOM (pontos com ícone, clusters) e o próprio mapa; os
6 canvases são um por camada (5) mais a sobreposição de seleção.

**Operações pontuais da rodada final** (tempo **síncrono** da chamada, ms, canvas / leaflet):

| Operação | 20 mil | 50 mil | 100 mil |
|---|---|---|---|
| selecionar 1 feição | 0,8 / 2,2 | 8 / 6,6 | 8,9 / 5,1 |
| selecionar 2 000 | **24** / 185 | **37** / 471 | **78** / 219 |
| limpar 2 000 | **3,8** / 309 | **9** / 389 | **9,8** / 526 |
| ocultar camada | 4,7 / 37 | 38 / 290 | 18 / 155 |
| exibir camada | 228 / 67 | 216 / 606 | 324 / 702 |

"Exibir camada" com 20 mil saiu pior no canvas nesta rodada (228 contra 67 ms), ao contrário da primeira (112 contra 254):
exibir lista e pinta a vista inteira de uma vez e fica perto do piso de ruído; precisa ser medido de novo antes de concluir.

O tempo "total" (até a rasterização) das operações pontuais não entra na tabela: nesta rodada ele tem picos de 0,5–1,8 s nos
**dois** caminhos logo depois de "selecionar 1". Isolado no navegador (100 mil feições, zoom 14, 3 seleções seguidas, com e
sem painel de camadas), a tarefa longa de ~600 ms aparece em uma seleção qualquer e não em todas, nos dois casos: é coleta de
lixo depois de gerar e carregar 100 mil objetos, não custo da seleção.

**Metas do prompt** (vista com zoom 12: 20 mil ≤ 60 ms, 50 mil ≤ 100 ms, 100 mil ≤ 200 ms): atingidas na primeira rodada para
20 mil e no limite para 50 mil; **não confirmadas** na rodada final por causa do piso de ~100 ms. Nas duas, o caminho canvas
fica 2,3–5× abaixo do leaflet. A tabela deve ser refeita numa máquina com GPU e sem carga (a do app).

**Motor puro em Node** (`tests/feicoes-desempenho.test.ts`, sem canvas, 100 mil quadrados de 40 m num bloco de 13 km; medido
nesta máquina, os orçamentos do teste têm folga de 10× ou mais para a suíte em paralelo):

- `listaDesenho` da vista inteira em zoom 12 (100 mil marcas): ~650 ms na primeira vista (projeta e avalia o LOD de tudo),
  **~140 ms** por mudança de vista (eram ~390–450 ms; ver "Otimização" abaixo);
- zoom 15 (~5 500 formas na tela): vista inteira ~21 ms; faixa de 120 px do pan incremental ~4,5 ms (~950 formas);
- `consultarCaixa` de ~8 px (hover): média 0,05 ms, pior 0,4 ms em 1 000 consultas.

### Otimização: marcas em cache e canvas em branco intocado

Duas mudanças depois da rodada final.

**1. Item da marca em cache por zoom** (`motor-formas.ts`). Perfil do `listaDesenho` com 100 mil marcas em zoom 12 (Node,
`--cpu-prof`): o maior custo era montar, a cada vista, um `ItemDesenho` e internar o estilo da marca (`InternadorEstilos.interno`
monta uma chave de texto por item), mais um `Set` de ids vistos e a concatenação por spread. Agora o item pronto fica na entrada
de geometria da feição (já em cache por zoom e apagada quando a feição muda) e é reaproveitado no pan enquanto a feição (mesmo
objeto), o estilo da camada (`revEstilo`), a seleção e o destaque não mudam: sem alocar, sem reavaliar LOD nem revisão. O `Set`
saiu (o índice devolve cada id uma vez). Mudança de vista com 100 mil marcas: **~389 → ~137 ms** (mediana de 20 pans, três
execuções). Testes em `tests/motor-formas.regressao.test.ts` (item reaproveitado; seleção, destaque, cor da feição, estilo da
camada, remoção, prévia, regra e `oculta` invalidam), conferidos com mutação (tirar a checagem de seleção ou de `revEstilo`
reprova).

**2. Canvas em branco não é tocado** (`canvas_formas_leaflet.ts`, `feicoes_canvas_renderer.ts`). Medido no navegador, a primeira
tarefa depois de cada pan esperava 110–150 ms **sem nenhuma tarefa longa** (nem `longtask` nem `long-animation-frame`): o tempo
era da etapa de renderização. A cada pan, o caminho canvas deslocava o bitmap de **todas** as camadas (`drawImage` com `copy`) e
limpava a sobreposição, mesmo em branco; cada chamada de desenho faz o navegador reenviar o canvas inteiro (3072×1920 com dpr 2)
ao compositor, o que sem GPU custa caro. Agora o `CanvasFormas` sabe se o bitmap está em branco (`QuadroCanvas.branco`; o
callback de pintura devolve se ficou algo): canvas em branco não é deslocado nem redimensionado de novo, e a pintura sem itens de
canvas não chama o pintor. 1 000 formas em zoom 18 (camadas sem nada na vista): **95–130 → 16–38 ms**, abaixo do leaflet
(79–101 ms na mesma sessão). Testes em `tests/feicoes-canvas-renderer.test.ts` (camada vazia, camada que esvazia, sobreposição
sem seleção), conferidos com mutação.

**Medição intercalada depois das duas mudanças** (mesma página, canvas e leaflet alternados, duas voltas por tamanho; mediana
em ms de cada volta, canvas / leaflet). Rodadas separadas variaram até 2× nesta máquina; só a intercalada compara:

| Formas | zoom 12 | zoom 15 | zoom 18 |
|---|---|---|---|
| 1 000 | 153, 165 / 113, 133 | 155, 164 / 108, 127 | **32, 38** / 79, 101 |
| 20 000 | **170, 192** / 440, 219 | **202, 205** / 441, 280 | 167, 168 / 148, 76 |
| 50 000 | **167, 176** / 289, 351 | **246, 124** / 929, 602 | **75, 84** / 155, 151 |
| 100 000 | **265, 213** / 838, 1 846 | **226, 371** / 751, 760 | 105, 204 / 126, 139 |

Leitura: o caminho canvas ganha com folga em 20 mil (z12/z15) e de 50 mil para cima (100 mil em zoom 12: ~240 contra
~840–1 850 ms). **Perde** quando há poucas formas na vista mas as camadas não estão em branco (1 000 em z12/z15, 20 000 em z18):
o pan ainda desloca bitmaps cheios de 3072×1920 por camada, e sem GPU isso custa mais que o Leaflet redesenhar poucas formas.
Resolvido em seguida (item 3).

**3. Poucos itens: repintar em vez de deslocar** (`canvas_formas_leaflet.ts`). A pintura passa a devolver quantos itens de
canvas deixou no bitmap (`PintarQuadro` → número; numa faixa do pan, quantos acrescentou, então entre repinturas completas a
conta é uma estimativa por cima). No pan, uma camada com até `CanvasFormas.limiteRepintar` itens (padrão **500**, também por
instância em `OpcoesCanvasFormas.limiteRepintar`) é repintada inteira sobre o mesmo bitmap, sem deslocar nem redimensionar.
Acima disso, desloca como antes. `NaN`/negativo valem 0 (sempre desloca); `Infinity` sempre repinta.

Escolha do limite: medição intercalada na mesma página, três configurações por tamanho (sempre deslocar, limite 0; sempre
repintar, limite ∞; leaflet), duas voltas, mediana em ms. "itens/camada" é o total de formas e marcas na vista dividido pelas
5 camadas:

| Caso | itens/camada | sempre desloca | sempre repinta | leaflet |
|---|---|---|---|---|
| 1 000, z18 | 0 | 43, 44 | **6, 9** | 83, 122 |
| 20 000, z18 | ~12 | 127, 146 | **31, 43** | 75, 85 |
| 1 000, z15 | ~32 | 180, 180 | **40, 55** | 117, 163 |
| 1 000, z12 | ~180 | 192, 204 | **52, 65** | 138, 156 |
| 20 000, z15 | ~650 | 126, 180 | 114, 185 | 222, 240 |
| 50 000, z15 | ~1 560 | **187, 311** | 267, 420 | 353, 1 501 |
| 20 000, z12 | ~3 050 | **105, 140** | 195, 209 | 262, 376 |
| 50 000, z12 | ~7 560 | **96, 250** | 1 178, 1 538 | 421, 1 276 |
| 100 000, z12 | ~15 000 | **175, 336** | 1 106, 2 275 | 1 682, 2 121 |

Até ~200 itens por camada, repintar é 3–5× mais rápido; perto de 650 empata; de ~1 500 para cima, deslocar ganha (e com 7 mil
ou mais, repintar fica 5–10× pior). O limite de 500 fica do lado seguro do empate.

**Confirmação com o padrão final (limite 500), canvas / leaflet intercalados, duas voltas, ms:**

| Formas | zoom 12 | zoom 15 | zoom 18 |
|---|---|---|---|
| 1 000 | **85, 75** / 345, 392 | **57, 52** / 983, 537 | **8, 8** / 866, 575 |
| 20 000 | **218, 193** / 237, 309 | 243, 178 / 176, 266 | **41, 57** / 61, 57 |
| 50 000 | **147, 300** / 1 214, 1 138 | **222, 317** / 1 810, 1 878 | **30, 89** / 916, 311 |
| 100 000 | **400, 441** / 2 027, 2 080 | **451, 451** / 2 946, 3 196 | **177, 135** / 832, 871 |

Os casos que perdiam (1 000 em z12/z15, 20 000 em z18) agora ficam abaixo do leaflet; 20 000 em z15 (~650 itens por camada,
o ponto de empate) fica empatado. **Ressalva:** nesta rodada o leaflet saiu anormalmente lento (1 000 em z18: 575–866 ms, contra
26–122 ms nas anteriores), provavelmente por pressão de memória na aba depois de muitas medições; a vantagem do canvas aqui está
exagerada. A comparação que decide o limite é a tabela anterior. As metas do prompt (20 mil ≤ 60 ms, 50 mil ≤ 100 ms, 100 mil
≤ 200 ms em z12) continuam **não confirmadas** nesta máquina, e o limite deve ser conferido numa máquina com GPU (lá o
deslocamento é uma cópia de textura e o equilíbrio pode ficar em outro ponto).

### Com GPU (máquina do dono, 2026-10-23)

Protocolo completo do bench (`__bench.protocoloGPU()`), Chrome 155. Tabelas completas em
[`docs/RELATORIO-motor-formas.md`](RELATORIO-motor-formas.md). Resumo:

- **Canvas × leaflet:** o canvas fica de 2 a 6 vezes abaixo em todos os tamanhos e zooms (1 000 em zoom 18: 4 contra
  151–195 ms; 20 000 em zoom 12: 90–222 contra 473–676 ms; 100 000 em zoom 15: 166–197 contra 811–1 652 ms).
- **Operações em lote:** selecionar 2 000 feições numa camada de 50 mil, 114 contra 1 316 ms; limpar, 22 contra 1 355 ms.
- **Metas do prompt em zoom 12** (20 mil ≤ 60, 50 mil ≤ 100, 100 mil ≤ 200 ms): **não atingidas** (90–222, 224–300 e
  218–375 ms).
- **Limite de repintura:** com GPU o equilíbrio fica abaixo do medido sem GPU (deslocar já ganha um pouco a ~180 itens por
  camada: 67–86 contra 90–96 ms; repintar segue muito melhor com ~10 itens: 2 contra 25–26 ms). O limite ficou em 500: com
  GPU a perda na faixa 180–500 é de ~15–20 ms, sem GPU repintar é 3× melhor. Algumas células da medição de limite saíram com
  0 ms (janela sem foco naquele trecho) e foram descartadas.

## Regressão

`tests/feicoes-lote.test.ts`:

- `aplicarLote` de 5 mil mudanças numa camada de 5 mil feições em **menos de 1 s** (medido: dezenas de ms);
- 100 mil feições: uma edição em menos de **40 ms** em média (medido: ~1 ms) — limite folgado para CI lenta;
- renderizador incremental = renderizador completo: sequências aleatórias de lotes comparadas, feição a feição e cluster
  a cluster, com a camada reconstruída do zero (pontos sem cluster, com cluster, com seleção no meio, linhas acima do
  corte por viewport, travessia do limite de 300, oficial × prévia).

Motor de formas (Fases 0 e 1):

- `tests/feicoes-caracterizacao.test.ts`: o que o renderizador Leaflet faz hoje (z-order por camada/`zIndex`, opacidade de
  grupo, `oculta` × `excluida`, oficial × prévia, seleção aditiva, culling de 300), régua para o renderizador Canvas;
- `tests/feicoes-lod.test.ts` (puro) e `tests/feicoes-lod-renderer.test.ts`: LOD em pixels, marcas, clique em marca,
  ciclo de vida, entrada hostil e seleção incremental;
- `tests/feicoes-lod-equivalencia.test.ts`: desenho incremental = desenho completo, agora incluindo marcas;
- `tests/feicoes-lod.regressao.test.ts`: simplificação em px, zoom `NaN`, `feicaoNoPonto` em anel enorme.

Motor de formas (Fases 2 e 3):

- `tests/motor-formas.test.ts` e `tests/motor-formas.regressao.test.ts` (Node, sem DOM): lista de desenho, LOD, clusters,
  seleção, prévia, delta e entrada hostil;
- `tests/renderizador-formas.test.ts` e `tests/feicoes-canvas-renderer.test.ts`: pintura, recorte, pan incremental (desloca
  o bitmap e pinta só as faixas), sobreposição, ciclo de vida;
- `tests/feicoes-renderizadores-paridade.test.ts`: a mesma suíte nos dois caminhos e equivalência por sequências aleatórias;
- `tests/ui-canvas-cad-renderizador.test.ts`: atributo `renderizador`, troca em execução, `estatisticasFeicoes`, reconexão;
- `tests/feicoes-desempenho.test.ts`: orçamentos do motor com 100 mil feições (`listaDesenho`, faixa do pan, hover).

## Dicas de uso

- Para sincronizar com um estado externo, prefira **um** `aplicarLote` a muitas chamadas unitárias (uma regravação, um
  evento de camadas, uma reconciliação de seleção/popup).
- Troca total de dados: `definirFeicoes`. Mudança parcial: `aplicarLote`.
- O corte por viewport só vale acima de 300 feições; abaixo disso tudo fica materializado (sem *pop-in*).
