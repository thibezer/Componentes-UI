# 📚 Componente UI Camadas (`<ui-camadas>`)

> **Web Component W3C Nativo** para visualização, gerenciamento hierárquico e edição de camadas vetoriais e feições geográficas em aplicações CAD/GIS (ex: ConecteMapas, GerenciGeo, Rifa da Sorte).

---

## 🚀 Características Principais

- **Zero Dependências Externas**: Criado puramente com Web Standards W3C (Custom Elements v1, Shadow DOM, CSS Variables).
- **Hierarquia Estilo Illustrator / ArcGIS Pro**: Visualização de camadas em árvore com feições filhas agrupadas por tipo geométrico (Polígono, Linha, Ponto).
- **Performance de 60 FPS**: Atualizações in-place cirúrgicas para visibilidade, travas, opacidade e cores (sem repaints pesados).
- **Drag & Drop Nativo (HTML5)**:
  - Reordenação da ordem de desenho / Z-Index das camadas.
  - Reordenação de feições internas.
  - Transferência de feições entre camadas distintas arrastando sobre o grupo.
- **Edição Inline de Nomes**: Duplo-clique no nome da camada ou feição para editar (`Enter` para confirmar, `Esc` para cancelar).
- **Drawer de Configurações**: Ajuste contínuo de opacidade, seletor de cor HEX/nativo e exclusão com confirmação em 2 passos.
- **Cálculo Geodésico Automático (WGS84)**: Cálculo de área em hectares/m² e comprimento em metros/km com base esférica precisa.
- **Rodapé de Ações em Massa**: Seleção com `Shift` e `Ctrl` para visibilidade, trava, cor, migração de camada ou exclusão em lote.

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
<!-- Painel embutido lateral -->
<ui-camadas id="meu-painel-camadas"></ui-camadas>

<!-- Ou flutuante sobre o mapa -->
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
```

---

## 📡 Eventos Customizados Disparados

Todos os eventos disparam com `{ bubbles: true, composed: true }`:

| Evento | Detalhe (`event.detail`) | Descrição |
| :--- | :--- | :--- |
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

---

## 🧠 Sistema de Persistência / Lembrança Inteligente (LocalStorage)

O `<ui-camadas>` possui suporte nativo à persistência transparente de estado para que o operador encontre o painel exatamente como deixou:

| Propriedade Persistida | Como Funciona |
| :--- | :--- |
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

### Configuração e API

```html
<!-- Persistência ativada por padrão com chave vinculada ao id do elemento -->
<ui-camadas id="painel-georreferenciamento"></ui-camadas>

<!-- Chave customizada de storage compartilhada entre telas -->
<ui-camadas id="painel-mapa" storage-key="projeto_fazenda_santo_antonio"></ui-camadas>

<!-- Desativar persistência se desejado -->
<ui-camadas persistir="false"></ui-camadas>
```

```ts
const painel = document.querySelector('ui-camadas');

// Limpar preferências salvas e restaurar o estado original dos dados
painel.limparLembranca();
```

---

## 🎨 Variáveis CSS Disponíveis para Customização

```css
ui-camadas {
  --ui-cor-fundo-elevado: #141418;
  --ui-cor-fundo-base: #101014;
  --ui-cor-primaria: #00E08A;
  --ui-cor-borda: rgba(255, 255, 255, 0.08);
  --ui-cor-texto: #f1f1f5;
  --ui-cor-texto-secundario: #888899;
}
```

