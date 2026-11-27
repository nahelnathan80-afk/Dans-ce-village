/**
 * Carte-question de fin, affichée PENDANT la dernière phrase (pas d'écran noir, pas d'attente).
 * Placée en haut : le sous-titre reste lisible au milieu.
 */
import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../lib/fonts';

const W = 1080 - 150;

export const QuestionCard: React.FC<{lines: string[]; red?: number; hint: string}> = ({lines, red = 1, hint}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const s = spring({frame: f, fps, config: {damping: 10, stiffness: 240}});
	const s2 = spring({frame: f - 12, fps, config: {damping: 9, stiffness: 260}});
	const bounce = Math.abs(Math.sin(f / 5)) * 22;
	return (
		<>
			<div style={{position: 'absolute', top: 330, left: 30, width: W - 10, display: 'flex', justifyContent: 'center'}}>
				<div style={{transform: `scale(${s}) rotate(-2deg)`, background: '#fff', border: '9px solid #1b1b1b', borderRadius: 40, padding: '22px 34px', boxShadow: '0 14px 0 #1b1b1b', textAlign: 'center'}}>
					{lines.map((q, i) => (
						<div key={i} style={{fontFamily: FONT, fontSize: i === red ? 84 : 64, lineHeight: 1.05, color: i === red ? '#ff2b2b' : '#1b1b1b'}}>{q}</div>
					))}
				</div>
			</div>
			<div style={{position: 'absolute', top: 1270, left: 30, width: W - 10, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${Math.max(0, s2)})`}}>
				<div style={{fontFamily: FONT, fontSize: 64, color: '#ffe14d', WebkitTextStroke: '12px #000', paintOrder: 'stroke fill', textShadow: '0 6px 0 rgba(0,0,0,0.85)'}}>{hint}</div>
				<svg width={110} height={140} viewBox="0 0 160 200" style={{marginTop: 6 + bounce}}>
					<path d="M55 10 H105 V110 H145 L80 190 L15 110 H55 Z" fill="#ffe14d" stroke="#1b1b1b" strokeWidth={12} strokeLinejoin="round" />
				</svg>
			</div>
		</>
	);
};
