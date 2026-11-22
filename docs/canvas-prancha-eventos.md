# Eventos e API do `<ui-canvas-prancha>`

Todos os eventos são `CustomEvent` com `bubbles` e `composed` (atravessam o Shadow DOM), prefixo `prancha-`. Tipos dos
`detail` em `src/components/ui-canvas-prancha/tipos.ts`.

**Contrato (o mesmo do `<ui-canvas-cad>`):** o componente mantém uma cópia de trabalho e não grava nada. Mudanças feitas
pelo **usuário** (gestos, teclado) e pelos **comandos** (`moverSelecao`, `girarSelecao`, `removerSelecao`,
`inserirPredefinicao`, `desfazer`...) saem em `prancha-elemento-*`; o app persiste. As chamadas de **sincronização** do app
(`definirElementos`, `aplicarLote`, `adicionarElemento`, `atualizarElemento`, `removerElemento`) mudam o documento **sem**
emitir esses eventos.

| Evento | `detail` | Quando |
|---|---|---|
| `prancha-elemento-criado` | `{ elementos, motivo }` | Ferramenta de desenho (`'ferramenta'`), texto (`'texto'`), pré-definição (`'predefinicao'`), refazer/desfazer que trazem de volta |
| `prancha-elemento-atualizado` | `{ elementos, motivo }` | Fim do gesto (`'mover'`, `'transformar'`, `'editar-ancoras'`), setas (`'teclado'`), comandos (`'comando'`), `'desfazer'`, `'refazer'` |
| `prancha-elemento-removido` | `{ ids, elementos, motivo }` | Delete (`'remover'`), comando, desfazer/refazer |
| `prancha-selecao` | `{ ids, elementos }` | Sempre que a seleção muda (sai **depois** de `prancha-elemento-criado` quando a forma nova é selecionada) |
| `prancha-ferramenta` | `{ ferramenta }` | Troca de ferramenta |
| `prancha-edicao-iniciada` / `-concluida` | `{ elemento }` | Entrar/sair da seleção direta (âncoras) |
| `prancha-recusa` | `{ acao, motivo, id? }` | Ação recusada: `sem-selecao`, `bloqueado`, `somente-leitura`, `forma-pequena`, `texto-sem-ancoras`, `minimo-de-ancoras`, `matriz-singular`, `nada-a-desfazer`, `nada-a-refazer`, `comando-desconhecido`, `id-invalido`, `id-duplicado`, `geometria-invalida`, `nao-objeto` |
| `prancha-vista` | `{ zoom, zoomPercentual, pan }` | Zoom ou pan (roda, mão, espaço, Ctrl+0/1/+/−, API) |
| `prancha-historico` | `{ podeDesfazer, podeRefazer }` | Depois de cada mudança no histórico |
| `prancha-guias` | `{ guias }` | Guia criada (puxada da régua), movida, removida (arrastada de volta à régua) ou definida pela API |
| `prancha-ponteiro` | `{ coordenada }` | Movimento do ponteiro (mm na folha; `null` ao sair) |
| `prancha-ordem` | `{ ids, motivo }` | A ordem de empilhamento mudou (ids de trás para a frente): reordenar, agrupar, desfazer/refazer |
| `prancha-camadas` | `{ camadas }` | `definirCamadas` (camadas normalizadas) |
| `prancha-isolamento` | `{ grupoId }` | Grupo isolado (duplo clique, `isolarGrupo`); `null` ao sair |
| `prancha-conta-gotas` | `{ elemento, aparencia }` | Conta-gotas: aparência amostrada (aplicada à seleção ou guardada para as formas novas) |
| `prancha-modificado` | `{ modificado, revisao }` | Só nas **transições** de `modificado` (a carga com `definirElementos` e `marcarComoSalvo()` o zeram) |
| `prancha-pronta` | `{}` | Uma vez, quando a área de desenho foi medida e dá para enquadrar (a mesma promessa de `pronto`) |
| `prancha-esc-sem-efeito` | `{}` | Esc sem gesto, âncoras, grupo isolado nem seleção a cancelar: o hospedeiro pode fechar o modal |
| `prancha-texto-solicitado` (**cancelável**) | `{ posicao, concluir(texto) }` | Clique com a ferramenta texto. Sem `preventDefault()`, cria "Texto"; com ele, o app abre o próprio campo e chama `concluir` |

## Ordem e garantias

1. Desenhar uma forma: `prancha-elemento-criado` → `prancha-selecao` (a forma nova fica selecionada) → `prancha-historico`.
2. Um gesto (arrastar, alça, âncora) gera **um** `prancha-elemento-atualizado`, ao soltar, e um passo no histórico. Durante o
   gesto nada é emitido (os elementos transformados são só mostrados).
3. Setas seguidas (e qualquer mudança com a mesma chave em menos de 1 s) viram **um** passo no histórico.
4. Esc, `pointercancel` ou desconectar no meio de um gesto não muda o documento.
5. `prancha-recusa` nunca vem junto com uma mudança: a ação recusada não fez nada.

## Atributos

| Atributo | Padrão | O que faz |
|---|---|---|
| `largura`, `altura` | 210, 297 | Tamanho da folha em mm |
| `unidade` | `mm` | Unidade das réguas (`mm`, `cm`, `pt`, `pol`, `px`); o dado é sempre mm |
| `grade`, `mostrar-grade` | 10, desligada | Espaçamento (mm) e exibição da grade (que também atrai o snap) |
| `sem-reguas`, `sem-snap`, `sem-guias-inteligentes` | — | Desligam réguas, snap e guias inteligentes |
| `ferramenta` | `selecao` | Ferramenta inicial (`FERRAMENTAS_PRANCHA`) |
| `rotulo` | `Prancha` | Nome acessível da área de desenho |
| `somente-leitura` | — | Bloqueia desenhar e editar (seleção e vista continuam) |
| `passo-teclado` | 1 | mm por seta (Shift × 10) |
| `margens` | — | Margens da folha em mm, `"e d s i"` (ou um número só): guia tracejada automática e quadro de `inserirPredefinicao(tipo, undefined, { quadro: 'margens' })`. Inválido = sem margens |
| `teclado` | `local` | `local`, `exclusivo` ou `isolado`: ver "Modos de teclado" abaixo |
| `ajustar-ao-abrir` | `folha` | Enquadramento inicial: `folha`, `conteudo` (os elementos) ou `nenhum` |

## Métodos

- **Dados:** `definirElementos`, `aplicarLote`, `adicionarElemento`, `atualizarElemento`, `removerElemento` (opção
  `{ historico: false }` para não entrar no desfazer), `obterElementos`, `obterElemento`, `renomearElemento(antigo, novo)`
  (troca o id provisório pelo definitivo sem perder o desfazer).
- **Seleção e ferramentas:** `selecionarElementos`, `alternarSelecaoElemento`, `limparSelecao`, `selecionarTudo`,
  `obterSelecao`, `definirFerramenta`, `definirOpcoesFerramentas` (aparência das formas novas, raio dos cantos, lados,
  pontas, ponta da seta, corpo do texto), `editarAncoras`, `concluirEdicao`.
- **Comandos:** `desfazer`, `refazer`, `moverSelecao`, `girarSelecao`, `escalarSelecao`, `espelharSelecao`,
  `transformarSelecao(matriz)`, `removerSelecao`, `inserirPredefinicao(tipo, caixa?, opcoes?)`. Sem `caixa`, a forma nasce no
  **centro da área visível**, de tamanho proporcional ao zoom, e fica selecionada; `opcoes.quadro: 'margens'` usa o quadro
  das margens.
- **Vista:** `ajustarFolha`, `ajustarSelecao`, `definirZoom(%)`, `aproximar`, `afastar`, `deslocarVista`, `obterVista`,
  `paraFolha(x, y)`, `paraTela(p)`.
- **Guias e snap:** `definirGuias`, `adicionarGuia`, `removerGuia`, `obterGuias`, `definirSnap`.
- **Exportação:** `exportarSvg(opcoes?)`, `desenharEm(ctx, opcoes?)` (o PDF vetorial do app, com o mesmo pintor da tela),
  `renderizarAgora()`.
- **Ciclo de vida (editor em modal):** `modificado`, `revisao`, `marcarComoSalvo()`, `pronto` (promessa), `ajustarElementos(ids?,
  { margem?, zoomMaximo? })` (enquadra sem alterar a seleção; teto de zoom em %, padrão 800), `focus()` (entrega o foco ao
  viewport).
- **Propriedades:** `ferramenta`, `elementos`, `selecao`, `podeDesfazer`, `podeRefazer`, `gerarId` (gerador do id
  provisório), `fabricaContexto` (contexto 2D de cada canvas).

## Comandos pelo `ui-bus`

```ts
import { UIBus } from '@thibezer/ui-components-kit';
UIBus.emit('prancha:comando', { alvo: 'prancha-1', comando: 'girarSelecao', args: [90] });
```

`alvo` é o `id` do elemento (sem `alvo`, todas as pranchas obedecem). Só os métodos de `COMANDOS_PRANCHA` são aceitos; o
resto vira `prancha-recusa` com `comando-desconhecido`. O mesmo vale para `executarComando(nome, args)`.

## Teclado

Vale com o foco na prancha ou com o ponteiro sobre ela (com `teclado="exclusivo"`, sempre), e nunca com o foco num campo de
texto. **Garantia:** quando a prancha trata uma tecla, chama `preventDefault()` e `stopPropagation()` e marca o evento
(`eventoTratadoPelaPrancha(e)`); os atalhos globais da página não a recebem. A tecla que a prancha não trata segue para o
hospedeiro.

| Tecla | Ação |
|---|---|
| V · A · H | Seleção · seleção direta · mão |
| M · L · P · `\` · T | Retângulo · elipse · caneta · linha · texto |
| Setas (Shift × 10) | Movem a seleção, ou as âncoras selecionadas na seleção direta |
| Delete / Backspace | Exclui a seleção (ou as âncoras); no desenho clique a clique, desfaz o último ponto |
| Enter | Conclui a polilinha/caneta; com uma ferramenta de forma, cria a forma (40 × 30 mm) no centro da vista; com um elemento selecionado, entra na seleção direta |
| Esc | Cancela o gesto/desenho; sai da seleção direta; sai do grupo isolado; limpa a seleção; sem nada disso, emite `prancha-esc-sem-efeito` |
| Ctrl+Z · Ctrl+Shift+Z / Ctrl+Y | Desfaz · refaz |
| Ctrl+A | Seleciona tudo |
| Ctrl+0 · Ctrl+1 · Ctrl+= · Ctrl+− | Ajusta a folha · 100% · aproxima · afasta |
| PageDown / PageUp | Seleciona o próximo/anterior elemento |
| R / Shift+R · Alt+= / Alt+− | Gira 15°/−15° · escala 110%/90% |
| Espaço segurado | Mão temporária |

## Modos de teclado (`teclado`)

| Modo | Quem recebe as teclas | O que o hospedeiro vê | Uso |
|---|---|---|---|
| `local` (padrão) | A prancha, com o foco ou o ponteiro nela | Tudo o que a prancha **não** trata; o que ela trata (`preventDefault` + `stopPropagation` + marca) não chega | Prancha avulsa numa página |
| `exclusivo` | A prancha, com o foco **em qualquer parte da página** (captura em `window`) | Só o que ela não trata | Um modal só com a prancha |
| `isolado` | A prancha, com o foco ou o ponteiro nela, **só enquanto o foco/ponteiro está dentro do editor/prancha** | **Nada**: todo `keydown`/`keyup`/`keypress` que passa pelo editor leva `stopPropagation()` na bolha, tratado ou não | `<ui-editor-prancha>` (padrão) e qualquer prancha num modal com atalhos globais atrás |

No `isolado`: fora do editor tudo segue normal (clicar fora do modal não isola); teclas com o foco num campo de texto não são
roubadas (sem `preventDefault`), mas também não vazam. **Exceções que nunca isolam** (`teclaReservadaDoNavegador`): `F5`,
`F11`, `F12`, `Ctrl/Cmd+R`, `L`, `W`, `T`, `Ctrl/Cmd+Shift+I` e `J`, `Tab` (foco) e o zoom do navegador
(`Ctrl/Cmd` com `+`, `=`, `-`, `0`). **Conflito do zoom:** a prancha usa `Ctrl+=`, `Ctrl+-` e `Ctrl+0` para o zoom dela; com o
foco/ponteiro no canvas ela trata a tecla (já vem com `defaultPrevented`) e **vence**; com o foco num campo ou painel
(fora do canvas) é o zoom do navegador e passa. Limite: um ouvinte do hospedeiro registrado em **captura** (`capture: true`) no
`window` roda antes de tudo e não pode ser impedido por nenhum componente.

## Ponteiro

| Gesto | Efeito |
|---|---|
| Clique / Shift+clique | Seleciona / alterna na seleção |
| Arrastar no vazio | Caixa: da esquerda para a direita, só o que está inteiro dentro (window); da direita para a esquerda, o que toca (crossing) |
| Arrastar um elemento | Move (snap pelo ponto agarrado; guias inteligentes com a distância; Shift trava o eixo; Alt desliga o snap) |
| Alças | Escala (Shift proporcional, Alt do centro); Ctrl na alça lateral cisalha; alça de cima gira (Shift 45°); arrastar o pivô o move |
| Duplo clique num elemento | Seleção direta (âncoras e alças Bézier; Alt solta a simetria) |
| Arrastar da régua | Cria uma guia; arrastar a guia de volta para a régua a remove |
| Roda · Shift+roda · botão do meio | Zoom no cursor · pan horizontal · pan |

## Fase 4: organização e operações

Novos motivos em `prancha-elemento-*`: `cantos`, `ordem`, `agrupar`, `desagrupar`, `bloquear`, `ocultar`, `alinhar`,
`distribuir`, `duplicar`, `colar`, `recortar`, `conta-gotas`, `aparencia`, `camada`, `mascara`, `unir`, `dividir`,
`deslocar-caminho`, `simplificar`, `contorno-traco`, `converter-caminho`. Novo motivo de recusa: `tipo-nao-suportado`.
Ferramentas novas: `conta-gotas` (I), `adicionar-ancora` (+), `excluir-ancora` (−), `converter-ancora` (Shift+C).

| Ação | Teclado | Método |
|---|---|---|
| Frente · trás · avançar · recuar | Ctrl+Shift+] · Ctrl+Shift+[ · Ctrl+] · Ctrl+[ | `trazerParaFrente`, `enviarParaTras`, `avancar`, `recuar`, `ordenarSelecao(op)` |
| Agrupar · desagrupar · isolar | Ctrl+G · Ctrl+Shift+G · duplo clique (Esc sai) | `agruparSelecao`, `desagruparSelecao`, `isolarGrupo(id \| null)` |
| Bloquear · desbloquear tudo · ocultar · mostrar tudo | Ctrl+2 · Ctrl+Alt+2 · Ctrl+3 · Ctrl+Alt+3 | `bloquearSelecao`, `desbloquearTudo`, `ocultarSelecao`, `mostrarTudo` |
| Alinhar · distribuir | — | `alinharSelecao(alinhamento, referencia?)`, `distribuirSelecao(eixo, modo?, espacamento?)` |
| Duplicar · transformar de novo | Alt + arrastar · Ctrl+D | `duplicarSelecao(deslocamento?)`, `transformarDeNovo` |
| Copiar · recortar · colar · no lugar | Ctrl+C · Ctrl+X · Ctrl+V · Ctrl+Shift+V | `copiar`, `recortar`, `colar(noLugar?)` |
| Conta-gotas · aparência | I | `aplicarAparencia(aparencia)` |
| Máscara · liberar | Ctrl+7 · Ctrl+Alt+7 | `criarMascara`, `liberarMascara` |
| Unir · dividir · deslocar caminho · simplificar · contorno do traço · converter em caminho | Ctrl+J | `unirSelecao`, `dividirSelecao`, `deslocarCaminho(mm)`, `simplificarSelecao(tol?)`, `contornarTraco`, `converterEmCaminho` |
| Cantos arredondados | arrastar a marca do canto (Alt: só um) | `definirRaiosCantos(raio \| [4])` |
| Camadas | — | `definirCamadas`, `obterCamadas`, `definirCamadaAtiva`, `moverSelecaoParaCamada` |

Todos estão em `COMANDOS_PRANCHA` (aceitos pelo `ui-bus` e por `executarComando`).

## Fase 5: Pathfinder e efeitos

Novo motivo em `prancha-elemento-*`: `pathfinder`. Nova recusa: `resultado-vazio` (interseção sem sobreposição, subtração
que apaga tudo).

| Ação | Teclado | Método |
|---|---|---|
| Unir · subtrair (menos frente) · interseção · excluir | Ctrl+Alt+Shift+1 · 2 · 3 · 4 | `pathfinder(op)`, `unirFormas`, `subtrairFrente`, `intersectarFormas`, `excluirSobreposicao` |

O resultado fica com o id do mais à frente (na subtração, do mais atrás); os demais que entraram saem em
`prancha-elemento-removido`. Efeitos são aparência: `aplicarAparencia({ ..., mesclagem: 'multiplicar', sombra: { deslocamento:
[2, 2], desfoque: 1 } })`, ou direto no dado do elemento.

## Fase 6: painéis

Novo motivo em `prancha-elemento-*`: `propriedades` (painel de propriedades e painel de camadas).

| Método | O que faz |
|---|---|
| `categoriasDePropriedades()` | Categorias para o `<ui-tabela-propriedades>` com a seleção atual (`[]` sem seleção) |
| `aplicarPropriedade(id, valor)` | Aplica um campo (`IDS_PROPRIEDADES_PRANCHA`) à seleção: aparência, estado ou geometria; histórico e evento |
| `dadosParaPainelDeCamadas()` | `{ camadas, feicoes }` para `painel.definirCamadas(camadas, feicoes)`, da frente para trás |
| `alterarElementos(ids, { nome?, oculto?, bloqueado?, camadaId? })` | Estado e camada de elementos pelo id (inclusive travados) |

Recusas: `sem-selecao`, `somente-leitura`, `bloqueado`, `comando-desconhecido` (id de campo fora da lista),
`geometria-invalida` (valor que não serve) e `id-invalido` (elemento ou camada inexistente). Os dois comandos de escrita
estão em `COMANDOS_PRANCHA` (`ui-bus`).
