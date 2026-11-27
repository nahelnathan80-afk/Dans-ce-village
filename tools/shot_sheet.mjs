// Planche de contrôle : 1 ou 2 images par cadrage (d'après out/<ep>/shots.json) → out/<ep>/sheet/
// Usage : COMP=Ep05 node tools/shot_sheet.mjs [scale] [ids séparés par des virgules]
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition, openBrowser} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const scale = Number(process.argv[2] ?? 0.3);
const only = process.argv[3] ? new Set(process.argv[3].split(',')) : null;
const COMP = process.env.COMP ?? 'Ep05';
const ep = COMP.toLowerCase();
const browserExecutable = process.env.REMOTION_BROWSER ?? '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browser = await openBrowser('chrome', {browserExecutable, chromiumOptions: {gl: 'angle'}});
const composition = await selectComposition({serveUrl, id: COMP, puppeteerInstance: browser});
const {shots, fps} = JSON.parse(fs.readFileSync(`out/${ep}/shots.json`, 'utf8'));
const dir = process.env.SHEET_DIR ?? `out/${ep}/sheet`;
fs.mkdirSync(dir, {recursive: true});
for (const s of shots) {
  if (only && !only.has(s.id)) continue;
  const d = s.to - s.from;
  const ts = d > 1.2 ? [0.3, 0.85] : [0.5];
  for (const k of ts) {
    const frame = Math.min(composition.durationInFrames - 1, Math.round((s.from + d * k) * fps));
    await renderStill({composition, serveUrl, frame, output: `${dir}/${String(frame).padStart(4, '0')}_${s.id.replace('~', '-')}.jpg`, imageFormat: 'jpeg', scale, puppeteerInstance: browser, chromiumOptions: {gl: 'angle'}});
  }
  process.stdout.write('.');
}
console.log(' ok');
await browser.close({silent: true});
