# AGENTS.md — Diretrizes de Engenharia, Arquitetura e Testes (`Componentes-UI`)

> **Instrução de Sistema para Agentes de IA (Claude, Cursor, Antigravity, Copilot, Windsurf):**
> Você está operando no repositório **`Componentes-UI`** (`@thibezer/ui-components-kit`), uma biblioteca de Web Components nativos (Custom Elements), agnóstica de framework, com foco em aplicações de alta densidade de dados, tabelas estilo planilha, gerenciamento de camadas estilo QGIS e motores gráficos CAD/GIS (`gerencigeo-canvas`).
> Leia este documento integralmente antes de planejar, criar ou refatorar qualquer arquivo.

---

## 1. Mapa de Camadas da Arquitetura ($L_0 \to L_5$)

O projeto impõe um **Grafo Acíclico Direcionado (DAG)** estrito. Um módulo na camada $L_n$ **só pode importar** módulos de camadas inferiores ($L_{<n}$). Importações circulares ou de camadas superiores quebram o *tree-shaking* e a arquitetura.

| Camada | Diretórios / Módulos Reais | Responsabilidade Estrita | Regra de Isolamento |
| :--- | :--- | :--- | :--- |
| **$L_0$ (Design Tokens)** | `src/tokens/` (`colors.css`, `spacing.css`, `typography.css`, `elevation.css`, `index.css`), `ui-tokens.css` | Primitivos visuais, temas (claro/escuro), variáveis CSS globais e escalas tipográficas/espaciais. | Zero JavaScript. Nenhum componente em $L_3/L_4$ pode usar cores hexadecimais ou medidas mágicas fixas fora dos tokens. |
| **$L_1$ (Fundação Core)** | `src/core/` (`ssr-safe.ts`, `listener-bag.ts`, `svg-seguro.ts`, `ui-bus.ts`, `acessibilidade.ts`, `alvo-digitavel.ts`, `form-associated-element.ts`, `form-submissao.ts`, `form-validacao.ts`, `parts.ts`, `rotulo.ts`, `zero-js-triggers.ts`, `leaflet-loader.ts`, `leaflet-style.ts`) | Segurança SSR, ciclo de vida de eventos sem vazamento de memória, sanitização XSS/SVG, barramento de comunicação (`ui-bus`), `ElementInternals` para formulários e gatilhos declarativos. | **Proibido** importar qualquer arquivo de `src/components/` ou `src/gerencigeo-canvas/`. |
| **$L_2$ (Motores Puros & Renderers)** | `src/gerencigeo-canvas/` (`feature_algoritmos.ts`, `feature_curvas.ts`, `feature_simplificacao.ts`, `feature_snap.ts`, `feature_indice.ts`, `feature_versoes.ts`, `layer_hit_test.ts`, `layer_manager.ts`, `renderers/*`) + utilitários puros (`avaliador-expressao.ts`, `cores-utils.ts`) | Geometria computacional, topografia, cálculos de interseção/área/azimute, *snapping*, indexação espacial, versionamento imutável (*Undo/Redo*) e renderização em Canvas/WebGL/Leaflet. | Módulos algorítmicos (`feature_algoritmos`, `feature_curvas`, `feature_snap`, `layer_hit_test`, `avaliador-expressao`) devem ser **funções puras orientadas a dados**, sem acoplamento com Custom Elements. |
| **$L_3$ (Componentes Atômicos & Forms)** | `src/components/`: `ui-botao`, `ui-icone`, `ui-texto`, `ui-badge`, `ui-avatar`, `ui-skeleton`, `ui-stat`, `ui-card`, `ui-campo-texto`, `ui-checkbox`, `ui-radio`, `ui-switch`, `ui-segmented`, `ui-alerta`, `ui-tooltip`, `ui-modal`, `ui-drawer`, `ui-lista-flutuante`, `ui-cores` | Componentes de UI fundamentais, overlays acessíveis (pilha de modais, focus trap) e controles de formulário nativos (`FormAssociated`). | Podem usar $L_0$ e $L_1$. Nunca importam componentes de $L_4$ nem o motor `gerencigeo-canvas`. |
| **$L_4$ (Workstation, CAD, GIS & Data)** | `src/components/`: `ui-canvas-cad`, `ui-camadas`, `ui-tabela-propriedades`, `ui-tabela`, `ui-barra-ferramentas` (`ui-ribbon`, `ui-paleta-ferramentas`), `ui-mapa`, `ui-seletor-mapa-base` | Componentes complexos de engenharia, inspeção de propriedades com expressões matemáticas, árvores de camadas com drag-and-drop e grids de dados de alta densidade. | Atuam como **Casca Fina (*Thin Shell*)** sobre $L_1$, $L_2$ e $L_3$. A comunicação entre eles ocorre exclusivamente via `ui-bus.ts`, `cad-broadcast.ts` ou Custom Events. |
| **$L_5$ (Entrypoints & Contratos)** | `src/index.ts`, `src/register.ts`, `src/botao.ts`, `src/camadas.ts`, `src/canvas.ts`, `src/tabela.ts`, `src/forms.ts`, `src/tools.ts`, `custom-elements-manifest.config.mjs` | Exportação modular (*tree-shakeable*), auto-registro de Custom Elements e geração de manifesto/tipos para HTML nativo, React e Vue. | Apenas re-exportações limpas e registros; zero lógica de negócio. |

---

## 2. Regras de Ouro Inegociáveis (Golden Rules)

### Regra #0: Never Crash & Degradação Graciosa (Prioridade Máxima)
1. **Entradas Externas são Hostis:** Atributos HTML, payloads JSON, GeoJSON em `cad-feicoes.ts`, expressões em `avaliador-expressao.ts` (`ui-tabela-propriedades`), respostas remotas em `tabela-remota.ts` (`ui-tabela`) e SVGs em `ui-icone` podem vir nulos, truncados, malformados ou com tipos incorretos.
2. **Zero Exceções Não Tratadas:** Funções públicas, *lifecycle hooks* (`connectedCallback`, `attributeChangedCallback`) e *handlers* de eventos nunca devem estourar exceções não capturadas que quebrem a árvore DOM ou travem o loop do Canvas. Retorne estados de erro tipados, aplique *fallbacks* seguros sem corromper os dados do usuário e emita eventos de erro padronizados.
3. **Proteção Numérica e Geométrica:** Em `src/gerencigeo-canvas/` e `avaliador-expressao.ts`, proteja toda operação matemática contra `NaN`, `Infinity`, divisão por zero, polígonos degenerados ($< 3$ vértices) ou recursão infinita em árvores de camadas/propriedades.

### Regra #1: SSR-Safety Absoluto (`src/core/ssr-safe.ts`)
- O pacote deve poder ser importado em ambientes Node.js / SSR sem estourar `ReferenceError: window is not defined` ou `HTMLElement is not defined`.
- Todo componente e módulo deve respeitar as guardas de `src/core/ssr-safe.ts` e passar obrigatoriamente pelo teste `tests/ssr-safety.test.ts`.
- Nunca execute acesso direto a `document`, `window`, `localStorage` ou `ResizeObserver` no escopo global (*top-level*) durante a importação do módulo.

### Regra #2: Zero Vazamento de Memória (`src/core/listener-bag.ts`)
- Todo `addEventListener` (em `window`, `document` ou elementos internos), `ResizeObserver` (`cad-tamanho-observer.ts`, `camadas-resizer.ts`), `IntersectionObserver` ou inscrição no `ui-bus.ts` **deve** ser gerenciado via `ListenerBag` (`src/core/listener-bag.ts`) e limpo integralmente no `disconnectedCallback()`.
- Reconexões do componente no DOM (`connectedCallback` $\to$ `disconnectedCallback` $\to$ `connectedCallback`) devem ser idempotentes e nunca duplicar *listeners*.

### Regra #3: Segurança contra XSS e Sanitização (`src/core/svg-seguro.ts`)
- É terminantemente proibido injetar strings arbitrárias de usuários ou ícones externos diretamente via `innerHTML` sem passar pelo sanitizador `src/core/svg-seguro.ts` ou por construção segura de nós DOM (`createElement`, `textContent`).

### Regra #4: Padrão "Thin Shell + Micro-Módulos" (Proibido Monolitos)
- Nenhum componente complexo deve concentrar template, sincronização de atributos, *drag-and-drop*, teclado e regras de estado em um único arquivo `.ts` gigante.
- Siga estritamente a anatomia modular já estabelecida no projeto (exemplos: `ui-camadas`, `ui-tabela`, `ui-tabela-propriedades`, `ui-canvas-cad`):
  - `ui-<componente>.ts`: Casca do Custom Element (ciclo de vida, propriedades públicas e delegação).
  - `<prefixo>-template.ts` / `<prefixo>-renderizador.ts`: Construção e atualização cirúrgica do DOM.
  - `<prefixo>-atributos-sync.ts` / `<prefixo>-sincronizacao-dom.ts`: Mapeamento bidirecional entre atributos HTML e estado interno.
  - `<prefixo>-eventos-*.ts` / `<prefixo>-interacao.ts`: Tratamento de mouse, ponteiro e arraste.
  - `<prefixo>-teclado.ts`: Navegação acessível por teclado (respeitando `src/core/alvo-digitavel.ts` para não interceptar teclas quando o usuário está digitando em um `<input>` ou editor).
  - `<prefixo>-selecao.ts` / `<prefixo>-persistencia.ts`: Lógica pura de estado.
  - `tipos.ts`: Contratos, *enums* e interfaces de eventos exportáveis.
  - `ui-<componente>.css`: Estilos encapsulados baseados em `src/tokens/` e expondo `::part()` (`src/core/parts.ts`).

### Regra #5: Arquitetura *Agent-Native* e Orientada a Comandos (`ui-bus` + `cad-broadcast`)
- Toda funcionalidade acionável pelo usuário (clicar em um botão da `ui-ribbon`, alternar visibilidade no `ui-camadas`, editar um vértice no `ui-canvas-cad` ou filtrar a `ui-tabela`) deve possuir uma **API programática pública** e/ou ser acionável via evento/comando no `ui-bus.ts` / `cad-broadcast.ts`.
- O histórico de feições (`src/gerencigeo-canvas/feature_versoes.ts`) deve tratar cada mutação geométrica ou de estilo como um snapshot/nó determinístico, permitindo *Undo/Redo* previsível e auditoria de estado.

---

## 3. Estratégia de Testes em 5 Camadas (Tests are the Gate)

Nenhuma funcionalidade ou correção é considerada pronta sem passar pelas camadas de validação no **Vitest** (`vitest.config.ts`):

### Camada A: Testes Unitários de Algoritmos e Dados Puros (Zero DOM)
- **Onde vivem:** `tests/feicoes-algoritmos.test.ts`, `tests/feicoes-curvas.test.ts`, `src/gerencigeo-canvas/layer_hit_test.test.ts`, `src/gerencigeo-canvas/layer_hit_test_avancado.test.ts`, `src/gerencigeo-canvas/feature_adapters.test.ts`, `src/components/ui-tabela-propriedades/ui-tabela-propriedades-math.test.ts`.
- **Como testar:** Passe estruturas de dados puras (coordenadas UTM/geodésicas, geometrias complexas, expressões matemáticas como `=10.5 * 2 + (4 / 2)`) e valide o retorno exato com tolerância de ponto flutuante (`toBeCloseTo`). Garanta **idempotência** total.

### Camada B: Testes de Componentes e Ciclo de Vida DOM
- **Onde vivem:** `src/components/<nome>/ui-<nome>.test.ts` e `tests/ui-canvas-cad.test.ts`.
- **Como testar:** Instancie o elemento no DOM de teste, verifique renderização inicial, mutação de atributos/propriedades, emissão de `CustomEvent` (com `detail` tipado) e limpeza completa no `disconnectedCallback`.

### Camada C: Testes de Regressão, Revisão, Lacunas e Robustez (Caça ao Pânico)
- **Onde vivem:**
  - `src/components/ui-camadas/ui-camadas.regressao.test.ts`
  - `src/components/ui-tabela-propriedades/ui-tabela-propriedades.regressao.test.ts`
  - `src/components/ui-tabela/ui-tabela-robustez.test.ts`
  - `src/components/ui-barra-ferramentas/ui-barra-ferramentas-revisao.test.ts`
  - `src/components/ui-lista-flutuante/ui-lista-flutuante.revisao.test.ts`
  - `src/components/ui-seletor-mapa-base/ui-seletor-mapa-base.revisao.test.ts`
  - `tests/feicoes-ferramentas-lacunas.test.ts`, `tests/feicoes-revisao.test.ts`
- **Regra obrigatória:** Todo bug corrigido **exige** um teste sintético no arquivo `*.regressao.test.ts` ou `*-robustez.test.ts` correspondente que falhava antes da correção e passa depois. Inclua entradas adversariais (arrays vazios, `null`, `undefined`, textos com caracteres especiais/HTML, cliques rápidos consecutivos, coordenadas fora de escala).

### Camada D: Contratos Transversais (SSR, Acessibilidade, Temas, Forms e Tipos)
- **Onde vivem:**
  - `tests/ssr-safety.test.ts` (Importação segura sem DOM).
  - `tests/teclado-aria.test.ts` e `src/core/acessibilidade.test.ts` (Roles ARIA, foco, `Escape`, `Tab`, setas e `alvo-digitavel`).
  - `tests/tema.test.ts`, `tests/customizacao.test.ts` e `src/components/ui-tabela/ui-tabela-estetica.test.ts` (Tokens CSS, `::part()`, densidade e alinhamento).
  - `tests/form-associated.test.ts`, `tests/form-submissao.test.ts`, `tests/form-validacao.test.ts` (Participação nativa em `<form>`).
  - `tests/tipos/react.tsx` e `tests/tipos/vue.ts` (Verificação estática de tipos para consumidores React e Vue).

### Camada E: Orçamento de Performance (`tests/feicoes-desempenho.test.ts`)
- **Referência:** `docs/desempenho-feicoes.md` e `tests/feicoes-desempenho.test.ts`.
- Operações pesadas em `gerencigeo-canvas` (renderização de milhares de feições em `feicoes_renderer.ts`, indexação espacial em `feature_indice.ts`, *hit-testing* em `layer_hit_test.ts`, operações em lote em `tests/feicoes-lote.test.ts`) e na `ui-tabela` devem manter tempo de execução dentro do orçamento de quadro ($\le 16\text{ ms}$ em caminhos quentes de interação como *pan/zoom/hover*), evitando realocações desnecessárias de objetos dentro de loops de renderização.

---

## 4. Fluxo de Trabalho do Agente (Loop de 5 Passos)

Para cada tarefa solicitada no `Componentes-UI`, siga rigorosamente esta sequência:

1. **Orientar (`Orient`):**
   - Leia os documentos relevantes em `docs/` (`docs/canvas-cad-eventos.md`, `docs/desempenho-feicoes.md`, `docs/guia-migracao-mapengine.md`, `docs/plano-migracao-canvas-cad.md`) e o `README.md` específico do módulo (`src/components/ui-camadas/README.md`, `src/gerencigeo-canvas/README.md`, `src/components/ui-seletor-mapa-base/README.md`).
   - Identifique em qual camada ($L_0 \to L_5$) o código reside e quais micro-módulos serão afetados.
2. **Escrever Testes Primeiro (`Test-First`):**
   - Defina o teste de aceitação ou regressão no Vitest antes de alterar a implementação.
3. **Implementar com Isolamento Modular (`Implement`):**
   - Escreva código TypeScript estrito (zero `any`, tipagem explícita em `tipos.ts`), respeitando `ssr-safe.ts`, `listener-bag.ts`, `svg-seguro.ts` e os tokens de `src/tokens/`.
4. **Verificar (`Verify Gate`):**
   - Execute os testes unitários e de regressão do módulo tocado.
   - Verifique a checagem de tipos (`tsc --noEmit`, incluindo `tests/tipos/tsconfig.json`).
   - Verifique se `tests/ssr-safety.test.ts` continua verde.
5. **Documentar (`Record`):**
   - Se adicionou ou alterou atributos, propriedades, eventos (`CustomEvent`) ou CSS `::part()`, atualize os JSDocs do componente (para o `custom-elements-manifest.config.mjs`), a documentação em `docs/` e o `CHANGELOG.md`.

---

## 5. Checklist de "Definition of Done" (DoD)

Uma feature ou refatoração no `Componentes-UI` **só está concluída** quando todos os itens abaixo forem verdadeiros:

- [ ] **Respeito às Camadas:** Nenhuma importação ilegal entre $L_0 \to L_5$.
- [ ] **Decomposição Limpa:** O arquivo principal `ui-<nome>.ts` continua enxuto, delegando lógica para submódulos especializados.
- [ ] **Zero Crash / Hostile Input Safe:** Entradas inválidas, `null`, strings malformadas ou geometrias degeneradas são tratadas graciosamente e testadas.
- [ ] **SSR & Memory Safe:** Usa guardas de `ssr-safe.ts` e limpa todos os listeners/observers via `listener-bag.ts` no `disconnectedCallback()`.
- [ ] **Design Tokens & Acessibilidade:** Usa variáveis de `src/tokens/`, expõe `::part()` padronizado, suporta navegação por teclado e respeita `alvo-digitavel.ts`.
- [ ] **Suíte de Testes Verde:** Testes unitários, `*.regressao.test.ts` / `*-robustez.test.ts` e `ssr-safety.test.ts` passando sem avisos.
- [ ] **Contratos Atualizados:** Tipos exportados em `tipos.ts`, entrypoints em `src/` íntegros e compatibilidade garantida com `tests/tipos/react.tsx` e `tests/tipos/vue.ts`.

---

## 6. Prompts Táticos de Engenharia para Copiloto de IA no `Componentes-UI`

### A. Prompt para Criar ou Evoluir Algoritmo no `gerencigeo-canvas` ($L_2$)
> *"Atue como Engenheiro de Software Sênior especialista em Geometria Computacional e TypeScript. Preciso implementar/otimizar [DESCREVA A OPERAÇÃO: ex. interseção de polilinhas / offset / snapping / simplificação] dentro de `src/gerencigeo-canvas/`. Siga as regras do `AGENTS.md`: (1) Escreva uma função pura em $L_2$ sem dependência de DOM; (2) Trate entradas hostis (vértices duplicados, colineares, arrays vazios, `NaN`, divisão por zero); (3) Evite alocações de memória desnecessárias no hot-path para manter o orçamento de 16ms (`docs/desempenho-feicoes.md`); (4) Gere a suíte completa de testes no Vitest cobrindo casos nominais e casos de borda."*

### B. Prompt para Criar ou Refatorar Web Component ($L_3 / L_4$)
> *"Atue como Arquiteto de Design Systems e Web Components Nativos. Vamos criar/refatorar o componente `<ui-nome>` em `src/components/ui-nome/`. Siga estritamente o padrão 'Thin Shell + Micro-Módulos' do `AGENTS.md`: separe o Custom Element principal dos submódulos de template, sincronização de atributos, eventos, teclado (usando `alvo-digitavel.ts`) e `tipos.ts`. Garanta compatibilidade SSR (`ssr-safe.ts`), gerenciamento de eventos com `ListenerBag` (`listener-bag.ts`), sanitização com `svg-seguro.ts` e estilização 100% baseada em `src/tokens/`. Inclua os testes `.test.ts` e `.regressao.test.ts`."*

### C. Prompt para Caça a Bugs e Geração de Testes de Robustez (`panic_hunt`)
> *"Analise o componente/módulo `[CAMINHO DO ARQUIVO]` do `Componentes-UI`. Atue como um engenheiro de QA adversarial e gere uma bateria de testes de robustez e regressão no Vitest simulando: (1) Atributos e propriedades nulas, indefinidas ou com tipos trocados; (2) Desconexão e reconexão rápida do DOM (`connectedCallback` / `disconnectedCallback`) verificando ausência de vazamento de listeners; (3) Conflitos de atalhos de teclado quando o foco está em um input editável (`alvo-digitavel.ts`); (4) Volume extremo de dados (10.000 linhas/feições) e chamadas assíncronas fora de ordem."*

### D. Prompt para Otimização de Performance em Canvas e Tabelas
> *"Analise os arquivos `[ex: src/gerencigeo-canvas/renderers/feicoes_renderer.ts ou src/components/ui-tabela/tabela-renderizador.ts]` junto com `docs/desempenho-feicoes.md` e `tests/feicoes-desempenho.test.ts`. Identifique gargalos de alocação de memória (Garbage Collection em loops de frame), reflows de DOM (Layout Thrashing) ou buscas lineares $O(N)$ que possam usar o índice espacial (`feature_indice.ts`) ou cache por revisão. Refatore mantendo todos os testes existentes verdes e adicione um benchmark verificável no teste de desempenho."*