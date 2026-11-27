import script from './script.json';
import timeline from './timeline.json';
import {Timeline, TimelineData} from '../../lib/timeline';
import {CharacterLook} from '../../three/Character';

export const FPS = 30;

type CastEntry = CharacterLook & {name: string};
export const CAST4 = script.cast as unknown as Record<'leo' | 'yuki' | 'mere' | 'odette' | 'maire', CastEntry>;

export const ep04 = {
	script,
	tl: new Timeline(timeline as TimelineData, {fps: FPS, payer: script.payer, startBalance: script.startBalance}),
};

const tl = ep04.tl;
const wordStart = (id: string, txt: string) => {
	const w = tl.line(id).words.find((x) => x.text.toLowerCase().includes(txt.toLowerCase()));
	return w ? w.start : tl.line(id).start;
};

/** Le compteur atteint 00:00:00 à la fin de la réplique 12 (plus d'écran noir : moteur v2). */
export const blackAt = () => tl.line('plan12').end;
export const ctaAt = () => tl.line('plan13').start - 0.2;

/**
 * « MUR FERMÉ DANS » : 57 s au début, 10 s sur « Dix », 5 s sur « Cinq »,
 * puis le ralenti étire les dernières secondes jusqu'à 00:00:00 pile sur l'écran noir.
 */
export const clockAt = (t: number): number | null => {
	if (t >= ctaAt()) return null;
	const keys: [number, number][] = [
		[0, 57],
		[wordStart('plan09', 'Dix'), 10],
		[wordStart('plan09', 'Cinq'), 5],
		[blackAt(), 0],
	];
	for (let i = 1; i < keys.length; i++) {
		const [t1, v1] = keys[i];
		const [t0, v0] = keys[i - 1];
		// arrondi au-dessus : 00:00:00 n'apparaît qu'à l'écran noir
		if (t <= t1) return Math.ceil(Math.max(0, v0 + ((v1 - v0) * (t - t0)) / (t1 - t0)));
	}
	return 0;
};

export const isRed = (t: number) => t >= tl.line('plan09').start - 0.15;
