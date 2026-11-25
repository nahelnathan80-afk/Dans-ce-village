// Rend une image au milieu de chaque plan → out/sheet/*.jpg (vérification rapide des cadrages)
// Usage : node tools/contact-sheet.mjs [scale] [frame1,frame2,...]
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition, openBrowser} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const scale = Number(process.argv[2] ?? 0.4);
const browserExecutable = process.env.REMOTION_BROWSER ??
  '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browser = await openBrowser('chrome', {browserExecutable, chromiumOptions: {gl: 'angle'}});
const composition = await selectComposition({serveUrl, id: 'Ep01', puppeteerInstance: browser});
let frames;
if (process.argv[3]) frames = process.argv[3].split(',').map(Number);
else {
  const tl = JSON.parse(fs.readFileSync('src/episodes/ep01/timeline.json', 'utf8'));
  frames = tl.lines.map((l) => Math.round(((l.start + l.end) / 2) * 30));
}
fs.mkdirSync('out/sheet', {recursive: true});
for (const frame of frames) {
  const t0 = Date.now();
  await renderStill({composition, serveUrl, frame, output: `out/sheet/${String(frame).padStart(4, '0')}.jpg`, imageFormat: 'jpeg', scale, puppeteerInstance: browser, chromiumOptions: {gl: 'angle'}});
  console.log(frame, ((Date.now() - t0) / 1000).toFixed(1) + 's');
}
await browser.close({silent: true});
