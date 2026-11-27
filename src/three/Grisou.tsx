/**
 * Ép. 06 — intérieur de la maison de Grisou + accessoires :
 * tourne-disque, photo de classe, feuille jaunie « LA MAISON CITROUILLE », feuille « OMELETTE AUX HANNETONS ? BEURK ! »,
 * mégaphone, arrosoir, poêle avec omelette aux hannetons.
 */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {rng} from './textures';
import {noiseTex} from './look';
import {FONT} from '../lib/fonts';

type V3 = [number, number, number];

const ctex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
	const c = ((ctex as unknown as {c?: Map<string, THREE.Texture>}).c ??= new Map());
	const hit = c.get(key);
	if (hit) return hit;
	const cv = document.createElement('canvas');
	cv.width = w;
	cv.height = h;
	draw(cv.getContext('2d')!);
	const t = new THREE.CanvasTexture(cv);
	t.colorSpace = THREE.SRGBColorSpace;
	t.anisotropy = 8;
	c.set(key, t);
	return t;
};

const lyricsTex = () =>
	ctex('paroles', 600, 800, (g) => {
		g.fillStyle = '#ecd58f';
		g.fillRect(0, 0, 600, 800);
		const R = rng(4);
		for (let i = 0; i < 40; i++) {
			g.fillStyle = `rgba(150,110,40,${0.05 + R() * 0.1})`;
			g.beginPath();
			g.arc(R() * 600, R() * 800, 10 + R() * 50, 0, Math.PI * 2);
			g.fill();
		}
		g.fillStyle = '#5a3210';
		g.textAlign = 'center';
		g.font = `64px ${FONT}`;
		g.fillText('LA MAISON', 300, 120);
		g.fillText('CITROUILLE', 300, 195);
		g.font = `36px ${FONT}`;
		g.fillStyle = '#7a4a20';
		['J\'habite une maison', 'citrouille...', 'Rapetipeto,', 'le soleil est rond...'].forEach((l, i) => g.fillText(l, 300, 300 + i * 56));
		g.font = `42px ${FONT}`;
		g.fillStyle = '#b0301a';
		g.fillText('paroles de Gaston, 8 ans', 300, 690);
	});

const schoolTex = () =>
	ctex('ecole', 600, 420, (g) => {
		g.fillStyle = '#fbfbf6';
		g.fillRect(0, 0, 600, 420);
		g.strokeStyle = '#9ec3ff';
		g.lineWidth = 2;
		for (let y = 40; y < 420; y += 34) {
			g.beginPath();
			g.moveTo(0, y);
			g.lineTo(600, y);
			g.stroke();
		}
		g.strokeStyle = '#ff7a7a';
		g.beginPath();
		g.moveTo(60, 0);
		g.lineTo(60, 420);
		g.stroke();
		g.fillStyle = '#d11a1a';
		g.textAlign = 'center';
		g.font = `54px ${FONT}`;
		g.fillText('OMELETTE AUX', 320, 150);
		g.fillText('HANNETONS ?', 320, 220);
		g.font = `82px ${FONT}`;
		g.fillText('BEURK !', 320, 330);
	});

/** Photo de classe : rangée d'enfants cubiques qui rient en montrant du doigt le petit Gaston. */
const photoTex = () =>
	ctex('photo', 700, 480, (g) => {
		g.fillStyle = '#d9c7a0';
		g.fillRect(0, 0, 700, 480);
		g.fillStyle = '#a8b8c8';
		g.fillRect(20, 20, 660, 300);
		g.fillStyle = '#8a9a6a';
		g.fillRect(20, 320, 660, 140);
		const kids = 7;
		for (let i = 0; i < kids; i++) {
			const x = 70 + i * 92;
			const gaston = i === 3;
			const s = gaston ? 0.75 : 1;
			const y = gaston ? 330 : 300;
			g.fillStyle = ['#e9b48e', '#d9a07a', '#f0bf96', '#ffd2b3'][i % 4];
			g.fillRect(x - 30 * s, y - 120 * s, 60 * s, 60 * s);
			g.fillStyle = ['#c8622a', '#556b2f', '#8b3a3a', '#6a3fa0', '#d9a400', '#2f5dd0', '#a0522d'][i];
			g.fillRect(x - 34 * s, y - 60 * s, 68 * s, 70 * s);
			g.fillStyle = '#222';
			if (gaston) {
				// petit Gaston triste
				g.fillRect(x - 12, y - 102, 6, 6);
				g.fillRect(x + 6, y - 102, 6, 6);
				g.beginPath();
				g.arc(x, y - 75, 10, Math.PI * 1.1, Math.PI * 1.9);
				g.stroke();
				g.fillStyle = '#4fb3ff';
				g.fillRect(x + 8, y - 95, 4, 12);
			} else {
				// enfants qui rient
				g.fillRect(x - 14, y - 104, 8, 4);
				g.fillRect(x + 6, y - 104, 8, 4);
				g.beginPath();
				g.arc(x, y - 82, 14, 0, Math.PI);
				g.fill();
				// bras qui montre Gaston
				g.fillStyle = ['#e9b48e', '#d9a07a'][i % 2];
				const dir = i < 3 ? 1 : -1;
				g.fillRect(dir > 0 ? x + 30 : x - 70, y - 50, 40, 12);
			}
		}
		g.strokeStyle = '#6a4a2a';
		g.lineWidth = 10;
		g.strokeRect(5, 5, 690, 470);
	});

/** Feuille / cadre accroché au mur (face +z). */
const WallPaper: React.FC<{tex: THREE.Texture; position: V3; w: number; h: number; rot?: number; frame?: string}> = ({tex, position, w, h, rot = 0, frame}) => (
	<group position={position} rotation={[0, 0, rot]}>
		{frame && (
			<mesh position={[0, 0, -0.02]} castShadow>
				<boxGeometry args={[w + 0.16, h + 0.16, 0.06]} />
				<meshStandardMaterial color={frame} roughness={0.6} />
			</mesh>
		)}
		<mesh position={[0, 0, 0.02]}>
			<planeGeometry args={[w, h]} />
			<meshStandardMaterial map={tex} roughness={0.9} />
		</mesh>
	</group>
);

/** Tourne-disque vintage (disque qui tourne, bras, pavillon). */
export const RecordPlayer: React.FC<{position?: V3; rotY?: number; f?: number; playing?: boolean}> = ({position, rotY = 0, f = 0, playing = true}) => (
	<group position={position} rotation={[0, rotY, 0]}>
		<mesh position={[0, 0.12, 0]} castShadow>
			<boxGeometry args={[0.9, 0.24, 0.75]} />
			<meshStandardMaterial color="#6b3d1f" roughness={0.5} bumpMap={noiseTex(4, 40, [1, 1])} bumpScale={0.6} />
		</mesh>
		<mesh position={[-0.08, 0.26, 0]} rotation={[0, playing ? f * 0.18 : 0, 0]}>
			<cylinderGeometry args={[0.3, 0.3, 0.02, 32]} />
			<meshStandardMaterial color="#111" roughness={0.25} metalness={0.2} />
		</mesh>
		<mesh position={[-0.08, 0.275, 0]}>
			<cylinderGeometry args={[0.09, 0.09, 0.01, 20]} />
			<meshStandardMaterial color="#e63946" />
		</mesh>
		<mesh position={[0.26, 0.3, -0.18]} rotation={[0, 0.6, Math.PI / 2 - 0.05]}>
			<cylinderGeometry args={[0.015, 0.015, 0.38, 6]} />
			<meshStandardMaterial color="#c9a227" metalness={0.8} roughness={0.3} />
		</mesh>
		{/* pavillon */}
		<group position={[0.3, 0.3, -0.3]} rotation={[0.3, 0.6, 0]}>
			<mesh position={[0, 0.3, 0]}>
				<cylinderGeometry args={[0.03, 0.03, 0.6, 8]} />
				<meshStandardMaterial color="#c9a227" metalness={0.8} roughness={0.3} />
			</mesh>
			<mesh position={[0, 0.75, 0.15]} rotation={[-0.9, 0, 0]}>
				<coneGeometry args={[0.38, 0.6, 24, 1, true]} />
				<meshStandardMaterial color="#d8a930" metalness={0.75} roughness={0.25} side={THREE.DoubleSide} />
			</mesh>
		</group>
	</group>
);

/** Notes de musique qui s'envolent du tourne-disque. */
export const MusicNotes: React.FC<{position?: V3; f: number}> = ({position, f}) => {
	const tex = ctex('note', 128, 128, (g) => {
		g.fillStyle = '#ffd27a';
		g.font = `110px ${FONT}`;
		g.textAlign = 'center';
		g.fillText('♪', 64, 105);
	});
	return (
		<group position={position}>
			{[0, 1, 2].map((i) => {
				const u = (f / 45 + i / 3) % 1;
				return (
					<mesh key={i} position={[Math.sin(u * 6 + i) * 0.3, u * 1.6, 0]}>
						<planeGeometry args={[0.3, 0.3]} />
						<meshBasicMaterial map={tex} transparent opacity={1 - u} depthWrite={false} />
					</mesh>
				);
			})}
		</group>
	);
};

/** Intérieur de la maison de Grisou (à l'intérieur de la citrouille : parois orange courbes). */
export const GrisouRoom: React.FC<{f: number; children?: React.ReactNode}> = ({f, children}) => {
	const wall = useMemo(() => new THREE.MeshStandardMaterial({color: '#e8853a', roughness: 0.8, side: THREE.BackSide, bumpMap: noiseTex(22, 50, [8, 4]), bumpScale: 2}), []);
	return (
		<group>
			{/* parois de la citrouille */}
			<mesh material={wall} scale={[6.5, 4.2, 6.5]} position={[0, 3.2, 0]}>
				<sphereGeometry args={[1, 48, 32]} />
			</mesh>
			{/* plancher */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
				<circleGeometry args={[6.4, 48]} />
				<meshStandardMaterial color="#8a5a32" roughness={0.75} bumpMap={noiseTex(4, 60, [8, 8])} bumpScale={1.2} />
			</mesh>
			{/* mur en planches du fond (affiches) */}
			<mesh position={[0, 2.6, -4.6]} receiveShadow>
				<boxGeometry args={[7, 4.4, 0.2]} />
				<meshStandardMaterial color="#7a4a26" roughness={0.85} bumpMap={noiseTex(4, 70, [6, 1])} bumpScale={2} />
			</mesh>
			<WallPaper tex={lyricsTex()} position={[-1.9, 2.9, -4.45]} w={1.3} h={1.73} rot={0.04} />
			<WallPaper tex={schoolTex()} position={[0.1, 3.1, -4.45]} w={1.4} h={0.98} rot={-0.05} />
			<WallPaper tex={photoTex()} position={[2.0, 2.7, -4.43]} w={1.6} h={1.1} frame="#5a3a1a" />
			{/* table + tourne-disque */}
			<mesh position={[1.3, 0.75, -2.2]} castShadow receiveShadow>
				<boxGeometry args={[1.6, 0.1, 1.0]} />
				<meshStandardMaterial color="#5a3a22" roughness={0.6} />
			</mesh>
			{[[-0.7, -0.4], [0.7, -0.4], [-0.7, 0.4], [0.7, 0.4]].map(([x, z], i) => (
				<mesh key={i} position={[1.3 + x, 0.37, -2.2 + z]}>
					<boxGeometry args={[0.08, 0.74, 0.08]} />
					<meshStandardMaterial color="#4a2e1a" />
				</mesh>
			))}
			<RecordPlayer position={[1.3, 0.8, -2.2]} rotY={-0.3} f={f} />
			{/* lampe chaude */}
			<pointLight position={[0.5, 3.2, -1]} intensity={14} distance={10} color="#ffc37a" castShadow />
			<pointLight position={[-2.5, 2, 1.5]} intensity={4} distance={8} color="#ff9a4a" />
			{children}
		</group>
	);
};

/** Mégaphone. */
export const Megaphone: React.FC<{position?: V3; rotation?: V3; s?: number}> = ({position, rotation, s = 1}) => (
	<group position={position} rotation={rotation} scale={s}>
		<mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.35]}>
			<cylinderGeometry args={[0.28, 0.1, 0.7, 20, 1, true]} />
			<meshStandardMaterial color="#e8e8e8" roughness={0.4} side={THREE.DoubleSide} />
		</mesh>
		<mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.7]}>
			<torusGeometry args={[0.28, 0.03, 8, 20]} />
			<meshStandardMaterial color="#e63946" />
		</mesh>
		<mesh position={[0, -0.18, 0.1]}>
			<boxGeometry args={[0.08, 0.25, 0.08]} />
			<meshStandardMaterial color="#222" />
		</mesh>
	</group>
);

/** Arrosoir de Mamie Rose. */
export const WateringCan: React.FC<{position?: V3; rotation?: V3; s?: number}> = ({position, rotation, s = 1}) => (
	<group position={position} rotation={rotation} scale={s}>
		<mesh position={[0, -0.25, 0.15]}>
			<cylinderGeometry args={[0.22, 0.24, 0.42, 16]} />
			<meshStandardMaterial color="#2e8b57" metalness={0.5} roughness={0.35} />
		</mesh>
		<mesh position={[0, -0.18, 0.5]} rotation={[-0.9, 0, 0]}>
			<cylinderGeometry args={[0.03, 0.04, 0.5, 8]} />
			<meshStandardMaterial color="#2e8b57" metalness={0.5} roughness={0.35} />
		</mesh>
	</group>
);

/** Poêle fumante avec omelette… et pattes de hannetons qui dépassent. */
export const OmelettePan: React.FC<{position?: V3; rotation?: V3; s?: number; f?: number}> = ({position, rotation, s = 1, f = 0}) => (
	<group position={position} rotation={rotation} scale={s}>
		<mesh position={[0, 0, 0]} castShadow>
			<cylinderGeometry args={[0.42, 0.36, 0.1, 28]} />
			<meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.35} />
		</mesh>
		<mesh position={[0, 0.0, -0.75]} rotation={[Math.PI / 2, 0, 0]}>
			<cylinderGeometry args={[0.04, 0.05, 0.7, 8]} />
			<meshStandardMaterial color="#3a2614" />
		</mesh>
		<mesh position={[0, 0.06, 0]}>
			<cylinderGeometry args={[0.36, 0.36, 0.03, 28]} />
			<meshStandardMaterial color="#f5d061" roughness={0.6} />
		</mesh>
		{/* pattes noires de hannetons */}
		{Array.from({length: 9}).map((_, i) => {
			const a = (i / 9) * Math.PI * 2;
			return (
				<mesh key={i} position={[Math.cos(a) * 0.2, 0.12, Math.sin(a) * 0.2]} rotation={[Math.sin(a) * 0.9, 0, Math.cos(a) * 0.9 + Math.sin(f * 0.6 + i) * 0.15]}>
					<boxGeometry args={[0.02, 0.16, 0.02]} />
					<meshStandardMaterial color="#2a1a0a" />
				</mesh>
			);
		})}
		{[0, 1, 2].map((i) => {
			const u = (f / 35 + i / 3) % 1;
			return (
				<mesh key={'s' + i} position={[Math.sin(i * 2) * 0.15, 0.2 + u * 0.9, Math.cos(i * 2) * 0.15]} scale={0.06 + u * 0.1}>
					<sphereGeometry args={[1, 8, 6]} />
					<meshStandardMaterial color="#ffffff" transparent opacity={0.5 * (1 - u)} />
				</mesh>
			);
		})}
	</group>
);
