# Changelog

## 2.11.0 — 2026-10-23

### `<ui-canvas-cad>`: volta a revisão dos modos de edição da 2.4.0

A 2.4.0 e a 2.4.1 foram publicadas no npm, mas a revisão da edição de formas que elas traziam não entrou na 2.5.0 nem nas versões seguintes. Esta versão a traz de volta, portada para os módulos extraídos depois (`cad-feicoes-edicao.ts`, `cad-feicoes-ponteiro.ts` e o novo `cad-feicoes-teclado.ts`) e combinada com a edição da 2.10.0 (alças latentes, ponto médio arrastável, dica do HUD).

**Novidades**

- **Desfazer/refazer/cancelar na edição**: Ctrl+Z, Ctrl+Shift+Z / Ctrl+Y e botões no HUD (100 gestos); **Cancelar** volta à geometria de quando a edição começou. Mudar a geometria por fora recomeça o histórico.
- **Nó selecionado**: clique na alça destaca o nó; Delete/Backspace ou "Excluir nó" o exclui. Recusas (mínimo de nós, ponto, círculo) avisam no HUD.
- **Mais formas de entrar na edição**: **Enter** com uma só feição editável selecionada e botão **Editar** na barra (`ferramentas="editar"` ou `"todas"`; reflete a edição em curso com `aria-pressed`). `cad-edicao-recusada` ganha o motivo `sem-selecao` (botão Editar sem uma feição selecionada), com aviso visível.
- **Novo evento `cad-feicao-duplo-clique`** (cancelável, `{ camadaId, feicao, coordenada }`). O duplo clique sobre a feição continua abrindo o popup, como na 2.8.1 (na 2.4.0 ele abria a edição). Com `preventDefault()` o consumidor assume o gesto, por exemplo chamando `editarVertices()`.
- **Retângulo**: arrastar um canto de um retângulo alinhado aos eixos mantém o retângulo (Shift solta).
- **Fantasmas** não aparecem em segmentos com menos de 24 px na tela e voltam ao aproximar o zoom.
- **Ferramentas de desenho avisam no HUD** quando recusam o clique (círculo abaixo de 2 m, cantos alinhados, centro repetido) ou quando Enter/duplo clique chega com pontos de menos.
- O HUD de edição passa a ter vários botões (Desfazer, Refazer, Excluir nó, Cancelar, Concluir): quem buscava o botão pelo seletor `#cm-vertex-edit-hud button` deve usar `[data-acao="concluir"]`.

**Correções**

- **Círculo**: o popup oferece o botão **Editar**; a alça da borda fica onde foi solta (antes voltava para o leste do centro).
- **Fantasma de inserção**: o duplo clique insere um vértice e não o converte mais em curva (`dblclick` até 600 ms depois da inserção é ignorado).
- **Camada ou feição fechada durante a edição**: ocultar, bloquear ou remover a camada, ou bloquear a feição, encerra a edição (`cad-edicao-concluida`) e tira alças e HUD.
- **Caneta**: o arraste da alça termina com o `mouseup` na janela; soltar o botão fora do mapa não deixa mais a alça seguindo o cursor.
- **Snap em curvas**: feição com `curva` atrai pelos nós (vértice) e pelo meio do trecho curvo; os vértices de apoio amostrados só valem como aresta.
- **Mudança externa no meio do arraste** (outro operador, API): a alça arrastada não é destruída; o gesto em curso vence ao soltar.
- **Tecla S** e **Enter** com vários canvases na página só valem no que está sob o mouse ou com foco. Com um único canvas nada muda.

## 2.10.0 — 2026-10-23

Junta à 2.9.0 o trabalho que tinha ficado fora do npm: o `<ui-area-texto>` e a lapidação dos textos (PR #10), a usabilidade do desenho e da edição de vértices, as curvas Bézier sempre à mão, o painel de camadas no estilo Adobe e a lapidação do `<ui-card>`.

### Novo: `<ui-area-texto>` (alias `<ui-textarea>`) para textos grandes

- Área de texto de várias linhas, form-associated (`name`, `value`, `required`, `minlength`/`maxlength`, `setCustomValidity`, `form.reset()`), com rótulo, ajuda/erro e os mesmos eventos do `<ui-campo-texto>` (`ui-input`, `ui-change`, `input`, `change`).
- `linhas` (1–50, padrão 4), `auto-altura` (cresce com o conteúdo, sem pular a rolagem da página) com `linhas-max` como teto, `redimensionar` (`nenhum`|`vertical`|`horizontal`|`ambos`) e `contador` (usa `maxlength` como limite).
- **Enter insere quebra de linha** e não submete o formulário. **Ctrl/Cmd + Enter** emite `ui-enviar` (`detail: { value }`).
- Acessibilidade: nome acessível pelo `label`, `aria-label` do host, `<label for>` ou `<label>` envolvente; `aria-required`; `aria-describedby` só com a ajuda visível; o contador avisa leitores de tela apenas quando muda de nível (perto do limite, atingido, excedido), não a cada tecla.
- API programática: `focus()`, `blur()`, `select()`, `setSelectionRange()`, `limpar()`, `readOnly`, `minLength`, `maxLength`.
- Parts: `rotulo`, `campo`, `input`, `rodape`, `ajuda`, `contador`. Exportado por `index`, `register` e `forms`.

### `<ui-texto>`: texto longo e lapidação

- **Novo `linhas`:** limita o texto a N linhas (1–50) com reticências; `truncar` continua tendo prioridade. Valores inválidos são ignorados.
- Palavras e URLs muito compridas passam a quebrar (`overflow-wrap`) em vez de estourar o contêiner; `alinhamento="justificado"` usa hifenização.
- O elemento interno expõe `part="base"`. Sem DOM (SSR) o componente fica inerte, sem casts `any`.

### `<ui-campo-texto>`: lapidação

- **`minlength`/`maxlength` inválidos** (`abc`, vazio, negativo) eram repassados ao `<input>` como `NaN`; agora são ignorados, e os getters `minLength`/`maxLength` devolvem `-1` em vez de `NaN`.
- Acessibilidade: `aria-required` no campo obrigatório; `aria-describedby` só referencia a ajuda enquanto ela está visível; a ajuda/erro é uma região `aria-live="polite"`, então mensagens de erro passam a ser anunciadas.
- Ouvintes via `ListenerBag` e temporizador de sincronização cancelado ao desconectar/reconectar (sem `any`).

### Núcleo

- `core/opcoes`: `escolherInteiro` e `inteiroOuNulo` convertem atributos numéricos hostis (`NaN`, `Infinity`, texto, fora da faixa) em inteiros seguros. `sincronizarFeedbackErro` aceita `<textarea>` e um prefixo de classe opcional (padrão inalterado).

### `<ui-canvas-cad>`: usabilidade do desenho e da edição de vértices



- **Esc voltava a falhar depois do primeiro popup.** O Leaflet mantém `map._popup` apontando para o último popup mesmo fechado, e o atalho de teclado do mapa engole o Esc enquanto essa referência existe: com o foco no mapa, o Esc deixava de encerrar a edição de vértices, cancelar a figura em desenho e limpar a seleção. O mapa agora solta a referência no `popupclose` (`src/gerencigeo-canvas/popup_residual.ts`); popup aberto continua fechando com Esc.

- **Enter em botões durante o desenho.** Com uma ferramenta ativa, o Enter era tratado como "concluir" mesmo com o foco num botão (barra de ferramentas, "Sair" do HUD), e o clique do botão não acontecia. O Enter agora fica com botões, links e controles com `role` acionável (`focoEmControleAcionavel`, em `src/core/alvo-digitavel.ts`).

- **Ferramenta ou edição recusada agora avisa.** Sem camada de desenho (ou com camada bloqueada/inválida), e ao recusar a edição de uma feição (bloqueada, com furos, multiparte...), o componente mostra um aviso visível por 5 s e o anuncia na região viva, além de emitir `cad-desenho-recusado`/`cad-edicao-recusada` como antes. **Novo atributo `sem-avisos`**: o consumidor que mostra o próprio aviso a partir dos eventos desliga o do componente.

- **Ponto médio arrastável na edição de vértices.** Arrastar o ponto médio de uma aresta cria o nó já na posição solta (com snap, prévia e HUD ao vivo e um único `cad-feicao-atualizada`); o clique continua inserindo no meio da aresta. Em feição com curva, o nó nasce sobre o traçado e a curva é mantida (antes, inserir um nó numa curva a convertia em poligonal). A dica do HUD passou a mencionar inserir e excluir.

- **Toque.** Um toque que começa numa alça de edição, num ponto médio ou nos HUDs não move mais o mapa junto; alças de Bézier passam a ser tratadas como as demais alças pelo mouse (não iniciam caixa de seleção).

- Testes de regressão em `tests/ui-canvas-cad-edicao.regressao.test.ts`.

### Canvas CAD: curvas (Bézier) sempre à mão



- **Editor de vértices**: as alças de Bézier agora aparecem **sempre**, inclusive em linhas/polígonos retos (alças latentes pontilhadas a 1/3 do vizinho, até 40 nós). Arrastar uma alça converte o nó em curva; `Shift` solta a simetria.

- **Caneta**: as alças das âncoras já colocadas podem ser **ajustadas durante o desenho** (arraste a alça, ou a própria âncora para criar/ajustar a curva dela). `Shift` solta a simetria; o cursor muda ao passar sobre uma alça.

- A dica do HUD de edição junta os gestos das duas mudanças acima (curvar pelas alças, ponto do meio, botão direito para excluir, duplo clique, Shift).

### `<ui-camadas>`: painel de camadas no estilo Adobe

- **Mudança visual:** os selos "✓ Ativa", "N SUB" e "OFICIAL" saem da linha da camada (a informação continua em `aria-current`, na dica da contagem e no marcador da prévia). Quem estilizava `.ui-active-badge`/`.ui-group-badge` precisa revisar.



- **Cor da camada editável**: clicar (ou Enter/Espaço) na barra de cor da linha abre o `<ui-seletor-cor>` ao lado, com prévia ao vivo, "cores do projeto" e Cancelar que restaura. Emite `ui-camada-cor` como antes.

- **Destaque de seleção na cor da camada**: a camada ativa, as feições selecionadas e o alvo de seleção usam a cor da camada (variável `--layer-active-color`, agora definida no grupo e herdada pelas feições).

- **Menos selos**: removidos "✓ Ativa", "N SUB" e "OFICIAL"; a camada ativa é indicada pelo destaque da linha (`aria-current`), a contagem vira um número discreto (a dica traz feições e subcamadas) e só a geometria prévia ganha um marcador.

- Alça de arraste mais estreita (8px, antes 14px).

- Colunas fixas (alça, olho, cadeado, barra de cor) alinhadas à esquerda em camadas, subcamadas e feições; só seta, miniatura e nome recuam com a profundidade, como no Illustrator. A barra de cor não se expande mais ao passar o mouse.

### `<ui-card>`: lapidação



- **Teclado:** Enter/Espaço vindos de um campo ou botão dentro do card não o ativam mais nem têm o `preventDefault` aplicado (antes era impossível digitar espaço num `<input>` dentro de um card `clicavel`). Tecla mantida (`repeat`) e atalhos com Ctrl/Alt/Meta não ativam.

- **Cliques internos:** o clique num ícone SVG dentro de um botão (alvo `<path>`) passou a ser reconhecido como de controle interno; `label`, `summary`, conteúdo editável, `ui-campo-texto` e `ui-segmented` também. Um `<a>`/`<label>` que *envolve* o card não o bloqueia mais.

- **Acessibilidade:** `aria-label` do host dá nome ao card clicável; `focus()` no host foca o card; anel de foco visível (`:focus-visible`, contorno que sobrevive ao modo de alto contraste).

- **Estilo:** o atributo `hidden` passa a esconder o card (o `display: block` do host o anulava); o realce de hover vale só com `(hover: hover)`; `prefers-reduced-motion` desliga transições e deslocamento.

- **Seções:** `[slot="cabecalho|rodape|midia"]` aninhado em um descendente não revela mais a seção do card (só filhos diretos).

- Lógica extraída para `card-interacao.ts` e `card-secoes.ts`; JSDoc de atributos, slots, parts e evento para o manifesto. API pública inalterada (novo observado: `aria-label`).

## 2.9.0 — 2026-10-23

### Junta a 2.8.2 com a linha 2.6.1–2.8.1

- **Atenção a quem instalou a 2.8.2:** ela foi publicada a partir de um branch baseado na 2.6.0 e **não continha** o que saiu na 2.6.1, 2.7.0, 2.8.0 e 2.8.1 (entre outros: `<ui-linha>` e a altura única dos controles; popups e câmera só a pedido no `<ui-canvas-cad>`; busca por nome de camada e mapa base recolhível no `<ui-camadas>`; as correções de robustez e acessibilidade da 2.7.0 em `<ui-tooltip>`, `<ui-modal>`, `<ui-mapa>`, `<ui-tabela>`, `<ui-camadas>` e `<ui-canvas-cad>`). A 2.9.0 traz as duas linhas juntas: tudo da 2.8.1 mais tudo da 2.8.2 (medidas no elipsoide GRS80 e as pendências do ribbon e da paleta).
- As mudanças da 2.8.2 no `<ui-ribbon>` e na `<ui-paleta-ferramentas>` foram portadas para os módulos extraídos na 2.7.0: grupo colapsado, botão dividido e lançador de diálogo em `ribbon-render.ts` (os cliques seguem delegados pelo painel); ativação manual das abas em `ribbon-teclado.ts` (`acaoDaTeclaAba` ganha a ação `ativar`); atalhos compostos e a paleta "dona" dos atalhos em `paleta-atalhos.ts` (`resolverAtalho` aceita o evento de teclado; `paletaDonaDosAtalhos`).

### `<ui-canvas-cad>`: desenho de muitas formas (Fases 0 e 1 do motor de formas)

- **LOD por tamanho em pixels:** feição (linha, polígono, círculo) com diagonal abaixo de 3 px na tela deixa de ser um objeto Leaflet e vira uma **marca de 1–2 px** na cor do preenchimento/contorno, pintada em lote por cor num canvas por camada (`feature_lod.ts`, `renderers/marcas_lod_layer.ts`). O mapa não fica "furado". Sempre em detalhe completo: selecionada (e em edição), com rótulo e em par oficial × prévia; ponto e texto nunca viram marca. Hit-test, snap, caixa, laço e hover seguem na geometria original, então uma feição de 1 px continua clicável. Reavaliado ao mudar de zoom, não a cada pan.
- **Seleção incremental:** `aplicarSelecao` deixou de reconciliar a camada inteira. Só as feições que mudaram de estado são tocadas, e só no estilo (`setStyle`/`setIcon`, sem `setLatLngs`); a camada só é reconciliada quando há ponto sob agrupamento (selecionado sai do cluster). Selecionar 1 feição em 100 mil: de ~60 ms síncronos para ~6 ms (medido no navegador).
- **Simplificação em pixels:** a tolerância de 1,2 px passa a valer para feições com **mais de 8 vértices** (antes 40) em **qualquer zoom abaixo de 17** (antes 12). `simplificarLinha`/`simplificarAnel` ganham o parâmetro opcional `escalaLat` e a tolerância deixa de ser 1/cos(lat) vezes maior na vertical (2× a 60° de latitude).
- **Instrumentação:** `FeicoesLayerRenderer.estatisticas()` ganha `marcasLOD` e `avaliacoesLOD`; novo `idsDesenhados()`. Página de benchmark `bench/bench-formas.html` (rAF por canal de mensagens e `getImageData`, dados sintéticos com semente fixa) para medir mudança de vista, seleção e ocultar/exibir no navegador.
- **Correções (Regra #0):** `feicaoNoPonto` estourava a pilha (`Math.max(...xs)`) em polígono com ~120 mil vértices ou mais; `toleranciaPorZoom(NaN)` colapsava geometrias a 2 pontos; uma feição que o Leaflet recusa (coordenada NaN) derrubava a reconciliação da camada inteira e agora fica sem desenho.

**Mudanças de comportamento**

- Feições minúsculas não estão mais em `grupo.getLayers()` nem em `map._layers`: quem contava camadas Leaflet para medir desenho deve usar `estatisticas()` (o app usa `map._layers` só no benchmark).
- O desenho de feições com mais de 8 vértices é mais simplificado (até 1,2 px de desvio) abaixo do zoom 17. A geometria da feição nunca é alterada.
- O clique numa marca passa pelo hit-test central do mapa (`layer_hit_test`: nova `FonteHit`), não por um objeto Leaflet: uma ação `feicao-clique` por clique, com a mesma ordem das formas (linha antes de área, camada do topo, menor área) e alternância em cliques repetidos sobre marcas empilhadas (até 20).
- Cada camada com marcas ganha um canvas extra (removido quando não há marcas). Não foi consolidado nesta fase.

### Motor das formas headless e renderizador Canvas opt-in (Fases 2 e 3)

- **Novo atributo/propriedade `renderizador`** em `<ui-canvas-cad>`: `leaflet` (padrão, inalterado) ou `canvas`. Com `canvas`, as camadas de feições são desenhadas por um motor próprio em Canvas 2D em vez de um objeto Leaflet por feição. Trocar o valor em tempo de execução recria só as camadas de feições (`CanvasLayerManager.recriarCamadasDoTipo`), mantendo dados e seleção. Valor inválido cai em `leaflet`. Guia: [`docs/motor-formas.md`](docs/motor-formas.md).
- **`estatisticasFeicoes(camadaId)`:** contadores da camada desenhada (`total`, `materializadas`, `marcasLOD`, `clusters`, `avaliacoesLOD` e, no caminho canvas, `desenhadas`, `marcadoresDom`, `canvases`; mais `renderizador`), para diagnóstico e benchmark. `null` se a camada não está desenhada.
- **Motor headless** (`src/gerencigeo-canvas/motor/`, L2, sem DOM e sem Leaflet; roda em Node e serve para Web Worker): `MotorFormas` com `definirCamada`, `definirFeicoes`, `aplicarDelta`, `listaDesenho(vista, { camadas, parte })`, `listaSobreposicao`, `consultarCaixa`, seleção, `previsualizar`, `destacar` e clusters. Estilo resolvido compartilhado pelos dois renderizadores (`estilo.ts`), geometria em `Float64Array` com projeção própria e Douglas-Peucker em px (`geometria-px.ts`), loja + índice + oficial × prévia (`dados-camada.ts`).
- **Novo entrypoint `@thibezer/ui-components-kit/motor`** (`src/motor.ts`): o motor sem o componente. O `check-layers` garante que nada alcançado por ele importa `leaflet` (`dist/motor.js` não importa).
- **Renderizador Canvas** (`renderers/renderizador_formas.ts`, `PintorCanvas2D`): pinta forma a forma, agrupado por estilo, com recorte. **Pan incremental** (`renderers/canvas_formas_leaflet.ts`): o bitmap é deslocado em pixels de mundo e só as faixas expostas são listadas e pintadas. Seleção, hover e edição vão para uma sobreposição única por mapa, sem repintar a base. Clique e hover passam pelo hit-test central (`FonteHit`).
- **Números com GPU** (máquina do dono, canvas × leaflet intercalados; tabelas em `docs/RELATORIO-motor-formas.md`): o canvas fica de 2 a 6 vezes abaixo do leaflet em todos os tamanhos. Mudança de vista: 20 mil em zoom 12, 90–222 contra 473–676 ms; 100 mil em zoom 15, 166–197 contra 811–1 652 ms. Selecionar 2 000 feições numa camada de 50 mil: 114 contra 1 316 ms. As metas absolutas do prompt (zoom 12: 20 mil ≤ 60 ms, 50 mil ≤ 100 ms, 100 mil ≤ 200 ms) não foram atingidas.
- **Desempenho do caminho canvas:** o item da marca de LOD fica em cache por zoom e é reaproveitado no pan enquanto feição, estilo da camada, seleção e destaque não mudam (lista de 100 mil marcas em zoom 12: de ~390 para ~140 ms por mudança de vista, no Node). Canvas em branco (camada sem nada na vista, sobreposição sem seleção) não é mais deslocado, limpo nem redimensionado a cada pan: cada chamada de desenho fazia o navegador reenviar o canvas inteiro ao compositor (1 000 formas em zoom 18: de ~130 para ~30 ms por pan, medido sem GPU). Camada com até 500 itens na vista é repintada inteira no pan em vez de ter o bitmap deslocado (`CanvasFormas.limiteRepintar`, ajustável; também por instância): com poucas formas, deslocar o bitmap de 3072×1920 custava 3–5× mais que repintar e deixava o canvas mais lento que o leaflet (1 000 formas em zoom 12: de ~200 para ~60 ms).
- **Correções** achadas pela suíte de equivalência: marca de LOD antiga ficava na tela quando a feição passava a ponto agrupado (também no caminho `leaflet`); ícone selecionado ou único restante numa célula de cluster sumia no caminho canvas.

**Mudanças de comportamento do caminho `canvas`** (o caminho `leaflet` não muda)

- Preenchimento translúcido é pintado forma a forma: polígonos sobrepostos da mesma camada continuam escurecendo onde se cruzam, como no Leaflet. A ordem de desenho dentro da camada é por grupo de estilo, não por ordem de inserção.
- Há um canvas por camada de feições mais uma sobreposição por mapa (não 2 canvases no total). Opacidade e visibilidade seguem o pane da camada; a sobreposição ignora a opacidade da camada (a seleção aparece sempre cheia).
- Curvas Bézier (`LinhaCurva`/`PoligonoCurvo`), ícone, texto, cluster e rótulo continuam como objetos/marcadores Leaflet dentro do mesmo renderizador.
- As feições não aparecem em `grupo.getLayers()` nem em `map._layers`; use `estatisticasFeicoes()`.

## 2.8.2 — 2026-10-23

> Publicada a partir de um branch baseado na 2.6.0: não inclui a 2.6.1, a 2.7.0, a 2.8.0 nem a 2.8.1. Use a 2.9.0, que junta as duas linhas.

### Canvas de feições: medidas no elipsoide GRS80

- **Distância, comprimento e área** (`feature_metricas`) deixam a esfera de 6371 km: distância pela escala local do elipsoide (M e N) até 0,1° e Vincenty acima disso; área por Σ(λ[i+1]−λ[i−1])·sen φ·M·N/2. Antes o erro chegava a 0,5% na distância e 0,45% na área; agora fica abaixo de 0,01% na área e de 2e-7 na distância curta (linha Flinders–Buninyong confere em milímetros).
- **Deslocamentos, offsets e alça de borda do círculo** (`feature_algoritmos`, `feature_edicao_ops`) usam a mesma escala (`metrosPorGrau`, exportada), para o raio lido da alça bater com o desenhado.

### `<ui-ribbon>` e `<ui-paleta-ferramentas>`: pendências de UX, acessibilidade e robustez

- **Harmonização de bordas, raios e alinhamento vertical no Ribbon**: botões pequenos agora utilizam `--ui-raio-sm` (4px) com `padding: 0 8px` proporcional; colunas de ferramentas recebem `gap: 2px` evitando colisão de cantos arredondados entre itens adjacentes; botões grandes têm altura calibrada em 76px (equivalente a 3 slots de 24px + gaps) com área de itens centrada verticalmente; grupos sem rótulo não geram nó vazio, eliminando o espaçamento inferior fantasma e garantindo margens perfeitamente simétricas.
- **Tooltip estilizado leve (M2)**: substituição do `title` nativo do browser por tooltip no Shadow DOM exibido em `focus-visible` e `pointerover`, com renderização do atalho formatado (`kbd`). Remoção de `aria-label` duplicado em botões que já possuem rótulo visível.
- **Colapso automático de grupos no Ribbon (A4)**: suporte a `prioridade` em `RibbonGrupo` e colapso dinâmico via `ResizeObserver` quando o espaço é insuficiente, transformando o grupo em botão único com flyout (estilo Office).
- **Botão dividido e Lançador de Diálogo (M4)**: suporte a `item.dividido` no ribbon (ação primária + gatilho de menu independente) e botão lançador de diálogo opcional (`grupo.lancadorDialogo`) com emissão do evento `ui-grupo-dialogo`.
- **Atalhos compostos e escopo multi-paletas (M7/B9)**: suporte a atalhos combinados (`Ctrl+Z`, `Shift+V`, `Esc`, etc.) via `correspondeAtalho`. No ribbon, suporte ao atributo `atalhos` e `keytips` (Alt). Conflito entre múltiplas paletas com atalhos na mesma página resolvido via escopo de foco (`:focus-within`) e ordenação DOM.
- **Navegação em grade de 2 colunas (M9)**: em paletas verticais com `colunas="2"`, navegação bidimensional intuitiva com `ArrowUp`, `ArrowDown`, `ArrowLeft` e `ArrowRight` respeitando a ordem visual e layout RTL.
- **Ativação manual de abas (M10)**: atributo opt-in `ativacao-manual` e propriedade `ativacaoManual` no ribbon, onde setas apenas transferem o foco do teclado e Enter/Espaço ativam a aba.
- **Fechamento de menu no window blur (M8)**: removido fechamento indevido em `window blur` para permitir inspeção no DevTools e troca de janelas; menus fecham apenas por clique fora, `Escape` ou rolagem.
- **Exclusividade configurável de ferramentas no Ribbon (B8)**: suporte a `tipo: 'ferramenta'` com seleção única por grupo e propriedade `grupo.exclusivo` (padrão `true`, `false` para múltipla ativação).
- **Submenus aninhados**: suporte a múltiplos níveis de `filhos` dentro de `filhos` na paleta e no ribbon, com abertura/fechamento via `ArrowRight` e `ArrowLeft` (respeitando RTL).
- **Modo controlado sem mutação de dados (A1)**: propriedade `modoControlado` e atributos `modo-controlado` / `copiar-dados` para clonagem profunda na entrada, garantindo que objetos do consumidor não sofram mutações.
- **IDs em SVG inline e allowlist (B1)**: prefixagem de IDs em `<defs>` de ícones SVG (`url(#...)` e `href`) no `svg-seguro.ts` para evitar colisões no DOM, e aviso em console para elementos descartados pela allowlist.
- **SSR e prevenção de layout shift (B9)**: reserva de altura mínima no `:host` do ribbon para evitar Cumulative Layout Shift (CLS) antes da hidratação.

## 2.8.1 — 2026-10-21

### `<ui-canvas-cad>`: popups e câmera só a pedido (como CAD/GIS)

- **Popups sob demanda (mudança de comportamento):** clicar numa feição, vértice, linha ou polígono **não abre mais o popup nem move o mapa** (o Leaflet abria no clique e fazia auto-pan). Abrem com **duplo clique** sobre a camada, por `abrirPopupFeicao(camadaId, id)` ou, no código, por `marcador.openPopup()` fora de um clique. Popups abertos a pedido não fazem auto-pan. Novo atributo/propriedade `popups`: `sob-demanda` (padrão), `automatico` (comportamento antigo: abre ao selecionar uma feição, com auto-pan e `definirMargensPopup`) e `desligado` (clique e duplo clique não abrem). A consulta SIGEF segue abrindo ao clicar (é um pedido explícito). No modo sob demanda, terminar a edição de vértices não reabre o popup.
- **Implementação:** `popup_gate.ts` (`PortaoPopups`, `liberarPopups`, `lerModoPopups`) intercepta `map.addLayer` só para popups e separa clique do mouse de abertura pelo código; `FeicaoPopup` aceita `liberar`; `PonteiroFeicoes.duploClique` e `GerenciadorFeicoes.abrirPopupFeicao`/`aoDuploClique`.
- **`selectPonto(id)` / `selecionarPonto(id)`:** só seleciona. Antes recentralizava o mapa sempre e abria o popup; agora isso acontece apenas com `zoomLevel` informado (pedido de "ir até o ponto").
- **Zoom em passos finos:** `zoomSnap: 0.25`, `zoomDelta: 0.5`, `wheelPxPerZoomLevel: 90` (antes 1, 1 e 60: cada giro da roda saltava um nível inteiro). Zoom fracionário é aceito por simplificação, clusters, densidade e pré-carga de tiles.
- **Botão do meio:** o duplo clique que enquadra (`zoomExtents`) agora exige dois cliques limpos; dois arrastes rápidos em sequência (pan) não enquadram mais.
- **Toque:** removido o zoom próprio da pinça (passos de 1 nível, em paralelo ao `touchZoom` do Leaflet, que também reagia ao mesmo gesto). Um dedo continua arrastando.
- **Não mudou:** `zoomParaFeicao(s)`, `ajustarTudo`, `ajustarCamada`, `fitBounds`, clique em cluster, ação "zoom" do popup e o botão "Enquadrar" seguem como pedidos explícitos. `zoomExtents` continua considerando só os vértices (não as feições).

### `<ui-camadas>`: busca, espaço da lista e documentação de eventos

- **Busca por nome de camada (correção):** o campo "Buscar camada ou feição" só filtrava feições; buscar `eixos` deixava todas as camadas na tela com "Nenhum item correspondente", inclusive a que casava. Agora a árvore mostra só camadas que casam (pelo nome) ou que levam a um resultado, mantendo os grupos ancestrais; um grupo que casa traz suas subcamadas; sem resultado há uma mensagem única (termo escapado). Nova função pura `filtrarCamadasPorBusca()` em `camadas-selecao.ts`; a seleção em intervalo (`Shift`) segue as mesmas linhas.
- **Mapa base recolhível:** novo atributo/propriedade `mapas-base-recolhido` / `mapasBaseRecolhido`, e o cabeçalho "Mapa Base" vira botão (`aria-expanded`) que mostra o mapa ativo. Novo evento `ui-mapas-base-recolhimento` (`{ recolhido }`), só para ação do usuário. Padrão inalterado (aberta).
- **Espaço da lista:** `.ui-panel-box` passa de `min-height: 80px` para `140px`, para a árvore não ficar espremida por rodapé e mapas base em painéis `docked` baixos (o corpo rola abaixo disso).
- **Documentação:** `ui-camada-grupo-adicionar` é emitido com `{ isGroup: true }` (o README dizia `{ grupoId, nome }`); `ui-camada-adicionar` (`{}` ou `{ parentId }`) passa a constar na tabela. Ambos são pedidos: sem handler no aplicativo, os botões não criam nada.

## 2.8.0 — 2026-10-17

### Controles na mesma linha: altura única e `<ui-linha>`

- **Novo `<ui-linha>`** (L3): contêiner que alinha botão, campo, lista, segmented e badge na mesma linha. `tamanho`/`densidade` (`sm|md|lg`), `altura`, `alinhar`, `justificar`, `espaco`, `sem-quebra`, `inline`; filhos ganham largura natural (botão e campo deixam de ocupar 100%), campos e listas ocupam o espaço restante e qualquer filho aceita `expandir`.
- **`tamanho`, `densidade` e `altura` agora funcionam** em `ui-botao`, `ui-campo-texto`, `ui-lista-flutuante` e `ui-segmented` (o README já os documentava, mas só `altura` tinha efeito). Lógica única em `src/core/altura-controle.ts` (exportada em `core`): entrada hostil é descartada, `altura` é limitada a 15–200px.
- **`ui-segmented` segue `--ui-campo-altura`** (antes tinha alturas fixas de 28/36/42px, o que o desalinhava do botão e do campo). O host passou a `inline-flex` com `vertical-align: middle`. `tamanho` inválido não vira mais classe CSS arbitrária (cai em `md`).
- **Escala de tokens** `--ui-altura-sm|md|lg` (26/34/42px). **Mudança de comportamento:** a altura padrão dos controles passou de 15px para `--ui-altura-md` (34px), o valor que o README já descrevia como padrão. Quem quiser o antigo define `--ui-campo-altura: 15px`.
- **`ui-badge[controle]`** assume a altura dos controles (e o alvo de toque mínimo no mobile).
- Hosts `inline` de botão, campo e lista ganharam `vertical-align: middle`.
- Teste de contrato `tests/contrato-linha.test.ts` + regressões; guia em `docs/layout-linha.md`.

## 2.7.0 — 2026-10-17

### `UIBus`: independente do componente de toast

- `src/core/ui-bus.ts` (L1) deixou de importar `ui-alerta` (L3). Novo `UIBus.registrarProvedorToast(fn | null)`; o `ui-toast` se registra sozinho ao ser carregado (`registrarToastNoBus()`).
- **Mudança de comportamento:** quem importar apenas `core/ui-bus` sem carregar `ui-alerta` (ou o pacote principal) passa a ter `UIBus.notificar()` como no-op, sem erro. Exceções do provedor são capturadas (`console.error`).
- Contratos `UIToastOpcoes`/`UIToastAcao` movidos para `src/core/tipos-toast.ts` e reexportados por `ui-alerta` (nomes públicos inalterados).

### `<ui-ribbon>`, `<ui-paleta-ferramentas>` e `<ui-tabela>`: organização interna

- **Sem mudança de comportamento nem de API.** Teclado, renderização, clique longo, atalhos, rolagem de linhas e estados (erro, anúncio do filtro, aria) passam a viver em módulos próprios com testes unitários.

### Componentes simples e de formulário: robustez e acessibilidade

- **`<ui-skeleton>`:** `linhas` é limitado a 100 (um valor enorme derrubava a página). Decorativo por padrão (`aria-hidden`); com `aria-label` vira `role="status"`.
- **Classes por atributo:** `variante`, `cor`, `peso`, `alinhamento` (`ui-texto`), `elevacao` (`ui-stat`, `ui-card`), `variante`/`estilo` (`ui-badge`) só aceitam valores conhecidos; qualquer outro usa o padrão (antes, o texto virava classes CSS arbitrárias).
- **`<ui-avatar>`:** host com `role="img"` e `aria-label` (nome, e o status quando houver) ou `aria-hidden` sem nome; **a imagem interna agora tem `alt=""`** (antes `alt` = nome ou "Avatar"). `aria-label`/`aria-hidden` do consumidor são respeitados. Tamanho numérico aceito entre 8 e 512 px.
- **`<ui-stat>`:** grupo rotulado e indicador de variação como imagem nomeada. **`<ui-card clicavel>`:** `role="button"`, `aria-disabled`. **`<ui-badge>`:** `disabled` desativa o ✕; nome acessível "Remover …".
- **`<ui-radio>`:** o grupo agora acompanha `setAttribute('name')` depois de conectado, mudança de nome e remoção do formulário; o primeiro radio habilitado entra na ordem de Tab.
- **`<ui-checkbox>`, `<ui-switch>`, `<ui-radio>`:** `focus()` no host foca o controle; checkbox e radio passam a respeitar `<label for>`, `<label>` envolvente e `aria-label` (como o switch).

### `<ui-tooltip>` e `<ui-modal>`: correções de comportamento

- **`<ui-tooltip>`:** o clique no gatilho deixa de ser interrompido (`stopPropagation`) e volta a chegar aos ouvintes de ancestrais; `disabled` fecha o balão aberto (e `aberto` + `disabled` não o mostra); ambientes sem `matchMedia` não lançam; o quadro de animação do posicionamento é cancelado ao fechar/desconectar.
- **`<ui-modal>`:** `Shift+Tab` no botão de fechar agora leva ao último controle do conteúdo (antes o foco escapava do modal); `Tab` no último controle volta ao primeiro. O foco real é lido atravessando Shadow DOMs.
- Ouvintes globais de ambos passam a ser gerenciados por `ListenerBag`. Sem mudança de API.

### `<ui-camadas>`: arrastos interrompidos e organização interna

- Desconectar o painel durante a pintura de controles (olho, cadeado, seleção) deixava `user-select: none` no `body` da página e ouvintes em `window`; o gesto agora é cancelado. O mesmo vale para o arraste por toque de camadas.
- Dados com ciclo de `parentId` não travam mais a verificação de descendência ao aninhar camadas por arraste.
- **Sem mudança de API.** Código dividido em módulos de responsabilidade única (renderização, seleção, lembrança, coleções, regras de soltar, renomear, miniaturas e hierarquia).

### `<ui-mapa>`, `<ui-mapa-marcador>` e `<ui-mapa-linha>`: robustez e acessibilidade

- **Segurança:** `cor` do `<ui-mapa-marcador>` era interpolada em HTML/estilo do ícone (injeção de atributo). O ícone agora é montado com DOM e `cor` só aceita hex, `rgb()`/`hsl()` ou nome de cor; outro valor usa a cor padrão (`#00f5a0`; `#3388ff` na linha).
- `lat`, `lng` e `zoom` inválidos (ou fora de -90..90, -180..180, 0..22) caem no padrão em vez de lançar; `espessura` inválida usa 3.
- Desconectar o `<ui-mapa>` antes de o Leaflet carregar não cria mais um mapa órfão. `<ui-mapa-linha>` reaparece quando o mapa é recriado e ignora pares inválidos em `pontos`.
- **Acessibilidade:** o mapa é uma região com nome (`aria-label` do host, padrão "Mapa"; o atributo passa a ser observado); marcadores são focáveis por teclado (`role=button`) e usam `titulo` como nome acessível.

### `<ui-canvas-cad>`: organização interna e acessibilidade

- **Sem mudança de API.** `GerenciadorFeicoes` virou fachada sobre módulos de responsabilidade única (`cad-feicoes-dados`, `-operacoes`, `-versoes`, `-camera`, `-desenho`, `-edicao`, `-consulta`, `-ponteiro`, `-selecao-regiao`, `-tipos`); tipos do Leaflet em `tipos.ts`, `cad-leaflet-adaptador.ts` e `cad-selecao-pontos.ts` substituem casts `as any`.
- **Acessibilidade:** o canvas é uma região nomeada ("Mapa CAD"), a barra rápida é uma `toolbar` com botões nomeados, o botão de snap expõe `aria-pressed` e uma região viva anuncia a seleção ("2 feições selecionadas") e a ferramenta ativa.

### Ferramentas de arquitetura

- `scripts/check-layers.mjs` verifica o DAG L0→L5 resolvendo imports (estáticos, de efeito colateral, re-exports e dinâmicos); `npm run gate` / `gate:full` agrupam as verificações.

## 2.6.1 — 2026-10-17

### `<ui-controle-cores>` e `<ui-seletor-cor>`: revisão de erros e visual

**Correções**

- O botão "sem cor" ficava por cima da amostra do traço e roubava os cliques da metade inferior esquerda dela. As ações (inverter, sem cor, restaurar padrão) agora ficam numa coluna ao lado das amostras, cada uma com a própria área de clique, sem sobreposição.
- `desabilitado` agora desativa todos os botões (antes só bloqueava o mouse: Tab + Enter ainda inverter/limpar/restaurar) e fecha um seletor aberto; remover o atributo reativa o controle.
- Trocar o alvo pelo controle (`alternarAlvo()`, `definirAlvo()`, clique na outra amostra) agora acompanha a aba do seletor aberto, em vez de deixá-las divergentes.
- `fecharSeletor(false)` agora cancela de verdade: as cores iniciais voltam (com um `ui-cores-change` não confirmado) em vez de ficar a pré-visualização aplicada sem nenhuma confirmação.
- `ui-alvo-change` não é mais emitido em duplicidade no documento (o painel do seletor deixou de repassá-lo ao abrir pelo popover; use `aoTrocarAlvo`).
- Espaço/Enter na amostra ativa com o seletor aberto fecham como o clique, e o Espaço não fecha mais o painel recém-aberto em navegadores que disparam o clique ao soltar a tecla.

**Acessibilidade**

- `abrirSeletorCor({ focar: true })` leva o foco ao painel (o controle usa ao abrir por teclado); ao fechar, o foco volta para a âncora. O painel ganha `aria-label` e as amostras da paleta `aria-pressed`.
- O grupo de amostras é anunciado como "Cores de desenho"; a dica/`aria-label` do preenchimento informa a opacidade.

**Visual**

- Amostras maiores (`--ui-controle-cores-amostra`, padrão 26px), coluna de ações alinhada, ícone "padrão" refeito e anel de foco visível.
- Ambos os componentes passam a usar os tokens do kit (`--ui-cor-texto`, `--ui-cor-borda`, `--ui-cor-primaria`…) e acompanham o tema claro; antes eram fixos no escuro.
- Seletor: trilha da opacidade preenchida até o valor, rótulos ORIGINAL/NOVA sempre legíveis, diagonal de "sem cor" igual à do controle, aba de preenchimento "sem cor" com a diagonal vermelha, `prefers-reduced-motion` respeitado e painel reposicionado ao redimensionar a janela.

## 2.6.0 — 2026-10-17

### `<ui-ribbon>` e `<ui-paleta-ferramentas>`: contrato com o consumidor

- **Valor inicial pendente**: `aba-ativa` / `valor` definidos antes de `abas` / `ferramentas` são aplicados quando os dados chegam; `aba-ativa` reflete a aba realmente ativa.
- **`valor = ''` / `limpar()`** removem a seleção da paleta (`ui-change` com `item: null`). Novas propriedades `orientacao`, `colunas`, `tamanho` (paleta) e `compacto` (ribbon); `valor` reflete no atributo usado (`valor` ou `value`).
- **Eventos**: `ui-ferramenta` agora é cancelável (`preventDefault()` reverte toggle/seleção); `definirAbaVisivel` emite `ui-aba-change` quando a aba ativa muda; novo `ui-recolhido-change`; tipos dos eventos no `HTMLElementEventMap` (`FerramentaDetail`, `AbaChangeDetail`, `PaletaChangeDetail`, `RecolhidoChangeDetail`).
- **Foco e roving tabindex**: re-renderizações preservam o foco; o tabindex acompanha o botão focado; `atualizarItem` não recria o DOM para mudanças de estado (paleta) nem para itens de outra aba (ribbon).
- **Menu/flyout**: `menuitemcheckbox`/`menuitemradio` com `aria-checked`, `aria-controls`, foco devolvido ao botão, fecha ao rolar, `ArrowDown` com menu aberto foca o primeiro item.
- **ARIA**: abas/painel ligados (`aria-controls`/`aria-labelledby`), `aria-label` e `rotulo-abas` configuráveis, `FerramentaItem.rotuloAcessivel`, `aria-keyshortcuts`; o nome acessível não cai mais no `id` quando há `rotulo` ou ícone nomeado.
- **Paleta**: grupo pula filho desabilitado/separador; clique longo cancelado ao arrastar; `suprimirClique` não prende mais o clique seguinte; atalhos ignoram `role=textbox` e `aria-modal`.
- `console.warn` para ids duplicados, `ativar()`/`atualizarItem()`/`selecionarAba()` com id inválido.

## 2.5.0

### `<ui-tabela>`: robustez, modo remoto e ordenação

- **Render protegido**: exceção em `coluna.render` deixa só a célula vazia (com `console.error`); o scroll virtual não trava mais após um erro de render.
- **Modo remoto**: `fetchOpcoes` (headers, credentials...), `fetcher` (substitui o `fetch`), `carregarDoEndpoint()`/`recarregar()` resolvem `true`/`false` (antes `void`; nunca rejeitam) e `carregarDoEndpoint(url)` passa a guardar a URL como `src`. `ui-fetch-erro` ganha `origem` (`rede`, `http`, `json`, `render`) e `status`. Novo evento `ui-fetch-cancelado`. Abortar (desconexão ou nova requisição) libera `carregando`; mesma URL em andamento é reaproveitada (sem requisição duplicada ao registrar o elemento depois do HTML).
- **Ordenação**: `ui-sort` agora é cancelável (`preventDefault()` desfaz); atributo/propriedade `ordenacao-remota` para ordenar no servidor. `TabelaColuna.tipo` (`numero`, `data`, `booleano`, `texto`) e `TabelaColuna.comparador`. `Date`, `dd/mm/aaaa` (com `tipo: 'data'`) e booleanos ordenam pelo valor; `Intl.Collator` reutilizado; **nulos ficam sempre no fim** (antes iam para o início em `desc`).
- **Filtro**: ignora acentos; datas entram na busca; `TabelaColuna.textoFiltro` torna pesquisável o texto formatado por `render`; filtra antes de ordenar (mais rápido).
- **Dados do consumidor**: `colunas` é copiado (redimensionar não altera nem falha com objetos congelados/reativos/compartilhados; `tabela.colunas` devolve a cópia interna); entradas `null`/`undefined` em `dados` são descartadas.
- **Seleção**: `id` nulo não marca várias linhas; a identidade do objeto tem prioridade sobre a chave; novo `ui-selecao-atualizada` quando os dados recarregados trazem outro objeto do mesmo registro.
- **Cliques**: botões dentro do shadow DOM de custom elements na célula não selecionam a linha (`composedPath`).
- **Redimensionamento**: clique na alça sem arrastar não emite `ui-column-resize` (antes `"undefined"`); desconectar durante o arraste não bloqueia mais a ordenação; o popover só emite se a largura mudou.
- Eventos do `<ui-tabela>` documentados no README.

### `<ui-tabela>`: estética, usabilidade e acessibilidade

- **Cabeçalho**: sem as larguras fixas de 90px/70px; o vão texto-seta vem de `--ui-tabela-th-gap` (6px) e a seta de `--ui-tabela-th-icone` (16px). Só colunas ordenáveis têm ícone (dois chevrons, o ativo em destaque); `aria-sort="none"` nas ordenáveis inativas. O `sticky` ficou só nos `<th>`.
- **Tokens**: `--ui-tabela-zebra`, `--ui-tabela-hover`, `--ui-tabela-selecionada(-hover)`, `--ui-tabela-cor-foco`. Zebrado visível nos dois temas; texto do botão "Aplicar" usa `--ui-cor-texto-sobre-primaria`. `tabular-nums` e `--ui-fonte-base`.
- **Estados**: erro de carregamento visível (`part="erro"`, `role="alert"`, "Tentar novamente"; atributo `texto-erro`); overlay de carregamento com a cor do tema, `role="status"` e `texto-carregando`; vazio mantém o cabeçalho e o filtro sem resultado usa `texto-sem-resultados` (também anunciado a leitores de tela).
- **Linhas**: `cursor: pointer`, hover só com `(hover: hover)`, foco de teclado (cor do texto) distinto da seleção (primária), texto das células não é selecionado ao clicar (opt-in: `selecionar-texto`).
- **ARIA**: `role="grid"`, `aria-rowcount/colcount`, `aria-rowindex`, `aria-selected` (mantém `aria-current`), espaçadores `aria-hidden`, contêiner `role="region"` com o `aria-label`.
- **Redimensionamento**: toque/caneta (Pointer Events), traço visível em repouso, alça focável (`role="separator"`; ←/→ ajustam, Shift = passo maior, Enter abre o diálogo) e clique na alça não ordena. Diálogo de largura com rótulo, campo numérico, validação inline, posição dentro da janela e retorno do foco.
- `prefers-reduced-motion` (sem transições; spinner lento) e alvos de toque maiores com `pointer: coarse`. Removido o CSS morto do menu de contexto.

## 2.3.0 — 2026-10-14

### Novos: `<ui-controle-cores>` e `<ui-seletor-cor>` (entrada `@thibezer/ui-components-kit/cores`)

- **`<ui-controle-cores>`**: par de cores de desenho no estilo Illustrator. Preenchimento na frente, traço atrás; clique na amostra de trás a ativa, clique no alvo ativo (ou duplo clique, Enter, Espaço) abre o seletor. Botões de canto para inverter, "sem cor" no alvo ativo e restaurar o padrão (`padrao-preenchimento`/`padrao-traco`). Estado misto (`definirMisto()`, mostra `?`) e `so-traco` (esmaece o preenchimento).
- Ações do usuário emitem `ui-cores-change` com `{ preenchimento, traco, opacidade, alvo, confirmado, alterados, origem }` (`origem`: `seletor`, `inverter`, `sem-cor` ou `padrao`): `confirmado: false` é pré-visualização com o seletor aberto; na confirmação, `alterados` lista o que mudou desde a abertura. `definirCores()`, `definirAlvo()` e `definirMisto()` não emitem eventos.
- O kit não registra atalhos de teclado: a aplicação chama `alternarAlvo()`, `inverter()`, `semCor()` e `restaurarPadrao()` e pode mostrar as teclas nas dicas com `atalhos`.
- **`<ui-seletor-cor>`** + **`abrirSeletorCor({ ancora, ... })`**: painel flutuante com abas Preenchimento/Traço (modo `duplo`) ou cor única (`simples`), prévia antes × depois, hexadecimal, seletor do sistema, opacidade do preenchimento, cores do projeto, paleta padrão e "sem cor". Um aberto por vez; Concluir, ✕, Enter no hexadecimal, Esc e clique fora confirmam; **Cancelar restaura todas as cores iniciais** (preenchimento, traço e opacidade); `X` alterna o alvo.
- Utilitários: `normalizarCor()`, `normalizarOpacidade()`, `coresUnicas()`, `PALETA_CORES_PADRAO`.

## 2.2.2 — 2026-10-14

### `<ui-canvas-cad>`: edição de círculo

- `editarVertices` passa a aceitar `Circle`: alça no centro (move o círculo sem mudar o raio) e alça na borda (define o raio; mínimo 0,5 m). O HUD mostra raio e área ao vivo. `pontosDe`/`comPontos` e `pontoDaBordaDoCirculo` tratam o círculo.

### `<ui-camadas>`: arraste sobre controles

- Clicar e arrastar sobre a coluna de olho, cadeado ou seleção aplica a todos os controles percorridos o estado resultante do primeiro, em vez de reordenar a camada.

## 2.2.1 — 2026-10-14

### `<ui-camadas>`: miniatura da feição fiel à geometria

- A miniatura ao lado do nome da feição desenha a geometria real (polígonos com furos, linhas, multi-geometrias), enquadrada com proporção preservada; sem coordenadas, usa o ícone genérico.
- Miniatura maior (20px; 17px no modo compacto).

## 2.2.0 — 2026-10-14

### `<ui-canvas-cad>`: curvas de Bézier de verdade

- A **caneta** deixou de quebrar a curva em trechos retos. Linha e polígono ganham `curva` (lista de nós `{ ponto, entrada?, saida? }`, alças em coordenadas absolutas); o desenho é calculado a cada zoom (`bezierCurveTo` no canvas, comandos `C` no SVG), então a curva continua lisa em qualquer escala.
- `coordenadas`/`aneis` seguem existindo como vértices de apoio amostrados sobre a curva (24 por segmento): métricas, snap, seleção e exportação continuam funcionando sem mudança.
- Entrada: `adicionarFeicao`/`definirFeicoes` aceitam `curva` em linha de uma parte e polígono de um anel; nós inválidos são ignorados e a feição vira poligonal.
- Edição de vértices numa feição curva trabalha com os nós: mover leva as alças junto, inserir divide o segmento sem mudar o traçado (de Casteljau) e excluir remove o nó. A caneta mostra as alças enquanto se arrasta.
- **Alças editáveis**: em feição curva, o editor mostra uma alça arrastável por alça (com haste até o nó). A oposta espelha; segurar `Shift` solta a simetria. Duplo clique num nó alterna canto ↔ suave; numa linha/polígono comum isso converte em curva.
- Curvas não são simplificadas por zoom; `deslocarGeometria` move nós e alças.

### `<ui-camadas>`: aprimoramento do rodapé e hierarquia de camadas (subcamadas e grupos)

- **Rodapé Redesenhado e Dual-Mode**:
  - Resolução dos conflitos e sobreposição de controles visuais (o contador de camadas não colide mais com o botão de visibilidade nem com o seletor de movimentação).
  - **Modo Resumo (sem seleção)**: Exibe contagem limpa e elegante (`X camadas`), tipografia tabular e botões rápidos `+ Grupo` e `+ Camada`.
  - **Modo Ações em Massa (com seleção ativa)**: Habilita barra contextual com botões de visibilidade, trava, exclusão, preview circular moderno de cor em lote com aro brilhante (substituindo o input retangular nativo) e seletor compacto de destino com recuo hierárquico e truncamento seguro.
- **Hierarquia de Camadas e Subcamadas**:
  - Suporte completo a camadas dentro de outras camadas através de `parentId?: string | null`, `children?: CamadaItem[]` e flag `isGroup?: boolean`. Suporte tanto a arrays planos quanto a árvores aninhadas (com achatamento inteligente e reversão automática).
  - **Arrastar e Soltar Hierárquico**: Arraste de camadas para dentro de outras camadas (`drop-into`) na área central da linha para transformar em subcamada, com prevenção automática de ciclos (não permite arrastar um pai para dentro de seus próprios filhos).
  - **Drawer e Ferramentas**: Seletor de camada pai e botão `+ Subcamada` integrados no drawer de configurações; botão `Novo Grupo` na toolbar superior.
  - **Proteção e Cascata**: Colapsar uma pasta/camada pai recolhe todas as suas subcamadas e feições; excluir um grupo promove automaticamente suas subcamadas para o nível raiz para evitar perda de dados.
  - Novos eventos públicos disparados por ação do usuário: `ui-camada-grupo-adicionar` e `ui-camada-mover-hierarquia`.

## 2.1.0 — 2026-10-11

### `<ui-canvas-cad>`: feições genéricas (migração do MapEngine)

Tudo é opt-in: o componente **não cria camadas** de feições sozinho. Pontos, segmentos, vizinhos e SIGEF continuam como antes.

- **Feições**: `definirFeicoes`, `adicionarFeicao`, `atualizarFeicao`, `removerFeicao`, `obterFeicoes`. Point, LineString, Polygon (com furos), Circle (metros) e Text (arrastável), com estilo por feição, ícones SVG, rótulos permanentes (`area`, `extensao`, propriedades) e atualização incremental.
- **Seleção e popup**: clique, Ctrl/Cmd/Shift, caixa Window (E→D) / Crossing (D→E) com toque geométrico real, popup único (`cad-selecao`, `cad-feicao-selecionada`, `cad-feicao-acao`), hit-test unificado entre camadas empilhadas (tolerância em px, alternância de cliques), `cad-feicao-hover` e `cad-feicao-menu`.
- **Desempenho**: índice espacial próprio (sem dependências), culling por viewport acima de 300 feições, clusters de pontos (grade de 55 px), simplificação Douglas-Peucker por zoom. Meta: 100 mil feições.
- **Snap e edição**: snap vértice > ponto médio > aresta (tecla `S`, `Alt` desliga, botão na barra, `definirSnap`); edição de vértices com alças, fantasmas nos pontos médios, exclusão pelo botão direito e HUD ao vivo (`editarVertices`).
- **Ferramentas**: `ponto`, `linha`, `poligono`, `retangulo`, `elipse`, `poligono-regular` (hexágono), `estrela`, `circulo`, `texto`, `caneta` (Bézier), `medir-distancia`, `medir-area`, `dividir`, `selecao-laco`, `conta-gotas`. Atributo `ferramentas` mostra uma barra opcional; `definirFerramenta(nome, { fechar, iniciarEm })`, `definirCamadaDesenho`, `definirEstiloDesenho`. Clicar no primeiro vértice fecha polígono, laço, medir área e caneta (3+ vértices); o botão direito com ferramenta ativa conclui, desfaz o último vértice ou sai; `selecao-laco` seleciona feições dentro do laço e encerra. Utilitários: `gerarBuffer`, `duplicarFeicao`, `juntarFeicoes`.
- **Versões e colaboração**: oficial × prévia (`entidadeId`, `definirPreviasGlobais`, `alternarPrevia`, `cad-previas`); cursores remotos (`atualizarCursorRemoto`, nome escapado e cor só `#hex`).
- **Câmera**: `zoomParaFeicao(s)`, `ajustarTudo`, `ajustarCamada` (ligam camadas e prévias escondidas).
- Exportados pelo entrypoint `./canvas`: modelo `Feicao`, algoritmos (`dividirPoligonoComLinha`, `gerarBuffer`, `juntarLinhas`, `juntarPoligonos`, `ddParaDms`, `dmsParaDd`, `converterComprimento`, `converterArea`...), índice, snap e editores.
- Guia de migração: `docs/guia-migracao-mapengine.md`.

### `<ui-canvas-cad>`: opções para integração agnóstica com aplicações externas

Tudo opt-in: sem os atributos e opções abaixo, o componente se comporta como antes. Detalhes e exemplos em
`docs/guia-migracao-mapengine.md`; eventos em `docs/canvas-cad-eventos.md`; números em `docs/desempenho-feicoes.md`.

- **Montagem só com API pública**: `inicializarAgora(): L.Map | null` (síncrono, idempotente, cancela o agendamento do `connectedCallback`, nunca cria um 2º mapa); atributos `sem-camadas-padrao` (não cria satélite Google, SIGEF/INCRA, homologados, perímetro, vizinhos, vértices nem grade, e o clique nunca consulta o INCRA), `sem-painel-camadas`, `sem-barra-rapida` e `sem-atalho-snap` (a tecla S não alterna o snap desde o primeiro instante); `definirEstilosExternos(css | CSSStyleSheet[] | null)` injeta CSS do app no shadow root (`adoptedStyleSheets`, com `<style>` de reserva; `destroy()` limpa e a reconexão recoloca). Sem referência a `initCAD`/`initTimeout`.
- **Posição dos HUDs**: `definirMargensHud({ topo, base, esquerda, direita })` (px) e as propriedades CSS `--cad-hud-topo/-base/-esquerda/-direita`. Os HUDs de desenho e de edição de vértices usam a mesma regra: centralizados na área visível, com largura/altura máximas e quebra de linha. Padrões = posição antiga (`base: 16`).
- **Linha multiparte (MultiLineString)**: `LineString` aceita `partes: LatLonPar[][]` (ou `coordenadas`). *Decisão:* estender `LineString` em vez de criar um tipo `MultiLineString`, porque quebra menos: `coordenadas` continua existindo (é a 1ª parte) e todo código/consumidor que só lê `coordenadas` segue enxergando uma linha válida; uma parte só normaliza para a linha simples de sempre; nenhum `switch (geometria.tipo)` do consumidor ganha um caso novo. Coberto: normalização, desenho, hit-test (tolerância por parte), caixa Window/Crossing, laço, snap (vértices e arestas de todas as partes, sem aresta entre partes), extensão somada (métricas e rótulo), popup, simplificação por zoom, `obterFeicoes`, `duplicarFeicao`. Recusas com motivo: `editarVertices` → `cad-edicao-recusada` `multiparte`; `juntarFeicoes` → `cad-uniao-falhou` `multiparte`; `dividir` com só multilinhas → `cad-divisao-falhou` `multiparte`; `gerarBuffer` de multilinha devolve `null`. Helpers exportados: `partesDaLinha`, `ehMultilinha`, `criarLinha`.
- **Lote e ordem**: `aplicarLote(camadaId, { adicionar, atualizar, remover }, opcoes)` faz uma regravação e um `aposDados` e devolve `{ adicionadas, atualizadas, removidas, recusadas }`; `adicionarFeicao`/`atualizarFeicao`/`removerFeicao` passam pelo mesmo caminho. O renderizador recebe só a diferença (índice, loja, oficiais e clusters por célula atualizados item a item) e a busca por id é O(1): com 100 mil feições, uma edição caiu de 60–250 ms para ~0,5 ms (ver `docs/desempenho-feicoes.md`). `atualizarFeicao(camadaId, id, parcial, { substituirPropriedades: true })` (e o mesmo em `aplicarLote`) troca as `propriedades` por inteiro em vez de mesclar.
- **`Feicao.oculta`**: não desenha, não seleciona (clique, caixa, laço, hit-test, hover, `selecionarFeicoes`), não atrai snap e fica fora de `ajustarTudo`/`ajustarCamada`; segue nos dados, não encerra a edição de vértices em andamento, não conta como excluída e participa da regra oficial × prévia como as demais. `excluida` mantém o significado.
- **Estilo**: texto com selo (`corFundo`, `corBorda`, `opacidadeFundo`, `raioBorda`; o selo substitui o `halo`) e ponto sem ícone com `corContorno`/`espessuraContorno`, separados do preenchimento. Cores só passam por `corSegura`; números só se finitos.
- **Ferramentas**: `medir-distancia` com 3+ pontos mostra também área e perímetro no HUD e traz `areaM2`/`perimetroM` em `cad-medicao` (sem criar feição); círculo ignora raio < 2 m; `definirOpcoesPopup({ copiarParaAreaDeTransferencia })` torna opcional a escrita da ação "copiar"; evento cancelável `cad-texto-solicitado` (`preventDefault()` + `detalhe.concluir(texto)`) para usar modal próprio. Teste parametrizado cobre as 15 ferramentas: o ouvinte do evento de conclusão pode desativá-las sem efeito colateral e `cad-selecao` nunca sai com a ferramenta ainda ativa quando a seleção é consequência dela.
- **Coordenada (0, 0)**: atributo/propriedade `aceitar-origem` / `aceitarOrigem` (padrão `false`) e `{ aceitarOrigem }` nas funções puras de normalização.

### Correções da revisão dos componentes

- **`<ui-tabela src>`**: deixou de refazer o `fetch` a cada mudança de atributo (chegava a dezenas de requisições); busca só ao conectar e quando o `src` muda. Filtro e ordenação passam a valer juntos, e o filtro olha as colunas declaradas (ignora campos fora delas e objetos).
- **`<ui-camadas>`**: foco do teclado preservado após redesenhar; novo `emLote(fn)` agrupa mutações numa só renderização; `definirCamadas` troca a camada ativa que sumiu; `selecionarFeicao` alcança feições de camadas recolhidas; a ordem enviada pela aplicação vence a ordem salva do usuário quando ela mudou; excluir uma camada apaga o override guardado; aviso no console quando painéis dividem a chave de persistência padrão.
- **`<ui-lista-flutuante>`**: `formReset` volta ao valor inicial mesmo após mover o elemento; `input` antes de `change`; Esc no gatilho, Tab, Home/End e foco devolvido ao gatilho; abre para cima quando falta espaço embaixo.
- **`<ui-seletor-mapa-base>`**: `desabilitado` agora funciona; `selecionar` ignora ids fora da lista; setas/Home/End e foco no mapa ativo ao abrir pelo teclado; miniaturas sem `referrer`.
- **`<ui-canvas-cad>`**: atalhos (`S`, Backspace, Esc) não disparam mais enquanto se digita em campos com shadow DOM; ferramentas funcionam após reconectar o componente; dividir/juntar não perdem a feição original quando o resultado é recusado; `juntarFeicoes` respeita bloqueios; `tamanhoIcone` não numérico não injeta HTML; texto bloqueado e depois liberado persiste o arraste.
- **`<ui-tabela-propriedades>`**: `-2^2` agora vale -4 (o sinal unário pesa menos que a potência).

### ⚠️ Mudanças de comportamento

- Ctrl/Cmd/Shift + clique no vazio **não limpa mais** a seleção de pontos (modo aditivo).
- Clique em marcador DOM não é mais repassado às feições do canvas por baixo.
- `MapaConfiguracoes.magnetSnap` está **obsoleto** e sem efeito (o snap agora é do componente).
- `adicionarFeicao`/`aplicarLote` com um `id` que já existe **substituem a feição no mesmo lugar**; antes ela ia para o fim da lista (mudava a ordem de empilhamento dentro da camada).
- **`cad-medicao`** de `medir-distancia` passa a trazer `areaM2` e `perimetroM` quando a régua tem 3 ou mais pontos (antes só `medir-area` trazia). Quem usava `areaM2 !== undefined` para distinguir o tipo deve olhar `tipo`.
- **Círculo**: o clique que daria raio menor que 2 m é ignorado (antes aceitava qualquer raio > 0). Feições com `Circle` de raio menor continuam válidas na entrada de dados.
- **`dividir`**: se a feição cortada estava selecionada, a ferramenta encerra antes de a seleção mudar (para `cad-selecao` sair sem ferramenta ativa). Sem seleção envolvida, continua ativa para o próximo corte.
- **Ordem do aviso nas medições**: `cad-medicao` agora sai depois de a ferramenta estar pronta para a próxima figura; desativar a ferramenta dentro desse evento deixava a sessão "ressuscitar" (corrigido).
- **HUDs**: ganham `width: max-content`, largura/altura máximas e quebra de linha (o de edição de vértices não quebrava linha). Na posição padrão ficam onde estavam.
- Valores novos nos `motivo` de `cad-edicao-recusada`, `cad-uniao-falhou` e `cad-divisao-falhou`: `multiparte`. Quem faz `switch` exaustivo precisa tratá-lo.
- `selecionarFeicoes` e `alternarSelecaoFeicao` ignoram feições `oculta`.
- `GerenciadorFeicoes.emitir` (uso interno/testes) ganhou um 3º parâmetro opcional `cancelavel` e pode devolver `true` para "cancelado"; o `normalizarFeicaoEntrada`, `normalizarCoordenada` e `parseCoordenada` ganharam um último parâmetro opcional `{ aceitarOrigem }` (compatível).

## 2.0.0

### ⚠️ Mudanças que podem exigir ajuste

- **Tema segue o sistema operacional por padrão.** Antes o kit era sempre escuro. Para manter o escuro fixo, use `<html data-tema="escuro">`. `UIBus.definirTema('auto')` volta a seguir o sistema.
- **Enter em `<ui-campo-texto>` envia o formulário**, como um campo nativo. Formulários com botão `type="submit"` e sem listener de `submit` com `preventDefault()` passam a enviar (e recarregar a página) ao pressionar Enter.
- **`ui-abrir` / `ui-fechar` do modal disparam também ao mudar o atributo `aberto`**, não só pelos métodos `abrir()`/`fechar()`.
- **A seleção de `<ui-tabela>` é mantida ao ordenar, filtrar ou trocar `dados`** (se o item ainda existir). Use `limparSelecao()` para zerar.
- **Variáveis CSS renomeadas:** `--ui-fonte-mono`, `--ui-fonte-familia` e `--ui-fonte-principal` → `--ui-fonte-codigo` / `--ui-fonte-base`; `--ui-radius-*` → `--ui-raio-*`.
- **Cores do tema claro mais escuras** para atingir contraste WCAG AA (primária `#006b40`). No escuro, o botão destrutivo passou para `#d32f2f`.
- Removidos `UIModal._openCount` e o atributo interno `data-scroll-locked`.

### Usuário final

- Textos legíveis nos dois temas (contraste WCAG AA verificado em testes).
- Tabela por teclado: cabeçalhos ordenáveis com Tab + Enter, linhas com setas, Home/End, PageUp/PageDown, Enter para selecionar.
- Modal: foco inicial no conteúdo (ou `[autofocus]`), foco devolvido ao fechar, Esc fecha o modal do topo, segundo modal aberto continua interativo, "✕" oculto com `bloquear-fechamento`.
- Tooltip lido por leitores de tela, fecha com Esc e não some ao levar o ponteiro até o balão.
- Botões só com ícone recebem nome acessível (`aria-label` ou `title`).
- Gatilhos Zero-JS ignoram botões desabilitados ou carregando.
- Correção de segurança: o `label` de campos nunca é interpretado como HTML.

### Desenvolvedor

- **Tipos para React e Vue** gerados a partir do Custom Elements Manifest: `@thibezer/ui-components-kit/tipos-react`, `/tipos-vue` e `/tipos-elementos`.
- **`custom-elements.json`** publicado (campo `customElements`), para IDEs, Storybook e documentação.
- **`::part`** nos 14 componentes principais, com estados (`opcao-selecionada`, `linha-selecionada`).
- **Tokens unificados:** fontes `--ui-fonte-base` / `--ui-fonte-codigo`; escala de raio derivada de `--ui-raio-borda` (`--ui-raio-sm/lg/xl/pill`); novos `--ui-cor-texto-info`, `--ui-cor-texto-sobre-status`, `--ui-cor-fundo-recuado`, `--ui-sombra-sm/md/lg`.
- `<ui-botao>` form-associated: `form="id"`, `<fieldset disabled>`, `name`/`value` no `e.submitter`, `disabled` como propriedade, `click()` no host.
- `UIBus.obterTema()`; `tema:alterado` também quando o sistema troca de tema.
- `<ui-tabela>`: `aria-label` repassado à tabela, `aria-busy` durante o carregamento.
- README corrigido (exemplo React, atributos do catálogo, import map para mapa/CAD via CDN).

## 1.0.0

- Primeira publicação no npm como `@thibezer/ui-components-kit`.
