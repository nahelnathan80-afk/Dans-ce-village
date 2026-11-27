/**
 * Exporte la liste des cadrages d'un épisode (id, début, fin, ce qu'on voit, mouvement)
 * pour le contrôle qualité. Usage : npx tsx tools/export_shots.mts ep05 out/ep05/shots.json
 */
import {writeFileSync, mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const ep = process.argv[2];
const out = process.argv[3] ?? `out/${ep}/shots.json`;
const mod = await import(pathToFileURL(resolve(`src/episodes/${ep}/shots.tsx`)).href);
const data = await import(pathToFileURL(resolve(`src/episodes/${ep}/data.ts`)).href);
const epData = data[ep] ?? Object.values(data).find((v: any) => v && v.tl);
const fps = epData.tl.fps;
const total = epData.durationInFrames ?? epData.tl.durationInFrames;
const shots = mod.shotsInOrder();
const rows = shots.map((s: any, i: number) => {
	const to = i + 1 < shots.length ? shots[i + 1].from : total;
	return {id: s.id, from: s.from / fps, to: to / fps, shows: s.shows ?? null, move: s.move ?? null};
});
mkdirSync(dirname(out), {recursive: true});
writeFileSync(out, JSON.stringify({fps, duration: total / fps, shots: rows}, null, 1));
console.log(`✔ ${rows.length} cadrages → ${out}`);
