# Linha padrão do `<ui-canvas-cad>`

Opções de traço no estilo CAD: tipo de linha (o *linetype* do AutoCAD), escala do tipo de linha (LTSCALE), opacidade do traço, pontas, cantos e deslocamento do tracejado. Valem nos dois renderizadores (`leaflet` e `canvas`): o estilo é resolvido uma vez em `motor/estilo.ts` e cada renderizador só o traduz.

## Três níveis

A opção mais específica vence:

1. **Feição**: `estilo` da feição (`EstiloFeicao`).
2. **Camada**: `estilo` da camada (`LayerStyleDef`), padrão das feições dela.
3. **Kit**: linha contínua, opaca, pontas e cantos arredondados, sem deslocamento.

A **linha padrão do componente** (atributos `linha-*` e `definirLinhaPadrao`) é o estilo que as feições **desenhadas daqui para frente** recebem: ela grava no estilo de desenho (`definirEstiloDesenho`/`obterEstiloDesenho`), que o conta-gotas também altera.

## Opções

| Atributo (`<ui-canvas-cad>`) | `definirLinhaPadrao` | `EstiloFeicao` | `LayerStyleDef` | Valores |
| :--- | :--- | :--- | :--- | :--- |
| `linha-cor` | `cor` | `corTraco` | `corPrimaria` | hex, `rgb()/hsl()` ou nome de cor |
| `linha-espessura` | `espessura` | `espessuraTraco` | `espessuraLinha` | px, 0 a 100 |
| `linha-tipo` | `tipo` | `tipoLinha` | `tipoLinha` | ver tabela abaixo |
| `linha-escala` | `escala` | `escalaTipoLinha` | `escalaTipoLinha` | > 0 (aplicada entre 0,05 e 100); padrão 1 |
| `linha-tracejado` | `tracejado` | `dashArray` | `dashArray` | números separados por espaço/vírgula (`"8 4 2 4"`); **vence o tipo** |
| `linha-deslocamento` | `deslocamento` | `deslocamentoTracejado` | — | px (início do tracejado) |
| `linha-opacidade` | `opacidade` | `opacidadeTraco` | `opacidadeLinha` | 0 a 1; padrão 1 |
| `linha-terminacao` | `terminacao` | `terminacaoTraco` | `terminacaoLinha` | `arredondada` (padrão), `reta`, `quadrada` |
| `linha-juncao` | `juncao` | `juncaoTraco` | `juncaoLinha` | `arredondada` (padrão), `chanfrada`, `angular` |

## Tipos de linha

| `tipoLinha` | AutoCAD | Padrão (espessura 1, escala 1) |
| :--- | :--- | :--- |
| `continua` | `Continuous` | linha cheia |
| `tracejada` | `Dashed` | 12 traço · 6 vão |
| `tracejada-curta` | `Dashed2` | 6 · 4 |
| `tracejada-longa` | `DashedX2` | 24 · 8 |
| `pontilhada` | `Dot`, `Dotted` | ponto · 4 |
| `traco-ponto` | `DashDot` | 12 · 4 · ponto · 4 |
| `traco-ponto-ponto` | `Divide` | 12 · 4 · ponto · 4 · ponto · 4 |
| `oculta` | `Hidden` | 6 · 3 |
| `centro` | `Center` | 24 · 4 · 6 · 4 |
| `fantasma` | `Phantom` | 24 · 4 · 6 · 4 · 6 · 4 |
| `divisa` | `Border` | 12 · 4 · 12 · 4 · ponto · 4 |

- Os nomes do AutoCAD (maiúsculas ou minúsculas) também são aceitos, inclusive os do editor de tipo de linha do `<ui-tabela-propriedades>`.
- Os padrões crescem com a **escala** e, acima de 2 px, com a **espessura** (para o tracejado não virar um borrão numa linha grossa).
- Com pontas arredondadas ou quadradas, cada vão ganha a espessura da linha, para compensar o avanço das pontas; os pontos viram bolinhas (ou quadradinhos) do tamanho da espessura. Com ponta `reta` os pontos ganham o comprimento da espessura.
- `tipoLinha: 'continua'` na feição força a linha cheia, inclusive numa prévia (que, sem isso, sai tracejada).
- Feição selecionada sempre tem traço opaco.

## Exemplos

```html
<ui-canvas-cad id="mesa" linha-tipo="centro" linha-espessura="1.5" linha-cor="#f59e0b" linha-escala="2"></ui-canvas-cad>
```

```ts
const mesa = document.querySelector('ui-canvas-cad')!;
mesa.definirLinhaPadrao({ tipo: 'traco-ponto', espessura: 2, opacidade: 0.8, terminacao: 'reta', juncao: 'chanfrada' });
mesa.obterLinhaPadrao(); // { tipo: 'traco-ponto', espessura: 2, opacidade: 0.8, terminacao: 'reta', juncao: 'chanfrada' }
mesa.definirLinhaPadrao({ tipo: null }); // volta à linha contínua

// numa feição existente
mesa.atualizarFeicao('lotes', 'divisa-1', { estilo: { tipoLinha: 'Hidden', escalaTipoLinha: 0.5 } });
```

## Entradas inválidas

Nada lança. Valor inválido (cor com CSS extra, tracejado com texto, espessura `"abc"`, tipo desconhecido, `NaN`) **não é aplicado**: a opção volta ao padrão. `null` em `definirLinhaPadrao` e remover o atributo também removem a opção.

## Utilitários (L2, puros)

Exportados de `gerencigeo-canvas` (`motor/tipos-linha.ts`): `TIPOS_LINHA`, `normalizarTipoLinha(v)`, `dashTipoLinha(tipo, peso, escala?, lineCap?)`, `escalaTipoLinhaSegura(v)`, `terminacaoCanvas(v)`, `juncaoCanvas(v)`.
