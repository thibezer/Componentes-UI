# Changelog

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
