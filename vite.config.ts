import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import { fileURLToPath, URL } from 'node:url';

type Platform = 'crazygames' | 'gamedistribution' | 'web';

const CRAZYGAMES_SDK = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';

/**
 * Only the CrazyGames build carries the CrazyGames SDK tag. It goes first in <head> with
 * `defer`, so it runs before the (also deferred) game module but never blocks the first
 * paint. GameDistribution's SDK is injected at runtime by its adapter, as GD documents.
 */
function platformHtml(platform: Platform): Plugin {
  return {
    name: 'evobite-platform-html',
    transformIndexHtml() {
      if (platform !== 'crazygames') return [];
      return [
        { tag: 'script', attrs: { defer: true, src: CRAZYGAMES_SDK }, injectTo: 'head-prepend' },
      ];
    },
  };
}

export default defineConfig(({ mode }) => {
  const platform: Platform = mode === 'crazygames' || mode === 'gamedistribution' ? mode : 'web';
  const gdGameId = process.env.GD_GAME_ID ?? '';
  return {
    // Relative base so the build works on GitHub Pages and inside portal iframes, which
    // serve the bundle from nested paths.
    base: './',
    define: {
      __PLATFORM__: JSON.stringify(platform),
      __GD_GAME_ID__: JSON.stringify(gdGameId),
    },
    plugins: [platformHtml(platform)],
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
  };
});
