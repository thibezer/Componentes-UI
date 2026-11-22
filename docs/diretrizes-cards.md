# Diretrizes de cards (`<ui-card>`)

## 1. Cantos concêntricos

Um canto interno só parece alinhado ao externo quando os dois arcos têm o **mesmo centro**:

```
raio interno = raio externo − distância entre as bordas
```

No `ui-card` a distância é a **folga** (padding das seções) mais a borda de 1 px. O card publica essa conta pronta:

| Variável | Quem define | Significado |
| :-- | :-- | :-- |
| `--ui-card-raio` | consumidor | Raio do card. Vence tudo (inclusive a derivação do pai). |
| `--ui-card-padding` | consumidor | Folga usada na conta (padrão 16 px; 12 px em `compacto`). Informe-a se mudar o padding das seções. |
| `--ui-card-raio-aninhado` | card (somente leitura) | Dentro de cabeçalho/corpo/rodapé: `max(0, raio − folga − borda)`. |

Regras de uso:

1. **Filho que acompanha o canto** (imagem, bloco colorido, botão em largura total): `border-radius: var(--ui-card-raio-aninhado)`.
2. **Card dentro de card** herda sozinho: o raio do filho já é `raio do pai − folga − borda`, sem configurar nada.
3. **Mídia no topo (`slot="midia"`)** encosta na borda: o `overflow: hidden` do card a recorta com o raio já descontado da borda; não arredonde a imagem por conta própria.
4. **Piso em 0.** Se a folga for maior que o raio o filho fica reto, que é a geometria correta. Para um filho arredondado mesmo assim, aumente o raio do card (`raio="xl"`) ou reduza a folga.
5. **Controles** (botão, campo) mantêm o raio de controle (`--ui-raio-borda`), pois não encostam no canto do card.
6. **Definir `--ui-card-raio` num ancestral** desliga a derivação dos cards aninhados (todos passam a ter o mesmo raio). Defina-o no próprio card.

## 2. Escala de raio

`raio="nenhum | sm | md | lg | xl"` (alias `radius`) escolhe a base entre os tokens `--ui-raio-*`:

| Valor | Token | Padrão |
| :-- | :-- | :-- |
| `nenhum` | — | 0 |
| `sm` | `--ui-raio-sm` | 4 px |
| `md` | `--ui-raio-borda` | 6 px |
| `lg` (padrão sem atributo) | `--ui-raio-lg` | 10 px |
| `xl` | `--ui-raio-xl` | 16 px |

Sem o atributo, o card é um **contêiner** e usa `lg` (antes usava o raio de controle). `formato="squircle"` sobe um degrau (`xl`) e o `raio` explícito vence o `formato`.

## 3. Tipografia (baseada nas HIG de tipografia da Apple)

Adaptado ao que vale para um card web (alta densidade, desktop e toque). Fonte: Human Interface Guidelines, "Typography".

| Seção | Estilo (HIG) | Token padrão | Peso | Entrelinha |
| :-- | :-- | :-- | :-- | :-- |
| Cabeçalho | Headline | `--ui-tamanho-corpo` (14 px) | semibold (600) | 1,25 |
| Corpo | Body | `--ui-tamanho-corpo` (14 px) | regular (400) | 1,5 |
| Rodapé | Footnote | `--ui-tamanho-corpo-sm` (13 px), cor secundária | regular | 1,5 |

Ajustes por `--ui-card-fonte-cabecalho`, `--ui-card-peso-cabecalho`, `--ui-card-fonte-corpo` e `--ui-card-fonte-rodape`.

1. **Hierarquia por peso, tamanho e cor**, não por mais famílias. Use só `--ui-fonte-base` (e `--ui-fonte-codigo` para dados); misturar fontes confunde a hierarquia.
2. **Sem pesos leves** (ultralight, thin, light): o card parte de 400 e o cabeçalho de 600. Fonte customizada fina deve ter tamanho maior.
3. **Tamanho mínimo:** nenhum texto do card abaixo de 11 px (`--ui-tamanho-caption`); as HIG usam 10 pt como mínimo no macOS e 11 pt no iOS.
4. **Entrelinha:** 1,25 em títulos de uma ou duas linhas; 1,5 em texto corrido. Com três ou mais linhas não aperte a entrelinha, mesmo com altura limitada.
5. **Texto grande não trunca:** cabeçalho e rodapé quebram linha (`flex-wrap`) e empilham o conteúdo secundário (ações, datas) abaixo do título; palavras longas quebram (`overflow-wrap`). Evite `text-overflow: ellipsis` em áreas rolavéis, salvo se um clique abrir o texto completo.
6. **Ao ampliar o texto, priorize o conteúdo:** rótulos de abas e metadados não precisam crescer tanto quanto o corpo; mantenha o título no topo.
7. **Ícones acompanham o texto:** em cabeçalho com ícone, dimensione-o em `em` para escalar com a fonte.
8. **Contraste:** o rodapé usa `--ui-cor-texto-secundario`; confira o contraste (4,5:1) ao trocar o tema. Texto sobre imagem (`slot="midia"`) precisa de fundo próprio.

## 4. Outras diretrizes

- **Elevação:** `plano` para listas densas, `elevado` para cards que flutuam sobre o fundo, `destaque` para um único card em foco por tela.
- **Densidade:** `compacto` em grades de dados; mantém a conta concêntrica (folga 12 px).
- **Clicável:** o card inteiro é um botão (`role=button`); não coloque outro controle principal dentro dele sem necessidade. Controles internos têm clique próprio e não ativam o card. Sempre informe `aria-label`.
- **Seções vazias somem** (mídia, cabeçalho, rodapé): não reserve espaço com elementos vazios.
- **Cores e raios só por tokens** (`src/tokens/`), nunca valores fixos no app.
