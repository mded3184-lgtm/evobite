/**
 * Builds one upload-ready zip per portal into release/:
 *   evobite-crazygames.zip        CrazyGames SDK v3
 *   evobite-gamedistribution.zip  GameDistribution SDK (needs GD_GAME_ID)
 *   evobite-itch.zip              no SDK, no ads (itch.io and any static host)
 *
 *   GD_GAME_ID=your-gd-id npm run release
 *
 * Needs the `zip` command line tool.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'release');
mkdirSync(out, { recursive: true });

const targets = [
  { mode: 'crazygames', zip: 'evobite-crazygames.zip' },
  { mode: 'gamedistribution', zip: 'evobite-gamedistribution.zip' },
  { mode: 'web', zip: 'evobite-itch.zip' },
];

if (!process.env.GD_GAME_ID) {
  console.warn(
    'GD_GAME_ID is not set: the GameDistribution build will run without ads.\n' +
      'Create the game on developer.gamedistribution.com, then rerun with GD_GAME_ID=<id>.',
  );
}

for (const { mode, zip } of targets) {
  const dir = resolve(root, `dist-${mode}`);
  rmSync(dir, { recursive: true, force: true });
  execFileSync('npx', ['vite', 'build', '--mode', mode, '--outDir', dir, '--emptyOutDir'], {
    cwd: root,
    stdio: 'inherit',
  });
  const target = resolve(out, zip);
  if (existsSync(target)) rmSync(target);
  // Zip the folder's contents, so index.html sits at the root of the archive.
  execFileSync('zip', ['-qr', target, '.'], { cwd: dir, stdio: 'inherit' });
  console.log(`wrote release/${zip}`);
}
