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
      entry: './src/index.ts',
      name: 'UIComponentsKit',
      fileName: (format) => `ui-kit.${format}.js`,
    },
    rollupOptions: {
      external: ['leaflet'],
      output: {
        globals: {
          leaflet: 'L',
        },
        assetFileNames: 'ui-kit.[ext]',
      },
    },
  },
});
