import script from './script.json';
import timeline from './timeline.json';
import {Timeline, TimelineData} from '../../lib/timeline';
import {CharacterLook} from '../../three/Character';
import {CounterEvent} from '../../engine/StatPill';

export const FPS = 30;

type CastEntry = CharacterLook & {name: string};
export const CAST5 = script.cast as unknown as Record<'noah' | 'papa' | 'maman' | 'lou' | 'maire' | 'passant' | 'homme_tele', CastEntry>;

export const tl = new Timeline(timeline as TimelineData, {fps: FPS, payer: script.payer, startBalance: script.startBalance});
export const ep05 = {script, tl};

/** Instant (s) du début du mot qui contient `txt` dans la réplique `id` (n-ième occurrence). */
export const ws = (id: string, txt: string, n = 1): number => {
	const all = tl.line(id).words.filter((w) => w.text.toLowerCase().replace(/\*/g, '').includes(txt.toLowerCase()));
	const w = all[Math.min(all.length - 1, n - 1)];
	return w ? w.start : tl.line(id).start;
};

/** Rafale de « −1 cm » : la taille descend de `from` à `to` entre t0 et t1, en `n` pops. */
const burst = (t0: number, t1: number, from: number, to: number, n: number): CounterEvent[] =>
	Array.from({length: n}).map((_, i) => ({
		t: t0 + ((t1 - t0) * (i + 1)) / n,
		value: Math.round(from + ((to - from) * (i + 1)) / n),
		badge: '−1 cm',
	}));

/** Compteur « TAILLE DE PAPA » (une étape visible à chaque relance de l'histoire). */
export const COUNTER: CounterEvent[] = [
	{t: 0, value: 182},
	{t: ws('plan02', 'vingt'), value: 20, badge: '20 cm ?!'},
	{t: ws('plan03', 'tout'), value: 182, quiet: true},
	{t: ws('plan07', 'moins'), value: 181, badge: '−1 cm'},
	{t: ws('plan07', 'deux'), value: 180, badge: '−1 cm'},
	...burst(ws('plan08', 'petite'), ws('plan08', 'dépassé'), 180, 140, 5),
	...burst(ws('plan08', 'costume'), ws('plan08', 'traînait'), 140, 90, 5),
	...burst(ws('plan10', 'resté'), ws('plan10', 'banc'), 90, 60, 4),
	...burst(ws('plan12', 'soir'), ws('plan12', 'mentait'), 60, 30, 4),
	...burst(ws('plan12', 'rapetissait'), ws('plan12', 'nous'), 30, 20, 3),
	{t: ws('plan16', 'pouf'), value: 182, roll: 0.6, badge: '+162 cm'},
];

export const sizeAt = (t: number): number => {
	let v = COUNTER[0].value;
	for (const e of COUNTER) if (e.t <= t) v = e.value;
	return v;
};

export const endAt = () => tl.duration; // dernier mot + 0,8 s
