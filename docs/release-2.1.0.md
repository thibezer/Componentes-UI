# Release 2.1.0: publicação e verificação

Nada foi commitado nem publicado: o código, os testes, o `CHANGELOG.md` (seção **2.1.0 — 2026-10-11**), o `package.json` e o
`package-lock.json` (2.1.0) estão só na árvore de trabalho.

## Conferido antes de entregar

| Passo | Resultado |
|---|---|
| `npx tsc --noEmit` | limpo |
| `npx vitest run` | 63 arquivos, 861 testes verdes |
| `npm run build` (`tsc && vite build && cem analyze`) | ok; `dist/` e `dist/custom-elements.json` regenerados |
| `npm run test:tipos` | ok |
| `dist/components/ui-canvas-cad/ui-canvas-cad.d.ts` (reexportado por `dist/canvas.d.ts`) | traz `inicializarAgora`, `definirEstilosExternos`, `definirMargensHud`, `aplicarLote`, `definirOpcoesPopup`, `aceitarOrigem`, `atualizarFeicao(..., opcoes)` |
| `custom-elements.json` | traz os métodos novos e os atributos `sem-camadas-padrao`, `sem-painel-camadas`, `sem-barra-rapida`, `sem-atalho-snap`, `aceitar-origem` (também em `tipos-elementos`/`tipos-react`/`tipos-vue`) |
| `npm pack` | 292 arquivos: `package.json`, `README.md`, `LICENSE`, `CHANGELOG.md` e `dist/` (288). Sem `privado/`, `coverage/`, `node_modules`, `tests/`, `docs/`, `src/`, `.env`, chaves ou tokens (busca por padrões de segredo no conteúdo extraído também vazia) |

## Publicar (você)

Pelo repositório, na `main`, depois de revisar o diff e commitar:

```bash
git add -A
git commit -m "feat(canvas-cad): 2.1.0 — integração com o app (inicialização síncrona, HUDs, multilinha, lote, oculta, estilos, ferramentas, origem)"
git tag v2.1.0
```

`prepublishOnly` já roda `npm test && npm run build && npm run test:tipos`; `publishConfig.access` é `public`.
É preciso estar logado (`npm login`; hoje `npm whoami` devolve 401 nesta máquina).

```bash
npm publish
git push origin main --follow-tags
```

Antes de publicar de verdade, se quiser ver o que iria: `npm publish --dry-run`.

## Atualizar a dependência no app (ConecteMapas)

```bash
npm install @thibezer/ui-components-kit@2.1.0
```

Depois, no adaptador `CanvasMapEngine`: trocar `host.initCAD()` / `host.initTimeout` por `host.inicializarAgora()`; trocar o
CSS que esconde o painel por `sem-painel-camadas` (e `sem-barra-rapida`, `sem-camadas-padrao`, `sem-atalho-snap`); trocar o
`bottom: 56px !important` por `definirMargensHud({ base: 56 })`; mapear `visible:false` → `oculta: true` e `is_deleted` →
`excluida: true`; usar `aplicarLote` no lugar do limite de 20 mudanças incrementais.

## Checklist de verificação manual no playground

`npm run dev` (ou o servidor "playground" do `.claude/launch.json`) e abrir o card `<ui-canvas-cad>`. No console da página,
`const mesa = document.getElementById('demo-canvas-cad')`.

**Montagem**
- [ ] Criar um elemento novo com `sem-camadas-padrao sem-painel-camadas sem-barra-rapida sem-atalho-snap`, chamar
  `inicializarAgora()`: o mapa existe na hora, não há satélite/camadas de fábrica, nem painel nem barra rápida; apertar **S**
  não muda o snap; chamar `inicializarAgora()` de novo devolve o mesmo mapa.
- [ ] Clicar no mapa sem a camada `sigef`: nenhuma requisição ao INCRA na aba Rede.
- [ ] `definirEstilosExternos('.leaflet-popup-content { color: red }')` muda o popup; `definirEstilosExternos(null)` desfaz.

**Feições, ordem e lote**
- [ ] `definirFeicoes` com ponto, linha, polígono, círculo e texto: aparecem, selecionam por clique, popup abre.
- [ ] `adicionarFeicao` com id existente: a feição troca no mesmo lugar (ordem do `obterFeicoes` mantida).
- [ ] `aplicarLote` com remover + atualizar + adicionar: uma única mudança visual; `atualizarFeicao(..., { substituirPropriedades: true })` apaga o atributo que não foi enviado.
- [ ] Feição com `oculta: true`: não desenha, não seleciona (clique, caixa, laço), não atrai snap; `atualizarFeicao(..., { oculta: false })` a traz de volta; ocultar a feição **em edição** não encerra a edição.

**Multilinha**
- [ ] `LineString` com `partes: [[...], [...]]`: as duas partes desenham; clicar em qualquer uma seleciona; rótulo `extensao`
  mostra a soma; a caixa Window só pega com todas as partes dentro, a Crossing com qualquer uma tocando.
- [ ] `editarVertices` nela: evento `cad-edicao-recusada` com `multiparte` (nada entra em edição); `juntarFeicoes` → `cad-uniao-falhou`.

**Laço e seleção**
- [ ] Ferramenta `selecao-laco`: desenhar o laço seleciona e a ferramenta encerra; o listener de `cad-selecao` vê `ferramentaAtiva === null`.
- [ ] `dividir` com o polígono **selecionado**: a ferramenta encerra antes de `cad-selecao`; sem seleção, continua ativa para o próximo corte.

**Medição**
- [ ] `medir-distancia`: com 2 pontos só "Extensão"; no 3º ponto o HUD passa a mostrar **Área** e **Perímetro**; Enter emite
  `cad-medicao` com `areaM2` e `perimetroM` e nada é criado; desativar a ferramenta dentro de `cad-medicao` deixa tudo desligado.
- [ ] `medir-area` igual a antes.
- [ ] `circulo`: um segundo clique a menos de 2 m do centro é ignorado; a 5 m cria.

**Edição de vértices e HUD em tela pequena**
- [ ] DevTools em modo celular (375 px) ou o mapa dentro de um contêiner estreito: `definirMargensHud({ base: 60, esquerda: 20, direita: 60 })`
  e `editarVertices(...)`: o HUD fica **centralizado na área livre**, acima da base reservada, quebra em linhas e não passa dos limites
  (conferido na 2.1.0 com mapa de 340×520: HUD de 244 px, centrado, 60 px acima da base). O mesmo vale para o HUD de desenho (qualquer ferramenta ativa).
- [ ] `ui-canvas-cad { --cad-hud-base: 56px }` no CSS da página produz o mesmo efeito sem chamar o método.

**Estilo**
- [ ] Texto com `corFundo`, `corBorda`, `opacidadeFundo`, `raioBorda`: selo; sem `corFundo` o `halo` continua.
- [ ] Ponto com `corPreenchimento` + `corContorno: '#fff'` + `espessuraContorno: 2`: círculo com contorno branco, sem confundir com o preenchimento.

**Texto e popup**
- [ ] Ouvir `cad-texto-solicitado`, chamar `e.preventDefault()` e `e.detail.concluir('Marco')`: cria o texto sem o campo inline. Sem `preventDefault`, o campo inline aparece.
- [ ] `definirOpcoesPopup({ copiarParaAreaDeTransferencia: false })`: "Copiar" no popup de um ponto só emite `cad-feicao-acao`; a área de transferência não muda.

**Coordenada (0, 0)**
- [ ] `definirFeicoes('c', [{ id: 'z', geometria: { tipo: 'Point', coordenada: [0, 0] } }])` devolve `recusadas: ['z']`; com `aceitar-origem` entra e desenha.

**Desempenho (opcional)**
- [ ] Camada de 100 mil pontos/linhas (`definirFeicoes` com um laço gerador) e depois `atualizarFeicao` em um id: sem engasgo perceptível (~0,5 ms medido; ver `docs/desempenho-feicoes.md`).
