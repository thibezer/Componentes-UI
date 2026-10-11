# Desempenho das camadas de feições

Meta do kit: camadas de **100 mil feições** com edição fluida. Esta página registra o que foi medido e o que mudou na 2.1.0.

## O que mudou

Antes, `adicionarFeicao`, `atualizarFeicao` e `removerFeicao` copiavam a lista inteira, e o renderizador diferenciava a
camada inteira contra a anterior (um `Set`, um `Map`, o índice de oficiais e, com pontos, o agrupamento em clusters
refeitos a cada edição). O custo era proporcional ao tamanho da camada.

Agora toda mudança passa por `aplicarLote` (as operações unitárias são lotes de um item) e o gerenciador manda ao
renderizador **só a diferença** (`mudadas` + `removidas`) junto com os dados:

- o índice espacial, a loja de feições e a contagem de oficiais são atualizados item a item;
- só as feições tocadas são recriadas ou remendadas na tela;
- os clusters de pontos são mantidos **por célula** (`AgrupadorCluster`): um ponto que entra, sai ou se move reavalia só
  as células afetadas;
- a busca por id é O(1) (índice de posições mantido pelo gerenciador), em vez de varrer a lista a cada consulta de
  seleção, popup ou edição;
- o renderizador desiste do caminho incremental e reconcilia a camada toda quando muda o **conjunto**: a regra oficial ×
  prévia (com prévias na camada), a entrada/saída do corte por viewport (300 feições) ou do agrupamento, ou quando a lista
  foi trocada por fora (`definirFeicoes`).

## Números (100 mil feições, uma camada)

Medidos em Node + happy-dom (sem GPU nem layout real; o custo de desenhar no navegador fica por conta do Leaflet e só
envolve as feições na tela). Máquina de desenvolvimento, valores em ms; use como ordem de grandeza.

| Operação | Pontos (zoom 16, com clusters) | Pontos (zoom 17) | Linhas | Polígonos |
|---|---|---|---|---|
| `definirFeicoes` (100 mil) | ~830 | ~480 | ~610 | ~610 |
| `atualizarFeicao` (1) | **0,5** | 0,3 | 0,5 | 0,3 |
| `adicionarFeicao` (1) | 3,9 | 1,1 | 2,6 | 2,2 |
| `removerFeicao` (1) | 3,0 | 1,9 | 2,2 | 2,2 |
| `aplicarLote` 1 000 atualizações | 29 | 14 | 15 | 23 |
| `aplicarLote` 5 000 mistos (1 000 remoções + 2 000 atualizações + 2 000 adições) | 98 | 33 | 39 | 58 |

Antes da mudança, na mesma camada: `atualizarFeicao` de **60 a 250 ms** (linhas ~60–100 ms, pontos ~230 ms) e
`removerFeicao` de **160 a 420 ms**. Uma edição passou de "proporcional à camada" a "milissegundos", com folga em relação
ao quadro de 16 ms (adicionar/remover custam um pouco mais porque copiam a lista de referências).

O que continua proporcional ao tamanho da camada: `definirFeicoes` (troca total), a primeira consulta por id depois de
uma **remoção** (o índice de posições é refeito sob demanda, numa varredura da lista) e a reconciliação completa que roda
quando o conjunto muda (mudança de zoom com clusters, regra de versões).

## Regressão

`tests/feicoes-lote.test.ts`:

- `aplicarLote` de 5 mil mudanças numa camada de 5 mil feições em **menos de 1 s** (medido: dezenas de ms);
- 100 mil feições: uma edição em menos de **40 ms** em média (medido: ~1 ms) — limite folgado para CI lenta;
- renderizador incremental = renderizador completo: sequências aleatórias de lotes comparadas, feição a feição e cluster
  a cluster, com a camada reconstruída do zero (pontos sem cluster, com cluster, com seleção no meio, linhas acima do
  corte por viewport, travessia do limite de 300, oficial × prévia).

## Dicas de uso

- Para sincronizar com um estado externo, prefira **um** `aplicarLote` a muitas chamadas unitárias (uma regravação, um
  evento de camadas, uma reconciliação de seleção/popup).
- Troca total de dados: `definirFeicoes`. Mudança parcial: `aplicarLote`.
- O corte por viewport só vale acima de 300 feições; abaixo disso tudo fica materializado (sem *pop-in*).
