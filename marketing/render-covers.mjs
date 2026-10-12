/**
 * Renders the three CrazyGames cover images from marketing/cover.html.
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
for (const [layout, w, h] of [
  ['landscape', 1920, 1080],
  ['portrait', 800, 1200],
  ['square', 800, 800],
]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  await page.goto(`http://localhost:5173/marketing/cover.html?layout=${layout}`);
  await page.waitForSelector('body[data-ready="1"]');
  await page.screenshot({ path: join(out, `cover-${layout}-${w}x${h}.png`) });
  await page.close();
}
await browser.close();
