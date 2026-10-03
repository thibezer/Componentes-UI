# 🌐 Componente UI Seletor de Mapa Base (`<ui-seletor-mapa-base>`)

> **Web Component W3C Nativo** para alternância flutuante e discreta de mapas base (satélite, terreno, ruas, CAD) em aplicações GIS/CAD (ex: ConecteMapas, GerenciGeo, Rifa da Sorte).

---

## 🚀 Características Principais

- **Zero Dependências Externas**: Criado puramente com Web Standards W3C (Custom Elements v1, Shadow DOM, CSS Variables).
- **Design Discreto & Glassmorphism**: Botão/pill compacto translúcido com blur, miniatura do mapa ativo e chevron.
- **Totalmente Desacoplado**: Não precisa estar amarrado ou abaixo do painel de camadas; pode flutuar diretamente no mapa ou ser inserido em barras de ferramentas e headers.
- **Posicionamento Automático**: Suporta atributo `posicao="bottom-right" | "bottom-left" | "top-right" | "top-left" | "inline"`.
- **Modo Compacto**: Atributo `compacto` exibe apenas o ícone circular com tooltip, ideal para telas cheias e alta densidade.
- **Acessibilidade Completa**: Suporte a teclado (setas, Enter, Escape) e fechamento automático ao clicar fora (*click outside*).

---

## 📦 Como Usar

### 1. No HTML (Flutuando no Mapa)

```html
<ui-seletor-mapa-base 
  id="meu-seletor" 
  posicao="bottom-right" 
  mapa-base-ativo="satelite">
</ui-seletor-mapa-base>
```

### 2. Capturando Mudanças de Mapa Base

```ts
const seletor = document.querySelector('ui-seletor-mapa-base');

seletor.addEventListener('ui-mapa-base-alterado', (e) => {
  const { mapaBaseId, item } = e.detail;
  console.log('Novo mapa base selecionado:', mapaBaseId, item);
  mapEngine.setBaseLayer(mapaBaseId);
});
```

### 3. Métodos Públicos

```ts
// Abrir/fechar programaaticamente
seletor.abrir();
seletor.fechar();
seletor.alternar();

// Selecionar mapa
seletor.selecionar('osm');

// Customizar catálogo de mapas
seletor.definirMapasBase([
  { id: 'osm', nome: 'OpenStreetMap' },
  { id: 'satelite', nome: 'Esri Satélite' }
]);
```
