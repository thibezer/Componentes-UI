# Controles na mesma linha

Contrato para que botão, campo, lista, segmented e badge fiquem alinhados quando dividem uma linha, sem CSS extra do consumidor.

## O problema que isto evita

Antes, cada componente decidia a própria altura (segmented fixo em 28/36/42px; botão e campo em 15px; badge pelo padding) e a largura (botão e campo em 100%). Lado a lado, ficavam com alturas diferentes, pela linha de base e esticados.

## O contrato

1. **Uma única variável de altura**, `--ui-campo-altura`, lida por `ui-botao`, `ui-campo-texto`, `ui-lista-flutuante`, `ui-segmented` e `ui-badge[controle]`. Valor padrão: `--ui-altura-md` (34px).
2. **Escala nomeada** em `src/tokens/spacing.css`: `--ui-altura-sm` (26px), `--ui-altura-md` (34px), `--ui-altura-lg` (42px).
3. **Atributos iguais em todos os controles:** `tamanho` (ou `size`/`densidade`) e `altura` (ou `height`). Precedência: `altura` > `tamanho` > herdado do contêiner > token global. A lógica vive em `src/core/altura-controle.ts`.
4. **Mobile (≤ 640px):** todos os controles sobem para no mínimo 38px (alvo de toque).
5. **O contêiner `<ui-linha>`** aplica a altura aos filhos, alinha (`align-items`), espaça (`gap`), quebra a linha e tira a largura 100% de botão e campo.

## Como escolher

| Situação | Use |
| :--- | :--- |
| Vários controles lado a lado | `<ui-linha tamanho="sm">` |
| Uma região inteira (formulário, barra) | `.minha-regiao { --ui-campo-altura: 36px }` |
| Um controle diferente dos demais | `tamanho`/`altura` no próprio controle |
| A aplicação inteira | `UIBus.definirDensidade('compacta')` |
| Controles de tipos diferentes, um com rótulo acima | `<ui-linha alinhar="fim">` |
| Badge clicável alinhado a botões | `<ui-badge controle>` |

## Itens que não são "controles"

`ui-switch`, `ui-checkbox`, `ui-radio`, `ui-avatar` e `ui-badge` (sem `controle`) têm tamanho próprio e ficam **centralizados** na linha; não são esticados.

## Verificação

`tests/contrato-linha.test.ts` garante que todos os controles leem a mesma variável e traduzem os mesmos atributos para o mesmo valor. Como o happy-dom não faz layout, a medição em pixels é feita no playground (`index.html`, card "Controles na mesma linha").
