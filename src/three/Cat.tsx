import React from 'react';
import {M} from './Character';

type V3 = [number, number, number];

/** Chat blocky (réutilisable). `pose`: assis, debout ou en boule. */
export const Cat: React.FC<{position?: V3; rotation?: V3; fur?: string; stripes?: string; scale?: number; tail?: number; blink?: boolean; pose?: 'sit' | 'stand' | 'curl'}> = ({
	position, rotation, fur = '#f28c28', stripes = '#c8611a', scale = 1, tail = 0, blink = false, pose = 'sit',
}) => {
	const B: React.FC<{s: V3; p: V3; c: string; r?: V3}> = ({s, p, c, r}) => (
		<mesh position={p} rotation={r} material={M(c)} castShadow>
			<boxGeometry args={s} />
		</mesh>
	);
	const sit = pose === 'sit';
	return (
		<group position={position} rotation={rotation} scale={scale}>
			{/* corps */}
			<B s={[0.5, sit ? 0.55 : 0.42, sit ? 0.55 : 0.95]} p={[0, sit ? 0.36 : 0.42, sit ? -0.05 : 0]} c={fur} />
			{[-0.15, 0.05, 0.25].map((z) => (
				<B key={z} s={[0.52, 0.06, 0.08]} p={[0, sit ? 0.6 : 0.64, sit ? z * 0.6 - 0.05 : z - 0.1]} c={stripes} />
			))}
			{/* pattes */}
			{(sit ? [[-0.14, 0.24], [0.14, 0.24]] : [[-0.15, 0.35], [0.15, 0.35], [-0.15, -0.35], [0.15, -0.35]]).map(([x, z], i) => (
				<B key={i} s={[0.13, 0.22, 0.13]} p={[x, 0.11, z]} c={fur} />
			))}
			{/* tête */}
			<group position={[0, sit ? 0.82 : 0.78, sit ? 0.12 : 0.55]}>
				<B s={[0.46, 0.38, 0.4]} p={[0, 0, 0]} c={fur} />
				{[-1, 1].map((sd) => (
					<mesh key={sd} position={[sd * 0.15, 0.27, 0]} material={M(fur)} castShadow>
						<coneGeometry args={[0.09, 0.2, 4]} />
					</mesh>
				))}
				{[-1, 1].map((sd) => (
					<B key={'e' + sd} s={[0.08, blink ? 0.02 : 0.09, 0.02]} p={[sd * 0.1, 0.04, 0.205]} c="#1b2b1b" />
				))}
				<B s={[0.07, 0.05, 0.02]} p={[0, -0.05, 0.21]} c="#ff8fa3" />
				<B s={[0.18, 0.1, 0.06]} p={[0, -0.11, 0.2]} c="#ffe6cc" />
			</group>
			{/* queue */}
			<group position={[0, 0.3, sit ? -0.32 : -0.5]} rotation={[-0.8 + Math.sin(tail) * 0.2, Math.sin(tail * 0.7) * 0.4, 0]}>
				<B s={[0.1, 0.1, 0.55]} p={[0, 0, -0.27]} c={fur} />
			</group>
		</group>
	);
};
