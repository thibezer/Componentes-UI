# `<ui-canvas-prancha>`

Prancha de desenho vetorial em **mm** (a folha de impressão), sem Leaflet. Casca fina (L4) sobre o núcleo puro
`src/gerencigeo-canvas/espaco/` e `src/gerencigeo-canvas/prancha/` (L2): o mesmo pintor desenha a tela, o PDF e o SVG.

```html
<ui-canvas-prancha id="prancha-1" largura="297" altura="210" mostrar-grade rotulo="Prancha 1"></ui-canvas-prancha>
<script type="module">
  import '@thibezer/ui-components-kit/prancha';
  const p = document.getElementById('prancha-1');
  p.definirElementos(salvos);                                   // carga
  p.addEventListener('prancha-elemento-criado', (e) => salvar(e.detail.elementos));
  p.inserirPredefinicao('moldura-dupla', caixaDoQuadroAbnt('A4', 'paisagem'));
  pdf.desenhar((ctx) => p.desenharEm(ctx, { matriz: escala(72 / 25.4) })); // PDF vetorial com o mesmo pintor
</script>
```

Eventos, atributos, métodos, teclado e ponteiro: [`docs/canvas-prancha-eventos.md`](../../../docs/canvas-prancha-eventos.md).
Arquitetura e decisões: [`docs/canvas-prancha.md`](../../../docs/canvas-prancha.md).

## Anatomia (thin shell + micro-módulos)

| Arquivo | Papel |
|---|---|
| `ui-canvas-prancha.ts`, `ui-canvas-prancha-base.ts` | Custom Element (organização e operações, Fase 4) sobre a base (ciclo de vida, atributos, dados, vista, Fase 3): só delegação |
| `prancha-template.ts`, `ui-canvas-prancha.css` | Shadow DOM fixo e estilos (só tokens; `::part()`) |
| `prancha-controlador.ts` | Documento + vista + estado da interação; mudanças do usuário → histórico e eventos |
| `prancha-documento.ts` | Elementos, índice espacial, seleção, histórico (sem DOM) |
| `prancha-vista.ts` | Zoom/pan e conversões tela ↔ folha (sem DOM) |
| `prancha-comandos.ts` | Ações sobre a seleção (teclado, API e `ui-bus` usam as mesmas) |
| `prancha-interacao.ts`, `prancha-gestos.ts` | Ponteiro: seleção, caixa, alças, pivô, âncoras, pan, zoom, guias |
| `prancha-ferramentas.ts` | Ferramentas de desenho (arrasto, clique a clique com a `SessaoDesenho`, texto) |
| `prancha-teclado.ts` | Atalhos (respeitam `alvo-digitavel.ts`) |
| `prancha-comandos-organizacao.ts`, `prancha-ferramentas-edicao.ts` | Ordem, grupos, alinhar, duplicar, área de transferência, máscara, operações de caminho; conta-gotas e ferramentas de âncora |
| `prancha-comandos-pathfinder.ts` | Pathfinder sobre a seleção (Fase 5) |
| `prancha-paineis.ts` | `ligarPaineisPrancha`: a cola com a paleta, as camadas e as propriedades (por eventos, tipada por estrutura) |
| `prancha-comandos-propriedades.ts` | `aplicarPropriedade` e `alterarElementos`: os comandos dos painéis (Fase 6) |
| `prancha-painel-propriedades.ts`, `prancha-painel-camadas.ts`, `prancha-paleta.ts` | Dados no formato do `<ui-tabela-propriedades>`, do `<ui-camadas>` e da `<ui-paleta-ferramentas>` (sem importar esses componentes) |
| `prancha-medidor-texto.ts` | Medidor de texto com `measureText`, registrado no núcleo |
| `prancha-render.ts`, `prancha-pintura.ts`, `prancha-reguas.ts` | Pintura agendada por quadro: base (o pintor da exportação), sobreposição e réguas |
| `prancha-cores.ts` | Cores da interface pelos tokens (`--ui-prancha-*`), lidas uma vez |
| `prancha-estado-ui.ts`, `prancha-acessibilidade.ts`, `prancha-bus.ts`, `prancha-atributos-sync.ts`, `tipos.ts` | Estado efêmero, anúncios, comandos pelo `ui-bus`, atributos e contratos |

## Painéis do kit

A prancha não importa os outros componentes: dá os dados e os comandos, e o app liga os eventos (referência completa em
`pagina_prancha.ts`, no playground).

```js
import { FERRAMENTAS_PALETA_PRANCHA, ferramentaDaPaleta } from '@thibezer/ui-components-kit/prancha';
paleta.ferramentas = FERRAMENTAS_PALETA_PRANCHA;
paleta.addEventListener('ui-change', (e) => prancha.definirFerramenta(ferramentaDaPaleta(e.detail.valor)));
prancha.addEventListener('prancha-selecao', () => { propriedades.categorias = prancha.categoriasDePropriedades(); });
propriedades.addEventListener('ui-propriedade-alterada', (e) => prancha.aplicarPropriedade(e.detail.id, e.detail.valor));
const d = prancha.dadosParaPainelDeCamadas();
camadas.definirCamadas(d.camadas, d.feicoes);
camadas.addEventListener('ui-feicao-visibilidade', (e) => prancha.alterarElementos([e.detail.feicaoId], { oculto: !e.detail.visivel }));
```

Migração do layout de impressão do app: [`docs/guia-migracao-prancha.md`](../../../docs/guia-migracao-prancha.md).

## Editor completo, painéis e modal

`<ui-editor-prancha>` (L4) compõe a prancha, a paleta, as camadas, as propriedades e o menu de pré-definições já ligados
(`import '@thibezer/ui-components-kit/prancha'` registra tudo). Não grava nada: `editor-concluir` entrega
`{ elementos, camadas, modificado }` e `editor-cancelar` (botão ou Esc sem nada a cancelar) avisa. Atributos: `largura`,
`altura`, `margens`, `grade`, `mostrar-grade`, `ajustar-ao-abrir`, `teclado` (`isolado` por padrão; `modal` também bloqueia
teclas da página em fase de captura na janela enquanto montado, salvo teclas reservadas do navegador e campos de texto
externos), `barra-formas` (`auto` | `botoes` | `menu`), `lateral` (`auto` | `fixa` | `gaveta`),
`somente-leitura`. **Responsivo ao próprio contêiner** (nunca à largura da janela): em `barra-formas="auto"` os botões
viram `"Formas ▾"` (menu com molduras, formas, linhas e setas) sempre que transbordariam para uma segunda linha (medido por
`ResizeObserver`, um reajuste por quadro e com histerese); em `lateral="auto"`, abaixo de 720 px a lateral vira uma gaveta
aberta pelo botão "Propriedades" ou por **Alt+P** (propriedade `lateralAberta`; Esc fecha e devolve o foco). Largura da
lateral: `--ui-editor-prancha-lateral` (300px). O rodapé (Cancelar/Concluir) nunca quebra nem some.

```js
import { ligarPaineisPrancha } from '@thibezer/ui-components-kit/prancha';
const desligar = ligarPaineisPrancha({ prancha, paleta, camadas, propriedades }); // toda a cola; devolve o desligador
```

`ligarPaineisPrancha` usa só eventos e propriedades públicas e limpa tudo em `desligar()` (Regra #2). Sem camadas
definidas, o painel de camadas lista os elementos direto, sem a pseudo-camada "Sem camada"
(`dadosParaPainelDeCamadas({ ocultarSemCamada: true })`); sem seleção, `categoriasDePropriedades()` mostra a folha e a dica.

Só pintar (tela e PDF), sem o componente: `@thibezer/ui-components-kit/prancha/nucleo` (`planejar`, `desenharPlano`,
`envelopeVisual`, `ajustarElementosACaixa`, `normalizarParaOrigem`, `ajustarAparenciaEmLote`, `diagnosticarContexto`...).

## Personalização

`::part(base | viewport | canvas | sobreposicao | regua | regua-horizontal | regua-vertical | canto-reguas | status)` e as
variáveis `--ui-prancha-mesa`, `--ui-prancha-papel`, `--ui-prancha-grade`, `--ui-prancha-selecao`, `--ui-prancha-alca`,
`--ui-prancha-guia`, `--ui-prancha-guia-inteligente`, `--ui-prancha-snap`, `--ui-prancha-regua`, `--ui-prancha-texto-regua`,
`--ui-prancha-tamanho-regua` (padrão: tokens `--ui-cor-*`; o papel e as guias usam `--ui-cor-papel`, `--ui-cor-guia`,
`--ui-cor-guia-inteligente` e `--ui-cor-grade-papel`).
