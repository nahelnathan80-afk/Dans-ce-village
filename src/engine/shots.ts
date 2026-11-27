/**
 * Règles du montage (moteur v2) — « l'image suit la voix ».
 *  - un plan = un cadrage ; chaque cadrage déclare ce qu'il montre (`shows`) : personnage en action
 *    ou objet que la voix nomme à ce moment-là ;
 *  - un changement de cadrage toutes les 1,5 à 2,2 s, calé sur un mot : un cadrage trop long est
 *    automatiquement recoupé sur le début d'un mot (« punch-in » : plan plus serré du même décor) ;
 *  - coupes franches, pas de fondu.
 */
import React from 'react';
import {Timeline} from '../lib/timeline';

export type ShotCtx = {f: number; g: number; t: number; d: number; p: number};
export type ShotDef = {
	id: string;
	from: number;
	render: (c: ShotCtx) => React.ReactNode;
	/** ce qu'on voit : personnages / objets (obligatoire, vérifié par check_rythme.py) */
	shows?: string[];
	/** type de mouvement de caméra (informatif) */
	move?: string;
	/** ne jamais recouper ce cadrage automatiquement */
	keep?: boolean;
};
export type BuiltShot = ShotDef & {to: number; variant: number};

export const SHOT_MAX = 2.2; // s — au-delà, on recoupe
export const SHOT_MIN = 1.0;

export const buildShots = (defs: ShotDef[], tl: Timeline, totalFrames: number): BuiltShot[] => {
	const fps = tl.fps;
	const sorted = [...defs].sort((a, b) => a.from - b.from).map((s) => ({...s, from: Math.max(0, Math.round(s.from))}));
	const starts = tl.allWords().map((w) => Math.round(w.start * fps));
	const out: BuiltShot[] = [];
	sorted.forEach((s, i) => {
		const to = i + 1 < sorted.length ? sorted[i + 1].from : totalFrames;
		if (to <= s.from) return;
		let a = s.from;
		let v = 0;
		while (!s.keep && to - a > SHOT_MAX * fps) {
			// coupe sur le début de mot le plus proche de a + 1,8 s, en laissant ≥ 1 s de chaque côté
			const ideal = a + Math.min(1.8 * fps, (to - a) / 2);
			const cands = starts.filter((w) => w >= a + SHOT_MIN * fps && w <= to - SHOT_MIN * fps && w <= a + SHOT_MAX * fps);
			const cut = cands.length ? cands.reduce((b, w) => (Math.abs(w - ideal) < Math.abs(b - ideal) ? w : b)) : Math.round(ideal);
			out.push({...s, id: v ? `${s.id}~${v}` : s.id, from: a, to: cut, variant: v});
			a = cut;
			v++;
		}
		out.push({...s, id: v ? `${s.id}~${v}` : s.id, from: a, to, variant: v});
	});
	return out;
};

/** Recadrage d'un sous-plan recoupé : plan plus serré, centre légèrement décalé (coupe franche). */
export const variantStyle = (v: number): React.CSSProperties =>
	v === 0
		? {}
		: {
				transform: `scale(${v % 2 ? 1.22 : 1.12})`,
				transformOrigin: `${[50, 38, 62, 45][v % 4]}% ${[40, 36, 44, 38][v % 4]}%`,
			};
