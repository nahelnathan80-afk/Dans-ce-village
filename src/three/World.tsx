/** Éléments réutilisables : drapeaux, pommier, pomme, mur avec porte, avions en papier, grande table, chambre. */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {M, Character, CharacterLook} from './Character';
import {Chair} from './Town';
import {rng, stripesTexture, woodTexture} from './textures';
import {FONT} from '../lib/fonts';

type V3 = [number, number, number];

const Box: React.FC<{s: V3; p?: V3; r?: V3; c: string}> = ({s, p, r, c}) => (
	<mesh position={p} rotation={r} material={M(c)} castShadow receiveShadow>
		<boxGeometry args={s} />
	</mesh>
);

// ——— Drapeaux (dessinés, simplifiés) ———
export type FlagCode = 'fr' | 'us' | 'cn' | 'ru' | 'br' | 'jp' | 'gb' | 'de';
const flagCache = new Map<string, THREE.CanvasTexture>();
const star = (g: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
	g.beginPath();
	for (let i = 0; i < 10; i++) {
		const a = -Math.PI / 2 + (i * Math.PI) / 5;
		const rr = i % 2 ? r * 0.42 : r;
		g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
	}
	g.closePath();
	g.fill();
};
export const flagTexture = (code: FlagCode) => {
	const hit = flagCache.get(code);
	if (hit) return hit;
	const W = 300;
	const H = 200;
	const c = document.createElement('canvas');
	c.width = W;
	c.height = H;
	const g = c.getContext('2d')!;
	const v3 = (a: string, b: string, d: string) => [a, b, d].forEach((col, i) => ((g.fillStyle = col), g.fillRect((i * W) / 3, 0, W / 3 + 1, H)));
	const h3 = (a: string, b: string, d: string) => [a, b, d].forEach((col, i) => ((g.fillStyle = col), g.fillRect(0, (i * H) / 3, W, H / 3 + 1)));
	switch (code) {
		case 'fr': v3('#1f4fd8', '#ffffff', '#e6262f'); break;
		case 'ru': h3('#ffffff', '#1f4fd8', '#e6262f'); break;
		case 'de': h3('#1b1b1b', '#e6262f', '#ffcc00'); break;
		case 'jp':
			g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
			g.fillStyle = '#d4112a'; g.beginPath(); g.arc(W / 2, H / 2, H * 0.3, 0, Math.PI * 2); g.fill();
			break;
		case 'cn':
			g.fillStyle = '#e6262f'; g.fillRect(0, 0, W, H);
			g.fillStyle = '#ffde00'; star(g, 50, 50, 30);
			[[100, 22], [118, 44], [118, 74], [100, 96]].forEach(([x, y]) => star(g, x, y, 10));
			break;
		case 'br':
			g.fillStyle = '#16a34a'; g.fillRect(0, 0, W, H);
			g.fillStyle = '#ffdf00'; g.beginPath(); g.moveTo(W / 2, 18); g.lineTo(W - 22, H / 2); g.lineTo(W / 2, H - 18); g.lineTo(22, H / 2); g.closePath(); g.fill();
			g.fillStyle = '#1e3a8a'; g.beginPath(); g.arc(W / 2, H / 2, 46, 0, Math.PI * 2); g.fill();
			break;
		case 'us':
			for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#c8102e'; g.fillRect(0, (i * H) / 13, W, H / 13 + 1); }
			g.fillStyle = '#1f3a8a'; g.fillRect(0, 0, W * 0.42, H * 0.54);
			g.fillStyle = '#ffffff';
			for (let y = 0; y < 5; y++) for (let x = 0; x < 6; x++) { g.beginPath(); g.arc(12 + x * 20, 11 + y * 21, 4, 0, Math.PI * 2); g.fill(); }
			break;
		case 'gb':
			g.fillStyle = '#1f3a8a'; g.fillRect(0, 0, W, H);
			g.strokeStyle = '#ffffff'; g.lineWidth = 40;
			g.beginPath(); g.moveTo(0, 0); g.lineTo(W, H); g.moveTo(W, 0); g.lineTo(0, H); g.stroke();
			g.strokeStyle = '#c8102e'; g.lineWidth = 14;
			g.beginPath(); g.moveTo(0, 0); g.lineTo(W, H); g.moveTo(W, 0); g.lineTo(0, H); g.stroke();
			g.fillStyle = '#ffffff'; g.fillRect(W / 2 - 30, 0, 60, H); g.fillRect(0, H / 2 - 30, W, 60);
			g.fillStyle = '#c8102e'; g.fillRect(W / 2 - 18, 0, 36, H); g.fillRect(0, H / 2 - 18, W, 36);
			break;
	}
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	flagCache.set(code, t);
	return t;
};

/** Drapeau sur hampe ; `wave` = phase d'ondulation. */
export const Flag: React.FC<{code: FlagCode; position?: V3; rotation?: V3; scale?: number; wave?: number; pole?: number}> = ({code, position, rotation, scale = 1, wave = 0, pole = 1.6}) => {
	const geo = useMemo(() => new THREE.PlaneGeometry(1.2, 0.8, 8, 1), []);
	const g2 = useMemo(() => {
		const g = geo.clone();
		const pos = g.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			const x = pos.getX(i) + 0.6;
			pos.setZ(i, Math.sin(x * 4 + wave) * 0.08 * x);
		}
		pos.needsUpdate = true;
		g.computeVertexNormals();
		return g;
	}, [geo, wave]);
	return (
		<group position={position} rotation={rotation} scale={scale}>
			<mesh position={[0, pole / 2, 0]} material={M('#c8c8c8')}>
				<cylinderGeometry args={[0.03, 0.03, pole, 6]} />
			</mesh>
			<mesh geometry={g2} position={[0.62, pole - 0.42, 0]} castShadow>
				<meshStandardMaterial map={flagTexture(code)} side={THREE.DoubleSide} />
			</mesh>
		</group>
	);
};

// ——— Pomme et pommier ———
export const Apple: React.FC<{position?: V3; rotation?: V3; scale?: number; glow?: number}> = ({position, rotation, scale = 1, glow = 0}) => (
	<group position={position} rotation={rotation} scale={scale}>
		<mesh castShadow scale={[1, 0.92, 1]}>
			<sphereGeometry args={[0.2, 16, 12]} />
			<meshStandardMaterial color="#d61f2c" roughness={0.35} emissive="#ff2a3a" emissiveIntensity={glow} />
		</mesh>
		<mesh position={[0, 0.2, 0]} material={M('#5b3a20')}>
			<cylinderGeometry args={[0.015, 0.02, 0.1, 6]} />
		</mesh>
		<mesh position={[0.06, 0.23, 0]} rotation={[0, 0, -0.8]} scale={[1, 0.4, 0.6]} material={M('#3fa34d')}>
			<sphereGeometry args={[0.07, 8, 6]} />
		</mesh>
	</group>
);

export const AppleTree: React.FC<{position?: V3; apple?: boolean; sway?: number}> = ({position, apple = true, sway = 0}) => {
	const R = rng(64);
	const blobs = Array.from({length: 9}).map(() => [(R() - 0.5) * 2.6, 3.6 + R() * 1.6, (R() - 0.5) * 2.6, 0.9 + R() * 0.7]);
	return (
		<group position={position} rotation={[0, 0, Math.sin(sway) * 0.02]}>
			<mesh position={[0, 1.6, 0]} material={M('#6b4226')} castShadow>
				<cylinderGeometry args={[0.28, 0.42, 3.2, 8]} />
			</mesh>
			{/* la branche du milieu, celle de la pomme */}
			<group position={[0, 2.9, 0]} rotation={[0, 0, -0.9]}>
				<mesh position={[0, 0.75, 0]} material={M('#6b4226')} castShadow>
					<cylinderGeometry args={[0.07, 0.11, 1.5, 6]} />
				</mesh>
				{apple && <Apple position={[0.05, 1.35, 0.12]} scale={1.3} />}
				{apple && (
					<mesh position={[0.05, 1.5, 0.12]} material={M('#5b3a20')}>
						<cylinderGeometry args={[0.012, 0.012, 0.2, 4]} />
					</mesh>
				)}
			</group>
			{blobs.map(([x, y, z, r], i) => (
				<mesh key={i} position={[x, y, z]} material={M(i % 2 ? '#3fa34d' : '#4cbb5a')} castShadow>
					<icosahedronGeometry args={[r, 0]} />
				</mesh>
			))}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
				<circleGeometry args={[1.8, 20]} />
				<meshStandardMaterial color="#7a5a3a" />
			</mesh>
		</group>
	);
};

// ——— Le mur ———
export const WALL = {x: 3.2, z0: -22, z1: 22, gateZ: 3.5, gateW: 3.4, h: 4.6};

/** Mur nord-sud au milieu de la place. `height` 0..1 (il monte), `close` 0..1 (porte qui se ferme). */
export const Wall: React.FC<{height?: number; close?: number; night?: boolean}> = ({height = 1, close = 1, night = false}) => {
	const tex = useMemo(() => {
		const c = document.createElement('canvas');
		c.width = 256;
		c.height = 256;
		const g = c.getContext('2d')!;
		g.fillStyle = '#9a9286';
		g.fillRect(0, 0, 256, 256);
		const R = rng(12);
		for (let y = 0; y < 8; y++)
			for (let x = 0; x < 4; x++) {
				const off = y % 2 ? 32 : 0;
				g.fillStyle = `hsl(30, 6%, ${50 + R() * 14}%)`;
				g.fillRect(x * 64 + off + 3, y * 32 + 3, 58, 26);
			}
		const t = new THREE.CanvasTexture(c);
		t.colorSpace = THREE.SRGBColorSpace;
		t.wrapS = t.wrapT = THREE.RepeatWrapping;
		t.repeat.set(4, 1.5);
		return t;
	}, []);
	const mat = useMemo(() => new THREE.MeshStandardMaterial({map: tex, color: night ? '#8a90b0' : '#ffffff', roughness: 1}), [tex, night]);
	const H = WALL.h * height;
	const g0 = WALL.gateZ - WALL.gateW / 2;
	const g1 = WALL.gateZ + WALL.gateW / 2;
	const segs: [number, number][] = [[WALL.z0, g0 - 0.3], [g1 + 0.3, WALL.z1]];
	const leaf = (WALL.gateW / 2) * close;
	return (
		<group>
			{segs.map(([a, b], i) => (
				<mesh key={i} position={[WALL.x, H / 2, (a + b) / 2]} material={mat} castShadow receiveShadow>
					<boxGeometry args={[0.8, Math.max(0.01, H), b - a]} />
				</mesh>
			))}
			{/* piliers + linteau de la porte */}
			{[g0 - 0.15, g1 + 0.15].map((z) => (
				<Box key={z} s={[1.0, Math.max(0.01, H + 0.5), 0.5]} p={[WALL.x, (H + 0.5) / 2, z]} c="#7d756a" />
			))}
			{height > 0.95 && <Box s={[1.0, 0.5, WALL.gateW + 1]} p={[WALL.x, H + 0.25, WALL.gateZ]} c="#7d756a" />}
			{/* lanternes allumées sur les piliers (lisibilité de nuit) */}
			{night &&
				height > 0.95 &&
				[g0 - 0.15, g1 + 0.15].map((z) =>
					[-1, 1].map((sd) => (
						<group key={`${z}${sd}`} position={[WALL.x + sd * 0.62, H - 0.6, z]}>
							<mesh>
								<boxGeometry args={[0.28, 0.4, 0.28]} />
								<meshStandardMaterial color="#ffe3a0" emissive="#ffc35a" emissiveIntensity={2.2} />
							</mesh>
							<pointLight intensity={9} distance={11} color="#ffcf7a" />
						</group>
					)),
				)}
			{/* battants coulissants (bois cerclé de fer) */}
			{height > 0.95 &&
				[-1, 1].map((sd) => (
					<group key={sd} position={[WALL.x, 0, (sd < 0 ? g0 : g1) - sd * (leaf / 2)]}>
						<Box s={[0.3, H - 0.1, Math.max(0.02, leaf)]} p={[0, (H - 0.1) / 2, 0]} c="#6b3d1f" />
						{[0.6, H - 0.8].map((y) => (
							<Box key={y} s={[0.34, 0.14, Math.max(0.02, leaf)]} p={[0, y, 0]} c="#3a3a3a" />
						))}
					</group>
				))}
		</group>
	);
};

// ——— Avions en papier et petits mots ———
export const PaperPlane: React.FC<{position?: V3; rotation?: V3; scale?: number}> = ({position, rotation, scale = 1}) => {
	const geo = useMemo(() => {
		const g = new THREE.BufferGeometry();
		const v = new Float32Array([
			0, 0, 0.6, -0.4, 0.05, -0.4, 0, -0.08, -0.4,
			0, 0, 0.6, 0, -0.08, -0.4, 0.4, 0.05, -0.4,
		]);
		g.setAttribute('position', new THREE.BufferAttribute(v, 3));
		g.computeVertexNormals();
		return g;
	}, []);
	return (
		<mesh geometry={geo} position={position} rotation={rotation} scale={scale} castShadow>
			<meshStandardMaterial color="#fffdf5" side={THREE.DoubleSide} />
		</mesh>
	);
};

const noteCache = new Map<string, THREE.CanvasTexture>();
export const noteTexture = (text: string) => {
	const hit = noteCache.get(text);
	if (hit) return hit;
	const c = document.createElement('canvas');
	c.width = 512;
	c.height = 360;
	const g = c.getContext('2d')!;
	g.fillStyle = '#fffdf5';
	g.fillRect(0, 0, 512, 360);
	g.strokeStyle = 'rgba(120,150,200,0.45)';
	g.lineWidth = 3;
	for (let y = 70; y < 360; y += 48) {
		g.beginPath();
		g.moveTo(20, y);
		g.lineTo(492, y);
		g.stroke();
	}
	// plis de l'avion
	g.strokeStyle = 'rgba(0,0,0,0.12)';
	g.beginPath();
	g.moveTo(256, 0);
	g.lineTo(256, 360);
	g.moveTo(0, 0);
	g.lineTo(256, 180);
	g.lineTo(512, 0);
	g.stroke();
	g.fillStyle = '#1d3a8a';
	g.font = `76px ${FONT}`;
	g.textAlign = 'center';
	g.textBaseline = 'middle';
	g.save();
	g.translate(256, 190);
	g.rotate(-0.05);
	g.fillText(text, 0, 0);
	g.restore();
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	noteCache.set(text, t);
	return t;
};

/** Petit mot déplié (avion en papier ouvert). */
export const PaperNote: React.FC<{text: string; position?: V3; rotation?: V3; scale?: number}> = ({text, position, rotation, scale = 1}) => (
	<mesh position={position} rotation={rotation} scale={scale}>
		<planeGeometry args={[1.42, 1.0]} />
		<meshStandardMaterial map={noteTexture(text)} side={THREE.DoubleSide} emissive="#ffffff" emissiveMap={noteTexture(text)} emissiveIntensity={0.25} />
	</mesh>
);

// ——— Grande table commune ———
export const LongTable: React.FC<{position?: V3; rotY?: number; length?: number; guests?: CharacterLook[]; frame?: number}> = ({position, rotY = 0, length = 10, guests = [], frame = 0}) => {
	const cloth = stripesTexture('#ffffff', '#e63946', 24);
	const n = Math.floor(length / 1.25);
	return (
		<group position={position} rotation={[0, rotY, 0]}>
			<mesh position={[0, 1.0, 0]} castShadow receiveShadow>
				<boxGeometry args={[length, 0.1, 1.6]} />
				<meshStandardMaterial map={cloth} />
			</mesh>
			{[-length / 2 + 0.3, length / 2 - 0.3].map((x) => [-0.6, 0.6].map((z) => <Box key={`${x}${z}`} s={[0.1, 1, 0.1]} p={[x, 0.5, z]} c="#a0794a" />))}
			{Array.from({length: n}).map((_, i) => {
				const x = -length / 2 + 0.7 + i * 1.25;
				return (
					<group key={i}>
						{[-0.45, 0.45].map((z) => (
							<mesh key={z} position={[x, 1.07, z]} material={M('#ffffff')}>
								<cylinderGeometry args={[0.22, 0.22, 0.03, 14]} />
							</mesh>
						))}
						{i % 2 === 0 && (
							<mesh position={[x + 0.6, 1.17, 0]} material={M(i % 4 ? '#e39a3b' : '#c0392b')}>
								<sphereGeometry args={[0.18, 10, 8]} />
							</mesh>
						)}
					</group>
				);
			})}
			{guests.map((look, i) => {
				const side = i % 2 ? 1 : -1;
				const x = -length / 2 + 0.7 + Math.floor(i / 2) * 1.25;
				return (
					<group key={i}>
						<Chair position={[x, 0, side * 1.15]} rotY={side > 0 ? Math.PI : 0} />
						<Character look={look} position={[x, 0.15, side * 1.05]} rotation={[0, side > 0 ? Math.PI : 0, 0]} sit emotion="happy"
							mouthOpen={Math.max(0, Math.sin(frame / 4 + i)) * 0.5} pose={{armR: [-1.1 + Math.sin(frame / 5 + i) * 0.3, -0.1]}} />
					</group>
				);
			})}
		</group>
	);
};

// ——— Chambre de Léo ———
export const BedRoom: React.FC<{night?: boolean; children?: React.ReactNode}> = ({night = true, children}) => {
	const floor = woodTexture('#9a6a3a', [3, 3]);
	const wall = stripesTexture('#cfe3f5', '#bcd6ee', 14);
	return (
		<group>
			<mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
				<planeGeometry args={[10, 10]} />
				<meshStandardMaterial map={floor} />
			</mesh>
			<mesh position={[0, 2.5, -3]}>
				<planeGeometry args={[10, 5]} />
				<meshStandardMaterial map={wall} />
			</mesh>
			<mesh position={[-3.5, 2.5, 0]} rotation={[0, Math.PI / 2, 0]}>
				<planeGeometry args={[10, 5]} />
				<meshStandardMaterial map={wall} />
			</mesh>
			{/* lit */}
			<group position={[0, 0, -1.6]}>
				<Box s={[3.0, 0.55, 1.7]} p={[0, 0.5, 0]} c="#6b3d1f" />
				<Box s={[2.9, 0.25, 1.6]} p={[0, 0.88, 0]} c="#f1faee" />
				<Box s={[1.9, 0.22, 1.62]} p={[0.5, 0.98, 0]} c="#2f5dd0" />
				<Box s={[0.7, 0.2, 1.1]} p={[-1.1, 1.08, 0]} c="#ffffff" />
				{[[-1.4, -0.75], [1.4, -0.75], [-1.4, 0.75], [1.4, 0.75]].map(([x, z], i) => (
					<Box key={i} s={[0.12, 0.25, 0.12]} p={[x, 0.12, z]} c="#4a2a14" />
				))}
			</group>
			{/* fenêtre */}
			<group position={[1.8, 2.6, -2.95]}>
				<Box s={[1.4, 1.4, 0.08]} c="#ffffff" />
				<Box s={[1.2, 1.2, 0.1]} c={night ? '#16234f' : '#a8dcff'} />
			</group>
			<pointLight position={[0.5, 2.6, 1]} intensity={night ? 6 : 3} distance={8} color="#ffcf8a" />
			{children}
		</group>
	);
};
