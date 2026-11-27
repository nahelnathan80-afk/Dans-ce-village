import React, {useMemo} from 'react';
import * as THREE from 'three';
import {M} from './Character';
import {Puffs} from './Props';
import {textTexture, woodTexture} from './textures';

type V3 = [number, number, number];

const Box: React.FC<{s: V3; p?: V3; r?: V3; c: string; e?: string; ei?: number}> = ({s, p, r, c, e, ei = 1}) => {
	const m = useMemo(() => (e ? new THREE.MeshStandardMaterial({color: c, emissive: e, emissiveIntensity: ei}) : M(c)), [c, e, ei]);
	return (
		<mesh position={p} rotation={r} material={m} castShadow receiveShadow>
			<boxGeometry args={s} />
		</mesh>
	);
};

const checker = () => {
	const c = document.createElement('canvas');
	c.width = c.height = 128;
	const g = c.getContext('2d')!;
	for (let y = 0; y < 2; y++)
		for (let x = 0; x < 2; x++) {
			g.fillStyle = (x + y) % 2 ? '#f4ead8' : '#c9a27a';
			g.fillRect(x * 64, y * 64, 64, 64);
		}
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.repeat.set(8, 8);
	return t;
};

/** Cadran de pression : vert → jaune → rouge. `value` 0..1. */
export const Gauge: React.FC<{value: number; position?: V3; scale?: number}> = ({value, position, scale = 1}) => {
	const face = useMemo(() => {
		const c = document.createElement('canvas');
		c.width = c.height = 512;
		const g = c.getContext('2d')!;
		g.fillStyle = '#fbf6ea';
		g.beginPath();
		g.arc(256, 256, 250, 0, Math.PI * 2);
		g.fill();
		const zones: [number, number, string][] = [
			[0, 0.55, '#2ecc71'], [0.55, 0.78, '#f1c40f'], [0.78, 1, '#e74c3c'],
		];
		for (const [a, b, col] of zones) {
			g.strokeStyle = col;
			g.lineWidth = 60;
			g.beginPath();
			g.arc(256, 256, 180, Math.PI * (0.75 + a * 1.5), Math.PI * (0.75 + b * 1.5));
			g.stroke();
		}
		g.fillStyle = '#222';
		g.font = 'bold 60px sans-serif';
		g.textAlign = 'center';
		g.fillText('PRESSION', 256, 400);
		g.strokeStyle = '#222';
		g.lineWidth = 16;
		g.beginPath();
		g.arc(256, 256, 248, 0, Math.PI * 2);
		g.stroke();
		const t = new THREE.CanvasTexture(c);
		t.colorSpace = THREE.SRGBColorSpace;
		return t;
	}, []);
	const ang = -(Math.PI * (0.75 + value * 1.5)) + Math.PI / 2;
	return (
		<group position={position} scale={scale}>
			<mesh rotation={[Math.PI / 2, 0, 0]} material={M('#b08d57')}>
				<cylinderGeometry args={[0.56, 0.56, 0.12, 32]} />
			</mesh>
			<mesh position={[0, 0, 0.07]}>
				<circleGeometry args={[0.5, 32]} />
				<meshBasicMaterial map={face} toneMapped={false} />
			</mesh>
			<group position={[0, 0, 0.09]} rotation={[0, 0, ang - Math.PI / 2]}>
				<Box s={[0.4, 0.04, 0.02]} p={[0.18, 0, 0]} c="#d4141f" />
			</group>
			<mesh position={[0, 0, 0.1]} material={M('#222')}>
				<sphereGeometry args={[0.04, 8, 6]} />
			</mesh>
		</group>
	);
};

/** Intérieur de la boulangerie : four, comptoir, étagères à pain. */
export const BakeryInterior: React.FC<{
	ovenShake?: number;
	gauge?: number;
	steam?: number; // temps pour l'animation de vapeur (−1 = pas de vapeur)
	glow?: number;
	children?: React.ReactNode;
}> = ({ovenShake = 0, gauge = 0.3, steam = -1, glow = 1, children}) => {
	const floor = useMemo(checker, []);
	const wall = woodTexture('#f3d9b1', [3, 2]);
	const sign = textTexture('PAIN CHAUD', {bg: '#5b2c0f', fg: '#ffd98a', w: 512, h: 128, radius: 20});
	const sx = ovenShake ? Math.sin(ovenShake * 13) * 0.06 : 0;
	const sr = ovenShake ? Math.sin(ovenShake * 17) * 0.02 : 0;
	return (
		<group>
			<mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
				<planeGeometry args={[14, 12]} />
				<meshStandardMaterial map={floor} />
			</mesh>
			{/* murs */}
			<mesh position={[0, 3, -5]} receiveShadow>
				<planeGeometry args={[14, 6]} />
				<meshStandardMaterial map={wall} />
			</mesh>
			<mesh position={[-7, 3, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
				<planeGeometry args={[12, 6]} />
				<meshStandardMaterial map={wall} />
			</mesh>
			<mesh position={[7, 3, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
				<planeGeometry args={[12, 6]} />
				<meshStandardMaterial map={wall} />
			</mesh>
			<mesh position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]}>
				<planeGeometry args={[14, 12]} />
				<meshStandardMaterial color="#e8cfa6" />
			</mesh>
			{/* enseigne intérieure */}
			<mesh position={[-3.6, 4.6, -4.95]}>
				<planeGeometry args={[3, 0.75]} />
				<meshStandardMaterial map={sign} />
			</mesh>
			{/* four */}
			<group position={[1.6 + sx, 0, -3.7]} rotation={[0, 0, sr]}>
				<Box s={[4, 3, 2.2]} p={[0, 1.5, 0]} c="#b5532f" />
				<Box s={[4.2, 0.3, 2.4]} p={[0, 3.1, 0]} c="#8c3d22" />
				{/* briques */}
				{Array.from({length: 6}).map((_, i) => (
					<Box key={i} s={[4.02, 0.05, 2.22]} p={[0, 0.45 + i * 0.45, 0]} c="#93422a" />
				))}
				{/* bouche du four */}
				<Box s={[2.0, 1.2, 0.1]} p={[0, 1.4, 1.11]} c="#2a120a" />
				<Box s={[1.8, 1.0, 0.1]} p={[0, 1.4, 1.14]} c="#ff8a1f" e="#ff6a00" ei={1.2 * glow} />
				<Box s={[2.3, 0.18, 0.4]} p={[0, 0.72, 1.2]} c="#555" />
				{/* tuyau */}
				<mesh position={[1.2, 4.6, -0.3]} material={M('#666b73')}>
					<cylinderGeometry args={[0.32, 0.32, 3, 12]} />
				</mesh>
				<Gauge value={gauge} position={[-1.35, 2.55, 1.15]} scale={0.8} />
				{steam >= 0 && (
					<group position={[1.2, 3.4, 0.6]}>
						<Puffs t={steam} count={7} spread={0.8} rise={2.5} size={0.45} />
					</group>
				)}
				{steam >= 0 && (
					<group position={[0, 2.2, 1.3]}>
						<Puffs t={steam * 1.3 + 0.3} count={6} spread={1.2} rise={1.5} size={0.35} seed={4} />
					</group>
				)}
			</group>
			{/* comptoir */}
			<group position={[-1, 0, 1.8]}>
				<Box s={[6, 1.2, 1.1]} p={[0, 0.6, 0]} c="#8b4a22" />
				<Box s={[6.2, 0.12, 1.3]} p={[0, 1.26, 0]} c="#f3ead7" />
				{[-2.3, -1.5, -0.7].map((x, i) => (
					<mesh key={i} position={[x, 1.42, 0]} rotation={[0, 0.3, Math.PI / 2]} material={M('#d08a3a')} castShadow>
						<capsuleGeometry args={[0.1, 0.9, 4, 8]} />
					</mesh>
				))}
				<mesh position={[1.6, 1.45, 0]} material={M('#e0a040')} castShadow>
					<sphereGeometry args={[0.35, 12, 8]} />
				</mesh>
				{/* pâte à pétrir */}
				<mesh position={[0.4, 1.4, 0.1]} scale={[1, 0.5, 0.8]} material={M('#fff3dc')} castShadow>
					<sphereGeometry args={[0.35, 12, 8]} />
				</mesh>
			</group>
			{/* étagères à pain */}
			<group position={[-6.6, 0, -1.5]} rotation={[0, Math.PI / 2, 0]}>
				{[1.3, 2.3, 3.3].map((y, i) => (
					<group key={i}>
						<Box s={[5, 0.12, 0.8]} p={[0, y, 0]} c="#7a4420" />
						{Array.from({length: 6}).map((_, k) => (
							<mesh key={k} position={[-2 + k * 0.8, y + 0.2, 0]} rotation={[0, 0, Math.PI / 2 + (k % 2) * 0.2]} material={M(k % 2 ? '#d08a3a' : '#c47a2c')} castShadow>
								<capsuleGeometry args={[0.13, 0.5, 4, 8]} />
							</mesh>
						))}
					</group>
				))}
			</group>
			<pointLight position={[1.6, 1.6, -2]} color="#ff8a3a" intensity={6 * glow} distance={8} />
			{children}
		</group>
	);
};
