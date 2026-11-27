/**
 * Pastille compteur du haut (« TAILLE DE PAPA : 182 cm »).
 * Chaque changement est VISIBLE : saut + pop + flash de couleur + badge « −1 cm » qui jaillit
 * (le petit son est ajouté par counterSfx). Rouge qui pulse sous `redBelow`, vert quand ça remonte.
 */
import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../lib/fonts';

export type CounterEvent = {t: number; value: number; roll?: number; badge?: string | null; quiet?: boolean};

const valueAt = (ev: CounterEvent[], t: number) => {
	let v = ev[0]?.value ?? 0;
	for (let i = 0; i < ev.length; i++) {
		const e = ev[i];
		if (e.t > t) break;
		if (e.roll && t < e.t + e.roll) {
			const k = (t - e.t) / e.roll;
			return Math.round(v + (e.value - v) * (1 - Math.pow(1 - k, 3)));
		}
		v = e.value;
	}
	return v;
};

export const StatPill: React.FC<{
	label: string;
	unit?: string;
	events: CounterEvent[];
	redBelow?: number;
	visible?: (t: number) => boolean;
	top?: number;
}> = ({label, unit = '', events, redBelow = -Infinity, visible, top = 170}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	if (visible && !visible(t)) return null;
	const v = valueAt(events, t);
	// dernier changement
	let last: CounterEvent | null = null;
	let prevV = events[0]?.value ?? 0;
	for (let i = 1; i < events.length; i++) {
		if (events[i].t <= t) {
			last = events[i];
			prevV = events[i - 1].value;
		}
	}
	const since = last ? (t - last.t) * fps : 999;
	const up = last ? last.value > prevV : false;
	const bump = since < 24 ? 1 + (up ? 0.45 : 0.28) * (1 - spring({frame: since, fps, config: {damping: 7, stiffness: 320}})) : 1;
	const shakeX = since < 10 && !up ? Math.sin(since * 2.2) * 10 * (1 - since / 10) : 0;
	const green = last && up && !last.quiet && since < 3.0 * fps + (last.roll ?? 0) * fps;
	const red = !green && v < redBelow;
	const pulse = red ? 1 + 0.08 * Math.max(0, Math.sin(t * Math.PI * 2 * 1.6)) : 1;
	const glow = red ? 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 1.6) : 0;
	const c = green ? ['#3ee07a', '#13a64a', '#0b5e2a'] : red ? ['#ff3b3b', '#c40d1d', '#6e0610'] : ['#3f8cff', '#1f5fd6', '#0f347a'];
	const flash = since < 8 ? interpolate(since, [0, 8], [1, 0]) : 0;
	const flashCol = up ? '80,255,140' : '255,60,60';
	return (
		<>
			<div style={{position: 'absolute', top, left: 0, width: 1080 - 150, display: 'flex', justifyContent: 'center', paddingLeft: 75}}>
				<div
					style={{
						transform: `translateX(${shakeX}px) scale(${bump * pulse})`,
						background: `linear-gradient(180deg, ${c[0]} 0%, ${c[1]} 100%)`,
						borderRadius: 999,
						padding: '14px 38px 16px',
						border: '7px solid #ffffff',
						boxShadow: `0 10px 0 ${c[2]}, 0 14px 30px rgba(0,0,0,0.35), 0 0 ${70 * glow}px rgba(255,40,40,${glow * 0.9}), 0 0 ${80 * flash}px rgba(${flashCol},${flash})`,
						fontFamily: FONT,
						color: '#ffffff',
						textShadow: '0 4px 0 rgba(0,0,0,0.35)',
						display: 'flex',
						alignItems: 'baseline',
						gap: 14,
						whiteSpace: 'nowrap',
					}}
				>
					<span style={{fontSize: 44}}>{label}</span>
					<span style={{fontSize: 78, fontVariantNumeric: 'tabular-nums'}}>{v}</span>
					{unit && <span style={{fontSize: 50}}>{unit}</span>}
				</div>
			</div>
			{last && since < 26 && last.badge !== null && !last.quiet && (
				<div
					style={{
						position: 'absolute',
						top: top + 150 + (up ? -1 : 1) * since * 1.5,
						left: 0,
						width: 1080 - 150,
						display: 'flex',
						justifyContent: 'center',
						paddingLeft: 300,
						opacity: since < 18 ? 1 : 1 - (since - 18) / 8,
						transform: `scale(${spring({frame: since, fps, config: {damping: 8, stiffness: 400}})}) rotate(${up ? -6 : 6}deg)`,
					}}
				>
					<span style={{whiteSpace: 'nowrap', fontFamily: FONT, fontSize: up ? 96 : 84, color: up ? '#3ee07a' : '#ff3b3b', WebkitTextStroke: '12px #fff', paintOrder: 'stroke fill', textShadow: '0 6px 0 rgba(0,0,0,0.5)'}}>
						{last.badge ?? `${last.value > prevV ? '+' : '−'}${Math.abs(last.value - prevV)} ${unit}`}
					</span>
				</div>
			)}
		</>
	);
};

/** Petit son à chaque changement du compteur. */
export const counterSfx = (events: CounterEvent[], fps: number) =>
	events.slice(1).map((e, i) => {
		const up = e.value > events[i].value;
		return {at: Math.round(e.t * fps), name: e.quiet ? 'whoosh' : up ? 'ding' : 'pop', vol: up ? 0.7 : 0.55};
	});
