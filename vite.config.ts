import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
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
      output: {
        assetFileNames: 'ui-kit.[ext]',
      },
    },
  },
});

