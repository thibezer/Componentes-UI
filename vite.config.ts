import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      entryRoot: 'src',
      include: ['src', 'vite-env.d.ts'],
      exclude: ['**/*.test.ts', 'tests/**', 'pagina_testes.ts'],
    }),
  ],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    lib: {
      entry: {
        'ui-kit': './src/index.ts',
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
      },
      name: 'UIComponentsKit',
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format}.js`,
    },
    rollupOptions: {
      external: ['leaflet'],
      output: {
        globals: {
          leaflet: 'L',
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'ui-kit.css';
          return assetInfo.name || '[name].[ext]';
        },
      },
    },
  },
});
