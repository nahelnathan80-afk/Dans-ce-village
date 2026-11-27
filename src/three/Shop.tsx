/** Magasin de jouets, coffret « Ultra Premium », camping de file d'attente. */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {M} from './Character';
import {Chalet} from './Village';
import {rng, stripesTexture, textTexture, woodTexture} from './textures';
import {FONT} from '../lib/fonts';

type V3 = [number, number, number];

/** Emplacement du magasin (remplace la mairie quand `toyShop` est activé sur le village). */
export const SHOP = {pos: [9.5, 0, -3] as V3, door: [6.1, 0, -3] as V3};

const Box: React.FC<{s: V3; p?: V3; r?: V3; c: string; e?: string; ei?: number; map?: THREE.Texture}> = ({s, p, r, c, e, ei = 1, map}) => {
	const m = useMemo(
		() => (e || map ? new THREE.MeshStandardMaterial({color: c, roughness: 0.7, ...(e ? {emissive: e, emissiveIntensity: ei} : {}), ...(map ? {map} : {})}) : M(c)),
		[c, e, ei, map],
	);
	return (
		<mesh position={p} rotation={r} material={m} castShadow receiveShadow>
			<boxGeometry args={s} />
		</mesh>
	);
};

// ——— Textures dessinées ———
const cache = new Map<string, THREE.CanvasTexture>();
const draw = (key: string, w: number, h: number, fn: (g: CanvasRenderingContext2D) => void) => {
	const hit = cache.get(key);
	if (hit) return hit;
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	fn(c.getContext('2d')!);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	t.anisotropy = 4;
	cache.set(key, t);
	return t;
};

/** Le fennec mauve « Lunafenn » (créature originale) dessiné en 2D. */
const drawFennec = (g: CanvasRenderingContext2D, cx: number, cy: number, s: number) => {
	g.save();
	g.translate(cx, cy);
	g.scale(s, s);
	// oreilles
	g.fillStyle = '#b58cff';
	g.strokeStyle = '#3a1d6e';
	g.lineWidth = 6;
	for (const sd of [-1, 1]) {
		g.beginPath();
		g.moveTo(sd * 30, -40);
		g.lineTo(sd * 95, -150);
		g.lineTo(sd * 80, -20);
		g.closePath();
		g.fill();
		g.stroke();
		g.fillStyle = '#ffd6f5';
		g.beginPath();
		g.moveTo(sd * 42, -45);
		g.lineTo(sd * 86, -125);
		g.lineTo(sd * 74, -35);
		g.closePath();
		g.fill();
		g.fillStyle = '#b58cff';
	}
	// tête
	g.beginPath();
	g.ellipse(0, 0, 80, 66, 0, 0, Math.PI * 2);
	g.fill();
	g.stroke();
	// museau
	g.fillStyle = '#f3e6ff';
	g.beginPath();
	g.ellipse(0, 28, 38, 26, 0, 0, Math.PI * 2);
	g.fill();
	g.fillStyle = '#3a1d6e';
	g.beginPath();
	g.ellipse(0, 16, 9, 6, 0, 0, Math.PI * 2);
	g.fill();
	// yeux
	for (const sd of [-1, 1]) {
		g.fillStyle = '#1b1035';
		g.beginPath();
		g.ellipse(sd * 32, -6, 13, 17, 0, 0, Math.PI * 2);
		g.fill();
		g.fillStyle = '#fff';
		g.beginPath();
		g.arc(sd * 32 - 4, -12, 5, 0, Math.PI * 2);
		g.fill();
	}
	// pierre de lune
	g.fillStyle = '#7ff3ff';
	g.strokeStyle = '#fff';
	g.lineWidth = 4;
	g.beginPath();
	g.moveTo(0, -58);
	g.lineTo(12, -42);
	g.lineTo(0, -28);
	g.lineTo(-12, -42);
	g.closePath();
	g.fill();
	g.stroke();
	g.restore();
};

const stars = (g: CanvasRenderingContext2D, w: number, h: number, seed: number, color = 'rgba(255,240,180,0.9)') => {
	const R = rng(seed);
	g.fillStyle = color;
	for (let i = 0; i < 40; i++) {
		const x = R() * w;
		const y = R() * h;
		const r = 1 + R() * 4;
		g.beginPath();
		g.arc(x, y, r, 0, Math.PI * 2);
		g.fill();
	}
};

export const cardTexture = () =>
	draw('card', 512, 716, (g) => {
		const W = 512;
		const H = 716;
		const gr = g.createLinearGradient(0, 0, W, H);
		gr.addColorStop(0, '#ffe680');
		gr.addColorStop(0.5, '#e0a91a');
		gr.addColorStop(1, '#fff2b0');
		g.fillStyle = gr;
		g.beginPath();
		g.roundRect(0, 0, W, H, 34);
		g.fill();
		const inner = g.createLinearGradient(0, 40, 0, 440);
		inner.addColorStop(0, '#2a1458');
		inner.addColorStop(1, '#8e5bff');
		g.fillStyle = inner;
		g.beginPath();
		g.roundRect(34, 90, W - 68, 360, 18);
		g.fill();
		stars(g, W, 440, 3);
		drawFennec(g, W / 2, 300, 1.25);
		g.fillStyle = '#3a1d6e';
		g.font = `64px ${FONT}`;
		g.textAlign = 'center';
		g.fillText('LUNAFENN', W / 2, 70);
		g.font = `40px ${FONT}`;
		g.fillText('✦ ÉDITION DORÉE ✦', W / 2, 520);
		g.fillStyle = '#5b3a00';
		g.font = `32px ${FONT}`;
		g.fillText('Bestiole lunaire · 30 ans', W / 2, 580);
		g.fillText('Attaque : Rayon de lune 120', W / 2, 630);
	});

export const coffretTexture = () =>
	draw('coffret', 768, 1024, (g) => {
		const W = 768;
		const H = 1024;
		const gr = g.createLinearGradient(0, 0, 0, H);
		gr.addColorStop(0, '#2b0f5e');
		gr.addColorStop(1, '#7b3fe4');
		g.fillStyle = gr;
		g.fillRect(0, 0, W, H);
		stars(g, W, H, 9);
		g.strokeStyle = '#f5c518';
		g.lineWidth = 26;
		g.strokeRect(20, 20, W - 40, H - 40);
		g.textAlign = 'center';
		g.fillStyle = '#ffe680';
		g.font = `72px ${FONT}`;
		g.fillText('BESTIOLES', W / 2, 140);
		g.fillText('MYSTIQUES', W / 2, 215);
		drawFennec(g, W / 2, 520, 1.6);
		g.fillStyle = '#f5c518';
		g.beginPath();
		g.arc(W - 150, 330, 92, 0, Math.PI * 2);
		g.fill();
		g.fillStyle = '#3a1d6e';
		g.font = `86px ${FONT}`;
		g.fillText('30', W - 150, 340);
		g.font = `36px ${FONT}`;
		g.fillText('ANS', W - 150, 382);
		g.fillStyle = '#ffffff';
		g.font = `64px ${FONT}`;
		g.fillText('ULTRA PREMIUM', W / 2, 860);
		g.font = `40px ${FONT}`;
		g.fillStyle = '#ffe680';
		g.fillText('COFFRET COLLECTOR', W / 2, 930);
	});

/** Coffret 3D, avec halo doré optionnel. */
export const Coffret: React.FC<{position?: V3; rotation?: V3; scale?: number; glow?: number}> = ({position, rotation, scale = 1, glow = 0}) => {
	const tex = coffretTexture();
	const halo = useMemo(
		() => new THREE.MeshBasicMaterial({color: '#ffd84d', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false}),
		[],
	);
	halo.opacity = 0.3 * glow;
	return (
		<group position={position} rotation={rotation} scale={scale}>
			<mesh castShadow>
				<boxGeometry args={[1.2, 1.6, 0.4]} />
				<meshStandardMaterial attach="material-0" color="#5b2bb5" />
				<meshStandardMaterial attach="material-1" color="#5b2bb5" />
				<meshStandardMaterial attach="material-2" color="#f5c518" metalness={0.6} roughness={0.3} />
				<meshStandardMaterial attach="material-3" color="#5b2bb5" />
				<meshStandardMaterial attach="material-4" map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.25 + glow * 0.25} />
				<meshStandardMaterial attach="material-5" color="#5b2bb5" />
			</mesh>
			{glow > 0 && (
				<mesh position={[0, 0, -0.3]} material={halo}>
					<circleGeometry args={[1.5, 32]} />
				</mesh>
			)}
		</group>
	);
};

/** Carte Lunafenn dorée (3D). */
export const Card: React.FC<{position?: V3; rotation?: V3; scale?: number}> = ({position, rotation, scale = 1}) => {
	const tex = cardTexture();
	return (
		<group position={position} rotation={rotation} scale={scale}>
			<mesh>
				<planeGeometry args={[0.64, 0.9]} />
				<meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.45} metalness={0.3} roughness={0.35} side={THREE.DoubleSide} />
			</mesh>
		</group>
	);
};

// ——— Camping de file d'attente ———
export const Tent: React.FC<{position?: V3; rotY?: number; color?: string; open?: boolean}> = ({position, rotY = 0, color = '#ff6b35'}) => (
	<group position={position} rotation={[0, rotY, 0]}>
		{[-1, 1].map((sd) => (
			<group key={sd} position={[0, 0, 0]} rotation={[0, 0, sd * 0.62]}>
				<Box s={[0.08, 2.0, 2.4]} p={[sd * -0.0, 0.95, 0]} c={color} />
			</group>
		))}
		<Box s={[1.9, 0.05, 2.4]} p={[0, 0.03, 0]} c="#3d5a80" />
		<Box s={[0.08, 1.75, 0.08]} p={[0, 0.88, 1.2]} c="#666" />
	</group>
);

/** Sac de couchage (avec la tête du dormeur qui dépasse si `head`). */
export const SleepingBag: React.FC<{position?: V3; rotY?: number; color?: string}> = ({position, rotY = 0, color = '#2a9d8f'}) => (
	<group position={position} rotation={[0, rotY, 0]}>
		<mesh position={[0, 0.28, 0]} rotation={[0, 0, Math.PI / 2]} material={M(color)} castShadow>
			<capsuleGeometry args={[0.32, 1.6, 6, 10]} />
		</mesh>
		<Box s={[0.6, 0.18, 0.6]} p={[-1.15, 0.12, 0]} c="#f1faee" />
	</group>
);

export const Armchair: React.FC<{position?: V3; rotY?: number; color?: string}> = ({position, rotY = 0, color = '#c0392b'}) => (
	<group position={position} rotation={[0, rotY, 0]}>
		<Box s={[1.5, 0.55, 1.3]} p={[0, 0.28, 0]} c={color} />
		<Box s={[1.5, 1.3, 0.3]} p={[0, 0.95, -0.55]} c={color} />
		<Box s={[0.28, 0.5, 1.3]} p={[-0.7, 0.75, 0]} c={color} />
		<Box s={[0.28, 0.5, 1.3]} p={[0.7, 0.75, 0]} c={color} />
		{/* roulettes (pour la ruée…) */}
		{[[-0.6, -0.5], [0.6, -0.5], [-0.6, 0.5], [0.6, 0.5]].map(([x, z], i) => (
			<mesh key={i} position={[x, 0.06, z]} rotation={[0, 0, Math.PI / 2]} material={M('#222')}>
				<cylinderGeometry args={[0.08, 0.08, 0.08, 10]} />
			</mesh>
		))}
		<Box s={[1.2, 0.08, 1.1]} p={[0, 0.58, 0.05]} c="#f4d35e" />
	</group>
);

export const Thermos: React.FC<{position?: V3}> = ({position}) => (
	<group position={position}>
		<mesh position={[0, 0.25, 0]} material={M('#2b6cb0')} castShadow>
			<cylinderGeometry args={[0.09, 0.09, 0.5, 12]} />
		</mesh>
		<mesh position={[0, 0.54, 0]} material={M('#cbd5e0')}>
			<cylinderGeometry args={[0.1, 0.1, 0.1, 12]} />
		</mesh>
	</group>
);

export const SoupBowl: React.FC<{position?: V3}> = ({position}) => (
	<group position={position}>
		<mesh material={M('#f8f1e5')} castShadow>
			<cylinderGeometry args={[0.18, 0.11, 0.14, 14]} />
		</mesh>
		<mesh position={[0, 0.066, 0]} material={M('#e76f51')}>
			<cylinderGeometry args={[0.16, 0.16, 0.01, 14]} />
		</mesh>
	</group>
);

export const Suitcase: React.FC<{position?: V3; rotY?: number; color?: string}> = ({position, rotY = 0, color = '#264653'}) => (
	<group position={position} rotation={[0, rotY, 0]}>
		<Box s={[0.7, 0.9, 0.35]} p={[0, 0.55, 0]} c={color} />
		<Box s={[0.3, 0.06, 0.08]} p={[0, 1.04, 0]} c="#111" />
		{[-0.25, 0.25].map((x) => (
			<mesh key={x} position={[x, 0.07, 0]} material={M('#111')}>
				<sphereGeometry args={[0.07, 8, 6]} />
			</mesh>
		))}
	</group>
);

/** Magasin de jouets (extérieur), orienté vers la place. */
export const ToyShop: React.FC<{night?: boolean; doorOpen?: number}> = ({night = false, doorOpen = 0}) => {
	const sign = textTexture('LE COFFRE À JOUETS', {bg: '#1d3557', fg: '#ffd166', w: 1024, h: 170, radius: 30});
	const poster = textTexture('', {bg: '#7b3fe4', fg: '#fff', w: 512, h: 512, lines: ['COFFRET', 'ULTRA PREMIUM', '30 ANS', 'JEUDI 9H']});
	const awning = stripesTexture('#ffd166', '#1d3557', 10);
	return (
		<Chalet w={8} d={6} h={6} wall="#8ecae6" stone="#f1faee" roof="#1d3557" shutter="#ffd166" position={SHOP.pos} rotY={-Math.PI / 2} balcony={false} night={night}>
			{/* vitrines */}
			{[-2.4, 2.4].map((x) => (
				<group key={x} position={[x, 1.4, 3.05]}>
					<Box s={[2.3, 1.9, 0.12]} c="#ffffff" />
					<Box s={[2.0, 1.6, 0.14]} c="#bfe6ff" e="#fff1c1" ei={night ? 0.9 : 0.25} />
				</group>
			))}
			{/* jouets en vitrine */}
			{[-3.1, -2.4, -1.7].map((x, i) => (
				<Box key={x} s={[0.45, 0.6, 0.3]} p={[x, 0.95, 3.22]} c={['#e63946', '#2a9d8f', '#ffbe0b'][i]} />
			))}
			<mesh position={[2.4, 1.45, 3.2]}>
				<planeGeometry args={[1.4, 1.4]} />
				<meshStandardMaterial map={poster} emissive="#ffffff" emissiveMap={poster} emissiveIntensity={night ? 0.7 : 0.2} />
			</mesh>
			{/* porte */}
			<group position={[-0.0, 0, 3.05]}>
				<group position={[-0.6, 0, 0]} rotation={[0, -doorOpen * 1.4, 0]}>
					<Box s={[1.2, 2.2, 0.12]} p={[0.6, 1.1, 0]} c="#e63946" />
				</group>
				<Box s={[1.25, 2.25, 0.05]} p={[0, 1.12, -0.05]} c="#2a1a10" />
			</group>
			<mesh position={[0, 2.75, 3.55]} rotation={[0.45, 0, 0]} castShadow>
				<boxGeometry args={[7.6, 0.08, 1.3]} />
				<meshStandardMaterial map={awning} />
			</mesh>
			<mesh position={[0, 3.6, 3.1]}>
				<planeGeometry args={[6.4, 1.06]} />
				<meshStandardMaterial map={sign} emissive="#ffffff" emissiveMap={sign} emissiveIntensity={night ? 0.6 : 0.1} />
			</mesh>
		</Chalet>
	);
};

/** Intérieur de la boutique : étagères de jouets, comptoir, coffret sur socle. */
export const ShopInterior: React.FC<{coffret?: boolean; children?: React.ReactNode}> = ({coffret = true, children}) => {
	const wall = woodTexture('#ffe8c2', [3, 2]);
	const R = rng(4);
	const boxes = Array.from({length: 36}).map(() => [R(), R(), R()]);
	const cols = ['#e63946', '#2a9d8f', '#ffbe0b', '#8338ec', '#3a86ff', '#fb5607', '#06d6a0'];
	return (
		<group>
			<mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
				<planeGeometry args={[14, 12]} />
				<meshStandardMaterial color="#c9a27a" />
			</mesh>
			<mesh position={[0, 3, -5]}>
				<planeGeometry args={[14, 6]} />
				<meshStandardMaterial map={wall} />
			</mesh>
			{[-7, 7].map((x) => (
				<mesh key={x} position={[x, 3, 0]} rotation={[0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
					<planeGeometry args={[12, 6]} />
					<meshStandardMaterial map={wall} />
				</mesh>
			))}
			{/* étagères pleines de jouets */}
			{[1.0, 2.1, 3.2].map((y, row) => (
				<group key={y}>
					<Box s={[12, 0.12, 0.9]} p={[0, y, -4.5]} c="#7a4420" />
					{boxes.slice(row * 12, row * 12 + 12).map(([a, b, c], i) => (
						<Box key={i} s={[0.6 + a * 0.3, 0.5 + b * 0.4, 0.5]} p={[-5.5 + i * 1.0, y + 0.3 + b * 0.2, -4.5]} c={cols[Math.floor(c * cols.length)]} />
					))}
				</group>
			))}
			{/* comptoir */}
			<Box s={[4.5, 1.2, 1.1]} p={[1.5, 0.6, 0.6]} c="#1d3557" />
			<Box s={[4.7, 0.12, 1.3]} p={[1.5, 1.26, 0.6]} c="#ffd166" />
			{/* panier de croissants */}
			<group position={[0.2, 1.32, 0.6]}>
				<mesh material={M('#a0522d')}>
					<cylinderGeometry args={[0.45, 0.35, 0.3, 14]} />
				</mesh>
				{[[-0.15, 0], [0.15, 0.05], [0, -0.15]].map(([x, z], i) => (
					<mesh key={i} position={[x, 0.22, z]} rotation={[Math.PI / 2, 0, i]} material={M('#e39a3b')}>
						<torusGeometry args={[0.15, 0.07, 6, 10, Math.PI * 1.2]} />
					</mesh>
				))}
			</group>
			{coffret && (
				<group position={[2.6, 1.32, 0.6]}>
					<Box s={[0.9, 0.3, 0.9]} p={[0, 0.15, 0]} c="#f1faee" />
					<Coffret position={[0, 1.12, 0]} scale={0.7} glow={1} />
				</group>
			)}
			<pointLight position={[2.6, 3.6, 1.6]} intensity={10} distance={6} color="#fff1c1" />
			{children}
		</group>
	);
};
