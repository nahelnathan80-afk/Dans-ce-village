import React, {useMemo} from 'react';
import * as THREE from 'three';
import {M} from './Character';
import {rng, stripesTexture, textTexture} from './textures';

type V3 = [number, number, number];

/** Pancarte tenue à la main (texte sur carton + manche). */
export const Sign: React.FC<{text: string; color?: string; position?: V3; rotation?: V3; scale?: number}> = ({
	text, color = '#fff6d8', position = [0, 0, 0], rotation = [0, 0, 0], scale = 1,
}) => {
	const lines = text.split('\n');
	const tex = textTexture(text, {bg: color, fg: '#c0392b', w: 512, h: 320, border: '#5b2c0f', lines});
	return (
		<group position={position} rotation={rotation} scale={scale}>
			<mesh position={[0, 0.9, 0]} material={M('#8b5a2b')} castShadow>
				<boxGeometry args={[0.1, 1.6, 0.1]} />
			</mesh>
			<mesh position={[0, 1.75, 0.07]} castShadow>
				<boxGeometry args={[1.7, 1.06, 0.06]} />
				<meshStandardMaterial attach="material-0" color="#5b2c0f" />
				<meshStandardMaterial attach="material-1" color="#5b2c0f" />
				<meshStandardMaterial attach="material-2" color="#5b2c0f" />
				<meshStandardMaterial attach="material-3" color="#5b2c0f" />
				<meshStandardMaterial attach="material-4" map={tex} />
				<meshStandardMaterial attach="material-5" color={color} />
			</mesh>
		</group>
	);
};

/** Croissant : tore partiel, bouts effilés. */
export const Croissant: React.FC<{position?: V3; rotation?: V3; scale?: number}> = ({position, rotation, scale = 1}) => {
	const geo = useMemo(() => {
		const g = new THREE.TorusGeometry(0.42, 0.2, 8, 14, Math.PI * 1.25);
		// effiler les extrémités
		const pos = g.attributes.position;
		const v = new THREE.Vector3();
		for (let i = 0; i < pos.count; i++) {
			v.fromBufferAttribute(pos, i);
			const ang = Math.atan2(v.y, v.x);
			const t = Math.min(1, Math.abs(ang - Math.PI * 0.625) / (Math.PI * 0.625));
			const k = 1 - t * t * 0.7;
			const r = Math.hypot(v.x, v.y);
			const cx = (Math.cos(ang) * 0.42);
			const cy = (Math.sin(ang) * 0.42);
			v.set(cx + (v.x - cx) * k, cy + (v.y - cy) * k, v.z * k);
			void r;
			pos.setXYZ(i, v.x, v.y, v.z);
		}
		g.computeVertexNormals();
		g.rotateZ(-Math.PI * 0.125);
		return g;
	}, []);
	return (
		<mesh geometry={geo} position={position} rotation={rotation} scale={scale} material={M('#e39a3b')} castShadow />
	);
};

/** Bouée rayée. */
export const Buoy: React.FC<{position?: V3; rotation?: V3; scale?: number}> = ({position, rotation, scale = 1}) => {
	const tex = stripesTexture('#ff3b3b', '#ffffff', 8);
	return (
		<mesh position={position} rotation={rotation} scale={scale} castShadow>
			<torusGeometry args={[0.55, 0.22, 10, 24]} />
			<meshStandardMaterial map={tex} />
		</mesh>
	);
};

/** Lampe de poche avec faisceau (on = allumée). */
export const Flashlight: React.FC<{on: boolean; position?: V3; rotation?: V3; beamLength?: number}> = ({
	on, position, rotation, beamLength = 6,
}) => {
	const beam = useMemo(
		() => new THREE.MeshBasicMaterial({color: '#fff3a0', transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, fog: false}),
		[],
	);
	return (
		<group position={position} rotation={rotation}>
			<mesh rotation={[Math.PI / 2, 0, 0]} material={M('#333a48')}>
				<cylinderGeometry args={[0.1, 0.1, 0.5, 10]} />
			</mesh>
			<mesh position={[0, 0, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
				<cylinderGeometry args={[0.16, 0.11, 0.14, 12]} />
				<meshStandardMaterial color="#fff6c2" emissive={on ? '#fff1a0' : '#000'} emissiveIntensity={on ? 3 : 0} />
			</mesh>
			{on && (
				<mesh position={[0, 0, 0.35 + beamLength / 2]} rotation={[-Math.PI / 2, 0, 0]} material={beam}>
					<coneGeometry args={[0.9, beamLength, 16, 1, true]} />
				</mesh>
			)}
		</group>
	);
};

/** Sac de farine. */
export const FlourSack: React.FC<{position?: V3; rotation?: V3}> = ({position, rotation}) => {
	const tex = textTexture('FARINE', {bg: '#f3ead7', fg: '#8b5a2b', w: 256, h: 256});
	return (
		<group position={position} rotation={rotation}>
			<mesh castShadow>
				<boxGeometry args={[0.7, 0.9, 0.45]} />
				<meshStandardMaterial attach="material-0" color="#f3ead7" />
				<meshStandardMaterial attach="material-1" color="#f3ead7" />
				<meshStandardMaterial attach="material-2" color="#f3ead7" />
				<meshStandardMaterial attach="material-3" color="#f3ead7" />
				<meshStandardMaterial attach="material-4" map={tex} />
				<meshStandardMaterial attach="material-5" color="#f3ead7" />
			</mesh>
		</group>
	);
};

/** Nuage de vapeur / fumée (bouffées qui grossissent). */
export const Puffs: React.FC<{t: number; count?: number; color?: string; spread?: number; rise?: number; seed?: number; size?: number; opacity?: number}> = ({
	t, count = 8, color = '#ffffff', spread = 1, rise = 2, seed = 1, size = 0.5, opacity = 0.8,
}) => {
	const R = rng(seed);
	const parts = Array.from({length: count}).map(() => [R() - 0.5, R(), R() - 0.5, R()]);
	const mat = useMemo(() => new THREE.MeshStandardMaterial({color, transparent: true, opacity, roughness: 1, depthWrite: false}), [color, opacity]);
	return (
		<group>
			{parts.map(([x, d, z, o], i) => {
				const p = (t + o) % 1;
				const s = size * (0.4 + p * 1.4);
				return (
					<mesh key={i} position={[x * spread * (1 + p), p * rise * (0.6 + d), z * spread * (1 + p)]} scale={s * (1 - p * 0.3)} material={mat}>
						<sphereGeometry args={[1, 10, 8]} />
					</mesh>
				);
			})}
		</group>
	);
};

/** Explosion cartoon : boules orange/jaunes + fumée qui grossissent. */
export const Explosion: React.FC<{t: number}> = ({t}) => {
	if (t <= 0) return null;
	const R = rng(77);
	const balls = Array.from({length: 18}).map(() => [R() - 0.5, R(), R() - 0.5, R()]);
	const k = Math.min(1, t * 2.2);
	return (
		<group>
			{balls.map(([x, y, z, r], i) => {
				const col = i % 3 === 0 ? '#ffe14d' : i % 3 === 1 ? '#ff8a1f' : '#ff3b1f';
				const smoke = t > 0.5 && i % 2 === 0;
				const s = (0.8 + r * 1.6) * k * (1 + t * 0.6);
				return (
					<mesh key={i} position={[x * 7 * k, 1 + y * 6 * k + t * 2, z * 7 * k]} scale={s}>
						<sphereGeometry args={[1, 10, 8]} />
						<meshStandardMaterial color={smoke ? '#8a8a8a' : col} emissive={smoke ? '#000' : col} emissiveIntensity={smoke ? 0 : 1.6 * (1 - t * 0.6)} transparent opacity={Math.max(0, 1 - t * 0.9)} depthWrite={false} />
					</mesh>
				);
			})}
		</group>
	);
};
