# Empacotando: carregar o editor só ao editar

Para apps que usam o kit num empacotador (Vite/Rollup/webpack) e querem que o editor da prancha seja um **download separado**,
feito só quando o usuário abre o editor.

## O que o pacote entrega (2.24.2)

| Entrypoint | O que traz | Fecho de imports (ESM, sem minificar) |
|---|---|---|
| `@thibezer/ui-components-kit/prancha/nucleo` | Só o L2 puro (planejar, pintar, envelope, ajuste, pré-definições). Sem Custom Element, CSS nem DOM | **187,6 kB** em 5 arquivos; bundle esbuild **165,3 kB** (uma função só: **4,4 kB**) |
| `@thibezer/ui-components-kit` (index) | Todos os componentes (menos prancha e mapa, que são sob demanda) | 845 kB em 21 arquivos |
| `@thibezer/ui-components-kit/prancha` | Prancha + `<ui-editor-prancha>` + o núcleo; reusa do index a paleta, as camadas e as propriedades | 818 kB em 13 arquivos, dos quais **~344 kB só dele** (o que o index não carrega) |

Estrutura de chunks previsível (um arquivo com hash por módulo pesado, **uma cópia cada**, compartilhada entre entrypoints):

- `kit-base-*.js`: tudo de `src/core/` (`ssr-safe`, `listener-bag`, `ui-bus`, `parts`...). É o chunk comum de base.
- `ui-editor-prancha-*.js`: o editor e a prancha (o chunk pesado do editor).
- `ui-camadas-*`, `ui-tabela-propriedades-*`, `ui-paleta-ferramentas-*`, `ui-tabela-*`...: um por componente, **uma cópia cada**.
- `feature_*`, `geometria-px-*`: motor puro compartilhado (núcleo, mapa, canvas).

**Por que antes apareciam 3 variantes de `ui-tabela-propriedades-*` e `ui-paleta-ferramentas-*`:** não era código repetido
entre entrypoints. O `vite build` em modo biblioteca **não apagava** os chunks com hash de builds anteriores, e eles iam para o
pacote publicado (a 2.23.0 saiu com 534 arquivos e 7,6 MB; mudava o hash a cada build). O `prebuild`
(`scripts/limpar-dist.mjs`) agora esvazia o `dist/` antes de cada build (2.24.2: 486 arquivos, 5,6 MB), e `npm run
check:bundle` (no `gate:full`) confere o resto.

## `sideEffects`

O `package.json` declara `sideEffects` como **lista**, não `false`: os componentes se registram ao serem importados
(`import '@thibezer/ui-components-kit/prancha'` sozinho precisa registrar as tags), então os entrypoints, os chunks `ui-*` e os
`.css` constam como "com efeito". **Fora da lista** (logo, eliminável por tree-shaking): `prancha-nucleo`, `motor`, `core`,
`kit-base-*` e os `feature_*`. Importar só `{ caixaDoQuadro }` de `/prancha/nucleo` gera ~4 kB.

## Padrão para o app

```ts
// ponto de entrada (carga inicial): só o que pinta
import { planejar, desenharPlano } from '@thibezer/ui-components-kit/prancha/nucleo';

// ao abrir o editor (download separado, ~344 kB além do que o index já trouxe)
async function abrirEditor() {
  await import('@thibezer/ui-components-kit/prancha'); // registra <ui-editor-prancha>
  const ed = document.createElement('ui-editor-prancha');
  modal.append(ed);
  await ed.pronto;
}
```

## `manualChunks` seguro (Vite/Rollup)

**A forma mais segura é não usar `manualChunks` para o kit.** Com o `import()` dinâmico acima o Rollup já separa sozinho o que só
o editor usa e deixa no chunk inicial o que é comum ao index. O que **quebrou** o carregamento inicial numa tentativa anterior foi
mandar o kit inteiro (`id.includes('ui-components-kit')`) para um chunk `vendor-ui`, ou separar "por nome" achando que o chunk
`prancha-*` era só da prancha (era o comum). Se ainda quiser um chunk de vendor para o kit, **exclua o que só o editor usa**:

```ts
// vite.config.ts do app
build: {
  rollupOptions: {
    output: {
      manualChunks(id) {
        if (!id.includes('node_modules/@thibezer/ui-components-kit/')) return undefined;
        const arquivo = id.split('/dist/').pop() ?? '';
        // só do editor (não está no fecho do index): fica a cargo do Rollup e vira download separado via import()
        if (/^(ui-editor-prancha|prancha|prancha-nucleo|feature_desenho|feature_caixa|feature_historico|geometria-px)[-.]/.test(arquivo)) return undefined;
        return 'vendor-ui'; // o restante do kit (index + kit-base-*) no chunk inicial
      }
    }
  }
}
```

Confira o resultado com `rollup-plugin-visualizer` (ou `vite build --debug`): o chunk do editor não deve ser importado
estaticamente pelo chunk inicial. Se `feature_caixa`/`feature_historico` também forem usados no caminho inicial (por exemplo,
por `canvas`/`mapa`), remova-os da lista: o Rollup os deixa no chunk inicial sozinho.

## Conferindo o pacote

- `npm run check:bundle` (depois do build): `sideEffects` cobre todo arquivo que registra tag; o núcleo não alcança nenhum;
  bundle esbuild do núcleo sem `HTMLElement`/Custom Elements/`document`/`window` e dentro do orçamento (182 kB).
- `npm pack --dry-run` lista os arquivos do pacote: não deve haver duas cópias do mesmo chunk com hashes diferentes.
