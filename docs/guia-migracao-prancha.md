# Guia de hospedagem e migração: a prancha do kit dentro de um layout de impressão

Escrito a partir da migração real da "Moldura" do ConecteMapas para o `<ui-canvas-prancha>`. A regra de ouro continua:
**nunca dois desenhos para a mesma forma**. A tela, o PDF e o SVG saem do mesmo pintor (`desenharElementos` /
`desenharPlano`).

## 1. O que muda no app

| Antes (app) | Depois (kit) |
|---|---|
| Item `shape` com tipo fixo, desenhado por código do app na tela e de novo no PDF | Elementos `ElementoGrafico` (dados), pintados pelo kit na tela, no PDF e no SVG |
| Estilo por campos soltos (`strokeStyle`, `fillColor`...) | `aparencia` (traço, pontas, preenchimento, hachura, gradiente, efeitos) |
| Edição limitada ao que o app implementou | Seleção, alças, rotação, cantos ao vivo, caneta, Pathfinder, camadas, histórico, teclado |
| Painéis e cola próprios | `<ui-editor-prancha>` (ou `ligarPaineisPrancha`) |

O componente **não grava nada**: devolve as mudanças em eventos e o app decide id, nome e persistência.

## 2. Padrão recomendado de hospedagem num layout

1. **O item guarda** `elementos` em mm **locais ao item** (origem no canto do item) e a `caixaBase` (mm) em que foram
   desenhados.
2. **O canvas do item pinta** com o plano e a matriz `escala(pxPorMm)`:

   ```js
   import { planejar, desenharPlano, escala } from '@thibezer/ui-components-kit/prancha/nucleo';
   item.plano = planejar(item.elementos);              // uma vez, ao editar
   desenharPlano(ctx, item.plano, { matriz: escala(pxPorMm) }); // a cada zoom/resolução: barato
   ```

   `planejar` calcula contornos, hachuras, pontas e texto em mm da folha. **O que invalida o plano:** qualquer mudança em
   elementos ou camadas. **O que não invalida:** a matriz (zoom, resolução, exportação). Com `planejar(els, { cache: true })`
   o plano é guardado por referência do array (trate o array como imutável: copie ao editar).
3. **O editor abre em modal** com `<ui-editor-prancha>`:

   ```js
   const ed = document.createElement('ui-editor-prancha');
   ed.setAttribute('largura', caixa.largura); ed.setAttribute('altura', caixa.altura);
   modal.append(ed);
   await ed.pronto;
   ed.elementos = item.elementos;
   ed.addEventListener('editor-concluir', (e) => aplicar(e.detail.elementos));
   ed.addEventListener('editor-cancelar', () => modal.close());
   ```

   O teclado da prancha é `exclusivo` nesse modo (ver §6) e o Esc sem nada a cancelar vira `editor-cancelar`.
4. **Ao concluir**, num único passo de histórico do host: normalize para a origem e reajuste a caixa do item ao envelope:

   ```js
   import { normalizarParaOrigem, envelopeVisual } from '@thibezer/ui-components-kit/prancha/nucleo';
   const { elementos, caixa } = normalizarParaOrigem(e.detail.elementos, { minimo: 5 });
   item.elementos = elementos; item.caixaBase = caixa;       // caixa = { x: 0, y: 0, largura, altura } em mm
   item.largura = caixa.largura; item.altura = caixa.altura;
   ```

   `envelopeVisual` mede **tudo o que o pintor desenha** (traço pelo alinhamento, ponta da junção angular, pontas de seta,
   sombra com desfoque, texto), então o canvas do item não corta nada.
5. **Ao redimensionar o item**, escale os elementos para a caixa nova (o traço não muda, é em mm da folha):

   ```js
   import { ajustarElementosACaixa } from '@thibezer/ui-components-kit/prancha/nucleo';
   item.elementos = ajustarElementosACaixa(item.elementos, item.caixaBase, novaCaixa, { escalarTexto: 'tamanho' });
   ```

   Garantia testada: espessura, tracejado e pontas de seta **não mudam** com a escala, mesmo não uniforme. Bloqueados são
   ajustados por padrão (`incluirBloqueados: false` os preserva). Caixa inválida recusa (devolve cópia sem alteração).

## 3. O contexto de pintura (PDF vetorial): o contrato

O pintor chama `ctx.setTransform(a, b, c, d, e, f)` com matrizes **absolutas**, isto é, relativas ao **espaço de exportação
do contexto** (o estado do contexto quando a pintura começa; identidade num canvas novo ou numa página de PDF recém-aberta),
**nunca** ao transform corrente no meio da pintura. O contrato mínimo está em `ContextoPrancha2D`; veja o que falta num
contexto com:

```js
import { diagnosticarContexto } from '@thibezer/ui-components-kit/prancha/nucleo';
const d = diagnosticarContexto(pdfCtx);
// d.obrigatorios: o que FALTA do contrato ([] = serve)
// d.opcionais: capacidades opcionais ausentes ('gradiente', 'texto', 'mesclagem', 'filtro', 'miterLimit')
// d.transformacao: 'absoluta' (tem setTransform) | 'relativa' (só transform) | 'nenhuma'
expect(diagnosticarContexto(pdfCtx).obrigatorios).toEqual([]); // um teste de uma linha no app
```

**Contexto sem `setTransform`** (só `translate/scale/rotate/transform`, relativos): o pintor detecta e usa o modo
**relativo** sozinho (`opcoes.transformacao: 'relativa'` força). Ele rastreia o transform corrente e a pilha de
`save/restore` e emite `transform(inverse(atual) · M)`.

**Recomendação final: implementar `setTransform` absoluto no próprio contexto é opcional, mas vale a pena.** Ele evita que o
kit recalcule a matriz inversa do transform corrente a cada chamada (o pintor chama `setTransform` várias vezes por
elemento). Basta um teste de uma linha para garantir que o contexto serve:

```js
expect(diagnosticarContexto(pdfCtx).obrigatorios).toEqual([]); // com ou sem setTransform próprio
```

Exemplo **real** (o `PdfVectorContext` do ConecteMapas): guarda `M_base` (o transform do contexto quando foi criado) e o
transform corrente, e implementa `setTransform(a..f) = transform(inverse(M_atual) · (M_base · T))`:

```js
import { multiplicar, inverter, IDENTIDADE } from '@thibezer/ui-components-kit/prancha/nucleo';

class PdfVectorContext {
  constructor(pagina) {
    this.pagina = pagina;
    this.base = pagina.matrizInicial ?? IDENTIDADE;   // M_base: guardada ao criar o contexto
    this.atual = this.base;                            // M_atual: o transform corrente
    this.pilha = [];
  }
  save() { this.pilha.push(this.atual); this.pagina.save(); }
  restore() { this.atual = this.pilha.pop() ?? this.atual; this.pagina.restore(); }
  transform(a, b, c, d, e, f) { this.atual = multiplicar(this.atual, { a, b, c, d, e, f }); this.pagina.transform(a, b, c, d, e, f); }
  setTransform(a, b, c, d, e, f) {
    const T = { a, b, c, d, e, f };                    // absoluto, no espaço de exportação do contexto
    const inv = inverter(this.atual);
    if (!inv) return;                                   // transform corrente singular: ignora
    const alvo = multiplicar(this.base, T);             // M_base · T
    const r = multiplicar(inv, alvo);                   // inverse(M_atual) · (M_base · T)
    this.transform(r.a, r.b, r.c, r.d, r.e, r.f);
  }
  // ... translate/scale/rotate, caminhos, fill/stroke/clip, fillText etc.
}
```

**O pintor nunca falha em silêncio.** As estatísticas trazem `falhas` (itens que lançaram ou que não puderam ser pintados) e
`primeiraFalha` (a mensagem); sem `setTransform` **nem** `transform` nada é pintado, `falhas > 0` e um aviso único vai ao
`console.warn`. Confira `falhas === 0` ao exportar.

**Texto no PDF:** o pintor escreve `ctx.font = "<corpo em mm>px <fonte>"`, `textBaseline = 'alphabetic'`, `textAlign`
(`left|center|right`), e chama `fillText(linha, 0, i × corpo × 1,2)` com a matriz do elemento (rotação/cisalhamento) já no
transform. Portanto o contexto precisa interpretar o tamanho da fonte **nas unidades do transform corrente** (como o Canvas):
com `escala(72 / 25,4)` o corpo de 4 mm sai com 11,3 pt. `texto.largura` **não quebra linhas**: só dimensiona a caixa (a
quebra é por `\n`); `measureText` é opcional (sem ele a caixa é estimada em 0,55 do corpo por caractere).

**Gradiente no PDF:** sem `createLinearGradient`, vira cor sólida. Opcional: `{ gradienteEmFaixas: true }` (24 faixas
sólidas recortadas pela forma; ou o número de 2 a 256) aproxima o gradiente **linear** vetorialmente; radial segue sólido.
As estatísticas dizem quando usou (`gradientesEmFaixas`).

```js
import { desenharPlano, escala, translacao, compor } from '@thibezer/ui-components-kit/prancha/nucleo';
const matriz = compor(escala(72 / 25.4), translacao(origemXpt, origemYpt));
const est = desenharPlano(pdfCtx, item.plano, { matriz, gradienteEmFaixas: true });
if (est.falhas) console.error(est.primeiraFalha);
```

## 4. Valores reais do formato antigo do ConecteMapas

| Campo | Valores |
|---|---|
| `shapeType` | `rect`, `rounded_rect`, `double_frame`, `ellipse`, `triangle`, `diamond`, `line_h`, `line_v`, `line_diag`, `arrow` |
| `strokeStyle` | `solid`, `dashed`, `dotted`, `dash_dot` |
| `arrowHead` | `end`, `both` |
| `strokeWidth`, `borderRadius` | **px a 96 dpi**: mm = px ÷ 3,78 (o app usa 3,78 para não mudar a aparência; o kit usa `MM_POR_PX = 25,4 / 96`) |
| `fillColor` | `rgba()` |
| `rotation` | graus, em torno do centro da caixa, **sem alterar a caixa** (a migração gira os elementos e reajusta a caixa) |

```js
import { gerarPredefinicao, girarElementos, ROTULOS_PREDEFINICOES } from '@thibezer/ui-components-kit/prancha/nucleo';

const TIPO = {
  rect: 'retangulo', rounded_rect: 'retangulo-arredondado', double_frame: 'moldura-dupla', ellipse: 'elipse', triangle: 'triangulo',
  diamond: 'losango', line_h: 'linha-horizontal', line_v: 'linha-vertical', line_diag: 'linha-diagonal'
};
const ESTILO = { solid: 'continuo', dashed: 'tracejado', dotted: 'pontilhado', dash_dot: 'traco-ponto' };
const MM = 3.78;

export function migrarShape(item) {
  const arrow = item.shapeType === 'arrow';
  const tipo = arrow ? (item.arrowHead === 'both' ? 'seta-dupla' : 'seta') : TIPO[item.shapeType];
  if (!tipo) return [];
  const caixa = { x: item.x, y: item.y, largura: item.width, altura: item.height };
  let els = gerarPredefinicao(tipo, caixa, {
    id: item.id,
    estiloTraco: ESTILO[item.strokeStyle] ?? 'continuo',
    corTraco: item.strokeColor,
    espessura: item.strokeWidth / MM,
    corPreenchimento: item.fillColor,         // rgba(): o alfa vira opacidade na aparência
    raio: item.borderRadius / MM,
    alinhamentoTraco: 'dentro',                // a borda externa do traço encosta na caixa (como a borda CSS antiga)
    preenchimentoNa: 'externa',                // moldura dupla: o fundo cobre o espaço entre as linhas
    recuo: tipo.startsWith('linha') || arrow ? 1 / MM : undefined
  });
  if (item.rotation) els = girarElementos(els, (item.rotation * Math.PI) / 180);
  return els;
}
```

`ROTULOS_PREDEFINICOES` e `ITENS_PREDEFINICOES` dão os rótulos pt-BR e a lista ordenada para o menu; `inserirPredefinicao`
sem caixa insere no **centro da área visível** (tamanho proporcional ao zoom, selecionada); com
`{ quadro: 'margens' }` (e o atributo `margens`) usa o quadro das margens da folha.

## 5. Armadilhas encontradas

- **`transformarElementos` (plural) pula elementos `bloqueado`.** Em lote isso surpreende; use `ajustarElementosACaixa` ou
  `normalizarParaOrigem` (que movem todos) ou `transformarElemento` um a um.
- **`inserirPredefinicao` sem caixa**: até a 2.22 caía na folha com 10 mm de margem, que podia estar **fora da vista**; agora
  nasce no centro da vista.
- **`moldura-dupla` põe o preenchimento na linha interna**; para o fundo cobrir o espaço entre as linhas use
  `preenchimentoNa: 'externa'`.
- **Contexto sem `setTransform`** (o PDF do app): era um PDF em branco sem erro; veja §3.
- **Teclado em hospedeiro com atalhos globais**: ver §6.
- **Espessura de pré-definição inválida** caía no padrão 0,35 mm; para "sem traço" use `semTraco: true`.

## 6. Teclado em hospedeiro com atalhos globais

- Quando a prancha **trata** uma tecla, chama `preventDefault()` + `stopPropagation()` e marca o evento: o atalho global do
  hospedeiro pode ignorar com `if (eventoTratadoPelaPrancha(e)) return;` (`e.defaultPrevented` também vale). Garantia
  testada com um `keydown` global registrado antes da prancha.
- `teclado="exclusivo"` (modal só com a prancha): a prancha captura as teclas da página inteira, em fase de captura, enquanto
  montada, sem roubar teclas de campos de texto. As teclas que ela **não** trata continuam chegando ao hospedeiro.
- **`teclado="isolado"` (padrão do `<ui-editor-prancha>`): nenhuma tecla vaza.** Todo `keydown`/`keyup`/`keypress` com o foco
  ou o ponteiro dentro do editor recebe `stopPropagation()` na bolha, tratado ou não, então o `keydown` global do hospedeiro
  não vê nem `F`, `[`, `]`, `Ctrl+D` nem `Delete` sem seleção. Passam só as teclas do navegador (`F5`, `F11`, `F12`,
  `Ctrl+R/L/W/T`, `Ctrl+Shift+I/J`, `Tab`, zoom do navegador fora do canvas). **O app não precisa mais de uma flag** que
  bloqueie o `keydown` global enquanto o editor está aberto. Tabela dos três modos em `docs/canvas-prancha-eventos.md`.
- `prancha-esc-sem-efeito`: Esc sem gesto, âncoras, isolamento nem seleção a cancelar (a cadeia é: gesto → âncoras →
  grupo isolado → seleção → este evento). O hospedeiro fecha o modal aqui.

## 7. Dados vindos de fora

Sempre passe o JSON salvo (nuvem, `localStorage`) por `normalizarElementos` ao carregar, com um teto de elementos:

```js
import { normalizarElementos } from '@thibezer/ui-components-kit/prancha/nucleo';
const { elementos, recusados } = normalizarElementos(JSON.parse(bruto).slice(0, 5000)); // elementos aceitos + { indice, motivo }
if (recusados.length) console.warn('descartados:', recusados);
prancha.definirElementos(elementos); // também devolve { aceitos, recusados }
```

## 8. Persistência, pranchas já salvas e atualização

- **Persistência.** Salve `obterElementos()` (e `obterCamadas()`). Para saber se há o que salvar: `modificado`, `revisao`,
  `marcarComoSalvo()` e o evento `prancha-modificado` (só nas transições); `await prancha.pronto` antes de enquadrar;
  `ajustarElementos(ids?, { margem, zoomMaximo })` enquadra sem mexer na seleção; atributo `ajustar-ao-abrir`
  (`folha` | `conteudo` | `nenhum`).
- **Na leitura, não em massa.** Converta os itens `shape` antigos com `migrarShape` ao abrir, carregue e grave a versão nova
  no próximo salvamento.
- **Compare.** Exporte o SVG antes e depois das pranchas de referência e confira as molduras ABNT.
- **Empacotamento.** Para o editor ser um download separado, veja `docs/empacotamento-prancha.md`.
- **Atualização.** O dono publica a versão (ver `docs/protocolo-de-release-e-sincronizacao.md`); no app,
  `npm install @thibezer/ui-components-kit@<versão>`. Quem só pinta importa de `@thibezer/ui-components-kit/prancha/nucleo`
  (sem o componente); o editor entra sob demanda: `const { } = await import('@thibezer/ui-components-kit/prancha')`.

## 9. Qual é o painel de propriedades oficial

`<ui-tabela-propriedades>` é a tag **oficial**. `<ui-painel-propriedades>` e `<ui-propriedades>` são **aliases suportados por
contrato** (registrados pelo kit, mesma classe, com tipos para HTML, React e Vue; ver `CHANGELOG.md`, 2.x). Os apps podem usar
qualquer uma, mas novos códigos devem usar `ui-tabela-propriedades`.
