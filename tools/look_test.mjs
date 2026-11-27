// Rend les 4 images de test avant/après en 1080×1920 et mesure le temps par image.
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition, openBrowser} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browser = await openBrowser('chrome', {browserExecutable, chromiumOptions: {gl: 'angle'}});
fs.mkdirSync('out/ep06/look', {recursive: true});
const only = process.argv[2] ? process.argv[2].split(',') : ['place', 'grisou', 'pluie', 'chorale'];
const modes = process.argv[3] ? process.argv[3].split(',') : ['avant', 'apres'];
for (const sc of only) for (const m of modes) {
  const id = `Look-${sc}-${m}`;
  const composition = await selectComposition({serveUrl, id, puppeteerInstance: browser});
  const times = [];
  for (const frame of [0, 1, 2]) {
    const t0 = Date.now();
    await renderStill({composition, serveUrl, frame, output: `out/ep06/look/${id}.jpg`, imageFormat: 'jpeg', jpegQuality: 90, puppeteerInstance: browser, chromiumOptions: {gl: 'angle'}});
    times.push((Date.now() - t0) / 1000);
  }
  console.log(id, 'temps/image (s):', times.map((t) => t.toFixed(2)).join(' '));
}
await browser.close({silent: true});
