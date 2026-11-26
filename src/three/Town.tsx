/** Éléments réutilisables : panneaux, urne de tirage, cartons, terrain vide, photo, salon aux horloges, vallée. */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {M} from './Character';
import {Chalet, Mountains, Sapin} from './Village';
import {Armchair, Suitcase} from './Shop';
import {grassTexture, rng, stripesTexture, textTexture, woodTexture} from './textures';
import {FONT} from '../lib/fonts';

type V3 = [number, number, number];

const Box: React.FC<{s: V3; p?: V3; r?: V3; c: string; e?: string; ei?: number}> = ({s, p, r, c, e, ei = 1}) => {
	const m = useMemo(() => (e ? new THREE.MeshStandardMaterial({color: c, emissive: e, emissiveIntensity: ei}) : M(c)), [c, e, ei]);
	return (
		<mesh position={p} rotation={r} material={m} castShadow receiveShadow>
			<boxGeometry args={s} />
		</mesh>
	);
};

const faceMats = (map: THREE.Texture, side: string, emissive = 0) => (
	<>
		{[0, 1, 2, 3, 5].map((i) => (
			<meshStandardMaterial key={i} attach={`material-${i}`} color={side} />
		))}
		<meshStandardMaterial attach="material-4" map={map} emissive="#ffffff" emissiveMap={map} emissiveIntensity={emissive} />
	</>
);

/** Grand panneau d'affichage sur deux poteaux. */
export const Billboard: React.FC<{lines: string[]; position?: V3; rotY?: number; w?: number; h?: number; lit?: number; bg?: string; fg?: string}> = ({
	lines, position, rotY = 0, w = 7, h = 3.6, lit = 0, bg = '#fff6d8', fg = '#c0162b',
}) => {
	const tex = textTexture(lines.join('|'), {bg, fg, w: 1024, h: Math.round((1024 * h) / w), border: '#1b1b1b', lines});
	return (
		<group position={position} rotation={[0, rotY, 0]}>
			{[-w * 0.35, w * 0.35].map((x) => (
				<Box key={x} s={[0.25, 3, 0.25]} p={[x, 1.5, -0.1]} c="#5b3a20" />
			))}
			<mesh position={[0, 3 + h / 2, 0]} castShadow>
				<boxGeometry args={[w, h, 0.2]} />
				{faceMats(tex, '#5b3a20', lit)}
			</mesh>
			{lit > 0 && <pointLight position={[0, 3 + h + 1, 2.5]} intensity={8 * lit} distance={12} color="#fff1c1" />}
		</group>
	);
};

/** Panneau de signalisation (rectangle bordé de rouge) sur un poteau. */
export const RoadSign: React.FC<{lines: string[]; position?: V3; rotY?: number; scale?: number}> = ({lines, position, rotY = 0, scale = 1}) => {
	const tex = textTexture(lines.join('|'), {bg: '#ffffff', fg: '#c0162b', w: 512, h: 384, border: '#c0162b', lines});
	return (
		<group position={position} rotation={[0, rotY, 0]} scale={scale}>
			<mesh position={[0, 1.2, -0.05]} material={M('#8a8f98')}>
				<cylinderGeometry args={[0.06, 0.06, 2.4, 8]} />
			</mesh>
			<mesh position={[0, 2.7, 0]} castShadow>
				<boxGeometry args={[1.9, 1.42, 0.06]} />
				{faceMats(tex, '#c0162b', 0.15)}
			</mesh>
		</group>
	);
};

// ——— Tirage au sort ———
// le numéro est écrit deux fois : il se voit de face (+z) et de dos (−z)
const ballTex = (n: number, color: string) => textTexture(`${n}        ${n}`, {bg: color, fg: '#1b1b1b', w: 512, h: 128, size: 92});
const BALL_COLORS = ['#ffd23f', '#ff6b6b', '#4ecdc4', '#ffffff', '#a78bfa', '#7bd389'];

export const NumberBall: React.FC<{n: number; position?: V3; rotation?: V3; scale?: number}> = ({n, position, rotation, scale = 1}) => {
	const color = BALL_COLORS[n % BALL_COLORS.length];
	const tex = ballTex(n, color);
	return (
		<mesh position={position} rotation={rotation} scale={scale} castShadow>
			<sphereGeometry args={[0.22, 20, 14]} />
			<meshStandardMaterial map={tex} roughness={0.3} />
		</mesh>
	);
};

/** Urne en verre remplie de boules numérotées, sur un socle. */
export const Urn: React.FC<{position?: V3; spin?: number}> = ({position, spin = 0}) => {
	const glass = useMemo(() => new THREE.MeshStandardMaterial({color: '#cfefff', transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.1, depthWrite: false}), []);
	const R = rng(31);
	const balls = Array.from({length: 22}).map((_, i) => ({n: (i * 7) % 24 + 1, p: [(R() - 0.5) * 0.8, -0.45 + R() * 0.5, (R() - 0.5) * 0.8] as V3, r: R() * 6}));
	return (
		<group position={position}>
			<mesh position={[0, -0.95, 0]} material={M('#b08d57')}>
				<cylinderGeometry args={[0.45, 0.6, 0.4, 16]} />
			</mesh>
			<group rotation={[0, spin, 0]}>
				{balls.filter((b) => b.n !== 12).map((b, i) => (
					<NumberBall key={i} n={b.n} position={b.p} rotation={[b.r, b.r * 2, 0]} scale={0.85} />
				))}
			</group>
			<mesh material={glass}>
				<sphereGeometry args={[0.75, 24, 16]} />
			</mesh>
			<mesh position={[0, 0.72, 0]} material={M('#b08d57')}>
				<cylinderGeometry args={[0.3, 0.3, 0.1, 16]} />
			</mesh>
		</group>
	);
};

// ——— Cartons ———
export const CardboardBox: React.FC<{position?: V3; rotation?: V3; s?: V3; label?: string}> = ({position, rotation, s = [0.8, 0.6, 0.6], label}) => {
	const tex = label ? textTexture(label, {bg: '#c89b63', fg: '#3b2412', w: 256, h: 192}) : null;
	return (
		<group position={position} rotation={rotation}>
			<mesh castShadow receiveShadow position={[0, s[1] / 2, 0]}>
				<boxGeometry args={s} />
				{tex ? faceMats(tex, '#c89b63') : <meshStandardMaterial color="#c89b63" />}
			</mesh>
			<Box s={[s[0] + 0.01, 0.02, 0.16]} p={[0, s[1] + 0.005, 0]} c="#d8c39a" />
		</group>
	);
};

/** Magasin de cartons (« SPÉCIAL DISPARITION -50 % »). */
export const CartonShop: React.FC<{position?: V3; rotY?: number}> = ({position = [0, 0, 0], rotY = 0}) => {
	const sign = textTexture('CARTONS', {bg: '#8b5a2b', fg: '#ffe8b0', w: 1024, h: 180, radius: 30});
	const promo = textTexture('promo', {bg: '#e11d2e', fg: '#ffffff', w: 1024, h: 256, lines: ['SPÉCIAL DISPARITION', '-50 %']});
	const awning = stripesTexture('#c89b63', '#fff4e6', 10);
	const R = rng(17);
	return (
		<Chalet w={8} d={6} h={6} wall="#e9c48f" stone="#f6efe2" roof="#6e3b1f" shutter="#8b5a2b" position={position} rotY={rotY} balcony={false}>
			<mesh position={[0, 3.6, 3.1]}>
				<planeGeometry args={[6.2, 1.06]} />
				<meshStandardMaterial map={sign} />
			</mesh>
			<mesh position={[2.3, 1.5, 3.12]}>
				<planeGeometry args={[2.6, 0.65]} />
				<meshStandardMaterial map={promo} emissive="#ffffff" emissiveMap={promo} emissiveIntensity={0.2} />
			</mesh>
			<mesh position={[0, 2.75, 3.55]} rotation={[0.45, 0, 0]}>
				<boxGeometry args={[7.6, 0.08, 1.3]} />
				<meshStandardMaterial map={awning} />
			</mesh>
			{Array.from({length: 9}).map((_, i) => (
				<CardboardBox key={i} position={[-3.4 + (i % 3) * 0.85, Math.floor(i / 3) * 0.6, 3.6 + (R() - 0.5) * 0.2]} rotation={[0, (R() - 0.5) * 0.3, 0]} />
			))}
		</Chalet>
	);
};

/** Terrain vide, clôture et panneau « ICI ÉTAIT LE N°7 ». */
export const EmptyLot: React.FC<{position?: V3; rotY?: number; label?: string[]}> = ({position = [0, 0, 0], rotY = 0, label = ['ICI ÉTAIT', 'LE N°7']}) => {
	const tex = textTexture(label.join('|'), {bg: '#fff6d8', fg: '#3b2412', w: 512, h: 320, border: '#5b3a20', lines: label});
	const R = rng(23);
	return (
		<group position={position} rotation={[0, rotY, 0]}>
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
				<planeGeometry args={[7, 6]} />
				<meshStandardMaterial color="#9c7b56" />
			</mesh>
			{/* fondations restantes */}
			<Box s={[5.6, 0.25, 0.3]} p={[0, 0.12, -2.4]} c="#b8ad9e" />
			<Box s={[0.3, 0.25, 4.8]} p={[-2.8, 0.12, 0]} c="#b8ad9e" />
			<Box s={[0.3, 0.25, 4.8]} p={[2.8, 0.12, 0]} c="#b8ad9e" />
			{Array.from({length: 18}).map((_, i) => (
				<mesh key={i} position={[(R() - 0.5) * 6, 0.18, (R() - 0.5) * 5]} material={M(i % 2 ? '#5c9e3a' : '#7bbf4a')}>
					<coneGeometry args={[0.12, 0.4, 4]} />
				</mesh>
			))}
			{Array.from({length: 8}).map((_, i) => (
				<Box key={'f' + i} s={[0.12, 0.9, 0.12]} p={[-3.3 + i * 0.95, 0.45, 3.0]} c="#c8a46a" />
			))}
			<Box s={[7, 0.1, 0.08]} p={[0, 0.75, 3.0]} c="#c8a46a" />
			<group position={[1.4, 0, 3.1]}>
				<Box s={[0.12, 2.0, 0.12]} p={[0, 1.0, -0.05]} c="#5b3a20" />
				<mesh position={[0, 2.1, 0.02]} rotation={[0, 0, 0.06]} castShadow>
					<boxGeometry args={[1.9, 1.2, 0.06]} />
					{faceMats(tex, '#5b3a20', 0.1)}
				</mesh>
			</group>
		</group>
	);
};

/** Texture de la photo : papi devant la porte n°7. */
const photoTexture = () => {
	const key = 'photo-papi';
	const cache = (photoTexture as unknown as {c?: Map<string, THREE.CanvasTexture>}).c ?? new Map();
	(photoTexture as unknown as {c?: Map<string, THREE.CanvasTexture>}).c = cache;
	if (cache.has(key)) return cache.get(key)!;
	const c = document.createElement('canvas');
	c.width = 384;
	c.height = 480;
	const g = c.getContext('2d')!;
	g.fillStyle = '#f4ead2';
	g.fillRect(0, 0, 384, 480);
	g.fillStyle = '#9fd3f0';
	g.fillRect(24, 24, 336, 360);
	g.fillStyle = '#d69a5b';
	g.fillRect(24, 140, 336, 244);
	g.fillStyle = '#6b3d1f';
	g.fillRect(212, 220, 96, 164);
	g.fillStyle = '#1f4fd8';
	g.fillRect(236, 168, 48, 44);
	g.fillStyle = '#fff';
	g.font = `40px ${FONT}`;
	g.textAlign = 'center';
	g.fillText('7', 260, 205);
	// papi
	g.fillStyle = '#3d6fa8';
	g.fillRect(90, 250, 80, 100);
	g.fillStyle = '#f0c4a0';
	g.fillRect(96, 186, 68, 64);
	g.fillStyle = '#ffffff';
	g.fillRect(96, 180, 68, 12);
	g.fillRect(108, 226, 44, 10);
	g.fillStyle = '#1b1b1b';
	g.fillRect(110, 206, 10, 10);
	g.fillRect(140, 206, 10, 10);
	g.fillStyle = '#3a3a48';
	g.fillRect(96, 350, 28, 34);
	g.fillRect(136, 350, 28, 34);
	g.fillStyle = '#5b3a20';
	g.font = `34px ${FONT}`;
	g.fillText('Marcel, n°7', 192, 440);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	cache.set(key, t);
	return t;
};

export const PhotoFrame: React.FC<{position?: V3; rotation?: V3; scale?: number}> = ({position, rotation, scale = 1}) => (
	<group position={position} rotation={rotation} scale={scale}>
		<Box s={[0.7, 0.86, 0.04]} c="#c8a46a" />
		<mesh position={[0, 0, 0.025]}>
			<planeGeometry args={[0.6, 0.75]} />
			<meshStandardMaterial map={photoTexture()} emissive="#ffffff" emissiveMap={photoTexture()} emissiveIntensity={0.15} />
		</mesh>
	</group>
);

// ——— Horloges ———
const clockFace = () => textTexture('', {bg: '#fffaf0', w: 256, h: 256, radius: 128});
/** Horloge murale ronde. `time` en heures (0-12) ; 12 = minuit pile. */
export const WallClock: React.FC<{position?: V3; rotation?: V3; r?: number; time?: number; frame?: string}> = ({position, rotation, r = 0.4, time = 12, frame = '#5b3a20'}) => {
	const hour = ((time % 12) / 12) * Math.PI * 2;
	const minute = ((time % 1) * Math.PI * 2);
	return (
		<group position={position} rotation={rotation}>
			<mesh rotation={[Math.PI / 2, 0, 0]} material={M(frame)}>
				<cylinderGeometry args={[r * 1.12, r * 1.12, 0.08, 24]} />
			</mesh>
			<mesh position={[0, 0, 0.045]}>
				<circleGeometry args={[r, 24]} />
				<meshStandardMaterial map={clockFace()} />
			</mesh>
			{Array.from({length: 12}).map((_, i) => {
				const a = (i / 12) * Math.PI * 2;
				return <Box key={i} s={[r * 0.06, r * (i % 3 === 0 ? 0.2 : 0.12), 0.01]} p={[Math.sin(a) * r * 0.82, Math.cos(a) * r * 0.82, 0.05]} r={[0, 0, -a]} c="#1b1b1b" />;
			})}
			<group position={[0, 0, 0.06]} rotation={[0, 0, -hour]}>
				<Box s={[r * 0.08, r * 0.55, 0.01]} p={[0, r * 0.25, 0]} c="#1b1b1b" />
			</group>
			<group position={[0, 0, 0.07]} rotation={[0, 0, -minute]}>
				<Box s={[r * 0.05, r * 0.8, 0.01]} p={[0, r * 0.38, 0]} c="#c0162b" />
			</group>
		</group>
	);
};

/** Salon de mamie : horloges partout, fauteuil, lampe, valise (indice) derrière le fauteuil. */
export const LivingRoom: React.FC<{
	/** heure affichée par les horloges (12 = minuit) ; `running` = elles tournent */
	clockTime?: (i: number) => number;
	night?: boolean;
	suitcase?: boolean;
	boxes?: boolean;
	shake?: number;
	children?: React.ReactNode;
}> = ({clockTime = () => 12, night = false, suitcase = true, boxes = false, shake = 0, children}) => {
	const wallpaper = stripesTexture('#e8d5f2', '#dcc3ea', 16);
	const floor = woodTexture('#a8743f', [4, 4]);
	const R = rng(41);
	const clocks = Array.from({length: 16}).map((_, i) => ({
		p: [-5 + (i % 8) * 1.45 + (R() - 0.5) * 0.3, 2.2 + Math.floor(i / 8) * 1.5 + (R() - 0.5) * 0.3, -4.9] as V3,
		r: 0.32 + R() * 0.25,
		f: ['#5b3a20', '#b08d57', '#2a4a3a', '#7a1f2b'][i % 4],
	}));
	const sx = shake ? Math.sin(shake * 1.9) * 0.05 : 0;
	return (
		<group position={[sx, 0, 0]}>
			<mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
				<planeGeometry args={[14, 12]} />
				<meshStandardMaterial map={floor} />
			</mesh>
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.5]}>
				<circleGeometry args={[2.6, 32]} />
				<meshStandardMaterial color="#b5476b" />
			</mesh>
			<mesh position={[0, 3, -5]}>
				<planeGeometry args={[14, 6]} />
				<meshStandardMaterial map={wallpaper} />
			</mesh>
			{[-6, 6].map((x) => (
				<mesh key={x} position={[x, 3, 0]} rotation={[0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
					<planeGeometry args={[12, 6]} />
					<meshStandardMaterial map={wallpaper} />
				</mesh>
			))}
			{clocks.map((c, i) => (
				<WallClock key={i} position={c.p} r={c.r} frame={c.f} time={clockTime(i)} />
			))}
			{/* horloge de parquet */}
			<group position={[4.6, 0, -4.4]}>
				<Box s={[1.0, 3.6, 0.6]} p={[0, 1.8, 0]} c="#6b3d1f" />
				<WallClock position={[0, 3.0, 0.32]} r={0.38} time={clockTime(99)} frame="#b08d57" />
			</group>
			{/* fenêtre */}
			<group position={[-5.95, 2.6, -1]} rotation={[0, Math.PI / 2, 0]}>
				<Box s={[2.2, 1.8, 0.1]} c="#ffffff" />
				<Box s={[2.0, 1.6, 0.12]} c={night ? '#1a2350' : '#a8dcff'} e={night ? '#0b1030' : '#bfe6ff'} ei={night ? 0.3 : 0.4} />
			</group>
			{/* lampe */}
			<group position={[2.4, 0, -2.6]}>
				<mesh position={[0, 0.8, 0]} material={M('#3a3a3a')}>
					<cylinderGeometry args={[0.05, 0.12, 1.6, 8]} />
				</mesh>
				<mesh position={[0, 1.75, 0]}>
					<coneGeometry args={[0.45, 0.5, 16, 1, true]} />
					<meshStandardMaterial color="#ffe3a0" emissive="#ffcf70" emissiveIntensity={night ? 1.2 : 0.4} side={THREE.DoubleSide} />
				</mesh>
				<pointLight position={[0, 1.6, 0]} intensity={night ? 10 : 3} distance={9} color="#ffcf8a" />
			</group>
			<Armchair position={[0, 0, -2.2]} color="#7b4dff" />
			{suitcase && <Suitcase position={[-1.15, 0, -3.1]} rotY={0.35} color="#8b3a3a" />}
			{boxes &&
				Array.from({length: 7}).map((_, i) => (
					<CardboardBox key={i} position={[-4 + (i % 4) * 0.9, Math.floor(i / 4) * 0.6, 1.8]} rotation={[0, (i % 3) * 0.2, 0]} label={i === 2 ? 'VAISSELLE' : i === 4 ? 'JOUETS' : undefined} />
				))}
			{children}
		</group>
	);
};

/** Colonne de lumière blanche (maison qui s'élève). */
export const LightColumn: React.FC<{position?: V3; intensity?: number; radius?: number}> = ({position, intensity = 1, radius = 5}) => {
	const mat = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffffff', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide}), []);
	mat.opacity = 0.55 * intensity;
	return (
		<group position={position}>
			<mesh position={[0, 30, 0]} material={mat}>
				<cylinderGeometry args={[radius, radius * 1.15, 60, 32, 1, true]} />
			</mesh>
			<pointLight position={[0, 3, 0]} intensity={60 * intensity} distance={30} color="#ffffff" />
		</group>
	);
};

export const Chair: React.FC<{position?: V3; rotY?: number}> = ({position, rotY = 0}) => (
	<group position={position} rotation={[0, rotY, 0]}>
		<Box s={[0.6, 0.08, 0.6]} p={[0, 0.6, 0]} c="#c8a46a" />
		<Box s={[0.6, 0.7, 0.08]} p={[0, 0.98, -0.26]} c="#c8a46a" />
		{[[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]].map(([x, z], i) => (
			<Box key={i} s={[0.07, 0.6, 0.07]} p={[x, 0.3, z]} c="#a0794a" />
		))}
	</group>
);

/** Table dressée dehors + 4 chaises. */
export const DinnerTable: React.FC<{position?: V3; rotY?: number}> = ({position, rotY = 0}) => {
	const cloth = stripesTexture('#ffffff', '#e63946', 12);
	return (
		<group position={position} rotation={[0, rotY, 0]}>
			<mesh position={[0, 1.0, 0]} castShadow>
				<boxGeometry args={[2.4, 0.1, 1.4]} />
				<meshStandardMaterial map={cloth} />
			</mesh>
			{[[-1, -0.55], [1, -0.55], [-1, 0.55], [1, 0.55]].map(([x, z], i) => (
				<Box key={i} s={[0.1, 1.0, 0.1]} p={[x, 0.5, z]} c="#a0794a" />
			))}
			{[[-0.6, -0.35], [0.6, -0.35], [-0.6, 0.35], [0.6, 0.35]].map(([x, z], i) => (
				<group key={'a' + i}>
					<mesh position={[x, 1.07, z]} material={M('#ffffff')}>
						<cylinderGeometry args={[0.2, 0.2, 0.03, 16]} />
					</mesh>
				</group>
			))}
			<mesh position={[0, 1.2, 0]} material={M('#e39a3b')}>
				<sphereGeometry args={[0.22, 14, 10]} />
			</mesh>
			<Chair position={[-0.6, 0, -1.05]} />
			<Chair position={[0.6, 0, -1.05]} />
			<Chair position={[-0.6, 0, 1.05]} rotY={Math.PI} />
			<Chair position={[0.6, 0, 1.05]} rotY={Math.PI} />
		</group>
	);
};

/** La vallée ensoleillée des maisons « disparues ». */
export const Valley: React.FC<{children?: React.ReactNode}> = ({children}) => {
	const grass = useMemo(() => grassTexture(80), []);
	const R = rng(55);
	const houses = Array.from({length: 16}).map((_, i) => {
		const a = (i / 16) * Math.PI * 2 + R() * 0.3;
		const d = 14 + R() * 22;
		return {p: [Math.cos(a) * d, 0, Math.sin(a) * d - 6] as V3, r: Math.atan2(-Math.cos(a), -Math.sin(a)) + Math.PI, n: [3, 21, 45, 9, 33, 18, 2, 27, 41, 15, 38, 5, 29, 11, 24, 36][i]};
	});
	const walls = ['#c8864a', '#e8b07a', '#8ecae6', '#f2c48d', '#d69a5b', '#b5713b'];
	return (
		<group>
			<mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
				<planeGeometry args={[400, 400]} />
				<meshStandardMaterial map={grass} color="#ffffff" />
			</mesh>
			{/* collines douces */}
			{[[-40, -60, 30], [30, -70, 36], [0, -95, 44], [60, -40, 26], [-65, -30, 24]].map(([x, z, r], i) => (
				<mesh key={i} position={[x, -r * 0.55, z]} material={M(i % 2 ? '#6fcf4a' : '#82d65a')}>
					<sphereGeometry args={[r, 24, 16]} />
				</mesh>
			))}
			{houses.map((h, i) => (
				<Chalet key={i} position={h.p} rotY={h.r} number={h.n} wall={walls[i % walls.length]} w={5 + (i % 3)} h={4.8 + (i % 2)} />
			))}
			{Array.from({length: 30}).map((_, i) => (
				<Sapin key={i} p={[(R() - 0.5) * 140, 0, -30 - R() * 60]} s={1 + R()} />
			))}
			{/* fleurs */}
			{Array.from({length: 60}).map((_, i) => (
				<mesh key={'fl' + i} position={[(R() - 0.5) * 30, 0.12, (R() - 0.5) * 20 + 2]} material={M(['#ff5d8f', '#ffd23f', '#ffffff', '#a78bfa'][i % 4])}>
					<sphereGeometry args={[0.12, 6, 4]} />
				</mesh>
			))}
			<Mountains snow="#ffffff" tint="#9fb4e0" />
			{children}
		</group>
	);
};
