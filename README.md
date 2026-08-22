# 🎨 UI Components Kit - Web Components Nativos & Universais

Biblioteca de **Web Components Nativos Universais e Agnósticos**, construída no padrão oficial **W3C Custom Elements + Shadow DOM**, com TypeScript, Design Tokens em CSS modular e Vite.

Projetada para funcionar em **qualquer linguagem, framework ou sistema web** (HTML puro, React, Next.js, Vue, Angular, Svelte, PHP, Django, WordPress, Blazor, etc.) com **zero dependências externas**.

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
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/thibezer/Componentes-UI@main/dist/ui-kit.css">

<!-- 2. Biblioteca dos Componentes (Módulo ES) -->
<script type="module" src="https://cdn.jsdelivr.net/gh/thibezer/Componentes-UI@main/dist/ui-kit.es.js"></script>

<!-- 3. Uso imediato no HTML -->
<ui-botao-primario variante="primary">Clique Aqui</ui-botao-primario>
```

### Opção 2: NPM / Módulos ES (React, Vue, Next.js, Vite)

Instale a biblioteca diretamente do repositório:

```bash
npm install git+https://github.com/thibezer/Componentes-UI.git
```

No ponto de entrada da sua aplicação (`main.ts`, `index.js` ou `App.tsx`):

```typescript
import 'ui-components-kit/dist/ui-kit.css';
import 'ui-components-kit';
```

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

### 5. Serviços Globais e Helpers
Utilitários prontos para uso sem necessidade de instanciar elementos:
```javascript
import { UIToast, UIBus } from 'ui-components-kit';

UIToast.notificar({
  tipo: 'sucesso',
  titulo: 'Registro Salvo!',
  mensagem: 'Os dados foram sincronizados.',
  duracao: 4000
});
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
| `alternar-tema` | Alterna entre tema claro e escuro globalmente. | `alternar-tema` |

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

---

### 3. Barramento Global de Orquestração (`UIBus`)
O `UIBus` é uma central reativa que permite comandar qualquer componente do sistema ou ouvir eventos sem precisar de `querySelector`:

```javascript
import { UIBus } from 'ui-components-kit';

// 1. Executar Ações Diretas:
UIBus.abrirModal('modal-confirmacao');
UIBus.fecharModal('modal-confirmacao');
UIBus.notificar({ tipo: 'sucesso', mensagem: 'Operação concluída!' });
UIBus.copiar('Texto para a área de transferência', 'Copiado!');
UIBus.definirDensidade('compacta'); // 'compacta' | 'normal' | 'relaxada'
UIBus.definirTema('escuro');        // 'claro' | 'escuro'

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
  <script type="module" src="dist/ui-kit.es.js"></script>
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

### React / Next.js
```tsx
import React, { useEffect, useRef, useState } from 'react';
import 'ui-components-kit/dist/ui-kit.css';
import 'ui-components-kit';
import { UIBus } from 'ui-components-kit';

export function DashboardPropriedades() {
  const tabelaRef = useRef<any>(null);
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
          setNome(e.detail?.value || '');
          tabelaRef.current?.filtrar(e.detail?.value || '');
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
import 'ui-components-kit/dist/ui-kit.css';
import 'ui-components-kit';

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
import { UIBus } from 'ui-components-kit';

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
| `<ui-botao-primario>` | Botão com estados de loading, ícone e variantes. | `variante`, `carregando`, `disabled`, `target-modal` | `ui-click` |
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
| `<ui-badge>` / `<ui-chip>` | Tags de status e chips com botão de remoção. | `variante`, `removivel`, `value` | `ui-remove` |
| `<ui-avatar>` | Avatar com fotos, iniciais e status online. | `nome`, `foto`, `status`, `tamanho` | - |

### 🟣 Camada 3: Contêineres, Overlays, Dados & GIS
| Tag | Descrição | Principais Atributos / Props | Eventos Emitidos |
| :--- | :--- | :--- | :--- |
| `<ui-card>` | Cartão de conteúdo com slots nomeados e elevação. | `elevacao`, `clicavel` | `ui-click` |
| `<ui-modal>` | Modal centralizado no PC e Bottom Sheet no Mobile. | `aberto`, `titulo`, `bottom-sheet` | `ui-abrir`, `ui-fechar` |
| `<ui-alerta>` | Banner de notificação contextual fixo. | `variante`, `titulo`, `fechavel` | `ui-fechar` |
| `<ui-toast>` | Notificações flutuantes inteligentes com pilha flex. | `UIToast.notificar({ tipo, mensagem })` | - |
| `<ui-tooltip>` | Dica contextual inteligente (Hover PC / Toque Mobile). | `texto`, `posicao`, `gatilho` | - |
| `<ui-tabela>` | Tabela orientada a dados, virtualizada tipo Excel. | `colunas`, `dados`, `src`, `densidade` | `ui-sort`, `ui-column-resize` |
| `<ui-mapa>` | Mapa geográfico interativo com camadas OpenStreetMap. | `lat`, `lng`, `zoom`, `camadas` | - |
| `<ui-canvas-cad>` | Mesa CAD/GIS para poligonais e vértices geodésicos. | `pontos`, `segmentos`, `fitBounds()` | `ui-ponto-selecionado` |

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
   * `dist/ui-kit.es.js` (Módulo ES para Vite, Webpack, Rollup)
   * `dist/ui-kit.umd.js` (Módulo UMD para scripts legados)
   * `dist/ui-kit.css` (Design Tokens e Estilos compilados)
