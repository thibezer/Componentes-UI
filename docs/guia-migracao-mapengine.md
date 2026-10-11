# Guia de migração: MapEngine → `<ui-canvas-cad>`

Para quem consome o MapEngine do GerenciGeo e quer passar para o componente. A API nova é em português, usa
`CustomEvent` no lugar de callbacks e **não cria nenhuma camada sozinha**: você decide quais existem.

Plano e decisões: [plano-migracao-canvas-cad.md](plano-migracao-canvas-cad.md) · Eventos: [canvas-cad-eventos.md](canvas-cad-eventos.md)

## Conceitos

| MapEngine | `<ui-canvas-cad>` |
|---|---|
| Lista única de feições (`renderFeatures`) | **Camadas de feições** que você cria: `definirFeicoes(camadaId, feicoes, opcoes)` |
| `feature.geometry` Leaflet/GeoJSON-like | `Feicao.geometria`: `{ tipo: 'Point' \| 'LineString' \| 'Polygon' \| 'Circle' \| 'Text', ... }`, sempre `[lat, lon]` |
| `feature.style` | `Feicao.estilo` (`corTraco`, `corPreenchimento`, `espessuraTraco`, `dashArray`, `icone`, ...) |
| `feature.properties` | `Feicao.propriedades` |
| `locked` | `Feicao.bloqueada` (e camada bloqueada) |
| `status` / `tipo_geometria` | `Feicao.status` (`'oficial'` \| `'previa'`), lidos também de `propriedades` |
| (par oficial/prévia) | `Feicao.entidadeId` agrupa as versões da mesma coisa |

Coordenadas aceitas na entrada: `[lat, lon]`, `{ lat, lng }`, `{ lat, lon }`, `{ latitude, longitude }`.
Descartadas: `NaN`/`Infinity`, UTM plano (> 90°/180°) e **(0, 0) exato** (placeholder de erro, "Null Island"), a menos que
você ligue [`aceitar-origem`](#coordenada-0-0).

## Métodos

| MapEngine | Componente |
|---|---|
| `renderFeatures(features, layers)` | `definirFeicoes(camadaId, feicoes, { nome, zIndex, opacidade, interativo, estilo })` (devolve `{ aceitas, recusadas }`) |
| `addFeature` / `updateFeature` / `removeFeature` | `adicionarFeicao` / `atualizarFeicao(camadaId, id, parcial, { substituirPropriedades })` / `removerFeicao` |
| (várias mudanças de uma vez) | `aplicarLote(camadaId, { adicionar, atualizar, remover }, opcoes)` ([Lote e ordem](#lote-e-ordem-das-feicoes)) |
| `setLayerVisibility` / `setLayerOpacity` | `setLayerVisibility(id, bool)` / `setLayerOpacity(id, n)` (já existiam) |
| `selectFeature(s)`, `toggleFeatureSelection`, `clearSelection` | `selecionarFeicao(camadaId, id)`, `selecionarFeicoes(refs, aditivo)`, `alternarSelecaoFeicao`, `limparSelecaoFeicoes()` |
| `getSelectedFeatures` | `obterFeicoesSelecionadas()` |
| `setTool(tool)` / `drawingEngine` | `definirFerramenta(nome \| null, { fechar, iniciarEm })`; antes, `definirCamadaDesenho(id)`. `select`→`null`, `point`→`ponto`, `line`→`linha`, `polygon`→`poligono`, `rectangle`→`retangulo`, `ellipse`→`elipse`, `regular-polygon`→`poligono-regular`, `star`→`estrela`, `circle`→`circulo`, `text`→`texto`, `pen`→`caneta`, `pen-select`→`selecao-laco`, `split`→`dividir`, `measure`→`medir-distancia`, `eyedropper`→`conta-gotas` |
| `drawingEngine.handleClick({ latlng })` (começar aqui) | `definirFerramenta(nome, { iniciarEm: [lat, lon] })` |
| `setActiveDrawingStyles` / `setActiveDrawingLayer` | `definirEstiloDesenho(estilo)` / `definirCamadaDesenho(id)` |
| `setSnappingEnabled` / `toggleSnapping` | `definirSnap(bool)` / `alternarSnap()` (tecla **S**, botão da barra; **Alt** desliga enquanto segurado) |
| `startVertexEditing(feature, cb)` / `stopVertexEditing` | `editarVertices(camadaId, id)` / `pararEdicaoVertices()` |
| `zoomToFeature`, `zoomToFeatures`, `fitAllFeatures`, `fitLayer` | `zoomParaFeicao`, `zoomParaFeicoes`, `ajustarTudo()`, `ajustarCamada(id)` |
| `closeFeaturePopup` | `fecharPopupFeicao()` (e `definirMargensPopup` para o auto-pan; `definirOpcoesPopup` para a ação "copiar") |
| (barras e painéis sobre o mapa) | `definirMargensPopup(...)` e `definirMargensHud(...)` ([HUDs](#posicao-dos-huds)) |
| `toggleGlobalShowPreviews` / `setGlobalShowPreviews` | `alternarPreviasGlobais()` / `definirPreviasGlobais(bool)` |
| `toggleIndividualPreview` / `isFeaturePreviewActive` | `alternarPrevia(camadaId, id)` / `previaSolicitada(camadaId, id)` |
| `updateRemoteCursor` / `removeRemoteCursor` | `atualizarCursorRemoto({ id, nome, cor }, posicao)` / `removerCursorRemoto(id)` (+ `limparCursoresRemotos()`) |
| `splitPolygonWithLine`, `generateBuffer`, `duplicateWithOffset`, `joinFeatures` | ferramenta `dividir`; `gerarBuffer(...)`; `duplicarFeicao(...)`; `juntarFeicoes(...)` |
| `isPointInPolygon`, DD ⇄ DMS, conversão de unidades | `pontoNoPoligono`, `ddParaDms` / `dmsParaDd`, `converterComprimento` / `converterArea` (exportados) |
| `simplifyDouglasPeucker` | `simplificarLinha` / `simplificarAnel` (a simplificação por zoom é automática) |

## Callbacks → eventos

| Hook do MapEngine | Evento no elemento |
|---|---|
| `onFeaturesSelected` / `onFeatureSelected` | `cad-selecao` / `cad-feicao-selecionada` (só com ≤ 1 feição) |
| `onFeatureUpdated` | `cad-feicao-atualizada` |
| `onFeatureAction` | `cad-feicao-acao` (`inspecionar`, `zoom`, `vertices`, `copiar`) |
| `onSnappingChange` | `cad-snap` |
| `onSplitFailed` / `onFeatureSplit` | `cad-divisao-falhou` / `cad-feicao-dividida` |
| `onEyedropperSampled` | `cad-conta-gotas` |

Eventos novos: `cad-feicao-clique`, `cad-feicao-hover`, `cad-feicao-menu` (botão direito), `cad-feicao-criada`,
`cad-ferramenta`, `cad-medicao`, `cad-edicao-*`, `cad-previas`, `cad-feicao-unida`, `cad-uniao-falhou`, `cad-desenho-recusado`,
`cad-texto-solicitado` (cancelável). Ordem e garantias dos eventos das ferramentas: [canvas-cad-eventos.md](canvas-cad-eventos.md).

## Exemplo

```html
<ui-canvas-cad id="mesa" ferramentas="linha poligono medir-distancia dividir" style="height:600px"></ui-canvas-cad>
<script type="module">
  const mesa = document.getElementById('mesa');

  // 1. você cria as camadas (nada vem pronto)
  mesa.definirFeicoes('glebas', [
    { id: 'g1', entidadeId: 'g1',
      geometria: { tipo: 'Polygon', aneis: [[[-23.50, -46.60], [-23.50, -46.59], [-23.51, -46.59], [-23.51, -46.60]]] },
      propriedades: { name: 'Gleba 1', category: 'Rural' }, estilo: { mostrarRotulo: true, campoRotulo: 'area' } },
    { id: 'g1-previa', entidadeId: 'g1', status: 'previa',
      geometria: { tipo: 'Polygon', aneis: [[[-23.50, -46.60], [-23.50, -46.585], [-23.51, -46.585], [-23.51, -46.60]]] } }
  ], { nome: 'Glebas' });

  // 2. onde as ferramentas desenham
  mesa.definirCamadaDesenho('rascunho');

  // 3. eventos
  mesa.addEventListener('cad-feicao-selecionada', (e) => console.log(e.detail.feicao));
  mesa.addEventListener('cad-feicao-criada', (e) => salvar(e.detail.camadaId, e.detail.feicao));
  mesa.addEventListener('cad-feicao-atualizada', (e) => salvar(e.detail.camadaId, e.detail.feicao));

  mesa.ajustarTudo();
</script>
```

## Montar o componente só com atributos e métodos públicos

Tudo que o app antes conseguia com membros privados (`initCAD`, `initTimeout`, CSS escondendo o painel) agora é API.

| Preciso de... | Use |
|---|---|
| o `L.Map` **agora**, não depois do agendamento do `connectedCallback` | `const mapa = mesa.inicializarAgora()` — idempotente (devolve o mesmo mapa), cancela o agendamento e **nunca cria um 2º mapa**; `null` se não há contêiner |
| nada das camadas de fábrica (satélite Google, SIGEF/INCRA, homologados, perímetro, vizinhos, vértices, grade) | atributo `sem-camadas-padrao`. As camadas não são criadas nem plotadas e o clique **nunca consulta o INCRA** (não há camada `sigef`). Lido na inicialização do mapa; camadas que você criou antes (`definirFeicoes`) ficam |
| esconder o painel de camadas / a barra rápida | atributos `sem-painel-camadas` (painel e seu botão) / `sem-barra-rapida` (barra inteira: camadas, enquadrar, snap, limpar) |
| a tecla S **sem** alternar o snap desde o primeiro instante | atributo `sem-atalho-snap` (equivale a `definirAtalhoSnap(false)` desde o início; o botão e `definirSnap` seguem valendo). Remover o atributo religa a tecla |
| CSS do app dentro do shadow root | `mesa.definirEstilosExternos(css)` |

```html
<ui-canvas-cad id="mesa" sem-camadas-padrao sem-painel-camadas sem-barra-rapida sem-atalho-snap></ui-canvas-cad>
```
```js
const mapa = mesa.inicializarAgora();              // L.Map síncrono
mesa.definirEstilosExternos(textoCss);             // string
mesa.definirEstilosExternos([...document.styleSheets]); // ou folhas
```

**`definirEstilosExternos(css: string | CSSStyleSheet[] | null)`** aplica o CSS do consumidor no shadow root (popups,
rótulos, tooltips que você estiliza). Usa `adoptedStyleSheets` quando o navegador suporta e cai num `<style>` no shadow
root quando não. Cada chamada **substitui** a anterior (`null` ou `[]` remove), então para acompanhar mudanças basta
chamar de novo, por exemplo num `MutationObserver` do `<head>`:

```js
const espelhar = () => mesa.definirEstilosExternos([...document.styleSheets]);
new MutationObserver(espelhar).observe(document.head, { childList: true, subtree: true, characterData: true });
espelhar();
```

As folhas recebidas são copiadas **como texto** (folhas do `document` não podem ser adotadas direto; folhas de outra
origem bloqueadas por CORS são ignoradas). `destroy()` (inclusive o `disconnectedCallback`) tira as folhas do shadow
root; reconectar o elemento as recoloca.

## Posição dos HUDs

Os HUDs de desenho (`#cm-draw-hud`) e de edição de vértices (`#cm-vertex-edit-hud`) seguem a mesma regra: centralizados
na **área visível** do mapa, ancorados à base, com largura e altura máximas (o conteúdo quebra de linha; nada passa dos
limites mesmo com margens grandes).

```js
// uma barra de tabela de 40 px na base e um painel de 320 px à direita
mesa.definirMargensHud({ base: 56, direita: 320 });   // px; chaves ausentes mantêm o que já estava
mesa.definirMargensHud({ base: undefined });          // volta ao padrão da chave
```

Padrão (comportamento antigo): `{ topo: 0, base: 16, esquerda: 0, direita: 0 }`. Em CSS, no host:
`--cad-hud-topo`, `--cad-hud-base`, `--cad-hud-esquerda`, `--cad-hud-direita`
(`ui-canvas-cad { --cad-hud-base: 56px; --cad-hud-direita: 320px; }`). `definirMargensHud` grava as mesmas propriedades
no contêiner do mapa e, por isso, vence o CSS do host. `posicaoHud(largura, altura, margens)` (exportada) faz a mesma conta
em números. O app não precisa mais de `bottom: 56px !important`.

## Linha multiparte

`LineString` aceita várias partes, **sem tipo novo**:

```js
mesa.definirFeicoes('rios', [{
  id: 'r1',
  geometria: { tipo: 'LineString', partes: [[[-23.5, -46.6], [-23.5, -46.59]], [[-23.51, -46.6], [-23.51, -46.58]]] }
}]);
```

- Entrada: `coordenadas` (uma parte) **ou** `partes` (`LatLonPar[][]`). Se vierem as duas, `partes` vence.
- Normalizado: com uma parte só, vira linha simples (`{ tipo, coordenadas }`, sem `partes`); com 2+, vira
  `{ tipo, coordenadas: partes[0], partes }`. `coordenadas` sempre existe e é a primeira parte, então código que só lê
  `coordenadas` continua vendo uma linha válida. Partes com menos de 2 vértices válidos são descartadas; se nenhuma
  sobra e não há `coordenadas` válidas, a feição é recusada.
- Helpers (exportados): `partesDaLinha(g)` (sempre devolve todas), `ehMultilinha(g)`, `criarLinha(partes)`.
- Cobertura: desenho (uma polilinha Leaflet de várias partes), clique/hit-test (tolerância por parte), caixa Window (todas
  as partes dentro) e Crossing (alguma parte toca), laço, snap (vértices e arestas de **todas** as partes; nenhuma aresta
  liga uma parte à outra), métricas e rótulo (**extensão = soma das partes**), popup (extensão somada, vértices totais e
  "Partes"), simplificação por zoom (por parte), envelope, `obterFeicoes` e `duplicarFeicao` (desloca todas).
- Recusas com motivo claro: `editarVertices` → `cad-edicao-recusada` `multiparte` (como o polígono com furos);
  `juntarFeicoes` → `cad-uniao-falhou` `multiparte`; `dividir` só atua em polígonos (com só multilinhas selecionadas,
  `cad-divisao-falhou` `multiparte`); `gerarBuffer` de multilinha devolve `null` (exigiria união de polígonos).

## Lote e ordem das feições

```js
const r = mesa.aplicarLote('glebas', {
  remover:   ['g7', 'g8'],
  atualizar: [{ id: 'g1', propriedades: { nome: 'Nova' } }, { id: 'g2', estilo: { corTraco: '#f00' } }],
  adicionar: [novaGleba1, novaGleba2]
}, { substituirPropriedades: false });
// r = { adicionadas: 2, atualizadas: 2, removidas: 2, recusadas: ['id-ou-#posicao', ...] }
```

- **Uma regravação da camada e um `aposDados`** (seleção, popup e edição reconciliados uma vez; um `ui-camadas-alteradas`).
  Ordem de aplicação: remover → atualizar → adicionar. `opcoes` aceita as mesmas de `definirFeicoes`
  (`nome`, `zIndex`, `opacidade`, `interativo`, `estilo`; a camada só é criada se algo válido vai entrar) e
  `substituirPropriedades`.
- `recusadas`: geometria inválida (id, ou `#posição` sem id), atualização de feição que não existe, ou camada que não é
  de feições (nesse caso nada muda). Remover um id que não existe é ignorado em silêncio.
- **Ordem preservada:** `adicionarFeicao`/`aplicarLote` com um `id` que já existe **substitui no mesmo lugar**; antes a
  feição ia para o fim e mudava a ordem de empilhamento. Ids novos entram no fim, na ordem dada. Remover e readicionar
  no mesmo lote é uma feição nova e vai para o fim. Atualizar nunca muda a posição.
- **`atualizarFeicao` mescla `propriedades`** (e `estilo`): atributos que o app apagou ficam para trás. Passe
  `{ substituirPropriedades: true }` para a troca total (`propriedades` informadas substituem as atuais por inteiro; sem
  `propriedades` no item, nada muda; `{}` apaga todas). Vale também no lote.
- Desempenho (100 mil feições, uma edição ≈ 0,3–0,5 ms): [desempenho-feicoes.md](desempenho-feicoes.md).

## Oculta ≠ excluída

| | `excluida: true` | `oculta: true` |
|---|---|---|
| desenhada / clicável / hover / snap / caixa / laço | não | não |
| seleção (inclusive por `selecionarFeicoes`) | sai | sai (e não entra) |
| `ajustarTudo` / `ajustarCamada` | ignora | ignora |
| encerra a edição de vértices em andamento | **sim** | **não** (a feição em edição continua selecionada) |
| conta na regra oficial × prévia | não | **sim**, como as demais |
| continua nos dados (`obterFeicoes`, tabela, atualizações) | sim | sim |
| `zoomParaFeicao` | recusa | enquadra (a localização é um dado) |

O app mapeia `visible: false` → `oculta: true` e `is_deleted` → `excluida: true`.

## Estilo do texto e do ponto

Texto com **selo** (etiqueta): `estilo.corFundo` liga o selo e substitui o `halo`.

| Campo | Efeito |
|---|---|
| `corFundo` | fundo do selo (hex, `rgb()/hsl()` ou nome; qualquer outra coisa é ignorada e não há selo) |
| `opacidadeFundo` | 0 a 1, padrão 0,85; só o fundo (a borda e o texto ficam opacos) |
| `corBorda` | borda de 1 px do selo; sem ela, sem borda |
| `raioBorda` | cantos em px, 0 a 50, padrão 4 |
| `tamanhoFonte` | já existia |

Ponto circular (sem `icone`): `estilo.corContorno` e `estilo.espessuraContorno` (0 = sem contorno) definem o contorno
**separado** do preenchimento (`corPreenchimento`). Sem eles, nada muda (contorno = `corTraco`/`espessuraTraco`).
Selecionado, o contorno vai para a cor de seleção. Todas as cores passam por `corSegura` e os números só valem se finitos.

## Ferramentas: o que mudou

- **Régua com 3+ pontos:** `medir-distancia` mostra no HUD também **área e perímetro** do contorno fechado, e o
  `cad-medicao` final traz `areaM2` e `perimetroM` (`comprimentoM` segue sendo o comprimento aberto). Nada é criado.
  `medir-area` não mudou.
- **Círculo:** raio mínimo de **2 m** (`RAIO_MINIMO_CIRCULO_M`); abaixo disso o clique é ignorado (e a prévia não aparece).
  Dados de entrada continuam aceitando qualquer raio positivo.
- **Popup, "copiar":** `definirOpcoesPopup({ copiarParaAreaDeTransferencia: false })` para o app controlar o toast sem
  escrita dupla; o `cad-feicao-acao` sai sempre.
- **Texto:** `cad-texto-solicitado` cancelável para usar modal próprio ([eventos](canvas-cad-eventos.md#cad-texto-solicitado-texto-com-modal-próprio)).
- **Ordem de eventos:** garantias em [canvas-cad-eventos.md](canvas-cad-eventos.md#ordem-dos-eventos-nas-ferramentas-de-desenho-garantias).

## Coordenada (0, 0)

A normalização de feições rejeita **(0, 0) exato** (placeholder de erro, "Null Island"). Quem tem dados reais ali liga
`aceitar-origem` (atributo ou propriedade `aceitarOrigem`; padrão `false`). Vale para `definirFeicoes`, `adicionarFeicao`,
`atualizarFeicao`, `aplicarLote`, cursores remotos e `iniciarEm`. As funções puras aceitam
`{ aceitarOrigem: true }` como último parâmetro (`normalizarFeicaoEntrada`, `normalizarCoordenada`, `parseCoordenada`...).
Continuam rejeitados: `NaN`, `Infinity` e UTM plano.

## Fica de fora (continua no app)

- **Persistência e sincronização**: o componente não grava nada; use os eventos `cad-feicao-criada`, `cad-feicao-atualizada`,
  `cad-feicao-dividida` e `cad-feicao-unida`.
- **Pontos, segmentos, vizinhos e SIGEF** continuam pela API antiga (`pontos`, `segmentos`, `confrontantes`, `plotar*`), com o
  popup e os eventos antigos (`ui-ponto-selecionado`). As duas APIs convivem no mesmo mapa.
- **União booleana de polígonos sobrepostos**, **polígonos multiparte**, **edição de vértices de linha multiparte** e
  **de polígonos com furos** (use a tabela de vértices do app; o componente avisa com `cad-edicao-recusada`). Linha
  multiparte é suportada para exibir, selecionar, medir e snapar (ver [Linha multiparte](#linha-multiparte)).
- Os consumidores internos do app (`AppComponentsBuilder`, `ShortcutsController`, `MapImageExporter` etc.) são código do
  GerenciGeo, fora deste repositório: troque as chamadas ao `MapEngine` pelas desta tabela.
