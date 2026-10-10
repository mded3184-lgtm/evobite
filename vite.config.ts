import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  // Relative base so the build works both on GitHub Pages and inside the
  // CrazyGames iframe, which serves the bundle from a nested path.
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    assetsInlineLimit: 8192,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
