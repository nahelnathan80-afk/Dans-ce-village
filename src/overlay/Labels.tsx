import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../lib/fonts';

/** Pastille de nom à la première apparition d'un personnage. (x, y) = point d'ancrage en px. */
export const NameTag: React.FC<{name: string; x: number; y: number; color?: string; delay?: number}> = ({name, x, y, color = '#2bb673', delay = 0}) => {
	const f = useCurrentFrame() - delay;
	const {fps} = useVideoConfig();
	if (f < 0) return null;
	const s = spring({frame: f, fps, config: {damping: 9, stiffness: 300}});
	return (
		<div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${s}) rotate(-3deg)`}}>
			<div style={{background: color, color: '#fff', fontFamily: FONT, fontSize: 52, padding: '6px 26px 8px', borderRadius: 999, border: '6px solid #fff',
				boxShadow: '0 8px 0 rgba(0,0,0,0.35)', whiteSpace: 'nowrap', textShadow: '0 3px 0 rgba(0,0,0,0.3)'}}>
				{name}
			</div>
			<div style={{width: 0, height: 0, margin: '-2px auto 0', borderLeft: '16px solid transparent', borderRight: '16px solid transparent', borderTop: '20px solid #fff'}} />
		</div>
	);
};

/** Bulle de dialogue façon BD (la pointe vise `tail` = 'left' | 'right'). */
export const SpeechBubble: React.FC<{text: string; x: number; y: number; tail?: 'left' | 'right'; size?: number; maxWidth?: number}> = ({text, x, y, tail = 'left', size = 58, maxWidth = 620}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const s = spring({frame: f, fps, config: {damping: 10, stiffness: 280}});
	return (
		<div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${s})`, maxWidth}}>
			<div style={{position: 'relative', background: '#fff', border: '7px solid #1b1b1b', borderRadius: 50, padding: '22px 34px', fontFamily: FONT, fontSize: size,
				color: '#1b1b1b', lineHeight: 1.1, textAlign: 'center', boxShadow: '0 10px 0 rgba(0,0,0,0.3)'}}>
				{text}
				<div style={{position: 'absolute', bottom: -38, [tail === 'left' ? 'left' : 'right']: 70, width: 0, height: 0, borderLeft: '22px solid transparent', borderRight: '22px solid transparent', borderTop: '40px solid #1b1b1b'}} />
				<div style={{position: 'absolute', bottom: -26, [tail === 'left' ? 'left' : 'right']: 77, width: 0, height: 0, borderLeft: '15px solid transparent', borderRight: '15px solid transparent', borderTop: '28px solid #fff'}} />
			</div>
		</div>
	);
};
