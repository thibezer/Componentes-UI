# 🎨 UI Components Kit - Web Components Nativos & Universais

Biblioteca de **Web Components Nativos Universais e Agnósticos**, construída no padrão oficial **W3C Custom Elements + Shadow DOM**, com TypeScript, Design Tokens em CSS modular e Vite.

Projetada para funcionar em **qualquer linguagem, framework ou sistema web** (HTML puro, React, Next.js, Vue, Angular, Svelte, PHP, Django, WordPress, Blazor, etc.) com **zero dependências externas** (exceto `<ui-mapa>` e `<ui-canvas-cad>`, que usam o Leaflet como dependência opcional).

---

## 📑 Índice

1. [Por que Web Components?](#-por-que-web-components)
2. [Como Importar na sua Aplicação](#-como-importar-na-sua-aplicação)
   - [Opção 1: CDN / Script Tag (HTML puro, PHP, Django)](#opção-1-cdn--script-tag-html-puro-php-django)
   - [Opção 2: NPM / Módulos ES (React, Vue, Next.js, Vite)](#opção-2-npm--módulos-es-react-vue-nextjs-vite)
3. [Como Controlar os Componentes (5 Pilares)](#-como-controlar-os-componentes-5-pilares)
4. [⚡ Recursos Inteligentes de Alta Produtividade](#-recursos-inteligentes-de-alta-produtividade)
   - [Ações Declarativas "Zero-JS" (Triggers Nativos)](#1-ações-declarativas-zero-js-triggers-nativos)
   - [Formulários Automáticos com FormData Nativo (W3C FACE)](#2-formulários-automáticos-com-formdata-nativo-w3c-face)
   - [Barramento Global de Orquestração (UIBus)](#3-barramento-global-de-orquestração-uibus)
   - [Tabelas Autônomas com Auto-Fetch Remoto](#4-tabelas-autônomas-com-auto-fetch-remoto)
5. [💻 Exemplos de Uso por Tecnologia](#-exemplos-de-uso-por-tecnologia)
   - [HTML Puro + JavaScript](#html-puro--javascript)
   - [React / Next.js](#react--nextjs)
   - [Vue.js](#vuejs)
   - [Iframes / Microfrontends](#iframes--microfrontends)
6. [🧩 Catálogo de Componentes & Referência](#-catálogo-de-componentes--referência)
7. [🛠️ Como Executar e Compilar Localmente](#️-como-executar-e-compilar-localmente)

---

## 🎯 Por que Web Components?

* 🌐 **100% Universal e Agnóstico**: Funciona em qualquer stack sem necessidade de bibliotecas intermediárias.
* 🛡️ **Encapsulamento Total (Shadow DOM)**: O CSS da sua aplicação nunca quebra o componente, e o CSS do componente nunca vaza para o seu site.
* 📐 **Design Tokens Centralizados**: Variáveis CSS personalizáveis para cores, tipografia, raios e densidade.
* 🚀 **Suporte a Altíssima Densidade**: Otimizado para interfaces densas e técnicas (GIS, CAD, Topografia de 15px a 20px de altura) até interfaces fluidas modernas.

---

## 📦 Como Importar na sua Aplicação

### Opção 1: CDN / Script Tag (HTML puro, PHP, Django)

Adicione as tags no `<head>` ou antes do fechamento do `</body>`:

```html
<!-- 1. Design Tokens e Estilos Globais -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@thibezer/ui-components-kit@1/dist/ui-kit.css">

<!-- 2. Biblioteca dos Componentes (Módulo ES) -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@thibezer/ui-components-kit@1/dist/index.js"></script>

<!-- 3. Uso imediato no HTML -->
<ui-botao-primario variante="primary">Clique Aqui</ui-botao-primario>
```

> **Mapa e CAD via CDN (`<ui-mapa>`, `<ui-canvas-cad>`)**: esses componentes dependem do [Leaflet](https://leafletjs.com/), importado como `leaflet` (especificador "bare"), que o navegador só resolve com um *import map*. Declare-o **antes** do script da biblioteca:
>
> ```html
> <script type="importmap">
>   { "imports": { "leaflet": "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/+esm" } }
> </script>
> ```
>
> Os demais componentes não precisam do Leaflet. Com npm, basta `npm install leaflet`.

### Opção 2: NPM / Módulos ES (React, Vue, Next.js, Vite)

Instale pelo npm:

```bash
npm install @thibezer/ui-components-kit
```

> O pacote é publicado já compilado (`dist/`) e **não executa build na instalação**, então funciona em CI/CD e em servidores com `npm ci --omit=dev`. A antiga instalação por URL Git (`git+https://github.com/...`) não é mais suportada: o repositório não versiona `dist/`.

No ponto de entrada da sua aplicação (`main.ts`, `index.js` ou `App.tsx`):

```typescript
// 1. Estilos globais obrigatórios (tokens CSS)
import '@thibezer/ui-components-kit/style.css';

// 2. Biblioteca completa (ou escolha os submódulos abaixo)
import '@thibezer/ui-components-kit';
```

#### 🚀 Importação Modular e Otimizada (Sub-paths)

Pague apenas pelo que utilizar. Importe por domínio de funcionalidade ou por componente específico:

O export map expõe explicitamente os pontos de entrada canônicos (ESM em `.js`, CommonJS em `.cjs` e tipos `.d.ts`):

| Subpath | Arquivo (ESM) |
|---|---|
| `@thibezer/ui-components-kit` | `dist/index.js` |
| `@thibezer/ui-components-kit/camadas` | `dist/camadas.js` |
| `@thibezer/ui-components-kit/forms` | `dist/forms.js` |
| `@thibezer/ui-components-kit/feedback` | `dist/feedback.js` |
| `@thibezer/ui-components-kit/tabela` | `dist/tabela.js` |
| `@thibezer/ui-components-kit/style.css` | `dist/ui-kit.css` (100% autocontido, sem `@import`) |

##### 1. Por Domínio / Categoria:
```typescript
import '@thibezer/ui-components-kit/forms';    // Campos, Select, Checkbox, Radio, Switch (~8 kB gzip)
import '@thibezer/ui-components-kit/feedback'; // Modais, Drawers, Alertas, Toasts, Tooltips, Skeletons (~6 kB gzip)
import '@thibezer/ui-components-kit/data';     // Tabela, Tabela-Propriedades, Stat KPI, Badge (~4 kB gzip)
import '@thibezer/ui-components-kit/tools';    // Ribbon CAD/Office e Paleta de Ferramentas (~10 kB gzip)
import '@thibezer/ui-components-kit/core';     // Apenas UIBus, Zero-JS e ListenerBag (< 1 kB gzip)
import '@thibezer/ui-components-kit/canvas';   // Mesa CAD vetorial e motor GIS (~33 kB gzip)
import '@thibezer/ui-components-kit/camadas';  // Painel de Camadas GIS/CAD redimensionável (~21 kB gzip)
import '@thibezer/ui-components-kit/mapa';     // Mapa Geográfico Leaflet (~3 kB gzip)
```

##### 2. Granular por Componente (Ultra Leve):
```typescript
import '@thibezer/ui-components-kit/botao';       // Apenas <ui-botao> e <ui-botao-primario> (~3.4 kB gzip)
import '@thibezer/ui-components-kit/campo-texto'; // Apenas <ui-campo-texto> com FACE e anti-zoom (~3.9 kB gzip)
import '@thibezer/ui-components-kit/modal';       // Apenas <ui-modal> com bottom-sheet mobile (~3.3 kB gzip)
import '@thibezer/ui-components-kit/card';        // Apenas <ui-card> com elevação (~2.3 kB gzip)
import '@thibezer/ui-components-kit/tabela';      // Apenas <ui-tabela> virtualizada
```

> **Zero Overhead**: Uma tela que utilize apenas `<ui-botao>` e `<ui-campo-texto>` importa menos de **8 kB gzip**, sem carregar nada de Leaflet, CAD, GIS ou virtualização.

---

## 🎛️ Como Controlar os Componentes (5 Pilares)

```text
 ┌─────────────────────────────────────────────────────────────┐
 │                      SISTEMA EXTERNO                        │
 └──────┬───────────────▲─────────────────┬─────────────────▲──┘
        │               │                 │                 │
 1. Atributos    4. Eventos Custom     2. Propriedades   3. Métodos
    (HTML)          (ui-*)                (Objetos/Listas)  (Imperativo)
        │               │                 │                 │
 ┌──────▼───────────────┴─────────────────▼─────────────────┴──┐
 │                     WEB COMPONENT (<ui-*>)                  │
 └─────────────────────────────────────────────────────────────┘
```

### 1. Atributos HTML (Controle Declarativo)
Configurações simples passadas diretamente nas tags:
```html
<ui-campo-texto label="CPF" placeholder="000.000.000-00" obrigatorio></ui-campo-texto>
<ui-modal id="meu-modal" titulo="Confirmar Exclusão"></ui-modal>
```

---

### 📏 Ajuste de Altura e Dimensionamento Inteligente (Zero Atrito)

Os campos de texto (`<ui-campo-texto>`), listas flutuantes/selects (`<ui-lista-flutuante>`, `<ui-select>`) e botões (`<ui-botao-primario>`) possuem 4 formas flexíveis de ajuste de altura:

#### 1. Via Atributo de Tamanho Predefinido (`tamanho` ou `densidade`):
```html
<!-- Compacto (26px) - Ideal para Toolbars CAD/GIS, tabelas e alta densidade -->
<ui-campo-texto tamanho="sm" placeholder="26px Compacto"></ui-campo-texto>
<ui-lista-flutuante tamanho="sm" placeholder="Selecione..."></ui-lista-flutuante>

<!-- Padrão (34px) - Padrão moderno e equilibrado para formulários e modais -->
<ui-campo-texto tamanho="md" placeholder="34px Padrão"></ui-campo-texto>
<ui-lista-flutuante tamanho="md" placeholder="Selecione..."></ui-lista-flutuante>

<!-- Conforto / Touch (42px) - Otimizado para dispositivos móveis e telas sensíveis ao toque -->
<ui-campo-texto tamanho="lg" placeholder="42px Conforto"></ui-campo-texto>
<ui-lista-flutuante tamanho="lg" placeholder="Selecione..."></ui-lista-flutuante>
```

#### 2. Via Atributo de Altura Explícita (`altura` ou `height`):
```html
<!-- Define a altura exata em pixels diretamente no elemento -->
<ui-campo-texto altura="38" placeholder="Altura de 38px"></ui-campo-texto>
<ui-lista-flutuante altura="44px" placeholder="Altura de 44px"></ui-lista-flutuante>
<ui-botao-primario altura="40">Salvar</ui-botao-primario>
```

#### 3. Via Variável CSS Customizável (`--ui-campo-altura`):
```css
/* No seu CSS global ou no container pai */
.meu-formulario {
  --ui-campo-altura: 36px; /* Aplica instantaneamente em todos os inputs, selects e botões filhos */
}
```

#### 4. Via Barramento Global de Densidade (`UIBus`):
```javascript
import { UIBus } from '@thibezer/ui-components-kit';

// Altera a densidade de toda a aplicação em tempo real:
UIBus.definirDensidade('compacta'); // 26px
UIBus.definirDensidade('padrao');   // 34px
UIBus.definirDensidade('relaxada'); // 42px
UIBus.definirDensidade(38);         // Valor numérico em px customizado
```

---

### 2. Propriedades JavaScript (Dados Complexos)
Para enviar arrays e objetos complexos:
```javascript
const tabela = document.querySelector('ui-tabela');
tabela.colunas = [
  { id: 'ponto', rotulo: 'Ponto', ordenavel: true },
  { id: 'altitude', rotulo: 'Altitude (m)' }
];
tabela.dados = [
  { ponto: 'P-01', altitude: '542,15' },
  { ponto: 'P-02', altitude: '545,30' }
];
```

### 3. Métodos Imperativos (Ações Diretas)
Comandos diretos chamados na instância do elemento:
```javascript
const modal = document.getElementById('meu-modal');
modal.abrir();
modal.fechar();
```

### 4. Eventos Customizados Nativos (`ui-*`)
Escuta de eventos disparados pelas interações do usuário:
```javascript
const campo = document.querySelector('ui-campo-texto');
campo.addEventListener('ui-input', (e) => {
  console.log('Texto digitado:', e.detail.value);
});
```

> **Mutação de usuário vs. programática (`<ui-camadas>`)**: eventos saem do componente **somente** em resposta a interações físicas (clique, drag-and-drop, teclado). Atribuir `painel.layers = [...]`, alterar atributos (`camada-ativa`, `colapsado`, `mapa-base-ativo`...) ou chamar métodos públicos (`definirCamadaAtiva`, `selecionarFeicao`, `limparSelecao`, `colapsar`, `definirAltura`...) apenas atualiza o DOM interno — sem redisparar eventos. Isso elimina loops de sincronização em apps reativos (React, Vue, Svelte). Para forçar a emissão numa chamada programática, passe `emitirEvento = true` (ex.: `painel.definirCamadaAtiva('lotes', true)`).

### 5. Serviços Globais e Helpers
Utilitários prontos para uso sem necessidade de instanciar elementos:
```javascript
import { UIToast, UIBus } from '@thibezer/ui-components-kit';

UIToast.notificar({
  tipo: 'sucesso',
  titulo: 'Registro Salvo!',
  mensagem: 'Os dados foram sincronizados.',
  duracao: 4000
});
```

### 6. Escala de Elevação (z-index)
Todos os componentes flutuantes consomem tokens de elevação previsíveis (com fallback), definidos em `ui-kit.css`. Sobrescreva-os no `:root` da aplicação para encaixar a pilha do kit entre os HUDs e modais do seu app:
```css
:root {
  --ui-z-workspace-hud: 500;  /* <ui-camadas flutuante>, <ui-seletor-mapa-base>, toolbars do canvas */
  --ui-z-docked-bar: 600;     /* <ui-ribbon> recolhido, <ui-tabela-propriedades flutuante> */
  --ui-z-drawer: 700;         /* <ui-drawer> e backdrop */
  --ui-z-modal: 1000;         /* <ui-modal> e backdrop */
  --ui-z-popover: 1050;       /* menus suspensos/contexto, <ui-select> (acima do modal, funciona dentro dele) */
  --ui-z-toast: 1100;         /* UIToast */
  --ui-z-tooltip: 1200;       /* <ui-tooltip> */
}
```

### 7. Acessibilidade Nativa de Rótulos
`<ui-input>` (alias de `<ui-campo-texto>`), `<ui-select>` e `<ui-switch>` geram IDs únicos internamente e associam o rótulo visível ao controle nativo do Shadow DOM — o projeto consumidor não precisa gerenciar IDs:
```html
<ui-input label="Nome"></ui-input>                  <!-- <label for> ↔ <input> interno -->
<ui-select label="Cidade">...</ui-select>           <!-- aria-labelledby = rótulo + valor atual -->
<ui-switch label="Modo escuro"></ui-switch>         <!-- role="switch" aria-labelledby -->

<!-- Sem o atributo label, o nome acessível vem de fora do Shadow DOM: -->
<label>Telefone <ui-input></ui-input></label>
<ui-switch aria-label="Camada visível"></ui-switch>
```

### 8. Temas Claro e Escuro
Sem configuração, o kit **segue o tema do sistema operacional** (`prefers-color-scheme`). Para fixar um tema, use o atributo na raiz — ou em qualquer elemento, para fixar só aquele trecho:
```html
<html data-tema="escuro">   <!-- ou "claro"; também aceitos: class="dark|light" e data-theme="dark|light" -->
<aside data-tema="claro">…</aside>   <!-- trecho claro dentro de uma página escura -->
```
```javascript
UIBus.definirTema('auto');   // volta a seguir o SO
UIBus.on('tema:alterado', ({ tema }) => { /* também dispara quando o SO muda, se o tema não estiver fixado */ });
```
Os componentes recebem o tema **apenas pelos tokens de cor** (`--ui-cor-*`, `--ui-sombra-*`), que atravessam o Shadow DOM. Todo token de texto atinge contraste **WCAG AA (4,5:1)** nos dois temas, inclusive sobre fundos tingidos de status e no texto sobre a cor primária e o botão destrutivo — verificado em `tests/tema.test.ts`.

| Token | Uso |
| :--- | :--- |
| `--ui-cor-texto-sucesso` / `-erro` / `-alerta` / `-info` | Texto e tons de status (alertas, badges, toasts) |
| `--ui-cor-texto-sobre-status` | Texto sobre fundo sólido de status (badge sólido) |
| `--ui-cor-fundo-recuado` | Faixas rebaixadas (rodapés de modal e drawer) |
| `--ui-sombra-sm` / `-md` / `-lg` | Sombras: densas no escuro, suaves no claro |

### 9. Tipografia e Raios
Todos os componentes usam apenas dois tokens de família de fonte e uma escala de raios derivada de `--ui-raio-borda`. Sobrescreva no `:root` (a escala é calculada lá):
```css
:root {
  --ui-fonte-base: 'Roboto', sans-serif;      /* textos da interface */
  --ui-fonte-codigo: 'JetBrains Mono', monospace; /* coordenadas, valores técnicos, código */

  --ui-raio-borda: 4px;  /* base: botões, campos, menus */
  /* derivados automaticamente: --ui-raio-sm (2/3), --ui-raio-lg (5/3), --ui-raio-xl (8/3) */
  /* --ui-raio-borda: 0  →  interface totalmente reta */
}
```

### 10. Estilização Interna com `::part`
O Shadow DOM isola o CSS, mas os elementos internos principais são expostos com `part`, com nomes consistentes entre componentes (uma regra serve para vários):

| Componente | Parts |
| :--- | :--- |
| `<ui-botao>` / `<ui-botao-primario>` | `base`, `spinner` |
| `<ui-campo-texto>` / `<ui-input>` | `rotulo`, `campo`, `input`, `icone`, `icone-esquerda`, `icone-direita`, `ajuda` |
| `<ui-lista-flutuante>` / `<ui-select>` | `rotulo`, `campo`, `valor`, `seta`, `lista`, `opcao`, `opcao-selecionada` |
| `<ui-checkbox>`, `<ui-radio>`, `<ui-switch>` | `base`, `controle`, `indicador`, `rotulo` |
| `<ui-segmented>` | `base`, `indicador`, `opcao`, `opcao-selecionada` |
| `<ui-modal>`, `<ui-drawer>` | `fundo`, `painel`, `cabecalho`, `titulo`, `descricao` (drawer), `fechar`, `corpo`, `rodape` |
| `<ui-card>` | `base`, `midia`, `cabecalho`, `corpo`, `rodape` |
| `<ui-badge>` / `<ui-chip>` | `base`, `rotulo`, `remover` |
| `<ui-alerta>` / toasts | `base`, `icone`, `conteudo`, `titulo`, `mensagem`, `acao`, `fechar`, `progresso` |
| `<ui-tooltip>` | `balao`, `texto`, `seta` |
| `<ui-tabela>` | `base`, `tabela`, `celula-cabecalho`, `ordenar`, `linha`, `linha-selecionada`, `celula`, `vazio`, `carregando` |

```css
ui-campo-texto::part(campo) { border-width: 2px; }
ui-modal::part(painel) { max-width: 720px; }
ui-tabela::part(linha-selecionada) { background: #0b3d2a; }
:is(ui-checkbox, ui-radio, ui-switch)::part(rotulo) { font-weight: 600; }
```

---

## ⚡ Recursos Inteligentes de Alta Produtividade

### 1. Ações Declarativas "Zero-JS" (Triggers Nativos)
Você pode acionar modais, fechar janelas, disparar notificações toast ou copiar textos **sem escrever nenhuma linha de JavaScript**, apenas adicionando atributos nas tags HTML:

```html
<!-- Abrir Modal sem JS -->
<ui-botao-primario target-modal="modal-exclusao" variante="destrutivo">
  Excluir Registro
</ui-botao-primario>

<!-- Modal com Fechamento e Toast automáticos -->
<ui-modal id="modal-exclusao" titulo="Confirmação">
  Tem certeza que deseja excluir?
  <div slot="rodape">
    <ui-botao-primario dismiss-modal variante="secundario">Cancelar</ui-botao-primario>
    <ui-botao-primario dismiss-modal toast-sucesso="Excluído com sucesso!" variante="destrutivo">
      Confirmar
    </ui-botao-primario>
  </div>
</ui-modal>

<!-- Copiar Texto em 1 Clique -->
<ui-campo-texto id="input-token" value="SIGEF-2026-X88"></ui-campo-texto>
<ui-botao-primario copiar-texto="#input-token" copiar-mensagem="Token copiado!">
  Copiar Chave
</ui-botao-primario>
```

#### Tabela de Atributos Zero-JS Disponíveis:
| Atributo | Descrição | Exemplo de Uso |
| :--- | :--- | :--- |
| `target-modal="id"` | Abre o modal com o ID especificado ao clicar. | `target-modal="modal-login"` |
| `dismiss-modal` | Fecha o modal atual (ou o especificado por ID). | `dismiss-modal` |
| `toast-sucesso="msg"` | Dispara uma notificação flutuante de sucesso. | `toast-sucesso="Salvo com sucesso!"` |
| `toast-erro="msg"` | Dispara uma notificação flutuante de erro. | `toast-erro="Falha na conexão."` |
| `toast-alerta="msg"` | Dispara uma notificação flutuante de aviso. | `toast-alerta="Preencha os campos obrigatórios."` |
| `copiar-texto="texto\|#id"` | Copia o texto ou o valor do elemento referenciado. | `copiar-texto="#campo-pix"` |
| `limpar-form="id"` | Reseta todos os campos do formulário indicado. | `limpar-form="form-cadastro"` |
| `alternar-tema` | Alterna entre tema claro e escuro globalmente (a partir do tema em vigor, inclusive o do SO). | `alternar-tema` |

---

### 2. Formulários Automáticos com `FormData` Nativo (W3C FACE)
Todos os campos (`<ui-campo-texto>`, `<ui-lista-flutuante>`, `<ui-checkbox>`, `<ui-radio>`, `<ui-switch>`) implementam a especificação oficial de **Form-Associated Custom Elements**.

Isso significa que você extrai os dados de todos os campos de uma única vez, sem ler um por um:

```html
<form id="form-imovel">
  <ui-campo-texto name="denominacao" label="Nome da Fazenda" value="Boa Vista"></ui-campo-texto>
  <ui-campo-texto name="municipio" label="Município" value="Uberlândia"></ui-campo-texto>
  <ui-checkbox name="georreferenciado" label="Georreferenciado" marcado value="sim"></ui-checkbox>
  
  <ui-botao-primario type="submit">Salvar Imóvel</ui-botao-primario>
</form>
```

```javascript
const form = document.getElementById('form-imovel');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  
  // Extrai TODOS os campos em 1 única linha nativa:
  const dados = Object.fromEntries(new FormData(form));
  console.log(dados);
  // Resultado: { denominacao: "Boa Vista", municipio: "Uberlândia", georreferenciado: "sim" }
});
```

Assim como nos campos nativos, **Enter** em um `<ui-campo-texto>` submete o formulário pelo botão de envio padrão (`<ui-botao-primario type="submit">` ou `<button>`), que também pode estar fora do `<form>` com `form="id-do-form"`. Para impedir, chame `preventDefault()` no `keydown`. O `name`/`value` do botão que submeteu chega como `e.submitter` (use `new FormData(form, e.submitter)`), e gatilhos Zero-JS em botões `disabled` ou `carregando` são ignorados.

---

### 3. Barramento Global de Orquestração (`UIBus`)
O `UIBus` é uma central reativa que permite comandar qualquer componente do sistema ou ouvir eventos sem precisar de `querySelector`:

```javascript
import { UIBus } from '@thibezer/ui-components-kit';

// 1. Executar Ações Diretas:
UIBus.abrirModal('modal-confirmacao');
UIBus.fecharModal('modal-confirmacao');
UIBus.notificar({ tipo: 'sucesso', mensagem: 'Operação concluída!' });
UIBus.copiar('Texto para a área de transferência', 'Copiado!');
UIBus.definirDensidade('compacta'); // 'compacta' | 'normal' | 'relaxada'
UIBus.definirTema('escuro');        // 'claro' | 'escuro' | 'auto' (segue o SO); sem argumento, alterna
UIBus.obterTema();                  // tema em vigor: 'claro' | 'escuro'

// 2. Comunicação Desacoplada (Pub/Sub):
UIBus.on('vertice:selecionado', (dadosVertice) => {
  console.log('Vértice selecionado em qualquer tela:', dadosVertice);
});

UIBus.emit('vertice:selecionado', { id: 101, nome: 'M-01', altitude: 432.10 });
```

---

### 4. Tabelas Autônomas com Auto-Fetch Remoto
A `<ui-tabela>` pode buscar dados de uma API remota de forma totalmente autônoma, exibindo indicador de loading, tratando erros e permitindo filtragem instantânea:

```html
<ui-tabela 
  id="tabela-vertices"
  src="/api/v1/geodesia/vertices"
  max-height="400px"
  densidade="compacta">
</ui-tabela>
```

```javascript
const tabela = document.getElementById('tabela-vertices');

// Definir colunas da tabela:
tabela.colunas = [
  { id: 'nome_vertice', rotulo: 'Vértice', ordenavel: true },
  { id: 'este', rotulo: 'Este (m)', ordenavel: true, alinhamento: 'direita' },
  { id: 'norte', rotulo: 'Norte (m)', ordenavel: true, alinhamento: 'direita' }
];

// Métodos inteligentes disponíveis na tabela:
tabela.filtrar('M-01'); // Filtra instantaneamente em todas as colunas
tabela.recarregar();   // Recarrega os dados da API remota
```

---

## 💻 Exemplos de Uso por Tecnologia

### HTML Puro + JavaScript
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <link rel="stylesheet" href="dist/ui-kit.css">
  <script type="module" src="dist/index.js"></script>
</head>
<body>
  <ui-campo-texto id="meu-campo" label="Nome do Projeto"></ui-campo-texto>
  <ui-botao-primario target-modal="meu-modal">Abrir Detalhes</ui-botao-primario>

  <ui-modal id="meu-modal" titulo="Detalhes">
    <p>Conteúdo do modal...</p>
    <div slot="rodape">
      <ui-botao-primario dismiss-modal>Fechar</ui-botao-primario>
    </div>
  </ui-modal>

  <script>
    document.getElementById('meu-campo').addEventListener('ui-input', (e) => {
      console.log('Digitado:', e.detail.value);
    });
  </script>
</body>
</html>
```

---

### React / Next.js (SSR & Client Components)

A biblioteca é **100% SSR-safe**: todas as classes herdam de `SafeHTMLElement` e o registro de tags utiliza verificações de segurança para ambientes sem DOM (Node.js). Isso garante que você pode importar tipos, classes e constantes tanto no servidor quanto no cliente sem encontrar `ReferenceError: HTMLElement is not defined` ou `customElements is not defined`.

#### Tipos no TSX (autocompletar e checagem)
O pacote gera tipos para todas as tags a partir do Custom Elements Manifest. Registre-os uma vez no `tsconfig.json`:

```json
{ "compilerOptions": { "types": ["@thibezer/ui-components-kit/tipos-react"] } }
```

A partir daí o editor sugere atributos, propriedades e eventos de cada tag, e o TypeScript recusa valores inválidos:

```tsx
<ui-tabela
  colunas={[{ id: 'ponto', rotulo: 'Ponto', ordenavel: true }]}   // tipado como TabelaColuna[]
  densidade="compacta"                                             // 'compacta' | 'normal' | 'relaxada'
  onui-sort={(e) => console.log(e.detail)}                         // eventos ui-* no formato do React 19
/>
<ui-tabela densidade="enorme" />                                   // ❌ erro de tipo
```

Outros JSX (Preact, Solid etc.) podem usar o mapa agnóstico `ElementosUI` de `@thibezer/ui-components-kit/tipos-elementos`.

#### No Next.js (App Router):

Crie um componente cliente provedor ou registre no topo do seu layout/página cliente:

```tsx
// components/UIProvider.tsx
'use client';

import { useEffect } from 'react';
import '@thibezer/ui-components-kit/style.css';
import '@thibezer/ui-components-kit/register'; // Registra todos os Custom Elements com segurança no cliente

export function UIProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

Ou registre de forma modular apenas o que a tela precisa:

```tsx
// app/dashboard/page.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import '@thibezer/ui-components-kit/style.css';
import '@thibezer/ui-components-kit/forms';
import '@thibezer/ui-components-kit/botao';
import '@thibezer/ui-components-kit/tabela';
import { UIBus } from '@thibezer/ui-components-kit/core';
import type { UITabela } from '@thibezer/ui-components-kit/tabela';

export default function DashboardPropriedades() {
  const tabelaRef = useRef<UITabela>(null);
  const [nome, setNome] = useState('');

  useEffect(() => {
    if (tabelaRef.current) {
      tabelaRef.current.colunas = [
        { id: 'id', rotulo: 'Código' },
        { id: 'nome', rotulo: 'Propriedade' }
      ];
      tabelaRef.current.dados = [
        { id: 1, nome: 'Fazenda Santa Luzia' }
      ];
    }
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <ui-campo-texto
        label="Pesquisar Imóvel"
        value={nome}
        onInput={(e: any) => {
          // Os eventos nativos `input`/`change` não têm `detail`: leia o valor do próprio elemento
          const valor = e.target.value;
          setNome(valor);
          tabelaRef.current?.filtrar(valor);
        }}
      ></ui-campo-texto>

      <ui-tabela ref={tabelaRef} max-height="300px" densidade="compacta"></ui-tabela>

      <ui-botao-primario 
        variante="primary" 
        onClick={() => UIBus.notificar({ tipo: 'sucesso', mensagem: 'Dados sincronizados!' })}>
        Sincronizar
      </ui-botao-primario>
    </div>
  );
}
```

---

### Vue.js

Para autocompletar e checar props e eventos nos templates (Volar), registre os tipos no `tsconfig.json` e informe ao Vue que tags `ui-*` são custom elements:

```json
{ "compilerOptions": { "types": ["@thibezer/ui-components-kit/tipos-vue"] } }
```

```javascript
// vite.config.js
vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('ui-') } } })
```

```vue
<template>
  <div class="container">
    <ui-campo-texto 
      :value="termoBusca"
      label="Buscar Vértice" 
      @ui-input="aoDigitar"
    />

    <ui-lista-flutuante 
      .itens="opcoes" 
      @ui-selecionar="aoSelecionar"
    />

    <ui-botao-primario target-modal="modal-confirmacao">
      Confirmar Operação
    </ui-botao-primario>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import '@thibezer/ui-components-kit/style.css';
import '@thibezer/ui-components-kit';

const termoBusca = ref('');
const opcoes = ref([
  { id: '1', label: 'Marco Geodésico M' },
  { id: '2', label: 'Ponto Topográfico P' }
]);

function aoDigitar(e) {
  termoBusca.value = e.detail.value;
}

function aoSelecionar(e) {
  console.log('Opção selecionada:', e.detail);
}
</script>
```

---

### Iframes / Microfrontends
Comunicação segura entre iframes e sistemas pais via eventos do `UIBus`:

```javascript
// Dentro do Iframe (Filho):
import { UIBus } from '@thibezer/ui-components-kit';

UIBus.on('vertice:salvo', (dados) => {
  window.parent.postMessage({ tipo: 'VERTICE_SALVO', payload: dados }, '*');
});

// No Sistema Principal (Pai):
window.addEventListener('message', (event) => {
  if (event.data?.tipo === 'VERTICE_SALVO') {
    console.log('Recebido do Iframe:', event.data.payload);
  }
});
```

---

## 🧩 Catálogo de Componentes & Referência

### 🟢 Camada 1: Fundamentos
| Tag | Descrição | Principais Atributos / Props | Eventos Emitidos |
| :--- | :--- | :--- | :--- |
| `<ui-botao-primario>` | Botão com estados de loading, ícone e variantes. Form-associated (`type="submit"`/`"reset"`, `name`/`value`, `form`). Só com ícone, informe `aria-label` (ou `title`). | `variante`, `carregando`, `disabled`, `type`, `aria-label`, `target-modal` | `ui-click` |
| `<ui-campo-texto>` | Input de texto com Floating Label, validação e senha. | `label`, `value`, `tipo`, `obrigatorio`, `name` | `ui-input`, `ui-change` |
| `<ui-lista-flutuante>` | Select/Dropdown com Bottom Sheet no mobile. | `itens`, `value`, `placeholder`, `name` | `ui-selecionar` |
| `<ui-texto>` | Tipografia semântica (H1-H6, corpo, caption, código). | `variante`, `cor`, `peso` | - |
| `<ui-icone>` | Wrapper para ícones vetoriais padronizados. | `nome`, `tamanho`, `cor` | - |

### 🔵 Camada 2: Controles & Seleção
| Tag | Descrição | Principais Atributos / Props | Eventos Emitidos |
| :--- | :--- | :--- | :--- |
| `<ui-checkbox>` | Caixa de seleção múltipla com estado indeterminado. | `marcado`, `indeterminado`, `name`, `value` | `ui-change` |
| `<ui-radio>` | Opção única com agrupamento automático por nome. | `marcado`, `name`, `value` | `ui-change` |
| `<ui-switch>` | Chave de alternância liga/desliga física instantânea. | `ativo`, `name`, `value` | `ui-change` |
| `<ui-segmented>` | Controle segmentado de opções (Pills/Tabs deslizantes). | `opcoes`, `value`, `name`, `tamanho` | `ui-change`, `ui-selecionar` |
| `<ui-badge>` / `<ui-chip>` | Tags de status e chips com botão de remoção. | `variante`, `removivel`, `value` | `ui-remove` |
| `<ui-avatar>` | Avatar com fotos, iniciais e status online. | `nome`, `src`, `status`, `tamanho` | - |

### 🟣 Camada 3: Contêineres, Overlays, Dados & GIS
| Tag | Descrição | Principais Atributos / Props | Eventos Emitidos |
| :--- | :--- | :--- | :--- |
| `<ui-card>` | Cartão de conteúdo com slots nomeados e elevação. | `elevacao`, `clicavel` | `ui-click` |
| `<ui-modal>` | Modal centralizado no PC e Bottom Sheet no Mobile. Abrir/fechar por `abrir()`/`fechar()` ou pelo atributo `aberto` tem o mesmo efeito (eventos, foco, `inert`). Foco inicial no `[autofocus]` ou no primeiro controle do conteúdo; ao fechar, volta ao gatilho. Modais empilhados: só o último aberto é interativo. | `aberto`, `titulo`, `bottom-sheet`, `bloquear-fechamento` (oculta o "✕" e ignora Esc/fundo) | `ui-abrir`, `ui-fechar` |
| `<ui-drawer>` | Painel lateral deslizante (Sheet/Gaveta direita/esquerda). | `aberto`, `posicao` (`direita`, `esquerda`, `baixo`, `cima`), `titulo`, `largura` | `ui-abrir`, `ui-fechar` |
| `<ui-alerta>` | Banner de notificação contextual fixo. | `variante`, `titulo`, `fechavel` | `ui-fechar` |
| `<ui-toast>` | Notificações flutuantes inteligentes com pilha flex. | `UIToast.notificar({ tipo, mensagem })` | - |
| `<ui-tooltip>` | Dica contextual inteligente (Hover PC / Toque Mobile). O texto vira `aria-description` do gatilho (lido pelo leitor de tela, também repassado pelo `<ui-botao>`); **Esc** fecha sem mover o foco; o balão não some ao levar o ponteiro até ele. | `texto`, `posicao`, `gatilho` | - |
| `<ui-skeleton>` | Placeholder de carregamento animado com pulsos. | `tipo`, `largura`, `altura`, `animado` | - |
| `<ui-stat>` | Cartão KPI de estatísticas, métricas e tendências. | `rotulo`, `valor`, `variacao`, `tendencia` (`alta`, `baixa`, `neutro`) | - |
| `<ui-tabela>` | Tabela orientada a dados, virtualizada tipo Excel. **Teclado**: cabeçalhos ordenáveis são botões (Tab + Enter/Espaço, com `aria-sort`); nas linhas, ↑/↓, Home/End e PageUp/PageDown movem o foco e Enter/Espaço selecionam (`aria-current`). A seleção é mantida ao ordenar e filtrar. Nome acessível via `aria-label`. | `colunas`, `dados`, `src`, `densidade`, `aria-label` | `ui-sort`, `ui-column-resize`, `ui-linha-clique` |
| `<ui-tabela-propriedades>` | Inspetor de propriedades técnicas padrão AutoCAD & Revit com cálculos matemáticos inline (+, -, *, /, ^, %), arraste de valor contínuo (scrubbing), splitter redimensionável e editores CAD. | `categorias`, `tipo-objeto`, `splitter-pos`, `modo-aplicar`, `filtro` | `ui-propriedade-alterada`, `ui-aplicar`, `ui-desfazer`, `ui-editar-tipo`, `ui-acao-clique`, `ui-quick-select`, `ui-calculadora` |
| `<ui-ribbon>` | Barra de ferramentas em abas e grupos (estilo AutoCAD / Word / Excel): botões grandes e pequenos em colunas de 3, toggles, menus suspensos, abas contextuais, modo recolhido (duplo clique na aba) e navegação por teclado (roving tabindex). | `abas`, `aba-ativa`, `recolhido`, `compacto` | `ui-ferramenta`, `ui-aba-change` |
| `<ui-paleta-ferramentas>` | Paleta de ferramentas (estilo Illustrator / Photoshop): seleção exclusiva, grupos com flyout (clique longo, botão direito ou seta), 1 ou 2 colunas, vertical/horizontal e atalhos de teclado que percorrem o grupo. | `ferramentas`, `valor`, `orientacao`, `colunas`, `tamanho`, `atalhos` | `ui-change`, `ui-selecionar`, `ui-ferramenta` |
| `<ui-mapa>` | Mapa geográfico interativo com camadas OpenStreetMap. | `lat`, `lng`, `zoom`, `camadas` | - |
| `<ui-camadas>` | Painel de camadas vetoriais CAD/GIS com hierarquia em árvore, barra de arraste vertical (`redimensionavel`), estabilidade de altura sem colapso, drag-and-drop, métricas geodésicas e persistência no LocalStorage. | `redimensionavel`, `altura`, `min-altura`, `max-altura`, `flutuante`, `colapsado`, `camada-ativa`, `persistir` | `ui-redimensionar-altura`, `ui-camada-selecionada`, `ui-camada-visibilidade`, `ui-camadas-reordenadas`, `ui-acao-massa` |
| `<ui-canvas-cad>` | Mesa CAD/GIS para poligonais e vértices geodésicos. | `pontos`, `segmentos`, `fitBounds()` | `ui-ponto-selecionado` |

---

### Custom Elements Manifest
O pacote publica `custom-elements.json` (campo `customElements` do `package.json`), o formato padrão que IDEs, Storybook e geradores de documentação leem para listar tags, atributos, propriedades, eventos e `::part` de cada componente. Ele é gerado no `npm run build` pelo [`@custom-elements-manifest/analyzer`](https://custom-elements-manifest.open-wc.org/), e os tipos React/Vue são derivados dele — por isso nunca ficam desatualizados em relação ao código.

---

## 🛠️ Como Executar e Compilar Localmente

1. **Instalar Dependências**:
   ```bash
   npm install
   ```

2. **Executar o Playground Sandbox em Desenvolvimento**:
   ```bash
   npm run dev
   ```
   Acesse: `http://localhost:5173/`

3. **Compilar Pacote de Produção (Library Mode)**:
   ```bash
   npm run build
   ```
   Gera na pasta `dist/`:
   * `dist/index.js` e `dist/<modulo>.js` (Módulos ES para Vite, Webpack, Rollup)
   * `dist/index.cjs` e `dist/<modulo>.cjs` (CommonJS para `require`)
   * `dist/*.d.ts` (Tipagens TypeScript)
   * `dist/ui-kit.css` (Design Tokens compilados, 100% autocontido — o build falha se restar qualquer `@import`)
   * `dist/custom-elements.json` (Custom Elements Manifest) e `dist/tipos-react.d.ts`, `dist/tipos-vue.d.ts`, `dist/tipos-elementos.d.ts`

4. **Verificar os tipos gerados** (depois do build):
   ```bash
   npm run test:tipos
   ```
