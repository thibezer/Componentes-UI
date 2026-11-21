# Guia de migração: moldura do layout de impressão para `<ui-canvas-prancha>`

Para o app (ConecteMapas): como o `PrintComposer` troca o item `shape` (formas fixas desenhadas no app) pela prancha do
kit. A regra de ouro continua: **nunca dois desenhos para a mesma forma**. A tela, o PDF e o SVG saem do mesmo pintor
(`desenharElementos`).

> **Atenção:** o código do app não estava disponível na máquina em que este guia foi escrito. Os nomes dos campos antigos
> abaixo (`shapeType`, `strokeStyle`, `fillColor`, `borderRadius`, `rotation`, `arrowHead`) vêm do pedido da migração.
> Confira os valores exatos no `PrintComposer` antes de escrever o conversor, e ajuste só a tabela de valores: o lado do
> kit (o modelo `ElementoGrafico` e as pré-definições) não muda.

## 1. O que muda no app

| Hoje (app) | Depois (kit) |
|---|---|
| Item `shape` com tipo fixo, desenhado por código do app na tela e de novo no PDF | Elementos `ElementoGrafico` (dados), pintados pelo kit na tela, no PDF e no SVG |
| Estilo por campos soltos (`strokeStyle`, `fillColor`...) | `aparencia` (traço, pontas de seta, preenchimento, hachura, gradiente, efeitos) |
| Edição limitada ao que o app implementou | Seleção, alças, rotação, cantos ao vivo, caneta, Pathfinder, camadas, histórico, teclado |
| Painel de propriedades próprio | `<ui-tabela-propriedades>` com `prancha.categoriasDePropriedades()` e `prancha.aplicarPropriedade(id, valor)` |

O componente **não grava nada**: devolve as mudanças em eventos e o app decide id, nome e persistência (o mesmo contrato do
`ui-canvas-cad`).

## 2. O que o app fornece

1. **Ids e nomes.** Elementos novos chegam em `prancha-elemento-criado` com um id provisório; o app pode trocá-lo com
   `prancha.renomearElemento(antigo, novo)` (ou aceitá-lo como está).
2. **Persistência.** Salve `prancha.obterElementos()` (e `obterCamadas()`) no JSON da prancha. Ouça:
   `prancha-elemento-criado`, `-atualizado`, `-removido`, `prancha-ordem` e `prancha-camadas`. Para carregar, use
   `definirElementos(lista)`, ou `aplicarLote({ adicionar, atualizar, remover })` incremental. Nada disso emite evento, então não há laço.
3. **O contexto do PDF.** O `PdfVectorContext` do app já cumpre o contrato `ContextoPrancha2D` (`save/restore/setTransform`,
   caminhos, `fill/stroke/clip`, `setLineDash`, `fillRect`). Pinte a moldura com o mesmo código da tela:

   ```js
   import { escala, translacao, compor } from '@thibezer/ui-components-kit/prancha';
   // mm da folha → pontos do PDF (72 / 25,4), com a origem do quadro da página
   const matriz = compor(escala(72 / 25.4), translacao(origemXpt, origemYpt));
   prancha.desenharEm(pdfCtx, { matriz }); // ou desenharElementos(pdfCtx, elementosSalvos, { matriz, camadas })
   ```

   Gradiente, texto (`fillText`), mesclagem e desfoque da sombra são **capacidades opcionais**. Sem elas, o pintor degrada
   sem erro: gradiente vira cor sólida, texto não é pintado (o app desenha o texto no PDF, como hoje), mesclagem vira
   normal e a sombra sai nítida. As estatísticas devolvidas dizem o que degradou.
4. **A composição dos painéis.** O `pagina_prancha.ts` do playground é a referência da cola entre a prancha, a
   `<ui-paleta-ferramentas>` (`FERRAMENTAS_PALETA_PRANCHA`), o `<ui-camadas>` (`dadosParaPainelDeCamadas`,
   `camadasComMudanca`, `camadasNaOrdemDoPainel`, `alterarElementos`) e o `<ui-tabela-propriedades>`.

## 3. Mapa dos campos antigos

Cada forma antiga vira uma **pré-definição** do kit, que gera a geometria e a aparência. Depois de criada, a forma é um
elemento comum, editável como qualquer outro.

```js
import { gerarPredefinicao } from '@thibezer/ui-components-kit/prancha';
const elementos = gerarPredefinicao(tipo, { x, y, largura, altura }, opcoes); // um array (a moldura dupla gera 2)
```

### `shapeType` → pré-definição

| `shapeType` (provável) | Pré-definição | Observação |
|---|---|---|
| retângulo | `'retangulo'` | |
| retângulo arredondado | `'retangulo-arredondado'` | `opcoes.raio` = `borderRadius` (mm) |
| moldura dupla (ABNT) | `'moldura-dupla'` | 2 elementos; `opcoes.espacamento`, `espessuraInterna`; caixa ABNT com `caixaDoQuadroAbnt('A4', 'paisagem')` |
| elipse / círculo | `'elipse'` / `'circulo'` | |
| triângulo / losango | `'triangulo'` / `'losango'` | |
| linha horizontal / vertical / diagonal | `'linha-horizontal'` / `'linha-vertical'` / `'linha-diagonal'` | |
| seta / seta dupla | `'seta'` / `'seta-dupla'` | `opcoes.ponta` (ver `arrowHead`) |

### Estilo

| Campo antigo | Novo | Conversão |
|---|---|---|
| `strokeStyle` contínuo / tracejado / pontilhado / traço-ponto | `opcoes.estiloTraco` | `'continuo'`, `'tracejado'`, `'pontilhado'`, `'traco-ponto'` (viram os tipos de linha CAD do kit) |
| cor do traço | `opcoes.corTraco` | qualquer cor CSS |
| espessura do traço | `opcoes.espessura` | **em mm**. Se o app guarda em pt: `pt × 25,4 / 72`; em px a 96 dpi: `px × 25,4 / 96` |
| `fillColor` | `opcoes.corPreenchimento` | ausente ou `'transparent'` = sem preenchimento |
| `borderRadius` | `opcoes.raio` | mm; depois é editável ao vivo (marcas nos cantos) |
| `rotation` | `transformacao` | graus, em torno do centro: aplique `girarElementos(elementos, graus × π / 180)` ao resultado |
| `arrowHead` | `opcoes.ponta` | `{ estilo: 'triangulo' \| 'triangulo-aberto' \| 'aberta' \| 'circulo' \| 'quadrado' \| 'losango' \| 'barra', escala? }`; nas setas, `aparencia.traco.pontaInicio`/`pontaFim` |

### Conversor (fica no app: é o formato antigo do app)

```js
import { gerarPredefinicao, girarElementos } from '@thibezer/ui-components-kit/prancha';

const TIPO = { rectangle: 'retangulo', 'rounded-rectangle': 'retangulo-arredondado', /* ...confira os valores reais... */ };
const ESTILO = { solid: 'continuo', dashed: 'tracejado', dotted: 'pontilhado', 'dash-dot': 'traco-ponto' };

export function migrarShape(item) {
  const tipo = TIPO[item.shapeType];
  if (!tipo) return []; // forma desconhecida: registre e mantenha o item antigo
  const caixa = { x: item.x, y: item.y, largura: item.width, altura: item.height }; // em mm
  let els = gerarPredefinicao(tipo, caixa, {
    id: item.id,
    estiloTraco: ESTILO[item.strokeStyle] ?? 'continuo',
    corTraco: item.strokeColor,
    espessura: item.strokeWidth,                // converta para mm se preciso
    corPreenchimento: item.fillColor && item.fillColor !== 'transparent' ? item.fillColor : undefined,
    raio: item.borderRadius,
    ponta: item.arrowHead ? { estilo: 'triangulo' } : undefined
  });
  if (item.rotation) els = girarElementos(els, (item.rotation * Math.PI) / 180);
  return els;
}
```

## 4. Pranchas já salvas

- **Na leitura, não em massa.** Ao abrir uma prancha com a versão antiga do JSON, converta os itens `shape` com
  `migrarShape`, carregue com `definirElementos` e grave com uma versão nova (`{ versao: 2, elementos, camadas }`) no
  próximo salvamento. A prancha antiga continua legível.
- **Valide.** `definirElementos` devolve `{ aceitos, recusados }`: o que não converter fica registrado (motivo por índice) e
  não derruba a página.
- **Compare.** Exporte o SVG antes (o PDF atual) e depois (`prancha.exportarSvg()`) das pranchas de referência e confira
  visualmente as molduras ABNT.

## 5. Atualização

1. O dono publica a versão do kit (ver `docs/protocolo-de-release-e-sincronizacao.md`).
2. No app: `npm install @thibezer/ui-components-kit@<versão>` e `import '@thibezer/ui-components-kit/prancha'` (entrada sem
   Leaflet).
3. Troque o item `shape` do `PrintComposer` por um `<ui-canvas-prancha largura="…" altura="…">` sobre a área da página,
   ligue os eventos de persistência (item 2) e o PDF (`desenharEm`).
4. Retire o código de desenho das formas do app (tela e PDF): a forma passa a ter um desenho só, o do kit.
