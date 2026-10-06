# Changelog

## 2.0.0

### ⚠️ Mudanças que podem exigir ajuste

- **Tema segue o sistema operacional por padrão.** Antes o kit era sempre escuro. Para manter o escuro fixo, use `<html data-tema="escuro">`. `UIBus.definirTema('auto')` volta a seguir o sistema.
- **Enter em `<ui-campo-texto>` envia o formulário**, como um campo nativo. Formulários com botão `type="submit"` e sem listener de `submit` com `preventDefault()` passam a enviar (e recarregar a página) ao pressionar Enter.
- **`ui-abrir` / `ui-fechar` do modal disparam também ao mudar o atributo `aberto`**, não só pelos métodos `abrir()`/`fechar()`.
- **A seleção de `<ui-tabela>` é mantida ao ordenar, filtrar ou trocar `dados`** (se o item ainda existir). Use `limparSelecao()` para zerar.
- **Variáveis CSS renomeadas:** `--ui-fonte-mono`, `--ui-fonte-familia` e `--ui-fonte-principal` → `--ui-fonte-codigo` / `--ui-fonte-base`; `--ui-radius-*` → `--ui-raio-*`.
- **Cores do tema claro mais escuras** para atingir contraste WCAG AA (primária `#006b40`). No escuro, o botão destrutivo passou para `#d32f2f`.
- Removidos `UIModal._openCount` e o atributo interno `data-scroll-locked`.

### Usuário final

- Textos legíveis nos dois temas (contraste WCAG AA verificado em testes).
- Tabela por teclado: cabeçalhos ordenáveis com Tab + Enter, linhas com setas, Home/End, PageUp/PageDown, Enter para selecionar.
- Modal: foco inicial no conteúdo (ou `[autofocus]`), foco devolvido ao fechar, Esc fecha o modal do topo, segundo modal aberto continua interativo, "✕" oculto com `bloquear-fechamento`.
- Tooltip lido por leitores de tela, fecha com Esc e não some ao levar o ponteiro até o balão.
- Botões só com ícone recebem nome acessível (`aria-label` ou `title`).
- Gatilhos Zero-JS ignoram botões desabilitados ou carregando.
- Correção de segurança: o `label` de campos nunca é interpretado como HTML.

### Desenvolvedor

- **Tipos para React e Vue** gerados a partir do Custom Elements Manifest: `@thibezer/ui-components-kit/tipos-react`, `/tipos-vue` e `/tipos-elementos`.
- **`custom-elements.json`** publicado (campo `customElements`), para IDEs, Storybook e documentação.
- **`::part`** nos 14 componentes principais, com estados (`opcao-selecionada`, `linha-selecionada`).
- **Tokens unificados:** fontes `--ui-fonte-base` / `--ui-fonte-codigo`; escala de raio derivada de `--ui-raio-borda` (`--ui-raio-sm/lg/xl/pill`); novos `--ui-cor-texto-info`, `--ui-cor-texto-sobre-status`, `--ui-cor-fundo-recuado`, `--ui-sombra-sm/md/lg`.
- `<ui-botao>` form-associated: `form="id"`, `<fieldset disabled>`, `name`/`value` no `e.submitter`, `disabled` como propriedade, `click()` no host.
- `UIBus.obterTema()`; `tema:alterado` também quando o sistema troca de tema.
- `<ui-tabela>`: `aria-label` repassado à tabela, `aria-busy` durante o carregamento.
- README corrigido (exemplo React, atributos do catálogo, import map para mapa/CAD via CDN).

## 1.0.0

- Primeira publicação no npm como `@thibezer/ui-components-kit`.
