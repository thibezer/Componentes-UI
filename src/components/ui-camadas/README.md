# 📚 Componente UI Camadas (`<ui-camadas>`)

> **Web Component W3C Nativo** para visualização, gerenciamento hierárquico e edição de camadas vetoriais e feições geográficas em aplicações CAD/GIS (ex: ConecteMapas, GerenciGeo, Rifa da Sorte).

---

## 🚀 Características Principais

- **Zero Dependências Externas**: Criado puramente com Web Standards W3C (Custom Elements v1, Shadow DOM, CSS Variables).
- **Hierarquia Estilo Illustrator / ArcGIS Pro**: Visualização de camadas em árvore com feições filhas agrupadas por tipo geométrico (Polígono, Linha, Ponto).
- **Estabilidade de Altura Profissional**: O componente mantém a altura exata definida pelo layout ou barra de arraste sem colapsar nem retrair quando há poucas ou nenhuma camada.
- **Barra de Arraste de Altura (Splitter / Resizer)**:
  - Suporte a redimensionamento vertical nativo com arraste por ponteiro (mouse/touch) via atributo `redimensionavel`.
  - Duplo-clique na barra de arraste restaura instantaneamente a altura padrão.
  - Compatibilidade total com splitters externos (divisores flex/grid entre painéis).
  - Persistência automática da altura no `LocalStorage`.
- **Performance de 60 FPS**: Atualizações in-place cirúrgicas para visibilidade, travas, opacidade e cores (sem repaints pesados).
- **Drag & Drop Nativo (HTML5)**:
  - Reordenação da ordem de desenho / Z-Index das camadas.
  - Reordenação de feições internas.
  - Transferência de feições entre camadas distintas arrastando sobre o grupo.
- **Edição Inline de Nomes**: Duplo-clique no nome da camada ou feição para editar (`Enter` para confirmar, `Esc` para cancelar).
- **Drawer de Configurações**: Ajuste contínuo de opacidade, seletor de cor HEX/nativo e exclusão com confirmação em 2 passos.
- **Cálculo Geodésico Automático (WGS84)**: Cálculo de área em hectares/m² e comprimento em metros/km com base esférica precisa.
- **Rodapé de Ações em Massa**: Seleção com `Shift` e `Ctrl` para visibilidade, trava, cor, migração de camada ou exclusão em lote com isolamento visual quando sem seleção.
- **Seletor de Mapas Base 100% Offline**: Previews vetoriais autônomos sem requisições a servidores externos de imagens.

---

## 📦 Como Usar

### 1. Importação

```typescript
import '@thibezer/ui-components-kit';
// Ou importando o módulo específico:
import '@thibezer/ui-components-kit/camadas';
```

### 2. No HTML

```html
<!-- Painel embutido lateral com altura de 500px e barra de arraste ativa -->
<ui-camadas id="meu-painel-camadas" redimensionavel altura="500px"></ui-camadas>

<!-- Painel flutuante sobreposto ao mapa / CAD -->
<ui-camadas id="painel-flutuante" flutuante></ui-camadas>
```

### 3. Alimentando com Dados (TypeScript / JavaScript)

```typescript
const painel = document.querySelector('ui-camadas');

painel.definirCamadas(
  [
    { id: 'camada-lotes', name: 'Lotes Urbanos', color: '#00E08A', visible: true, locked: false },
    { id: 'camada-vias', name: 'Eixos Viários', color: '#38BDF8', visible: true, locked: false }
  ],
  [
    {
      id: 'lote-01',
      name: 'Lote 01 Quadra B',
      layerId: 'camada-lotes',
      type: 'Polygon',
      status: 'oficial',
      coordinates: [[[-23.55, -46.63], [-23.551, -46.63], [-23.551, -46.631], [-23.55, -46.631], [-23.55, -46.63]]]
    }
  ]
);

// Atalhos reativos (equivalentes a definirCamadas / definirFeicoes / definirMapasBase)
painel.layers = camadas;
painel.features = feicoes;
painel.basemaps = mapasBase;
```

---

## 📏 Controle de Altura, Estabilidade e Barra de Arraste (Splitter)

O `<ui-camadas>` foi desenvolvido para se comportar com estabilidade em layouts densos do tipo Workbench:

### 1. Preenchimento Estável sem "Retração"
Por padrão, o componente ocupa `100%` da altura do container onde foi inserido (`height: var(--ui-camadas-altura, 100%)`). 
* **Se houver apenas 1 camada:** O painel **não encolhe** para 50px; ele preenche a altura designada e mantém o rodapé fixado na base.
* **Se houver 50 camadas:** A lista rola suavemente com barra de rolagem estilizada, sem quebrar o layout externo.

### 2. Barra de Arraste Nativa (`redimensionavel`)
Ao adicionar o atributo `redimensionavel` (ou `redimensionavel-altura`), o componente exibe uma barra de arraste sutil na borda inferior:

```html
<ui-camadas id="camadas-docked" redimensionavel altura="420px" min-altura="160px" max-altura="800px"></ui-camadas>
```

* **Arraste com Mouse ou Toque:** Altera dinamicamente a altura e dispara o evento `ui-redimensionar-altura`.
* **Duplo-clique no Grip:** Restaura a altura automática/original do layout.

### 3. Uso com Splitter Externo / Layout Flexível
Se você estiver utilizando uma barra de arraste externa (ex: um divisor entre o painel de camadas e uma tabela de propriedades):

```typescript
const painel = document.querySelector('ui-camadas');

// Define altura programática estável
painel.definirAltura(380);

// Ou via CSS padrão:
painel.style.height = '450px';
```

---

## 🎛️ Atributos e Propriedades Reativas

| Atributo | Propriedade JS | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `altura` | `el.altura` | `string \| number` | `null` | Altura fixa do componente (ex: `'450px'` ou `450`). |
| `min-altura` | `el.minAltura` | `string \| number` | `'140px'` | Altura mínima permitida durante o redimensionamento. |
| `max-altura` | `el.maxAltura` | `string \| number` | `'1600px'`| Altura máxima permitida durante o redimensionamento. |
| `redimensionavel` | `el.redimensionavel` | `boolean` | `false` | Exibe a barra de arraste inferior para redimensionamento vertical. |
| `flutuante` | `el.flutuante` | `boolean` | `false` | Posiciona o painel flutuante sobre a tela/mapa. |
| `colapsado` | `el.colapsado` | `boolean` | `false` | Colapsa o painel lateralmente (com botão flutuante para restaurar). |
| `camada-ativa` | `el.camadaAtivaId` | `string \| null` | `null` | ID da camada de trabalho atualmente ativa para inserção de vetores. |
| `mapa-base-ativo`| `el.mapaBaseAtivo` | `string` | `'satelite'`| ID do mapa base ativo no seletor inferior. |
| `mostrar-mapas-base` | `el.mostrarMapasBase` | `boolean` | `true` | Exibe ou oculta a seção de mapas base no rodapé do painel. |
| `mostrar-rodape` | `el.mostrarRodape` | `boolean` | `true` | Exibe ou oculta a barra de ações em massa e contadores. |
| `mostrar-busca` | `el.mostrarBusca` | `boolean` | `true` | Exibe o campo de busca/filtro textual de camadas e feições. |
| `densidade` | `el.densidade` | `'compacto' \| 'normal'` | `'normal'` | Densidade visual das linhas (22px vs 25px). |
| `persistir` | `el.persistir` | `boolean` | `true` | Ativa a lembrança transparente de estado no `LocalStorage`. |
| `storage-key` | `el.storageKey` | `string \| null` | `null` | Chave personalizada no `LocalStorage` (padrão: `ui_camadas_estado_{id}`). |

---

## 🛠️ Métodos Públicos da Instância

```typescript
const painel = document.querySelector('ui-camadas');

// Define camadas e feições do painel
painel.definirCamadas(camadas, feicoes);

// Redimensiona a altura (2º parâmetro = persistir no LocalStorage; não dispara evento)
painel.definirAltura(520, true);

// Seleciona o mapa base ativo
painel.selecionarMapaBase('topografia');

// Define camada ativa por ID
painel.definirCamadaAtiva('camada-lotes');

// Seleção programática de feições
painel.selecionarFeicoes(['lote-01', 'lote-02']);
painel.limparSelecao();

// Expansão e colapso de pastas
painel.expandirTodas();
painel.colapsarTodas();
painel.alternarExpansao('camada-lotes');

// Colapso geral do painel
painel.colapsar();
painel.expandir();
painel.alternarColapso();

// Métodos que alteram estado observável são silenciosos por padrão.
// Para propagar como se fosse ação do usuário, passe emitirEvento = true:
painel.definirCamadaAtiva('camada-lotes', true);  // dispara ui-camada-selecionada
painel.selecionarMapaBase('osm', true);           // dispara ui-mapa-base-alterado
painel.selecionarFeicao('lote-01', false, false, true);
painel.limparSelecao(true);
painel.alternarVisibilidadeTodas(true);
painel.colapsar(true);                            // dispara ui-colapso-alterado

// Limpar dados salvos no LocalStorage
painel.limparLembranca();
```

---

## 📡 Eventos Customizados Disparados

Todos os eventos disparam com `{ bubbles: true, composed: true }`.

> **Somente interações do usuário disparam eventos.** Clique, drag-and-drop, teclado e o arraste da barra de altura emitem os eventos abaixo. Mutações feitas pelo aplicativo — `painel.layers = [...]`, `setAttribute('camada-ativa' | 'colapsado' | 'mapa-base-ativo' | 'altura', ...)` ou métodos públicos — atualizam apenas o DOM interno, **sem** redisparar eventos. Assim, o padrão reativo "evento → atualiza estado → reatribui `layers`" nunca entra em loop.
>
> ```typescript
> painel.addEventListener('ui-camada-visibilidade', (e) => {
>   store.setVisivel(e.detail.camadaId, e.detail.visivel);
>   painel.layers = store.camadas; // seguro: não redispara ui-camada-visibilidade
> });
> ```

| Evento | Detalhe (`event.detail`) | Descrição |
| :--- | :--- | :--- |
| `ui-redimensionar-altura` | `{ altura: number \| null }` | Disparado ao finalizar o redimensionamento ou resetar a altura |
| `ui-redimensionando-altura` | `{ altura: number }` | Disparado continuamente em tempo real durante o arraste da barra |
| `ui-camada-selecionada` | `{ camadaId, camada }` | Camada ativa selecionada para desenho |
| `ui-camada-visibilidade` | `{ camadaId, visivel }` | Visibilidade da camada alterada |
| `ui-camada-bloqueio` | `{ camadaId, bloqueado }` | Bloqueio/trava de edição da camada |
| `ui-camada-cor` | `{ camadaId, cor }` | Cor do vetor da camada alterada |
| `ui-camada-opacidade` | `{ camadaId, opacidade }` | Opacidade contínua (0.05 a 1.0) |
| `ui-camada-renomeada` | `{ camadaId, novoNome }` | Camada renomeada via duplo-clique |
| `ui-camada-excluida` | `{ camadaId }` | Camada removida pelo usuário |
| `ui-camadas-reordenadas`| `{ camadas }` | Nova ordem das camadas pós Drag & Drop |
| `ui-feicao-selecionada` | `{ feicaoId, feicao }` | Feição individual selecionada |
| `ui-feicoes-selecionadas`| `{ feicoesIds, feicoes }`| Conjunto de feições selecionadas |
| `ui-feicao-movida` | `{ feicaoId, camadaOrigemId, camadaDestinoId }` | Feição transferida de camada via DnD |
| `ui-acao-massa` | `{ acao, feicoesIds, feicoes }` | Ação coletiva disparada no rodapé |
| `ui-mapa-base-alterado` | `{ mapaBaseId }` | Mapa base alterado no seletor |
| `ui-colapso-alterado` | `{ colapsado: boolean }` | Painel colapsado ou expandido |

---

## 🧠 Sistema de Persistência / Lembrança Inteligente (LocalStorage)

O `<ui-camadas>` possui suporte nativo à persistência transparente de estado para que o operador encontre o painel exatamente como deixou:

| Propriedade Persistida | Como Funciona |
| :--- | :--- |
| **Altura do Painel** | Salva a altura ajustada pelo operador via barra de arraste (`altura`). |
| **Expansão / Recolhimento** | Lembra individualmente quais camadas estavam abertas ou fechadas (`expandedLayers`). |
| **Ordem das Camadas** | Preserva a hierarquia visual (Z-Index) alterada via Drag & Drop. |
| **Estado do Painel** | Lembra se o painel estava colapsado/minimizado ou expandido (`colapsado`). |
| **Camada Ativa** | Mantém a camada de trabalho ativa selecionada (`camadaAtivaId`). |
| **Visibilidade da Camada** | Salva se a camada estava visível ou oculta (`visible`). |
| **Bloqueio da Camada** | Lembra se o cadeado estava trancado (`locked`). |
| **Opacidade Customizada** | Salva o percentual de transparência ajustado no slider (`opacity`). |
| **Cor Personalizada** | Salva a cor atribuída no seletor de cor (`color`). |
| **Nome Renomeado** | Preserva a edição inline de nome realizada pelo usuário. |
| **Mapa Base Ativo** | Lembra o mapa base orbital/vetorial selecionado no grid. |

---

## 🎨 Variáveis CSS Disponíveis para Customização

```css
ui-camadas {
  --ui-camadas-altura: 500px;
  --ui-camadas-min-altura: 160px;
  --ui-cor-fundo-elevado: #141418;
  --ui-cor-fundo-base: #101014;
  --ui-cor-primaria: #00E08A;
  --ui-cor-borda: rgba(255, 255, 255, 0.08);
  --ui-cor-texto: #f1f1f5;
  --ui-cor-texto-secundario: #888899;
}
```
