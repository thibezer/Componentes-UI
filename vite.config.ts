import { defineConfig } from 'vite';

export default defineConfig({
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
