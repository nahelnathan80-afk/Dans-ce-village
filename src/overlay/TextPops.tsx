import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../lib/fonts';

export type TextPop = {at: number; text: string; x: number; y: number; color?: string; size?: number};

/** Petits textes qui pop avec rebond (« +1 », « +50 € »…). `at` en frames. */
export const TextPops: React.FC<{pops: TextPop[]; life?: number}> = ({pops, life = 34}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	return (
		<>
			{pops.map((p, i) => {
				const f = frame - p.at;
				if (f < 0 || f > life) return null;
				const s = spring({frame: f, fps, config: {damping: 8, stiffness: 320, mass: 0.6}});
				const rise = interpolate(f, [0, life], [0, -110]);
				const op = interpolate(f, [life - 10, life], [1, 0], {extrapolateLeft: 'clamp'});
				return (
					<div key={i} style={{position: 'absolute', left: p.x, top: p.y + rise, transform: `translate(-50%, -50%) scale(${s}) rotate(${(i % 2 ? 1 : -1) * 7}deg)`,
						fontFamily: FONT, fontSize: p.size ?? 110, color: p.color ?? '#ffe14d', WebkitTextStroke: '13px #000', paintOrder: 'stroke fill',
						textShadow: '0 8px 0 rgba(0,0,0,0.6)', opacity: op, whiteSpace: 'nowrap'}}>
						{p.text}
					</div>
				);
			})}
		</>
	);
};
