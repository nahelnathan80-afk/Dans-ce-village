import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../lib/fonts';
import {CostEvent, Timeline} from '../lib/timeline';

export type PopAnchor = (e: CostEvent, index: number) => [number, number];

/** « −1 € » rouge qui pop avec rebond à chaque mot payant. */
export const CostPops: React.FC<{tl: Timeline; anchor: PopAnchor}> = ({tl, anchor}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const life = 34;
	return (
		<>
			{tl.costs.map((e, i) => {
				const at = Math.round(e.t * fps);
				const f = frame - at;
				if (f < 0 || f > life) return null;
				const [x, y] = anchor(e, i);
				const s = spring({frame: f, fps, config: {damping: 8, stiffness: 320, mass: 0.6}});
				const rise = interpolate(f, [0, life], [0, -120]);
				const op = interpolate(f, [life - 10, life], [1, 0], {extrapolateLeft: 'clamp'});
				const rot = interpolate(s, [0, 1], [-25, (i % 2 ? 1 : -1) * 8]);
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: x,
							top: y + rise,
							transform: `translate(-50%, -50%) scale(${s * 1.0}) rotate(${rot}deg)`,
							fontFamily: FONT,
							fontSize: 120,
							color: '#ff2b2b',
							WebkitTextStroke: '14px #fff',
							paintOrder: 'stroke fill',
							textShadow: '0 8px 0 rgba(120,0,0,0.6), 0 0 30px rgba(255,60,60,0.6)',
							opacity: op,
							whiteSpace: 'nowrap',
						}}
					>
						−1 €
					</div>
				);
			})}
		</>
	);
};
