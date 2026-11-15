# Callbacks do MapEngine → eventos do `<ui-canvas-cad>`

Decisão da Fase 0: callbacks viram `CustomEvent` (bubbles + composed) disparados pelo componente.
Nomes novos usam o prefixo `cad-`; os eventos já existentes no componente não mudam.

| Callback / hook do MapEngine | Evento | `detail` | Estado |
|---|---|---|---|
| `onFeaturesSelected(lista)` | `cad-selecao` | `{ feicoes: Feicao[] }` (sempre que a seleção muda) | Fase 3 |
| `onFeatureSelected(feat \| null)` | `cad-feicao-selecionada` | `{ feicao: Feicao \| null }` (só com ≤ 1 feição) | Fase 3 |
| `onFeatureUpdated` | `cad-feicao-atualizada` | `{ camadaId, feicao }` (texto arrastado; fim de cada gesto de edição de vértices; também ao desfazer, refazer e cancelar a edição) | Fase 2/5 / 2.4.0 |
| `onFeatureAction` | `cad-feicao-acao` | `{ acao: 'inspecionar' \| 'zoom' \| 'vertices' \| 'copiar', feicao }` (com `definirOpcoesPopup({ copiarParaAreaDeTransferencia: false })` o componente não escreve na área de transferência; o evento sai igual) | Fase 3 / 2.1.0 |
| (clique numa feição) | `cad-feicao-clique` | `{ camadaId, feicao, aditivo }` | Fase 2 |
| (duplo clique numa feição) | `cad-feicao-duplo-clique` (**cancelável**) | `{ camadaId, feicao, coordenada }` — sem `preventDefault()` o componente abre o popup da feição (a não ser com `popups="desligado"`); com `preventDefault()` o consumidor assume o gesto. Ignorado durante desenho ou edição de vértices | 2.10.1 |
| `onSnappingChange` | `cad-snap` | `{ ativo, ligado, temporario }` (`ativo` = ligado e sem Alt) | Fase 5 |
| (edição de vértices) | `cad-edicao-iniciada` / `cad-edicao-concluida` | `{ feicao }` | Fase 5 |
| (edição recusada) | `cad-edicao-recusada` | `{ motivo: 'bloqueada' \| 'tipo-nao-suportado' \| 'poligono-com-furos' \| 'multiparte' \| 'muitos-vertices' \| 'sem-selecao', feicao }` (`sem-selecao`, do botão Editar da barra, vem com `feicao: null`) | Fase 5 / 2.1.0 / 2.4.0 |
| `onSplitFailed` | `cad-divisao-falhou` | `{ motivo: 'nenhum-poligono' \| 'sem-intersecao' \| 'bloqueada' \| 'poligono-com-furos' \| 'multiparte' \| 'geometria-invalida' }` | Fase 6 / 2.1.0 |
| `onFeatureSplit` | `cad-feicao-dividida` | `{ origem: Feicao, partes: Feicao[] }` | Fase 6 |
| `onEyedropperSampled` | `cad-conta-gotas` | `{ cor: string, feicao: Feicao \| null, estilo }` (`cor` vazia e `feicao` nula se clicou no vazio) | Fase 6 |
| (ferramenta ativa mudou) | `cad-ferramenta` | `{ ferramenta: string \| null }` | Fase 6 |
| (feição desenhada, buffer ou cópia) | `cad-feicao-criada` | `{ camadaId, feicao }` | Fase 6 |
| (medição) | `cad-medicao` | `{ tipo: 'distancia' \| 'area', pontos, comprimentoM, areaM2?, perimetroM? }` — `areaM2`/`perimetroM` vêm em `medir-area` e também em `medir-distancia` com 3 ou mais pontos | Fase 6 / 2.1.0 |
| (texto pedido) | `cad-texto-solicitado` (**cancelável**) | `{ coordenada: [lat, lon], camadaId: string \| null, concluir(texto): Feicao \| null }` | 2.1.0 |
| (desenho recusado) | `cad-desenho-recusado` | `{ ferramenta, motivo: 'sem-camada' \| 'camada-invalida' \| 'camada-bloqueada' \| 'geometria-invalida' }` | Fase 6 |
| (junção) | `cad-feicao-unida` / `cad-uniao-falhou` | `{ origens, resultado }` / `{ motivo: 'feicoes-insuficientes' \| 'tipos-incompativeis' \| 'sem-ligacao' \| 'bloqueada' \| 'multiparte' \| 'geometria-invalida' }` | Fase 6 / 2.1.0 |
| (previas) | `cad-previas` | `{ global }` ou `{ camadaId, entidadeId, ativa }` | Fase 7 |
| (hover / menu de contexto) | `cad-feicao-hover` / `cad-feicao-menu` | `{ feicao \| null }` / `{ feicao \| null, coordenada, x, y }` | Fase 7 |

Os métodos (`renderFeatures`, `selectFeature`, `zoomToFeature` etc.) viram métodos públicos do componente,
com nomes em português seguindo o restante da API; o mapeamento exato está em [guia-migracao-mapengine.md](guia-migracao-mapengine.md).

## Ordem dos eventos nas ferramentas de desenho (garantias)

Vale para **todas** as ferramentas (`ponto`, `linha`, `poligono`, `retangulo`, `elipse`, `poligono-regular`, `estrela`,
`circulo`, `texto`, `caneta`, `medir-distancia`, `medir-area`, `dividir`, `selecao-laco`, `conta-gotas`); há um teste
parametrizado para cada uma (`tests/feicoes-ferramentas-lacunas.test.ts`).

1. Quando o evento de conclusão sai (`cad-feicao-criada`, `cad-medicao`, `cad-feicao-dividida`, `cad-selecao` do laço,
   `cad-conta-gotas`), o componente **já está pronto para a próxima figura**: quem escuta pode chamar
   `definirFerramenta(null)` (ou trocar de ferramenta) ali dentro, sem efeito colateral. Nada que roda depois do evento
   religa a ferramenta, e o HUD, o cursor e os listeners de mouse/teclado já saíram quando `definirFerramenta` volta.
   - Em `medir-distancia`/`medir-area` isso nem sempre foi assim: o aviso saía antes de a próxima sessão ser montada e
     desativar dentro de `cad-medicao` deixava a ferramenta "ressuscitar". Corrigido na 2.1.0.
2. Desativar emite `cad-ferramenta { ferramenta: null }` uma única vez.
3. `cad-selecao` **nunca** sai com a ferramenta ativa quando a mudança de seleção é consequência dela:
   - `selecao-laco` encerra antes de selecionar;
   - `dividir`, quando a feição cortada estava selecionada (ela sai e a seleção muda), encerra a ferramenta antes de
     remover a original. Sem seleção envolvida, `dividir` continua ativa para o próximo corte.
4. As demais ferramentas não mexem na seleção (criar uma feição não a seleciona).

### `cad-texto-solicitado` (texto com modal próprio)

Sai quando o usuário clica com a ferramenta `texto`, **antes** do campo inline. Sem `preventDefault()`, o campo inline
aparece como sempre. Com `preventDefault()`, o componente não abre nada: o app abre o próprio modal e, ao confirmar,
chama `detail.concluir(texto)` (cria o texto na camada de desenho, com o estilo de desenho, e emite `cad-feicao-criada`).
Para cancelar basta não chamar `concluir`. A ferramenta continua ativa.

```js
mesa.addEventListener('cad-texto-solicitado', (e) => {
  e.preventDefault();
  abrirModalDeTexto().then((texto) => texto && e.detail.concluir(texto));
});
```

## Valores novos nos `motivo` (2.1.0)

`multiparte` aparece em `cad-edicao-recusada` (linha multiparte não tem edição de vértices), `cad-uniao-falhou`
(`juntarFeicoes` com multilinha) e `cad-divisao-falhou` (só havia multilinhas na seleção). Quem faz `switch` exaustivo
nos motivos precisa tratar o valor novo.

## Edição de vértices (2.4.0)

**Como entrar:** botão "Vértices" (ou "Editar", no círculo) do popup, **Enter** com uma só feição editável selecionada, botão **Editar** da barra
(`ferramentas="editar"` ou `"todas"`) e `editarVertices(camadaId, id)`. O duplo clique sobre a feição abre o popup
(pedido de informações, 2.8.1); quem quiser que ele abra a edição chama `editarVertices` no ouvinte de `cad-feicao-duplo-clique`
e `preventDefault()`.

**Dentro da edição:**

| Gesto | Efeito |
|---|---|
| Arrastar alça | move o nó (com snap; Alt desliga; S alterna). Num **retângulo** alinhado aos eixos, o canto arrastado leva os vizinhos e o oposto fica fixo; segurar **Shift durante o arraste** solta os cantos |
| Clique no nó | seleciona (destacado); **Delete**/**Backspace** ou o botão "Excluir nó" o exclui |
| Botão direito no nó | exclui (abaixo do mínimo, 3 no polígono e 2 na linha, o HUD avisa) |
| Clique no ponto fantasma | insere um nó (fica selecionado). Segmentos com menos de 24 px na tela não têm fantasma; aproxime o zoom |
| Duplo clique no nó | alterna canto ↔ curva |
| Alças de Bézier | Aparecem só para o **nó selecionado** (reais e latentes) e para as alças dos vizinhos que moldam os trechos ligados a ele; sem seleção, só as das curvas já existentes. **Shift durante o arraste** deixa as duas alças independentes e o nó vira `livre` (o Leaflet ignora um arraste que começa com Shift apertado); **Ctrl** trava o ângulo da alça em múltiplos de 45° em relação ao nó; o snap atrai a alça para vértices e arestas de **outras** feições. Puxar uma alça seleciona o nó dela |
| Arrastar o traçado | agarrar um trecho (a até 7 px) e arrastar o **molda**: o ponto agarrado acompanha o cursor e as duas alças do trecho se ajustam (a mais próxima mexe mais). Trecho reto vira curva; clique sem mover não altera; Shift/Ctrl/Alt/botão direito não agarram |
| **Ctrl+Z** / **Ctrl+Shift+Z** ou **Ctrl+Y** | desfaz / refaz o último gesto (até 100); também há botões no HUD |
| **Cancelar** (HUD) | volta à geometria de quando a edição começou e encerra |
| **Enter**, **Esc** ou **Concluir** | encerra mantendo as alterações |

O histórico recomeça quando outro operador (ou a API) troca a **geometria** da feição durante a edição; mudar só estilo ou
propriedades não o apaga. Se a camada é ocultada, bloqueada ou removida, ou a feição é bloqueada, a edição encerra
(`cad-edicao-concluida`). Elipse, hexágono e estrela são polígonos comuns depois de criados: mover um nó os deforma.

**Tipos de nó.** Um nó com alças é `suave` (alças alinhadas, cada uma com o seu comprimento), `simetrico` (alinhadas e do mesmo
comprimento) ou `livre` (independentes, cúspide); sem alças é de `canto`. O tipo decide o que acontece com a alça oposta quando uma é
arrastada. `NoCurva.modo` guarda a escolha; ausente, o tipo é deduzido da geometria das alças (`tipoDoNo`). A primeira alça
arrastada num nó de canto nasce simétrica, como na caneta.

**Painel do nó** (linha extra do HUD, só em linha/polígono, com um nó selecionado):

| Controle | Efeito |
|---|---|
| Canto / Suave / Simétrico / Livre | muda o tipo do nó selecionado (`definirTipoDoNoSelecionado`) |
| Lat / Lon | move o nó para a coordenada digitada (vírgula decimal aceita), levando as alças (`moverNoSelecionadoPara`) |
| Alça ← / Alça → | comprimento (m) e azimute (°, 0 = norte, horário) de cada alça (`definirAlcaDoNoSelecionado`) |
| Segmento → Reto / Curvo | tira / dá alças ao trecho que **sai** do nó selecionado (`endireitarSegmentoSeguinte`, `curvarSegmentoSeguinte`) |
| Raio + Arco ⟲ / Arco ⟳ | troca o trecho que sai do nó por um **arco circular** de raio dado (metros), abaulado para a esquerda/direita; raio menor que meia corda vira semicírculo (`arcoNoSegmentoSeguinte`). O arco entra como cúbicas de Bézier (um nó novo a cada 90°) |
| Raio + Concordar | **concordância (fillet)**: arredonda o canto do nó (sem alças, com dois trechos não alinhados) com um arco tangente; o raio é reduzido se os vizinhos forem curtos (`concordarNoSelecionado`) |

Cada ação é um gesto de desfazer. Entradas inválidas (vazio, texto, NaN, fora de faixa, raio ≤ 0) mostram um aviso no HUD e não alteram a feição.
As operações puras estão em `feature_edicao_nos.ts` (`definirTipoDoNo`, `moldarSegmento`, `arcoNoSegmento`, `concordarNo`, `restringirAngulo`, ...).

**Atalhos com vários canvases:** com mais de um `<ui-canvas-cad>` na página, **S** (snap) e **Enter** (editar) valem só no
canvas sob o mouse ou com foco; com um único canvas valem em qualquer lugar da página, como antes.
