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

### Fase 0 — Rede de segurança (pré-requisito, Camadas A/B do AGENTS) — concluída em 2026-10-17
- [x] Testes de caracterização do `ui-canvas-cad`. **Correção do diagnóstico:** o componente já tinha ~7.000 linhas de teste em `tests/` (a contagem inicial só olhou `src/`). A Fase 0 virou preencher lacunas: `tests/cad-eventos-canvas.test.ts` (24 testes) e `tests/cad-atributos-tamanho.test.ts` (13 testes).
- [x] Lacunas fechadas: `tests/cad-colecoes-toolbar.test.ts` (21: coleções, toolbar e template) e `tests/cad-inicializador.test.ts` (11).
- [x] `ui-mapa` e `ui-tooltip` (Camada B: ciclo de vida, atributos, eventos, limpeza no `disconnectedCallback`) foram cobertos nas Fases 3 e 4, escrevendo os testes antes das correções.
- Critério: comportamento atual congelado; refatoração subsequente não pode quebrá-los.

### Fase 0.5 — Higiene arquitetural (gate verde)
Pré-requisito das demais fases: sem isso `npm run gate` falha.
- [x] **Corrigir A1** (2026-10-17): `ui-bus.ts` (L1) não pode conhecer `ui-alerta` (L3). Inverter a dependência: o bus expõe um ponto de registro (ex.: `registrarProvedorToast(fn)`) e o `ui-alerta` (ou `src/register.ts`, L5) registra o `UIToast` ao ser carregado. Manter a API pública do bus (`UIBus.toast`) e o `tests/ssr-safety.test.ts` verde. Feito: contratos em `src/core/tipos-toast.ts` (reexportados por `ui-toast.ts`), `UIBus.registrarProvedorToast`, auto-registro em `ui-toast.ts` e `src/core/ui-bus-toast.test.ts` (5 testes). **Mudança de comportamento:** quem importar só `core/ui-bus` sem carregar `ui-alerta` passa a ter `notificar` como no-op; registrar no `CHANGELOG.md`.
- [x] **Ampliar `check-layers.mjs` (A2)** (2026-10-17): regras L3 ↛ L4/`gerencigeo-canvas`; L4 ↛ L5 (`src/index.ts`, `src/register.ts`, entrypoints); detectar `import 'x'`, `export ... from 'x'` e `import('x')`; corrigir a regra de L0. Feito: o script agora resolve cada import ao destino e compara camadas (L3 ↛ L4, L3 ↛ `gerencigeo-canvas`, L4 ↛ L5, L0 só CSS); `import type` é ignorado por ser apagado na compilação; corrigido o falso positivo de prefixo (`core` × `cores.ts`). Testado em `tests/check-layers.test.ts` (8 testes).
- [x] **A3** (parcial): os dois utilitários continuam fisicamente onde estão, mas o `check-layers` os trata como L2 (`UTILITARIOS_L2`), e não importam nada de runtime de L3/L4. Mover para `gerencigeo-canvas/` fica como decisão futura (muda caminhos públicos).
- [x] **A7**: no worktree só existe `AGENTS.md`; o repositório rastreia um único arquivo (o `agents.md` era o mesmo arquivo no Windows).
- [x] **A9**: `check:framework-types` precisa de `dist/`; o `package.json` foi reordenado: `gate` = `check:layers` + `check:types` + `test:run`; `gate:full` = `gate` + `build` + `check:framework-types`.
- Critério: `check:layers`, `check:types`, `test:run`, `build` e `check:framework-types` verdes (verificado em 2026-10-17: 72 arquivos, 1052 testes).

### Fase 1 — `ui-canvas-cad` (P0) — concluída em 2026-10-17
- [x] **Tipos** (2026-10-17): `ui-canvas-cad/tipos.ts` criado (`ContainerLeaflet`, `EventoMapaCad`, `LatLngEvento`, `ElementoComCoordenadas`); `as any` de eventos e coordenadas em `cad-eventos-canvas.ts` substituídos. Restam 14 ocorrências de `any` no diretório (parâmetros genéricos de callbacks, `cad-inicializador.ts`, `cad-atributos-sync.ts`, etc.).
- [x] **Adaptador Leaflet** (2026-10-17, `cad-leaflet-adaptador.ts`): concentrar o reset de `_leaflet_id` (hoje duplicado em `cad-inicializador.ts` e `ui-canvas-cad.ts`) numa função única `liberarContainerLeaflet()`.
- [x] **`cad-feicoes.ts` (1.179 → ~625 linhas)** (2026-10-17): `GerenciadorFeicoes` virou fachada (API pública e testes intactos) sobre 10 módulos de responsabilidade única: `cad-feicoes-tipos` (contratos), `-dados` (repositório indexado e lote), `-operacoes` (dividir/buffer/duplicar/juntar), `-versoes` (oficial × prévia), `-camera` (zoom/ajustar), `-desenho` (ferramentas, camada/estilo, texto, conta-gotas), `-edicao` (vértices), `-consulta` (candidatas, snap, feição sob o cursor), `-ponteiro` (hover e menu de contexto) e `-selecao-regiao` (laço e caixa). Cada um recebe só as `Portas*` de que precisa. **Exceção ao gatilho de ~400 linhas, justificada:** o que sobra são ~90 delegadores públicos de uma linha mais a fiação das portas no construtor; dividir mais só espalharia a fachada.
- [x] **`cad-eventos-canvas.ts`**: leitura de alvo, pixel e lat/lng extraída para `cad-evento-coordenadas.ts` (funções puras, `tests/cad-evento-coordenadas.test.ts`, 5 testes); os 24 testes da Fase 0 seguem verdes.
- [x] **Ciclo de vida (A6)**: auditado. `cad-tamanho-observer` (`observe()` chama `disconnect()` antes), `cad-snap` (guarda `conectado`) e `cad-broadcast` (`conectar()` chama `desconectar()` antes) já são idempotentes; migrar para `ListenerBag` não traria ganho e atrapalharia a injeção de `alvo` do snap. Congelado em `tests/ui-canvas-cad.regressao.test.ts`.
- [x] **Entrada hostil (Regra #0)**: `tests/ui-canvas-cad.regressao.test.ts` (23 testes) cobre payloads de BroadcastChannel inválidos, `definirFeicoes`/`aplicarLote` com `null`, tipos errados, `NaN`/`Infinity`, polígono degenerado e ids inexistentes. Nenhum bug foi encontrado: o componente já degradava com elegância.
- [x] **Seleção**: `selectedPontoIds` ganhou acessor único em `cad-selecao-pontos.ts` (`lerPontosSelecionados`/`gravarPontosSelecionados`), usado por `ui-canvas-cad.ts` e `cad-eventos-canvas.ts`. (O motor L2, `canvas_interacao.ts`, ainda tem seus próprios `as any` no mesmo campo; tipar `context.selectedPontoIds` lá elimina o cast restante.)
- [x] **ARIA** (`cad-acessibilidade.ts`): raiz `role=region` "Mapa CAD", barra rápida `role=toolbar`, botões só-ícone com `aria-label`, `aria-pressed` do snap sincronizado e região viva (`role=status`) anunciando seleção e ferramenta. A barra de ferramentas de desenho já tinha `role=toolbar` e `aria-pressed`.

### Fase 2 — `ui-camadas` (P1) — concluída em 2026-10-17
- [x] **`ui-camadas.ts` 878 → 647 linhas** (casca com ~35 propriedades públicas espelhadas em atributos, ciclo de vida e delegadores). Extraídos: `camadas-render.ts` (montagem do corpo preservando scroll/foco), `camadas-selecao-api.ts` (seleção e eventos de seleção), `camadas-lembranca.ts` (`LembrancaCamadas`: origens, remoções, debounce e storage) e `camadas-colecao.ts` (definir/adicionar/remover camadas e feições). **Exceção justificada ao gatilho de ~400 linhas:** o que resta são os acessores públicos (API) e os delegadores de uma linha.
- [x] **`camadas-arvore-renderer.ts` 510 → 370**: `camadas-thumb.ts` (miniaturas SVG, pura) e `camadas-hierarquia.ts` (árvore a partir de parentId, pura); nomes públicos reexportados.
- [x] **`camadas-drag-drop.ts` 495 → 314**: regras puras em `camadas-drop-ops.ts` (zona de drop, mover/reordenar camada, mover/reordenar feição) e renomear inline deduplicado em `camadas-renomear.ts` (camada e feição usavam o mesmo código duplicado).
- [x] **`any`:** o `(this.host as any).expandedLayers` virou campo opcional tipado em `UICamadasHost`; resta 1 `any` (genérico de `debounce`, idiomático). Antes: 8.
- [x] **Regra #2 (A6) auditada**: o resizer já limpava a `window` ao desconectar; os outros dois gestos não.
- **Defeitos encontrados e corrigidos** (testes em `ui-camadas.regressao.test.ts`):
  1. Desconectar o painel durante a **pintura de controles** (olho/cadeado/seleção) deixava `user-select: none` preso no `body` da página e ouvintes em `window`; agora o gesto é cancelado ao desconectar (`cancelarArrasteControles`) e um gesto novo substitui o anterior.
  2. O **arraste por toque** da camada deixava `pointermove`/`pointerup` em `window` se o componente saísse do DOM no meio do gesto, e `pointerdown` repetido empilhava ouvintes; agora `CamadasDragDropManager.destruir()` os solta.
  3. `ehDescendente` podia entrar em laço infinito com dados que já tinham um ciclo de `parentId`; agora detecta e trata como descendência.
- **Testes novos:** `camadas-drop-ops.test.ts` (22) e 3 casos de regressão; suíte total 78 arquivos / 1159 testes.

### Fase 3 — `ui-mapa` (P1) — concluída em 2026-10-17
- [x] **Adaptador Leaflet**: `mapa-leaflet.ts` (`obterLeaflet`/`carregarLeafletTipado`) e `tipos.ts` (`LeafletModulo`); `window.L as any` e `L: any` removidos (0 `any` no diretório).
- [x] **SRP**: `ui-mapa.ts` 178 → 157 linhas (casca); extraídos `mapa-basemaps.ts`, `mapa-atributos.ts` (leitura segura, pura), `mapa-icones.ts`, `mapa-vinculo-pai.ts` (espera do mapa pai + reação a `ui-mapa-pronto`, antes duplicada em marcador e linha).
- [x] **ARIA**: contêiner `role=region` com `aria-label` (atributo do host, padrão "Mapa"); marcador focável (`role=button`, `tabindex=0`) com `aria-label`/`title` do `titulo`; pin SVG `aria-hidden`.
- [x] **Testes**: `ui-mapa.regressao.test.ts` (22) e `mapa-atributos.test.ts` (29).
- **Defeitos encontrados e corrigidos** (cada um com teste que falhava antes):
  1. **Injeção via `cor`** (Regra #3): o atributo era interpolado em `innerHTML`/`style` do ícone do marcador. Agora o ícone é montado com DOM e a cor passa por `corSegura` (hex, rgb/hsl ou nome).
  2. `lat`/`lng`/`zoom` inválidos (ou `zoom` mudado depois do init) lançavam "Invalid LatLng" / "infinite number of tiles"; agora cada campo cai no padrão.
  3. Desconectar antes do Leaflet carregar criava um mapa órfão (vazamento); agora há checagem de `isConnected` após o `await`.
  4. `<ui-mapa-linha>` não reaparecia quando o mapa era recriado ao reconectar (só o marcador ouvia `ui-mapa-pronto`), e `pontos` que não fossem um array de pares lançavam; agora pares inválidos são descartados.

### Fase 4 — `ui-tooltip` e `ui-modal` (P2) — concluída em 2026-10-17
- [x] **`ui-tooltip`**: `tooltip-posicionamento.ts` (lado normalizado + posição do balão, puro) e `tooltip-popover.ts` (Popover API tipada; só ignora `InvalidStateError`, o resto vira `console.warn`); ouvintes via `ListenerBag` (host enquanto conectado, globais só com o balão aberto); `requestAnimationFrame` cancelado ao fechar/desconectar; JSDoc de atributos/slots/parts para o manifesto. `any` e `catch {}` mudos removidos.
- [x] **`ui-modal`**: `modal-foco.ts` (focáveis, foco inicial e armadilha de Tab) e `modal-acessibilidade.ts` sem duplicação de laço e sem casts (`inert` já é tipado no TS 5.9); ouvintes via `ListenerBag`; `ui-modal.ts` 301 → 220 linhas.
- [x] **Testes**: `ui-tooltip.regressao.test.ts` (23), `ui-modal.regressao.test.ts` (16), `tooltip-posicionamento.test.ts` e `modal-foco.test.ts`; suíte 82 arquivos / 1220 testes.
- **Defeitos encontrados e corrigidos** (cada um com teste que falhava antes):
  1. `<ui-tooltip>`: o clique no gatilho chamava `stopPropagation()` e **escondia o clique de ancestrais** (delegação de eventos, analytics); o "clicar fora" já ignora cliques dentro do host, então a chamada era desnecessária.
  2. `<ui-tooltip>`: `window.matchMedia` ausente lançava no clique.
  3. `<ui-tooltip>`: `disabled` com o balão aberto (ou `aberto` + `disabled` iniciais) deixava o balão visível.
  4. `<ui-tooltip>`: o `requestAnimationFrame` de posicionamento ficava pendente após desconectar.
  5. `<ui-modal>`: **Shift+Tab no botão de fechar não voltava para o último controle** e o foco escapava do modal: a comparação usava o elemento retargeted pelo Shadow DOM em vez do foco real.

### Fase 5 — Componentes simples e de formulário (P3) — concluída em 2026-10-17
- [x] **Núcleo compartilhado (L1):** `core/opcoes.ts` (`escolherOpcao`: atributo → valor de um conjunto conhecido) e `core/rotulo-controle.ts` (rótulo por atributo ou externo para switch/checkbox/radio, antes só no switch).
- [x] **Testes:** um `*.regressao.test.ts` por componente (avatar, skeleton, stat, badge, card, texto, radio, checkbox+switch); suíte 90 arquivos / 1355 testes; `any` em produção 255 → 251.
- **Defeitos encontrados e corrigidos** (cada um com teste que falhava antes):
  1. **`<ui-skeleton linhas="100000000">` derrubava o processo** (criava milhões de nós): agora há teto de 100 linhas.
  2. **Classes CSS injetáveis por atributo** em `ui-texto`, `ui-stat`, `ui-badge` e `ui-card` (`variante="erro x"` adicionava a classe `x`): agora só valores de um conjunto conhecido.
  3. **`<ui-avatar>`:** sem papel nem nome (as iniciais eram lidas como texto) e `alt="Avatar"` genérico. Agora o host é `role=img` com `aria-label` ("Ana, online") ou decorativo (`aria-hidden`) sem nome; respeita `aria-label`/`aria-hidden` do consumidor. Também: iniciais não cortam emoji/pares substitutos, tamanho numérico limitado a 8–512 px, e o fallback da imagem usa o nome atual.
  4. **`<ui-skeleton>`:** `role=status` dentro de um host `aria-hidden` era contraditório; agora decorativo por padrão e `role=status` quando há `aria-label`.
  5. **`<ui-stat>`:** `aria-label` em `div` sem papel não era anunciado; o indicador é `role=img` e o conjunto, `role=group` rotulado pelo rótulo.
  6. **`<ui-badge>`:** o atributo `disabled` era observado e ignorado; o ✕ agora respeita (sem remover, `tabindex=-1`, `aria-disabled`) e seu nome identifica o item ("Remover Urgente").
  7. **`<ui-card clicavel>`:** `tabindex` sem papel e sem `aria-disabled`; agora `role=button`, `aria-disabled` e `tabindex=-1` quando desabilitado.
  8. **`<ui-radio>`:** `name` definido por `setAttribute` depois de conectado não formava grupo; mudar o `name` deixava o radio no grupo antigo; **remover um radio de um `<form>` o deixava registrado** (as setas levavam o foco a um radio fora do DOM); se o primeiro radio estava desabilitado, nenhum entrava na ordem de Tab; ao selecionar outro, o primeiro continuava com `tabindex=0`.
  9. **`focus()` no host de `ui-checkbox` e `ui-switch` não fazia nada** (só o radio tinha o override); `ui-checkbox` e `ui-radio` ignoravam `<label for>`/`<label>` envolvente/`aria-label` (só o switch tinha).

### Fase 6 — Divisões oportunistas — concluída em 2026-10-17
- [x] **`ui-ribbon.ts` 552 → 490**: `ribbon-render.ts` (botão de aba e grupo, com colunas de até 3 botões pequenos) e `ribbon-teclado.ts` (tecla → ação nas abas, com RTL).
- [x] **`ui-paleta-ferramentas.ts` 548 → 490**: `paleta-pressao-longa.ts` (clique longo: temporizadores, limiar de movimento e supressão do `click` residual) e `paleta-atalhos.ts` (quando a letra não deve ser capturada e qual ferramenta ela ativa).
- [x] **`ui-tabela.ts` 635 → 498**: `tabela-teclado.ts` (tecla → mover/ativar), `tabela-rolagem.ts` (`RolagemLinhas`: foco e posicionamento com janela virtual, rolagem suave com tempo limite) e `tabela-estados.ts` (erro, anúncio do filtro, aria).
- [x] **Testes:** `barra-modulos.test.ts` (18) e `tabela-modulos.test.ts` (22); suíte 92 arquivos / 1395 testes. Os testes existentes dos três componentes passaram sem alteração.
- **Exceção ao gatilho de ~400 linhas, justificada:** o que resta em cada casca são os acessores públicos, os controladores de menu/dados e a fiação de eventos. Dividir mais separaria o que muda junto.
- Nenhum defeito novo foi encontrado nesses três componentes (já tinham testes de robustez e regressão, como o plano antecipou).

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
| 0 | Testes de caracterização `ui-canvas-cad` (eventos, atributos, redimensionamento, coleções, toolbar, template, inicializador) | feito | 2026-10-17 | | +69 testes. Nota: a contagem de testes do diagnóstico ignorava `tests/` |
| 1 | Tipos Leaflet, adaptador e acessor de seleção | feito | 2026-10-17 | | `tipos.ts`, `cad-leaflet-adaptador.ts`, `cad-selecao-pontos.ts`; `any` no diretório: 23+ → 10 (os restantes são payloads de domínio opacos: `elemento`/`segmento`, `Record<string, any>` de atualização parcial e o payload do BroadcastChannel) |
| 1 | Divisão de `cad-feicoes.ts` | feito | 2026-10-17 | | 1.179 → ~625 linhas, 10 módulos; fachada justificada |
| 1 | Extração de `cad-evento-coordenadas`, regressão/robustez e ARIA | feito | 2026-10-17 | | +5, +23 testes; suíte: 75 arquivos, 1085 testes; `any` em produção: 301 → 275 |
| 2 | `ui-camadas`: divisão em 9 módulos, 3 defeitos (estado preso no `body`, ouvintes em `window`, laço em `ehDescendente`) | feito | 2026-10-17 | | `ui-camadas.ts` 878→647, renderer 510→370, drag-drop 495→314; `any` em produção: 266 → 264 |
| 3 | `ui-mapa`: adaptador, SRP, ARIA e 4 defeitos (inclui injeção via `cor`) | feito | 2026-10-17 | | +51 testes; suíte 77 arquivos / 1134 testes; `any` em produção: 275 → 266 |
| 4 | `ui-tooltip` e `ui-modal`: SRP, ListenerBag, sem `any`, 5 defeitos (clique engolido, foco escapando no Shift+Tab) | feito | 2026-10-17 | | +39 testes; suíte 82 arquivos / 1220 testes; `any` em produção: 264 → 255 |
| 5 | Componentes simples e de formulário: 9 defeitos (inclui queda por `linhas` enorme e classes injetáveis), núcleo `opcoes`/`rotulo-controle` | feito | 2026-10-17 | | +9 arquivos de regressão; suíte 90 arquivos / 1355 testes |
| 6 | Divisões: ribbon 552→490, paleta 548→490, tabela 635→498, com 7 módulos novos | feito | 2026-10-17 | | +40 testes; suíte 92 arquivos / 1395 testes |

## Resumo final (2026-10-17)

Todas as fases (0, 0.5, 1, 2, 3, 4, 5 e 6) foram concluídas. Verificação final: `npm run gate:full` verde (camadas, `tsc`, 94 arquivos / 1.427 testes, build e tipos React/Vue).

| Métrica | Antes | Depois |
|---|---|---|
| Violações de camada (`check:layers`) | 1 (`ui-bus` → `ui-alerta`), e o script cobria só L0–L2 | 0, com regras L0–L5 e testes do próprio script |
| Testes | ~1.000 no início da revisão | 1.427 em 94 arquivos |
| `any` em código de produção | 301 | 251 (0 em mapa, tooltip e modal; 1 em camadas; 10 em canvas-cad) |
| `cad-feicoes.ts` | 1.179 linhas | 625 (fachada) + 10 módulos |
| `ui-camadas.ts` / renderer / drag-drop | 878 / 510 / 495 | 647 / 370 / 314 |
| `ui-ribbon` / `ui-paleta-ferramentas` / `ui-tabela` | 552 / 548 / 635 | 490 / 490 / 498 |

**Defeitos reais corrigidos (cada um com teste que falhava antes), por gravidade:**
1. Segurança: `cor` do `<ui-mapa-marcador>` era interpolada em HTML (injeção de atributo); classes CSS arbitrárias por atributo em `ui-texto`, `ui-stat`, `ui-badge` e `ui-card`.
2. Queda: `<ui-skeleton linhas="100000000">` esgotava a memória do processo.
3. Acessibilidade: foco escapando do `<ui-modal>` no Shift+Tab; avatar, stat, card clicável e skeleton sem papel/nome corretos; `focus()` inoperante em checkbox/switch; checkbox e radio sem rótulo externo.
4. Vazamentos/estado preso: `user-select: none` ficava no `body` ao desconectar `<ui-camadas>` durante um arraste; ouvintes de `window` pendentes; grupos de `<ui-radio>` com membros fantasmas após remoção do formulário.
5. Comportamento: o tooltip engolia o clique do gatilho; `disabled` ignorado em tooltip aberto e em `ui-badge`; `lat`/`lng`/`zoom` inválidos lançavam no mapa; mapa órfão ao desconectar cedo.

**Decisões que ficam com você**
- Mudanças de contrato registradas no `CHANGELOG.md` (seção "Não lançado"): `UIBus.notificar()` vira no-op sem `ui-alerta` carregado; `alt` da imagem do `ui-avatar` agora é vazio (o nome fica no host).
- `avaliador-expressao.ts` e `cores-utils.ts` continuam fisicamente fora de `gerencigeo-canvas/` (tratados como L2 pelo `check-layers`); mover muda caminhos públicos.
- Cascas ainda acima de ~400 linhas, com exceção justificada: `cad-feicoes.ts`, `ui-camadas.ts`, `ui-ribbon.ts`, `ui-paleta-ferramentas.ts`, `ui-tabela.ts` (acessores públicos e delegadores).
- Restam 251 `any` em produção fora destes componentes (backlog para uma próxima rodada).
- Nada foi enviado ao remoto e nenhuma versão foi publicada; a versão do `package.json` continua 2.6.0.

## Riscos e cuidados

- Inverter a dependência do `ui-bus` não pode quebrar quem chama `UIBus.toast`; cobrir com teste antes de mexer.
- Endurecer o `check-layers` pode revelar violações novas; tratá-las na própria Fase 0.5 em vez de afrouxar a regra.
- Divisão de arquivos não deve mudar a ordem de inicialização do Leaflet nem os eventos disparados; os testes da Fase 0 existem para detectar isso.
- Reexportar pelo `index.ts` de cada componente para não quebrar imports públicos (`src/canvas.ts`, `src/camadas.ts` etc.).
- Regenerar `custom-elements.json` (`npm run build`) e conferir o diff: não deve haver mudança de API sem intenção.
