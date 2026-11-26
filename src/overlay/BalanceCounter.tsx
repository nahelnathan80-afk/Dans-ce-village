import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../lib/fonts';
import {Timeline} from '../lib/timeline';

/** Pastille « SOLDE : 15 € » en haut, qui rebondit à chaque changement. */
export const BalanceCounter: React.FC<{tl: Timeline; label?: string; top?: number; unit?: string; valueAt?: (t: number) => number; color?: [string, string, string]}> = ({
	tl,
	label = 'SOLDE',
	top = 175,
	unit = '€',
	valueAt,
	color = ['#ff4d4d', '#d40f1f', '#8f0612'],
}) => {
	const val = valueAt ?? ((x: number) => tl.balanceAt(x));
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const bal = Math.round(val(t));

	// dernière modification du solde → rebond
	let lastChange = -999;
	for (let f = frame; f > frame - 30 && f >= 0; f--) {
		if (Math.round(val(f / fps)) !== Math.round(val((f - 1) / fps))) {
			lastChange = f;
			break;
		}
	}
	const since = frame - lastChange;
	const bump = since >= 0 && since < 30 ? spring({frame: since, fps, config: {damping: 7, stiffness: 260, mass: 0.6}}) : 1;
	const scale = since >= 0 && since < 30 ? 1 + 0.28 * (1 - bump) * Math.cos(since / 2) + 0.18 * (1 - bump) : 1;
	const flash = since >= 0 && since < 10 ? interpolate(since, [0, 10], [1, 0]) : 0;
	const danger = unit === '€' && bal <= 5;

	return (
		<div
			style={{
				position: 'absolute',
				top,
				left: 0,
				width: 1080 - 150, // on évite la colonne de droite TikTok
				display: 'flex',
				justifyContent: 'center',
				paddingLeft: 75,
			}}
		>
			<div
				style={{
					transform: `scale(${scale})`,
					background: `linear-gradient(180deg, ${danger ? '#ff2d2d' : color[0]} 0%, ${color[1]} 100%)`,
					borderRadius: 999,
					padding: '18px 46px 20px',
					border: '7px solid #ffffff',
					boxShadow: `0 10px 0 ${color[2]}, 0 14px 30px rgba(0,0,0,0.35), 0 0 ${60 * flash}px rgba(255,230,80,${flash})`,
					fontFamily: FONT,
					fontSize: 74,
					color: '#ffffff',
					letterSpacing: 2,
					textShadow: '0 4px 0 rgba(0,0,0,0.35)',
					display: 'flex',
					alignItems: 'center',
					gap: 18,
					whiteSpace: 'nowrap',
				}}
			>
				<span style={{fontSize: 52, opacity: 0.95}}>{label} :</span>
				<span style={{minWidth: 70, textAlign: 'center', color: flash > 0.3 ? '#fff36b' : '#fff'}}>{bal}</span>
				{unit && <span>{unit}</span>}
			</div>
		</div>
	);
};
