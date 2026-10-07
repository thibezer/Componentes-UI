import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    // Módulos privados locais (privado/) têm seus próprios testes (node:test) e não fazem parte da biblioteca
    exclude: ['**/node_modules/**', '**/dist/**', 'privado/**', 'private/**'],
  },
});
