import script from './script.json';
import timeline from './timeline.json';
import {Timeline, TimelineData} from '../../lib/timeline';
import {CharacterLook} from '../../three/Character';
import {CounterEvent} from '../../engine/StatPill';
import {GRISOU_HOUSE, HOUSES} from '../../three/Pumpkins';

export const FPS = 30;
type CastEntry = CharacterLook & {name: string};
export const CAST6 = script.cast as unknown as Record<'leon' | 'lou' | 'grisou' | 'maire' | 'rose', CastEntry>;
export const tl = new Timeline(timeline as TimelineData, {fps: FPS, payer: script.payer, startBalance: script.startBalance});
export const ep06 = {script, tl};

/** Contour des sous-titres par personnage (qui parle, sans lire). */
export const STROKES: Record<string, string> = {narrateur: '#000000', leon: '#000000', grisou: '#6a2fb0', maire: '#1f4fd8', lou: '#e0308a', rose: '#22863a'};

export const line = (id: string) => tl.line(id);
/** Début (s) du mot contenant `txt` dans la réplique `id` (n-ième occurrence). */
export const ws = (id: string, txt: string, n = 1): number => {
	const all = tl.line(id).words.filter((w) => w.text.toLowerCase().replace(/\*/g, '').includes(txt.toLowerCase()));
	const w = all[Math.min(all.length - 1, n - 1)];
	return w ? w.start : tl.line(id).start;
};

const burst = (t0: number, t1: number, from: number, to: number, n: number): CounterEvent[] =>
	Array.from({length: n}).map((_, i) => ({t: t0 + ((t1 - t0) * (i + 1)) / (n + 0.5), value: Math.round(from + ((to - from) * (i + 1)) / n), badge: '−1'}));

/** mots forts de la chorale finale : une citrouille (ou plusieurs) se regonfle à chacun */
const STRONG = ['grisou', 'citrouille', 'rapetipeto', 'pardon', 'embrouilles', 'mouille', 'omelette', 'hannetons'];
const rise = (): CounterEvent[] => {
	const ws_ = tl.line('plan16').words.filter((w) => STRONG.some((k) => w.text.toLowerCase().includes(k)));
	return ws_.map((w, i) => {
		const v = i === ws_.length - 1 ? 50 : Math.round(1 + (49 * (i + 1)) / ws_.length);
		return {t: w.start, value: v, badge: 'POUF !'};
	});
};

export const COUNTER: CounterEvent[] = [
	{t: 0, value: 50},
	{t: ws('plan01', 'pourrissent'), value: 49, badge: '−1'},
	{t: ws('plan02', "qu'une"), value: 1, badge: '1 ?!'},
	{t: ws('plan03', 'tout'), value: 50, quiet: true},
	...burst(line('plan08a').start, line('plan08b').end, 50, 32, 6),
	...burst(line('plan08c').start, ws('plan08c', 'pluie') + 0.3, 32, 14, 6),
	...burst(line('plan10').start, line('plan10').end, 14, 6, 3),
	...burst(line('plan13a').start, line('plan13b').end, 6, 1, 2),
	...rise(),
];

export const valueAt = (t: number) => {
	let v = COUNTER[0].value;
	for (const e of COUNTER) if (e.t <= t) v = e.value;
	return v;
};

// ——— état de chaque maison-citrouille, cohérent avec le compteur
// rang 0 = Grisou (ne pourrit jamais) ; les autres meurent dans cet ordre, revivent dans l'ordre inverse
const ORDER = [GRISOU_HOUSE, ...HOUSES.map((_, i) => i).filter((i) => i !== GRISOU_HOUSE).sort((a, b) => ((a * 7) % 16) - ((b * 7) % 16))];
const RANK = new Map(ORDER.map((h, r) => [h, r]));
const aliveCount = (v: number) => Math.max(1, Math.floor((v / 50) * HOUSES.length));
/** health 0..1 (1 = orange vivante), glow (éclat orange quand elle revit), pop (regonflement). */
export const houseAt = (i: number, t: number): {health: number; glow: number; pop: number} => {
	const r = RANK.get(i) ?? 0;
	let alive = true;
	let tChange = -99;
	let revived = false;
	let quiet = false;
	for (const e of COUNTER) {
		if (e.t > t) break;
		const a = r < aliveCount(e.value);
		if (a !== alive) {
			alive = a;
			tChange = e.t;
			revived = a;
			quiet = !!e.quiet;
		}
	}
	const dt = t - tChange;
	if (!alive) return {health: Math.max(0, 1 - dt / 0.7), glow: 0, pop: 1};
	if (revived && !quiet) return {health: 1, glow: Math.max(0, Math.exp(-dt * 2.5)), pop: 1 + 0.28 * Math.exp(-dt * 5) * Math.cos(dt * 22)};
	return {health: 1, glow: 0, pop: 1};
};

export const songSpans = () => tl.lines.filter((l) => (l as {type?: string}).type === 'chanson').map((l) => [l.start, l.end] as [number, number]);
