/**
 * Sous-titres façon référence : UN SEUL MOT à la fois (deux s'ils sont très courts, ex. « à la »),
 * gros, au milieu de l'écran, contour noir épais. Mots normaux en blanc, *mots-clés* en jaune.
 * Le mot reste affiché jusqu'au suivant : jamais d'écran sans mot quand la voix parle.
 */
import React, {useMemo} from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../lib/fonts';
import {Timeline} from '../lib/timeline';

type Unit = {text: string; key: boolean; start: number; end: number; show: number; who: string};
const letters = (s: string) => s.replace(/[^\p{L}\p{N}]/gu, '').length;

export const buildUnits = (tl: Timeline): Unit[] => {
	const units: Unit[] = [];
	for (const l of tl.lines) {
		const ws = l.words;
		for (let i = 0; i < ws.length; i++) {
			const w = ws[i];
			let text = w.text;
			let end = w.end;
			let key = w.text.includes('*');
			const nx = ws[i + 1];
			if (nx && letters(w.text) <= 2 && letters(w.text) + letters(nx.text) <= 6 && !/[.,!?…:]\s*»?$/.test(w.text)) {
				text = `${w.text} ${nx.text}`;
				end = nx.end;
				key = key || nx.text.includes('*');
				i++;
			}
			units.push({text: text.replace(/\*/g, '').replace(/[«»]/g, '').trim(), key, start: w.start, end, show: end, who: l.who});
		}
	}
	for (let i = 0; i < units.length; i++) {
		const nx = units[i + 1];
		// affiché jusqu'au mot suivant (respiration comprise), +0,35 s max après le dernier mot d'une phrase
		units[i].show = nx && nx.start - units[i].end < 0.7 ? nx.start : units[i].end + 0.35;
	}
	return units;
};

/**
 * strokes : couleur de contour par personnage (qui parle, sans lire). Narrateur : noir.
 * Paroles chantées (who = "chanson") : ORANGE avec une petite note ♪.
 */
export const WordSubs: React.FC<{tl: Timeline; y?: number; hidden?: (t: number) => boolean; strokes?: Record<string, string>}> = ({tl, y = 1000, hidden, strokes = {}}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const units = useMemo(() => buildUnits(tl), [tl]);
	if (hidden?.(t)) return null;
	const u = units.find((x) => t >= x.start - 0.03 && t < x.show - 0.03);
	if (!u) return null;
	const wf = Math.round((t - u.start) * fps);
	const pop = spring({frame: wf + 1, fps, config: {damping: 9, stiffness: 420, mass: 0.4}});
	const sung = u.who === 'chanson';
	const chars = Math.max(1, u.text.length + (sung ? 2 : 0));
	const base = u.key ? 168 : 150;
	const stroke = strokes[u.who] ?? '#000';
	const color = sung ? '#ff9a1f' : u.key ? '#ffe14d' : '#ffffff';
	const size = Math.min(base, 860 / (chars * 0.6));
	return (
		<div style={{position: 'absolute', top: y - size * 0.6, left: 60, width: 1080 - 60 - 150, display: 'flex', justifyContent: 'center'}}>
			<span
				style={{
					fontFamily: FONT,
					fontSize: size,
					lineHeight: 1.1,
					color,
					WebkitTextStroke: `${Math.round(size * 0.13)}px ${sung ? '#3a1a00' : stroke}`,
					paintOrder: 'stroke fill',
					textShadow: '0 10px 0 rgba(0,0,0,0.9)',
					textTransform: 'uppercase',
					whiteSpace: 'nowrap',
					display: 'inline-block',
					transform: `scale(${0.55 + 0.45 * pop}) rotate(${u.key ? -3 : 0}deg)`,
				}}
			>
				{sung ? `♪ ${u.text}` : u.text}
			</span>
		</div>
	);
};
