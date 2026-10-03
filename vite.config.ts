import { defineConfig, type Plugin } from 'vite';
import dts from 'vite-plugin-dts';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CSS_FINAL = 'ui-kit.css';

/**
 * Garante que o CSS distribuído seja 100% autocontido: um único `dist/ui-kit.css`
 * sem nenhum `@import` (relativo ou remoto), que quebraria Vite/Rollup/Webpack
 * nas aplicações consumidoras ao resolver caminhos inexistentes no pacote.
 */
function cssAutocontido(): Plugin {
  let dirSaida = 'dist';
  return {
    name: 'ui-kit:css-autocontido',
    apply: 'build',
    configResolved(config) {
      dirSaida = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const arquivosCss = readdirSync(dirSaida, { recursive: true })
        .map(String)
        .filter((arquivo) => arquivo.endsWith('.css'));

      if (arquivosCss.length !== 1 || arquivosCss[0] !== CSS_FINAL) {
        throw new Error(
          `[css-autocontido] Esperado apenas "${CSS_FINAL}" em ${dirSaida}, encontrado: ${arquivosCss.join(', ') || 'nenhum'}`
        );
      }

      const conteudo = readFileSync(resolve(dirSaida, CSS_FINAL), 'utf8');
      const imports = conteudo.match(/@import\s+[^;]+;/g);
      if (imports) {
        throw new Error(`[css-autocontido] "${CSS_FINAL}" contém @import não resolvido: ${imports.join(' ')}`);
      }
    },
  };
}

export default defineConfig({
  plugins: [
    dts({
      entryRoot: 'src',
      include: ['src', 'vite-env.d.ts'],
      exclude: ['**/*.test.ts', 'tests/**', 'pagina_testes.ts'],
    }),
    cssAutocontido(),
  ],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    // Um único CSS com todos os tokens globais inline (os estilos dos componentes já vão no Shadow DOM via ?inline)
    cssCodeSplit: false,
    lib: {
      entry: {
        'index': './src/index.ts',
        'register': './src/register.ts',
        'core': './src/core/index.ts',
        'forms': './src/forms.ts',
        'feedback': './src/feedback.ts',
        'data': './src/data.ts',
        'tools': './src/tools.ts',
        'mapa': './src/mapa.ts',
        'canvas': './src/canvas.ts',
        'tabela': './src/tabela.ts',
        'botao': './src/botao.ts',
        'campo-texto': './src/campo-texto.ts',
        'modal': './src/modal.ts',
        'card': './src/card.ts',
        'camadas': './src/camadas.ts',
        'seletor-mapa-base': './src/seletor-mapa-base.ts',
      },
      name: 'UIComponentsKit',
      formats: ['es', 'cjs'],
      // ESM em `.js` (package "type": "module") e CommonJS em `.cjs`, casando com o export map
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['leaflet'],
      output: {
        globals: {
          leaflet: 'L',
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return CSS_FINAL;
          return assetInfo.name || '[name].[ext]';
        },
      },
    },
  },
});
