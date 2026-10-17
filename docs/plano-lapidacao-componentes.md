# Plano de lapidação dos componentes

Resultado de uma revisão geral rápida (métricas estáticas: linhas de código e de teste, uso de `any`/`TODO`, atributos ARIA).
Não houve auditoria em runtime; os itens abaixo são priorizados por indício e devem ser confirmados ao executar cada fase.

Este documento é também o **registro vivo** das melhorias: ao concluir um item, marque-o e anote a data e o commit.

## Protocolos que regem este plano

Este plano obedece ao [`AGENTS.md`](../AGENTS.md) (camadas L0→L5, Regras de Ouro #0–#5, testes em 5 camadas, loop de 5 passos e DoD) e ao `scripts/check-layers.mjs`. Em conflito, vale o `AGENTS.md`. O SRP abaixo é a **regra #4 (Thin Shell + Micro-Módulos)** levada a cada arquivo.

Loop por fase (AGENTS §4): **Orient** (ler `docs/` e README do módulo, identificar a camada) → **Test-First** → **Implement** → **Verify Gate** → **Record** (JSDoc, `docs/`, `CHANGELOG.md`).

Comando de verificação de cada fase: `npm run gate` (`check:layers` + `check:types` + `check:framework-types` + `test:run`); ao fechar a fase, `npm run gate:full` (inclui `build`). `npm run test:ssr` para mudanças em módulos de import.

> Pendência de repositório: `AGENTS.md`, `scripts/check-layers.mjs` e as mudanças do `package.json` existem só no checkout principal (não commitados). Este worktree ainda não os tem; antes da Fase 0.5 é preciso commitá-los (ou trazê-los para cá) para que `npm run gate` rode aqui.

## Princípio orientador: SRP

Cada arquivo tem **uma única razão para mudar**. Regras práticas adotadas:

1. **Classe do componente (`ui-*.ts`)** só orquestra: ciclo de vida, atributos/propriedades, delegação. Sem lógica de domínio, sem HTML/CSS inline extenso, sem tratamento de eventos de terceiros.
2. **Template** (HTML do shadow DOM) em arquivo próprio (`*-template.ts`).
3. **Eventos/teclado** em módulo próprio (`<prefixo>-teclado.ts`, `<prefixo>-eventos-*.ts`/`-interacao.ts`); atributos em `<prefixo>-atributos-sync.ts`; estado puro em `<prefixo>-selecao.ts`/`-persistencia.ts`. Teclado respeita `src/core/alvo-digitavel.ts`.
4. **Adaptadores de bibliotecas externas** (Leaflet etc.) isolados em um único módulo por componente; nenhum `as any` espalhado pelo código. Os tipos "emprestados" ficam no `tipos.ts` do componente (convenção do AGENTS).
5. **Utilitários puros** (cálculo, parsing, normalização) em módulos sem acesso a DOM, testáveis isoladamente.
6. **Acessibilidade** (papéis, rótulos, foco) em módulo próprio quando passar de ~30 linhas (padrão já usado em `modal-acessibilidade.ts` e `drawer-acessibilidade.ts`).
7. **Gatilho de divisão**: arquivo acima de ~400 linhas ou com mais de uma responsabilidade nomeável sem usar "e" é candidato a quebra.
8. Respeitar as camadas: o módulo novo fica na mesma camada do componente de origem e nunca importa camada superior.
9. Cada módulo novo nasce com teste próprio; a divisão não pode alterar a API pública (atributos, eventos, métodos) nem o `custom-elements.json`.

## Achados da conferência com AGENTS.md e check-layers

Rodei `scripts/check-layers.mjs` e cruzei o `AGENTS.md` com o código real (nada foi alterado nesses arquivos).

| # | Achado | Ação no plano |
|---|---|---|
| A1 | (corrigido) `npm run check:layers` **falhava**: `src/core/ui-bus.ts` (L1) importa `../components/ui-alerta` (L3). O `gate` já nasce vermelho. | Fase 0.5 |
| A2 | `check-layers` cobre só L0, L1 e L2. Faltam: L3 ↛ L4/L2, L4 ↛ L5, e imports de efeito colateral (`import '...'`) e dinâmicos (`import(...)`), que a regex `from '...'` não pega. A regra de L0 usa uma regex que só casa `from "x.ts"`. | Fase 0.5 |
| A3 | `avaliador-expressao.ts` (em `ui-tabela-propriedades/`) e `cores-utils.ts` (em `ui-cores/`) são declarados **L2 (puros)** no AGENTS, mas vivem em diretórios de componentes L4/L3. Se `gerencigeo-canvas` (L2) precisar deles, viola a regra. | Fase 0.5: decidir mover para L2 ou corrigir o AGENTS |
| A4 | O AGENTS manda "zero `any`", mas há **301** `any` em código de produção (`as any`/`: any`). Impossível zerar numa fase só. | Meta incremental (ver DoD) |
| A5 | Camada C exige teste de regressão por bug. O canvas-cad não tem `*.regressao.test.ts`; `ui-mapa`, `ui-tooltip`, `ui-modal` e simples também não. | Cada fase cria o arquivo de regressão/robustez |
| A6 | Regra #2 lista `ResizeObserver` (`cad-tamanho-observer.ts`, `camadas-resizer.ts`) como gerenciado por `ListenerBag`; `cad-tamanho-observer.ts` gerencia manualmente (`disconnect`, `clearTimeout`). | Auditar na Fase 1/2 |
| A7 | Existem `AGENTS.md` e `agents.md` (143 linhas cada). No Windows é o mesmo arquivo; em Linux/CI seriam dois. | Manter só `AGENTS.md` |
| A8 | Os caminhos citados no AGENTS (tokens, core, testes, README, `tabela-remota.ts`, `feicoes_renderer.ts`) existem todos. | Nenhuma |

## Diagnóstico

| Prioridade | Componente | Problemas |
|---|---|---|
| P0 | `ui-canvas-cad` | 3.080 linhas; os testes ficam em `tests/` (~7.000 linhas, não em `src/`), mas módulos como `cad-eventos-canvas`, `cad-atributos-sync` e `cad-tamanho-observer` só eram cobertos indiretamente; 23 usos de `as any`; `cad-feicoes.ts` com 1.179 linhas; acesso a internos do Leaflet (`_leaflet_id`); pouco ARIA |
| P1 | `ui-camadas` | 4.539 linhas; `ui-camadas.ts` com 878; `camadas-arvore-renderer.ts` (510) e `camadas-drag-drop.ts` (495) grandes; 8 `any`/TODO |
| P1 | `ui-mapa` | Sem ARIA; 36 linhas de teste; fallback em `window.L` com `as any` |
| P2 | `ui-tooltip` | Testes mínimos (XSS e abrir/fechar); `as any` em `showPopover`; `catch(_e) {}` silencioso |
| P2 | `ui-modal` | 7 `any`/TODO; componente crítico de a11y com pouca cobertura |
| P3 | `ui-avatar`, `ui-texto` | Sem ARIA; testes mínimos; `alt` genérico "Avatar" |
| P3 | `ui-badge`, `ui-card`, `ui-stat`, `ui-skeleton` | Testes curtos; verificar `aria-busy` (skeleton) e papéis (stat) |
| P3 | `ui-switch`, `ui-checkbox`, `ui-radio` | Cobrir validação e associação a `<form>` |
| Monitorar | `ui-tabela`, `ui-barra-ferramentas`, `ui-lista-flutuante`, `ui-seletor-mapa-base` | Em bom estado; `ui-tabela.ts` (635) e `ui-ribbon.ts` (552) / `ui-paleta-ferramentas.ts` (548) acima do gatilho de divisão |

## Plano de ataque

Cada fase é independente e termina com `npx tsc --noEmit`, `npx vitest run` e `npm run build` verdes, em commit próprio.

### Fase 0 — Rede de segurança (pré-requisito, Camadas A/B do AGENTS)
- [x] Testes de caracterização do `ui-canvas-cad`. **Correção do diagnóstico:** o componente já tinha ~7.000 linhas de teste em `tests/` (a contagem inicial só olhou `src/`). A Fase 0 virou preencher lacunas: `tests/cad-eventos-canvas.test.ts` (24 testes) e `tests/cad-atributos-tamanho.test.ts` (13 testes).
- [ ] Lacunas restantes: `cad-colecoes-dados`, `cad-inicializador`, `cad-toolbar-painel`, `cad-template` (só cobertos indiretamente).
- [ ] Mesmo para o fluxo de `ui-mapa` e `ui-tooltip` (Camada B: ciclo de vida, atributos, eventos, limpeza no `disconnectedCallback`).
- Critério: comportamento atual congelado; refatoração subsequente não pode quebrá-los.

### Fase 0.5 — Higiene arquitetural (gate verde)
Pré-requisito das demais fases: sem isso `npm run gate` falha.
- [x] **Corrigir A1** (2026-10-17): `ui-bus.ts` (L1) não pode conhecer `ui-alerta` (L3). Inverter a dependência: o bus expõe um ponto de registro (ex.: `registrarProvedorToast(fn)`) e o `ui-alerta` (ou `src/register.ts`, L5) registra o `UIToast` ao ser carregado. Manter a API pública do bus (`UIBus.toast`) e o `tests/ssr-safety.test.ts` verde. Feito: contratos em `src/core/tipos-toast.ts` (reexportados por `ui-toast.ts`), `UIBus.registrarProvedorToast`, auto-registro em `ui-toast.ts` e `src/core/ui-bus-toast.test.ts` (5 testes). **Mudança de comportamento:** quem importar só `core/ui-bus` sem carregar `ui-alerta` passa a ter `notificar` como no-op; registrar no `CHANGELOG.md`.
- [x] **Ampliar `check-layers.mjs` (A2)** (2026-10-17): regras L3 ↛ L4/`gerencigeo-canvas`; L4 ↛ L5 (`src/index.ts`, `src/register.ts`, entrypoints); detectar `import 'x'`, `export ... from 'x'` e `import('x')`; corrigir a regra de L0. Feito: o script agora resolve cada import ao destino e compara camadas (L3 ↛ L4, L3 ↛ `gerencigeo-canvas`, L4 ↛ L5, L0 só CSS); `import type` é ignorado por ser apagado na compilação; corrigido o falso positivo de prefixo (`core` × `cores.ts`). Testado em `tests/check-layers.test.ts` (8 testes).
- [x] **A3** (parcial): os dois utilitários continuam fisicamente onde estão, mas o `check-layers` os trata como L2 (`UTILITARIOS_L2`), e não importam nada de runtime de L3/L4. Mover para `gerencigeo-canvas/` fica como decisão futura (muda caminhos públicos).
- [x] **A7**: no worktree só existe `AGENTS.md`; o repositório rastreia um único arquivo (o `agents.md` era o mesmo arquivo no Windows).
- [x] **A9**: `check:framework-types` precisa de `dist/`; o `package.json` foi reordenado: `gate` = `check:layers` + `check:types` + `test:run`; `gate:full` = `gate` + `build` + `check:framework-types`.
- Critério: `check:layers`, `check:types`, `test:run`, `build` e `check:framework-types` verdes (verificado em 2026-10-17: 72 arquivos, 1052 testes).

### Fase 1 — `ui-canvas-cad` (P0)
- [x] **Tipos** (2026-10-17): `ui-canvas-cad/tipos.ts` criado (`ContainerLeaflet`, `EventoMapaCad`, `LatLngEvento`, `ElementoComCoordenadas`); `as any` de eventos e coordenadas em `cad-eventos-canvas.ts` substituídos. Restam 14 ocorrências de `any` no diretório (parâmetros genéricos de callbacks, `cad-inicializador.ts`, `cad-atributos-sync.ts`, etc.).
- [x] **Adaptador Leaflet** (2026-10-17, `cad-leaflet-adaptador.ts`): concentrar o reset de `_leaflet_id` (hoje duplicado em `cad-inicializador.ts` e `ui-canvas-cad.ts`) numa função única `liberarContainerLeaflet()`.
- [~] **`cad-feicoes.ts` (1.179 → 860 linhas)**: divisão em andamento, mantendo `GerenciadorFeicoes` como fachada (API pública e testes intactos). Extraídos: `cad-feicoes-tipos.ts` (contratos), `cad-feicoes-operacoes.ts` (dividir/buffer/duplicar/juntar), `cad-feicoes-versoes.ts` (oficial × prévia), `cad-feicoes-camera.ts` (zoom/ajustar), `cad-feicoes-desenho.ts` (ferramentas, camada e estilo de desenho, texto, conta-gotas). Cada um recebe só as `Portas*` de que precisa. **Pendente** (para chegar a < 400): `cad-feicoes-dados.ts` (CRUD e lote, ~175 linhas), seleção/laço/caixa, hover e menu de contexto, snap e edição de vértices.
- [ ] **`cad-eventos-canvas.ts`**: extrair a extração de ponto/coordenada do evento (hoje com cascatas de `?.`/`??`) para `cad-evento-coordenadas.ts` (puro, testável). Os 24 testes da Fase 0 já protegem esse trecho.
- [ ] **Ciclo de vida (A6)**: confirmar que `ResizeObserver`, timers e listeners do `cad-tamanho-observer.ts`/`cad-broadcast.ts` são idempotentes em reconexão (Regra #2) e, se coerente, usar `ListenerBag`.
- [ ] **Entrada hostil (Regra #0)**: `cad-feicoes.ts` recebe GeoJSON externo; incluir em `tests/ui-canvas-cad.regressao.test.ts` casos nulos, truncados e geometrias degeneradas (< 3 vértices, `NaN`).
- [x] **Seleção**: `selectedPontoIds` ganhou acessor único em `cad-selecao-pontos.ts` (`lerPontosSelecionados`/`gravarPontosSelecionados`), usado por `ui-canvas-cad.ts` e `cad-eventos-canvas.ts`. (O motor L2, `canvas_interacao.ts`, ainda tem seus próprios `as any` no mesmo campo; tipar `context.selectedPontoIds` lá elimina o cast restante.)
- [ ] **ARIA**: região do canvas (`role`/rótulo), anúncio de seleção via `aria-live`, teclado para as ferramentas.

### Fase 2 — `ui-camadas` (P1)
- [ ] `ui-camadas.ts` (878): extrair o que não for ciclo de vida/atributos para módulos existentes (`camadas-*`); alvo < 400 linhas.
- [ ] `camadas-arvore-renderer.ts`: separar construção de nó, estado (expandido/selecionado) e atualização incremental.
- [ ] `camadas-drag-drop.ts`: separar cálculo de alvo/posição de soltura (puro) da manipulação de DOM.
- [ ] Eliminar os 8 `any`/TODO; ampliar `ui-camadas.test.ts` e `ui-camadas.regressao.test.ts` para os módulos novos.
- [ ] Auditar `camadas-resizer.ts` quanto à Regra #2 (A6).

### Fase 3 — `ui-mapa` (P1)
- [ ] Acesso ao Leaflet por um único módulo (`mapa-leaflet.ts`) com `obterLeaflet()` tipado; remover `window.L as any` de `ui-mapa-linha.ts` e `ui-mapa-marcador.ts`.
- [ ] ARIA: `role="application"` ou `region` com `aria-label`; marcadores focáveis com rótulo.
- [ ] Testes: ciclo de vida, marcadores, linhas, atributos reativos.

### Fase 4 — `ui-tooltip` e `ui-modal` (P2)
- [ ] **tooltip**: extrair posicionamento (`tooltip-posicionamento.ts`) e API de popover (`tooltip-popover.ts` com detecção de suporte tipada); tratar erros em vez de `catch(_e) {}`; garantir `aria-describedby`, Esc e foco/hover/teclado.
- [ ] **modal**: remover os 7 `any`; testar focus trap, restauração de foco, pilha de modais e Esc.

### Fase 5 — Componentes simples e de formulário (P3)
- [ ] `ui-avatar`: sem nome, imagem decorativa (`alt=""`/`aria-hidden`); `ui-texto`: papéis/semântica.
- [ ] `ui-skeleton`: `aria-busy`; `ui-stat`: papel e rótulos.
- [ ] `ui-switch`/`ui-checkbox`/`ui-radio`: validação (`required`), `reset`, valor no `FormData`, `disabled` em `fieldset`.
- [ ] Ampliar testes de `ui-badge`, `ui-card`.

### Fase 6 — Divisões oportunistas (monitorar)
- [ ] `ui-ribbon.ts` e `ui-paleta-ferramentas.ts`: extrair o que for comum para `ferramentas-comum.ts` e o que for específico para módulos próprios.
- [ ] `ui-tabela.ts` (635): conferir se há responsabilidades ainda embutidas além do orquestrador.

## Definição de pronto (por fase)

- Checklist do `AGENTS.md` §5 inteiro (camadas, decomposição, zero crash, SSR/memória, tokens/a11y, suíte verde, contratos).
- `any`: nenhum novo; os arquivos tocados ficam sem `any` (ou com justificativa em comentário). Meta acompanhada: baseline **301** `any` em produção, caindo a cada fase (registrar o número no fim de cada fase).
- Bug corrigido ⇒ teste em `*.regressao.test.ts` / `*-robustez.test.ts` que falhava antes.
- Cada arquivo tem uma responsabilidade descritível em uma frase e fica abaixo do gatilho de ~400 linhas (exceções justificadas).
- API pública inalterada (ou mudança registrada no `CHANGELOG.md`).
- `npm run gate` verde durante a fase e `npm run gate:full` verde ao concluí-la (cobre `check:layers`, `tsc`, tipos React/Vue, vitest e build).
- Teste para cada módulo novo; ARIA verificado quando a fase tocar em UI.
- Entrada no `CHANGELOG.md` e atualização deste documento.

## Registro de melhorias e correções

| Fase | Item | Status | Data | Commit | Observações |
|---|---|---|---|---|---|
| 0.5 | `ui-bus` sem importar `ui-alerta` (A1) | feito | 2026-10-17 | | provedor de toast registrável; +5 testes |
| 0.5 | `check-layers` ampliado (A2), A3 (parcial) e A7 | feito | 2026-10-17 | | +8 testes; pendente A9 (ordem do `gate`) |
| 0 | Testes de caracterização `ui-canvas-cad` (eventos, atributos, redimensionamento) | feito (parcial) | 2026-10-17 | | 37 testes novos; faltam colecoes-dados, inicializador, toolbar-painel. Nota: contagem de testes do diagnóstico ignorava `tests/` |
| 1 | Tipos Leaflet, adaptador e acessor de seleção | feito (parcial) | 2026-10-17 | | `tipos.ts`, `cad-leaflet-adaptador.ts`, `cad-selecao-pontos.ts`; +5 testes; 14 `any` restam no diretório |
| 1 | Divisão de `cad-feicoes.ts` | em andamento | 2026-10-17 | | 1.179 → 860 linhas, 5 módulos novos; faltam dados/lote, seleção, hover, snap/edição |
| 2 | Divisão de `ui-camadas.ts` | pendente | | | |
| 3 | Adaptador Leaflet e ARIA de `ui-mapa` | pendente | | | |
| 4 | `ui-tooltip` e `ui-modal` | pendente | | | |
| 5 | A11y e testes dos componentes simples | pendente | | | |
| 6 | Divisões oportunistas | pendente | | | |

## Riscos e cuidados

- Inverter a dependência do `ui-bus` não pode quebrar quem chama `UIBus.toast`; cobrir com teste antes de mexer.
- Endurecer o `check-layers` pode revelar violações novas; tratá-las na própria Fase 0.5 em vez de afrouxar a regra.
- Divisão de arquivos não deve mudar a ordem de inicialização do Leaflet nem os eventos disparados; os testes da Fase 0 existem para detectar isso.
- Reexportar pelo `index.ts` de cada componente para não quebrar imports públicos (`src/canvas.ts`, `src/camadas.ts` etc.).
- Regenerar `custom-elements.json` (`npm run build`) e conferir o diff: não deve haver mudança de API sem intenção.
