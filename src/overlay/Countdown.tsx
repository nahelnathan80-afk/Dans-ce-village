import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../lib/fonts';

export const fmtClock = (sec: number) => {
	const s = Math.max(0, Math.floor(sec));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	return [h, m, s % 60].map((v) => String(v).padStart(2, '0')).join(':');
};

/**
 * Pastille « MINUIT DANS 15:00:00 » (même style que le compteur de l'ép. 02).
 * Passe au rouge et pulse sous `redBelow` secondes. `valueAt(t)` renvoie des secondes ou null (masqué).
 */
export const CountdownPill: React.FC<{label: string; valueAt: (t: number) => number | null; redBelow?: number; top?: number; red?: (t: number) => boolean}> = ({label, valueAt, redBelow = 300, top = 175, red: redAt}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const v = valueAt(frame / fps);
	if (v === null) return null;
	const red = redAt ? redAt(frame / fps) : v < redBelow;
	// petit rebond quand la valeur saute (changement de scène)
	let jump = -999;
	for (let f = frame; f > frame - 20 && f > 0; f--) {
		const a = valueAt(f / fps);
		const b = valueAt((f - 1) / fps);
		if (a !== null && b !== null && Math.abs(a - b) > 5) {
			jump = f;
			break;
		}
	}
	const since = frame - jump;
	const bump = since >= 0 && since < 20 ? 1 + 0.25 * (1 - spring({frame: since, fps, config: {damping: 8, stiffness: 260}})) : 1;
	const pulse = red ? 1 + 0.07 * Math.max(0, Math.sin((frame / fps) * Math.PI * 2 * 1.3)) : 1;
	const glow = red ? 0.5 + 0.5 * Math.sin((frame / fps) * Math.PI * 2 * 1.3) : 0;
	const c = red ? ['#ff3b3b', '#c40d1d', '#6e0610'] : ['#ffb703', '#fb8500', '#9a4a00'];
	const flash = since >= 0 && since < 10 ? interpolate(since, [0, 10], [1, 0]) : 0;
	return (
		<div style={{position: 'absolute', top, left: 0, width: 1080 - 150, display: 'flex', justifyContent: 'center', paddingLeft: 75}}>
			<div
				style={{
					transform: `scale(${bump * pulse})`,
					background: `linear-gradient(180deg, ${c[0]} 0%, ${c[1]} 100%)`,
					borderRadius: 999,
					padding: '16px 40px 18px',
					border: '7px solid #ffffff',
					boxShadow: `0 10px 0 ${c[2]}, 0 14px 30px rgba(0,0,0,0.35), 0 0 ${70 * glow}px rgba(255,40,40,${glow * 0.9}), 0 0 ${60 * flash}px rgba(255,230,80,${flash})`,
					fontFamily: FONT,
					color: '#ffffff',
					textShadow: '0 4px 0 rgba(0,0,0,0.35)',
					display: 'flex',
					alignItems: 'center',
					gap: 16,
					whiteSpace: 'nowrap',
				}}
			>
				<span style={{fontSize: 46}}>{label}</span>
				<span style={{fontSize: 72, fontVariantNumeric: 'tabular-nums', letterSpacing: 2}}>{fmtClock(v)}</span>
			</div>
		</div>
	);
};
