import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';

/** On regarde « par la fenêtre ronde » : cadre en bois, nuit autour, reflets et gouttes sur la vitre. */
export const RoundWindow: React.FC<{cx?: number; cy?: number; r?: number}> = ({cx = 540, cy = 760, r = 380}) => {
	const f = useCurrentFrame();
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<AbsoluteFill style={{background: `radial-gradient(circle at ${cx}px ${cy}px, rgba(0,0,0,0) ${r}px, #4a2c12 ${r + 2}px, #2e1a0a ${r + 44}px, rgba(6,10,28,0.97) ${r + 48}px)`}} />
			<div style={{position: 'absolute', left: cx - r, top: cy - r, width: r * 2, height: r * 2, borderRadius: '50%', overflow: 'hidden',
				background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.07) 70%, rgba(255,255,255,0) 80%)'}}>
				<div style={{position: 'absolute', left: r - 6, top: 0, width: 12, height: r * 2, background: '#3a2410'}} />
				<div style={{position: 'absolute', top: r - 6, left: 0, height: 12, width: r * 2, background: '#3a2410'}} />
				{Array.from({length: 14}).map((_, i) => {
					const x = (i * 137) % (r * 2);
					const y = ((i * 211 + f * (2 + (i % 3))) % (r * 2.4)) - r * 0.2;
					return <div key={i} style={{position: 'absolute', left: x, top: y, width: 7, height: 12, borderRadius: '50%', background: 'rgba(200,220,255,0.35)'}} />;
				})}
			</div>
		</AbsoluteFill>
	);
};
