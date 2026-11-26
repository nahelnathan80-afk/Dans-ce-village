import script from './script.json';
import timeline from './timeline.json';
import {Timeline, TimelineData} from '../../lib/timeline';
import {CharacterLook} from '../../three/Character';

export const FPS = 30;

type CastEntry = CharacterLook & {name: string; kind?: string; fur?: string; stripes?: string};
export const CAST3 = script.cast as unknown as Record<'noe' | 'lila' | 'odette' | 'maire' | 'marcel' | 'pistache', CastEntry>;

export const ep03 = {
	script,
	tl: new Timeline(timeline as TimelineData, {fps: FPS, payer: script.payer, startBalance: script.startBalance}),
};

const parse = (s: string) => {
	const [h, m, x] = s.split(':').map(Number);
	return h * 3600 + m * 60 + x;
};

/** Compte à rebours (secondes) à l'instant t, d'après les champs clock / clockTo du scénario. null = masqué. */
export const clockAt = (t: number): number | null => {
	const lines = ep03.tl.lines as unknown as {start: number; end: number; clock?: string | null; clockTo?: string}[];
	let cur: (typeof lines)[number] | null = null;
	for (const l of lines) {
		if (l.start - 0.12 <= t) cur = l;
		else break;
	}
	if (!cur) cur = lines[0];
	if (cur.clock === null || cur.clock === undefined) return null;
	const v0 = parse(cur.clock);
	const t0 = cur.start - 0.12;
	if (cur.clockTo) {
		const v1 = parse(cur.clockTo);
		const k = Math.min(1, Math.max(0, (t - t0) / Math.max(0.3, cur.end - t0)));
		return t - t0 > cur.end - t0 ? Math.max(0, v1 - (t - cur.end)) : v0 + (v1 - v0) * k;
	}
	return Math.max(0, v0 - Math.max(0, t - t0));
};
