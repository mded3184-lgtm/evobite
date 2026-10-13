/**
 * Renders every store image (CrazyGames, itch.io, GameDistribution) from marketing/cover.html.
 *
 *   npm run dev   (in another terminal, port 5173)
 *   node marketing/render-covers.mjs <outDir>
 *
 * Needs Playwright (`npm i -D playwright` or any install it can resolve).
 */
import { chromium } from 'playwright';
import { join } from 'node:path';

const out = process.argv[2] ?? 'marketing/store';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium',
  args: ['--no-sandbox'],
});
for (const [layout, w, h, name] of [
  ['landscape', 1920, 1080, 'cover-landscape-1920x1080'],
  ['portrait', 800, 1200, 'cover-portrait-800x1200'],
  ['square', 800, 800, 'cover-square-800x800'],
  ['itch', 630, 500, 'itch-cover-630x500'],
  ['landscape', 1280, 720, 'gd-1280x720'],
  ['banner', 1280, 550, 'gd-1280x550'],
  ['icon', 512, 512, 'gd-512x512'],
  ['icon43', 512, 384, 'gd-512x384'],
  ['tiny', 200, 120, 'gd-200x120'],
]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  await page.goto(`http://localhost:5173/marketing/cover.html?layout=${layout}`);
  await page.waitForSelector('body[data-ready="1"]');
  await page.screenshot({ path: join(out, `${name}.png`) });
  await page.close();
}
await browser.close();
