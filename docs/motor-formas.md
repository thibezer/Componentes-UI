# Motor das formas e renderizador Canvas

Como o `<ui-canvas-cad>` desenha muitas feições (polígonos, linhas, círculos, pontos, textos). O Leaflet continua dono do
**mapa** (tiles, pan, zoom, eventos); a decisão do que desenhar saiu dele e foi para um motor sem DOM, e a pintura para um
canvas nosso. Mesma API, mesmos eventos, mesmos dados: o que muda é quem desenha.

```
 dados ──► MotorFormas (headless) ──► ListaDesenho ──► PintorCanvas2D ──► canvas
           src/gerencigeo-canvas/motor/      │            renderers/renderizador_formas.ts
           sem window, document nem Leaflet  │
                                             └──► marcadores DOM / curvas (ponte Leaflet)
                                                  renderers/feicoes_canvas_renderer.ts
```

## Escolher o caminho: `renderizador`

| Valor | O que faz |
|---|---|
| `leaflet` (padrão) | Um objeto Leaflet por feição visível (`L.Polygon`, `L.Polyline`...). Caminho de sempre, com o LOD por tamanho em px. |
| `canvas` | Motor + Canvas 2D. Nenhum objeto Leaflet por forma. |

```html
<ui-canvas-cad renderizador="canvas"></ui-canvas-cad>
```

```ts
cad.renderizador = 'canvas';                 // ao mudar, as camadas de feições são recriadas (dados e seleção ficam)
cad.estatisticasFeicoes('minha-camada');     // { total, materializadas, desenhadas, marcasLOD, clusters, canvases, renderizador }
```

Valor inválido cai em `leaflet`. Os dois caminhos passam na mesma suíte de comportamento
(`tests/feicoes-renderizadores-paridade.test.ts`) e, depois de sequências aleatórias de lotes, desenham as mesmas feições e as
mesmas marcas.

## 1. Motor (`src/gerencigeo-canvas/motor/`, L2)

Sem `window`, `document` nem `L`: importável em Node/SSR e rodável em Web Worker. O `check-layers` proíbe `leaflet` e globais
de navegador em `motor/` (e em `feature_lod`, `feature_simplificacao`, `feature_indice`).

```ts
const motor = new MotorFormas();
motor.definirCamada({ id: 'glebas', zIndex: 600, opacidade: 1, visivel: true, interativo: true, estilo: { corPrimaria: '#0af' } });
motor.definirFeicoes('glebas', feicoes);                         // troca total (diferença contra o que existe)
motor.aplicarDelta('glebas', lista, { base, mudadas, removidas }); // O(mudanças)
const lista = motor.listaDesenho(vista);                         // Vista → ListaDesenho, na ordem de empilhamento
```

- **`Vista`**: `{ caixa, zoom, larguraPx, alturaPx, dpr, origemPx? }`. `origemPx` são os pixels de mundo do canto superior
  esquerdo do canvas; o pintor subtrai esse valor em dupla precisão (coordenadas de mundo em zoom alto não cabem no float32 do
  canvas).
- **`ListaDesenho`**: por camada (zIndex crescente), `itens` na ordem de pintura: marcas < polígonos/círculos < linhas < pontos
  < marcadores DOM e curvas. Cada `ItemDesenho` traz `camadaId`, `id`, `forma`, `geometriaEmPx` (Float64Array planos em pixels
  de mundo), `estilo` (compartilhado entre itens iguais), `selecionada` e `destaque`.
- **Projeção própria** (Web Mercator, tiles de 256 px; não usa `map.project`). Círculo em metros vira raio em px por zoom e
  latitude.
- **Cache** por (feição, revisão, zoom) da geometria projetada e simplificada. No pan puro só muda a origem da vista: a lista
  reaproveita os mesmos arrays.

### LOD (regras fixas)

- Usa a **diagonal da caixa em px** (não a área): linha longa e fina continua visível.
- Diagonal **< 3 px**: não é descartada, vira **marca** de 1–2 px na cor do preenchimento/contorno, pintada em lote por cor.
- Acima disso, Douglas-Peucker com tolerância de 1,2 **px** (não graus) para feição com mais de 8 vértices, abaixo do zoom 17.
- **Sempre em detalhe completo**: feição selecionada, em edição, com rótulo e em par oficial × prévia. Ponto e texto nunca viram
  marca (já têm a regra de cluster).
- **Hit-test, snap, caixa e laço usam a geometria original** (`consultarCaixa` + índice), nunca a lista: uma feição de 1 px
  continua clicável.
- Reavaliado ao mudar de zoom, não a cada pan (`avaliacoesLOD` não cresce no pan).

### Seleção e edição não repintam a base

`listaSobreposicao(camadaId, vista)` devolve as feições selecionadas, em edição (`previsualizar`) ou destacadas (`destacar`),
sempre em detalhe completo e com o estilo de seleção. A lista da base **não depende da seleção** (só a de um ponto sob cluster,
que sai do agrupamento).

## 2. Renderizador (`renderers/renderizador_formas.ts`)

```ts
interface RenderizadorFormas {
  desenhar(lista, vista, opcoes?): EstatisticasPintura;   // opcoes.alvo: 'base' | 'sobreposicao'
  destacar(ids): void;
  limpar(): void;
  destruir(): void;
}
```

`PintorCanvas2D` pinta em Canvas 2D sem Leaflet, em lote por estilo (um `stroke` por grupo; marcas num `fillRect` por marca com
a cor definida uma vez por grupo). Preenchimento translúcido é feito forma a forma (as sobreposições dentro da camada escurecem,
como no Leaflet); preenchimento opaco entra no lote. `devicePixelRatio` por `setTransform`. A suíte usa um contexto 2D falso que
grava as chamadas (`tests/renderizador-formas.test.ts`); não se promete comparação de pixels.

## 3. Ponte Leaflet (`renderers/feicoes_canvas_renderer.ts`, `canvas_formas_leaflet.ts`)

- **Canvas por camada, no pane da camada.** Decisão de projeto (ver abaixo). Z-order, opacidade de grupo (sobreposições dentro
  da camada não se somam), visibilidade e bloqueio seguem o pane, como no caminho `leaflet`, sem composição fora da tela.
- **Um canvas de sobreposição por mapa** (seleção, destaque e edição), acima de todas as camadas de feições.
- `CanvasFormas` estende `L.Canvas` e herda tamanho com folga, retina, reposicionamento, escala na animação de zoom e remoção
  limpa. **Pan:** o canvas se move por CSS com o mapa e é repintado no fim do movimento (nenhuma repintura durante o arraste).
- **Canvas em branco não é tocado.** `CanvasFormas` sabe se o bitmap está em branco (`QuadroCanvas.branco`; o callback de
  pintura devolve se ficou algo pintado). Em branco, o pan não desloca o bitmap, o `_update` não o redimensiona de novo e a
  pintura sem itens de canvas não chama o pintor: qualquer chamada de desenho, até um `clearRect`, faz o navegador reenviar o
  canvas inteiro ao compositor. Vale para a sobreposição sem seleção e para camadas sem nada na vista.
- **Poucos itens: repinta em vez de deslocar.** A pintura devolve quantos itens de canvas deixou no bitmap; no pan, a camada
  com até `CanvasFormas.limiteRepintar` itens (padrão 500, ou `limiteRepintar` nas opções) é repintada inteira, porque deslocar
  copia o bitmap todo seja qual for o conteúdo. Medição e escolha do limite em `docs/desempenho-feicoes.md`.
- **Hit-test central.** Os canvases têm `pointer-events: none`; o clique das formas é resolvido por `resolverCliqueCentral`
  (`layer_hit_test`, via `FonteHit`) sobre todas as camadas, na geometria original: linha antes de área, camada do topo, menor
  área, alternância em cliques repetidos. `bloqueada` e `interativo: false` não capturam clique. Ferramentas de desenho têm
  prioridade (o gerenciador ignora o clique com ferramenta ativa).

### Marcadores DOM e curvas (híbrido, pendência explícita)

Continuam objetos Leaflet, limitados à vista pelo motor, porque dependem de CSS e de arraste:

| Item | Como |
|---|---|
| Ponto com ícone SVG | `L.Marker` no sub-pane de pontos da camada |
| `Text` (selo/halo) | `L.Marker` arrastável (`feicao-movida` ao soltar) |
| Cluster | `L.Marker` numerado; o clique enquadra o grupo |
| Rótulo (`mostrarRotulo`) | marcador âncora com tooltip permanente |
| Curva Bézier (`curva`) | **caminho Leaflet legado** (`LinhaCurva`/`PoligonoCurvo`) dentro do mesmo renderizador. **Pendência:** não é desenhada no canvas |
| Alças do editor de vértices | `L.Marker` (inalterado) |

Como cada camada tem o próprio pane, os marcadores de uma camada ficam acima dos vetores **dessa** camada e abaixo da camada
seguinte, como no caminho `leaflet` (não ficam todos acima de todos os vetores).

## Decisões de projeto

1. **Canvas por camada (N + 1) em vez de um canvas único (2).** A meta do plano era 2 canvases (base + sobreposição). Um único
   canvas para todas as camadas obriga a recompor a opacidade de grupo fora da tela, a perder a intercalação com marcadores
   DOM por camada e a ter um z-index só para camadas que o consumidor empilha com `setLayerZIndex`. Com um canvas por camada
   tudo isso vem do pane, sem código, e continua muito abaixo dos 15 canvases do caminho `leaflet` (5 camadas: 6 contra 20 com
   as marcas). Se o custo de N canvases virar problema, o motor já devolve uma lista por camada e basta um pintor que componha.
2. **Coordenadas projetadas em cache em vez de `Path2D` por feição.** O ambiente de teste não tem `Path2D` e o ganho de cachear
   o caminho é pequeno diante de um `stroke` único por estilo. O que se guarda é o `Float64Array` projetado e simplificado por
   (feição, revisão, zoom); a pintura monta um caminho por grupo de estilo.
3. **Ordem dentro da camada por tipo e estilo.** Polígonos < linhas < pontos, e dentro de cada tipo por grupo de estilo
   (primeira aparição). Feições de estilos diferentes que se sobrepõem podem trocar de ordem em relação ao caminho `leaflet`
   (lá a ordem é a da materialização, que também não é a da lista de dados).
4. **Uso de internos do Leaflet** (`_bounds`, `_ctx`, `_updatePaths`) em `CanvasFormas`, como o kit já faz com `_paneRenderers`.

## Rodar o motor em um Web Worker

O motor e as funções puras que ele usa saem no entrypoint `@thibezer/ui-components-kit/motor`, sem Leaflet nem DOM:

```ts
// worker.ts
import { MotorFormas } from '@thibezer/ui-components-kit/motor';
const motor = new MotorFormas();
self.onmessage = (e) => {
  // e.data: { tipo: 'dados', camada, feicoes } | { tipo: 'vista', vista }
  if (e.data.tipo === 'vista') self.postMessage(motor.listaDesenho(e.data.vista)); // Float64Array são transferíveis
};
```

## Testes

| Arquivo | O que cobre |
|---|---|
| `tests/motor-formas.test.ts`, `.regressao.test.ts` | Motor em Node (`@vitest-environment node`): lista = feições que cruzam a vista e passam no LOD, igual com e sem cache, pan sem reprojetar, hit-test idêntico antes e depois do LOD, delta = completo, entrada hostil |
| `tests/renderizador-formas.test.ts` | Pintura com contexto 2D falso: lote por estilo, origem em dupla precisão, DPR, ordem, sobreposição |
| `tests/feicoes-canvas-renderer.test.ts` | Ponte Leaflet: nenhum objeto por forma, pintura, seleção só na sobreposição, marcadores DOM, clique, ciclo de vida |
| `tests/feicoes-renderizadores-paridade.test.ts` | Mesma suíte de comportamento nos dois caminhos e equivalência `leaflet` × `canvas` |
