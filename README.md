# Playground de Testes Isolados de Componentes UI (Sandbox)

Ambiente isolado e 100% autônomo para o desenvolvimento de uma biblioteca de **Web Components Nativos Universais e Agnósticos**, construída com TypeScript, CSS Vanilla modularizado (Design Tokens) e Vite.

---

## 🎯 Objetivo & Princípios

Permitir a criação, testes visuais, responsivos e o aprimoramento contínuo de componentes de interface altamente otimizados (suportando desde **interfaces densas GIS/CAD de 15px/20px** até **interfaces fluidas modernas**), sem qualquer dependência de frameworks externos (React, Vue, Angular, etc.).

### Core Principles & Diretrizes de Design
1. **Agnóstico e Universal**: Baseado na especificação W3C Custom Elements + Shadow DOM com prefixo `ui-` e eventos `ui-*`.
2. **Design Tokens Centralizados**: Estilização dividida em `src/tokens/colors.css`, `src/tokens/spacing.css` e `src/tokens/typography.css`.
3. **Alinhamento Vertical Perfeito**: Todos os componentes flexbox utilizam `align-items: center`, `line-height: 1` e compensação de padding vertical para garantir que texto e ícones fiquem **100% centralizados no eixo vertical** em qualquer altura (de 15px a 40px+).
4. **Resiliência e Segurança Visuossemântica**: Componentes possuem travas contra quebra de layout (ex: Rótulos Flutuantes travados ao container do campo, repasse de clique `pointer-events: none`, suporte a `:autofill`, parsing de filhas HTML e fallback de SVGs sem distorção).
5. **Gerenciador de Empilhamento sem Sobreposição**: Notificações Toast e Overlays utilizam gerenciadores flexbox inteligentes que empurram os elementos dinamicamente sem sobreposição visual.

---

## 📁 Estrutura Modular do Projeto (`src/`)

```text
testes_componentes/
├── index.html                    # Playground Interativo Sandbox
├── pagina_testes.ts              # Controller do Playground & Event Listener Log
├── vite.config.ts                # Configuração do Vite (Dev Server & Library Mode)
├── README.md                     # Documentação e Diretrizes Gerais
├── package.json                  # Scripts e dependências (TypeScript + Vite)
├── src/
│   ├── index.ts                  # Entry Point Principal da Biblioteca (Exportações)
│   ├── tokens/                   # Design Tokens em Variáveis CSS
│   │   ├── colors.css            # Cores, Neutros e Paletas Temáticas
│   │   ├── spacing.css           # Escala de Espaço, Raios e Dimensão Mínima
│   │   ├── typography.css        # Fontes, Tamanhos em Clamp() e Pesos
│   │   └── index.css             # Importador Central dos Tokens
│   └── components/               # Web Components Nativos Modulares
│       ├── ui-botao-primario/
│       ├── ui-lista-flutuante/
│       ├── ui-texto/
│       ├── ui-campo-texto/
│       ├── ui-icone/
│       ├── ui-checkbox/
│       ├── ui-radio/
│       ├── ui-switch/
│       ├── ui-badge/
│       ├── ui-avatar/
│       ├── ui-card/
│       ├── ui-modal/
│       ├── ui-alerta/
│       └── ui-tooltip/
└── dist/                         # Pacotes Compilados de Produção (Vite Library Mode)
    ├── ui-kit.es.js              # Bundle ES Module
    ├── ui-kit.umd.js             # Bundle UMD / Script Tag
    └── ui-kit.css                # CSS Global dos Tokens e Estilos
```

---

## 🧩 Componentes Disponíveis (15 Web Components)

### 🟢 Camada 1: Fundamentos
- `<ui-botao-primario>`: Botão universal (Primary, Secondary, Ghost, Destructive, Icon-only, Loading).
- `<ui-lista-flutuante>` / `<ui-select>`: Dropdown com Mobile Bottom Sheet e parsing de `<option>`.
- `<ui-texto>`: Tipografia semântica (H1-H6, Corpo, Caption, Código).
- `<ui-campo-texto>`: TextField com slots, Floating Label e alternância de senha (`👁️`/`🙈`).
- `<ui-icone>`: Wrapper de ícones vetoriais padronizados.

### 🔵 Camada 2: Controles & Seleção
- `<ui-checkbox>`: Caixa de seleção múltipla com estado indeterminado (`-`).
- `<ui-radio>`: Botão rádio com grupo exclusivo automático (`name="..."`).
- `<ui-switch>` / `<ui-toggle>`: Chave de alternância física instantânea.
- `<ui-badge>` / `<ui-chip>` / `<ui-tag>`: Badges de status e chips removíveis (`ui-remove`).
- `<ui-avatar>`: Avatar com fotos, iniciais automáticas (`TS`), fallback e presença online.

### 🟣 Camada 3: Contêineres, Overlays & Feedback
- `<ui-card>`: Cartão com slots nomeados (`midia`, `cabecalho`, corpo, `rodape`) e elevações.
- `<ui-modal>` / `<ui-dialog>`: Modal centralizado no Desktop e Mobile Bottom Sheet.
- `<ui-alerta>`: Banner de feedback fixo no layout.
- `<ui-toast>`: Notificação flutuante com empilhamento Flexbox sem sobreposição (`UIToast.notificar()`).
- `<ui-tooltip>` / `<ui-popover>`: Dica contextual dual (Hover no PC, toque no Mobile).

---

## 🚀 Como Executar o Playground Localmente

1. **Iniciar o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```
   Acesse: `http://localhost:5173/`

2. **Compilar a Biblioteca para Produção**:
   ```bash
   npm run build
   ```
   Os arquivos empacotados serão gerados na pasta `dist/`:
   - `dist/ui-kit.es.js` (Módulo ES para Vite, Webpack, Rollup)
   - `dist/ui-kit.umd.js` (Módulo UMD para navegação direta via `<script>`)
   - `dist/ui-kit.css` (Estilos CSS de tokens)

---

## 📖 Guia de Consumo da Biblioteca

```html
<!-- Exemplo de consumo em qualquer HTML/Framework -->
<script type="module" src="./dist/ui-kit.es.js"></script>

<ui-card elevacao="elevado">
  <div slot="cabecalho">
    <ui-avatar nome="Thiago Silva" status="online"></ui-avatar>
    <ui-badge variante="sucesso">Ativo</ui-badge>
  </div>
  <ui-texto variante="h4">Métricas do Sistema</ui-texto>
  <div slot="rodape">
    <ui-botao-primario variante="primary" onclick="UIToast.notificar({ tipo: 'sucesso', mensagem: 'Salvo!' })">
      Salvar
    </ui-botao-primario>
  </div>
</ui-card>
```
