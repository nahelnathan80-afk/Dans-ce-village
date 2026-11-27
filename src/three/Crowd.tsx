import React from 'react';
import {Character} from './Character';
import {Emotion} from './faceTexture';
import {villager} from '../episodes/cast';
import {rng} from './textures';
import {blinkAt} from '../lib/anim';

type V3 = [number, number, number];

export type CrowdMode = 'idle' | 'lookUp' | 'run' | 'ignore' | 'happy';

/** Foule de villageois sur la place (positions déterministes). */
export const Crowd: React.FC<{
	frame: number;
	count?: number;
	mode?: CrowdMode;
	/** point regardé (lookUp/idle) */
	lookAt?: V3;
	/** temps de course en secondes (mode run) */
	runT?: number;
	/** point fui (mode run) */
	fleeFrom?: V3;
	seed?: number;
	exclude?: (x: number, z: number) => boolean;
}> = ({frame, count = 18, mode = 'idle', lookAt = [0, 2, 0], runT = 0, fleeFrom = [-9, 0, -2], seed = 3, exclude}) => {
	const R = rng(seed);
	const people: {p: V3; i: number; ph: number}[] = [];
	let guard = 0;
	while (people.length < count && guard++ < 500) {
		const a = R() * Math.PI * 2;
		const d = 3.2 + R() * 6.5;
		const x = Math.cos(a) * d;
		const z = Math.sin(a) * d - 2;
		if (exclude?.(x, z)) continue;
		if (people.some((q) => Math.hypot(q.p[0] - x, q.p[2] - z) < 1.5)) continue;
		people.push({p: [x, 0, z], i: people.length + seed * 7, ph: R() * 6});
	}
	return (
		<group>
			{people.map(({p, i, ph}) => {
				let [x, , z] = p;
				let rotY: number;
				let emotion: Emotion = 'neutral';
				let walk: number | undefined;
				let headNod = 0;
				let pose = {};
				if (mode === 'run') {
					const dx = x - fleeFrom[0];
					const dz = z - fleeFrom[2];
					const len = Math.hypot(dx, dz) || 1;
					const dist = runT * (5 + (i % 3));
					x += (dx / len) * dist;
					z += (dz / len) * dist;
					rotY = Math.atan2(dx, dz);
					emotion = 'panic';
					walk = frame * 0.65 + ph;
					pose = {armL: [Math.sin(frame * 0.65 + ph) * 0.8, 2.6], armR: [-Math.sin(frame * 0.65 + ph) * 0.8, 2.6]};
				} else if (mode === 'ignore') {
					// discutent entre eux, dos tourné
					rotY = ph + Math.sin(frame / 20 + ph) * 0.3;
					emotion = i % 2 ? 'happy' : 'neutral';
					pose = {armR: [-0.6 + Math.sin(frame / 6 + ph) * 0.4, -0.3]};
				} else {
					rotY = Math.atan2(lookAt[0] - x, lookAt[2] - z);
					if (mode === 'lookUp') {
						headNod = -0.55;
						emotion = i % 3 === 0 ? 'surprised' : 'panic';
					} else if (mode === 'happy') {
						emotion = 'happy';
						headNod = -0.3;
						pose = {armL: [0, 2.4 + Math.sin(frame / 4 + ph) * 0.3], armR: [0, 2.4 + Math.cos(frame / 4 + ph) * 0.3]};
					}
				}
				return (
					<Character
						key={i}
						look={villager(i)}
						position={[x, 0, z]}
						rotation={[0, rotY, 0]}
						emotion={emotion}
						walk={walk}
						walkAmp={1.3}
						blink={blinkAt(frame, i)}
						bob={mode === 'idle' ? Math.sin(frame / 12 + ph) * 0.03 : 0}
						pose={{headNod, ...pose}}
					/>
				);
			})}
		</group>
	);
};
