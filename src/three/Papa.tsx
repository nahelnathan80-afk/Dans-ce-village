/**
 * Éléments réutilisables de l'ép. 05 « Papa rapetisse » :
 * toise, écran « EN DIRECT », banc + pigeons, mallette, lettre, boîte à chaussures-lit, pupitre + micro géant,
 * cuisine, poubelle, carnet, lasagnes, doudou lapin, effet « pouf », larme, et Papa (costume qui ne rétrécit pas).
 */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {Character, CharacterLook, CharacterProps, M} from './Character';
import {rng, stripesTexture, textTexture} from './textures';
import {FONT} from '../lib/fonts';

type V3 = [number, number, number];

const Box: React.FC<{s: V3; p?: V3; r?: V3; c: string; e?: string; ei?: number; map?: THREE.Texture}> = ({s, p, r, c, e, ei = 1, map}) => {
	const m = useMemo(
		() => (e || map ? new THREE.MeshStandardMaterial({color: c, roughness: 0.8, ...(e ? {emissive: e, emissiveIntensity: ei} : {}), ...(map ? {map} : {})}) : M(c)),
		[c, e, ei, map],
	);
	return (
		<mesh position={p} rotation={r} material={m} castShadow receiveShadow>
			<boxGeometry args={s} />
		</mesh>
	);
};

/** Face avant texturée (index 4 = +z). */
const Faced: React.FC<{s: V3; p?: V3; r?: V3; side: string; map: THREE.Texture; glow?: number}> = ({s, p, r, side, map, glow = 0}) => (
	<mesh position={p} rotation={r} castShadow>
		<boxGeometry args={s} />
		{[0, 1, 2, 3, 5].map((i) => (
			<meshStandardMaterial key={i} attach={`material-${i}`} color={side} />
		))}
		<meshStandardMaterial attach="material-4" map={map} emissive="#ffffff" emissiveMap={map} emissiveIntensity={glow} />
	</mesh>
);

// ——— textures dessinées
const canvasTex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
	const cache = ((canvasTex as unknown as {c?: Map<string, THREE.Texture>}).c ??= new Map());
	const hit = cache.get(key);
	if (hit) return hit;
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	draw(c.getContext('2d')!);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	t.anisotropy = 4;
	cache.set(key, t);
	return t;
};

const toiseTex = () =>
	canvasTex('toise', 256, 2048, (g) => {
		g.fillStyle = '#fff7e0';
		g.fillRect(0, 0, 256, 2048);
		g.fillStyle = '#e63946';
		g.fillRect(0, 0, 256, 150);
		g.fillStyle = '#fff';
		g.font = `90px ${FONT}`;
		g.textAlign = 'center';
		g.fillText('cm', 128, 110);
		g.fillStyle = '#1b1b1b';
		g.font = `54px ${FONT}`;
		for (let cm = 0; cm <= 200; cm += 5) {
			const y = 2048 - (cm / 200) * 1880;
			const big = cm % 20 === 0;
			g.fillRect(0, y - 3, big ? 120 : 60, big ? 8 : 4);
			if (big) g.fillText(String(cm), 190, y + 18);
		}
	});

/** Toise géante (entrée de l'école) : 0 → 200 cm. 1 unité ≈ 58 cm, donc ~3,45 unités de haut. */
export const Toise: React.FC<{position?: V3; rotY?: number}> = ({position, rotY = 0}) => (
	<group position={position} rotation={[0, rotY, 0]}>
		<Faced s={[0.7, 3.75, 0.12]} p={[0, 1.88, 0]} side="#c0392b" map={toiseTex()} glow={0.05} />
		<Box s={[0.9, 0.12, 0.3]} p={[0, 0.06, 0]} c="#8b5a2b" />
	</group>
);

/** Panneau de rue sur deux poteaux (fond, texte). */
export const StreetSign: React.FC<{lines: string[]; position?: V3; rotY?: number; w?: number; h?: number; bg?: string; fg?: string; border?: string; post?: number}> = ({
	lines, position, rotY = 0, w = 4.4, h = 2.2, bg = '#ffd23f', fg = '#c0162b', border = '#1b1b1b', post = 2.2,
}) => {
	const tex = textTexture(lines.join('|'), {bg, fg, w: 1024, h: Math.round((1024 * h) / w), border, lines});
	return (
		<group position={position} rotation={[0, rotY, 0]}>
			{[-w * 0.38, w * 0.38].map((x) => (
				<mesh key={x} position={[x, post / 2, -0.1]} material={M('#5b6270')}>
					<cylinderGeometry args={[0.08, 0.08, post, 8]} />
				</mesh>
			))}
			<Faced s={[w, h, 0.12]} p={[0, post + h / 2, 0]} side={border} map={tex} glow={0.12} />
		</group>
	);
};

/** Écran géant « EN DIRECT » : un petit studio en retrait derrière le cadre (les personnages se placent dedans, z∈[-1,0]). */
export const TVScreen: React.FC<{position?: V3; rotY?: number; frame: number; children?: React.ReactNode}> = ({position, rotY = 0, frame, children}) => {
	const live = textTexture('● EN DIRECT', {bg: '#e11d2e', fg: '#ffffff', w: 512, h: 96, lines: ['● EN DIRECT']});
	const studio = useMemo(() => stripesTexture('#2a3f9e', '#2f47b0', 10), []);
	const blink = frame % 24 < 16;
	return (
		<group position={position} rotation={[0, rotY, 0]}>
			{[-2.0, 2.0].map((x) => (
				<Box key={x} s={[0.25, 2.2, 0.25]} p={[x, 1.1, -0.6]} c="#3a3a3a" />
			))}
			{/* cadre */}
			<group position={[0, 3.9, 0]}>
				<Box s={[5.6, 0.3, 1.2]} p={[0, 1.65, -0.5]} c="#151515" />
				<Box s={[5.6, 0.3, 1.2]} p={[0, -1.65, -0.5]} c="#151515" />
				<Box s={[0.3, 3.6, 1.2]} p={[-2.65, 0, -0.5]} c="#151515" />
				<Box s={[0.3, 3.6, 1.2]} p={[2.65, 0, -0.5]} c="#151515" />
				<mesh position={[0, 0, -1.05]}>
					<planeGeometry args={[5.1, 3.1]} />
					<meshStandardMaterial map={studio} emissive="#3050d0" emissiveIntensity={0.35} />
				</mesh>
				<Box s={[5.0, 0.08, 1.0]} p={[0, -1.5, -0.55]} c="#20307a" />
				<group position={[0, -1.46, -0.55]}>{children}</group>
				<pointLight position={[0, 0.8, 0.6]} intensity={6} distance={6} color="#dfe6ff" />
				{/* bandeau EN DIRECT */}
				<mesh position={[-1.4, -1.25, 0.12]}>
					<planeGeometry args={[2.2, 0.42]} />
					<meshStandardMaterial map={live} emissive="#ffffff" emissiveMap={live} emissiveIntensity={blink ? 0.6 : 0.25} transparent />
				</mesh>
			</group>
		</group>
	);
};

/** Banc de parc. */
export const Bench: React.FC<{position?: V3; rotY?: number}> = ({position, rotY = 0}) => (
	<group position={position} rotation={[0, rotY, 0]}>
		{[0, 1, 2].map((i) => (
			<Box key={i} s={[3.0, 0.1, 0.22]} p={[0, 0.9, -0.3 + i * 0.26]} c="#2e7d4f" />
		))}
		{[0, 1].map((i) => (
			<Box key={'d' + i} s={[3.0, 0.22, 0.08]} p={[0, 1.3 + i * 0.32, -0.45]} r={[-0.15, 0, 0]} c="#2e7d4f" />
		))}
		{[-1.3, 1.3].map((x) => (
			<group key={x}>
				<Box s={[0.12, 0.9, 0.7]} p={[x, 0.45, -0.05]} c="#2b2b2b" />
				<Box s={[0.12, 1.0, 0.1]} p={[x, 1.3, -0.48]} c="#2b2b2b" />
			</group>
		))}
	</group>
);

/** Pigeon (bloc gris) qui picore. */
export const Pigeon: React.FC<{position?: V3; rotY?: number; f: number; seed?: number; scale?: number}> = ({position, rotY = 0, f, seed = 0, scale = 1}) => {
	const peck = Math.max(0, Math.sin(f * 0.35 + seed * 2.1)) ** 3;
	const hop = Math.abs(Math.sin(f * 0.11 + seed)) > 0.97 ? 0.06 : 0;
	return (
		<group position={[position?.[0] ?? 0, (position?.[1] ?? 0) + hop, position?.[2] ?? 0]} rotation={[0, rotY + Math.sin(f * 0.05 + seed) * 0.4, 0]} scale={scale}>
			<Box s={[0.26, 0.24, 0.42]} p={[0, 0.2, 0]} c="#8a8f9e" />
			<Box s={[0.2, 0.06, 0.2]} p={[0, 0.22, -0.28]} c="#6f7484" />
			<group position={[0, 0.34, 0.16]} rotation={[0.9 * peck, 0, 0]}>
				<Box s={[0.15, 0.17, 0.16]} p={[0, 0.06, 0.06]} c="#5d6275" />
				<Box s={[0.05, 0.04, 0.08]} p={[0, 0.05, 0.17]} c="#f2a33a" />
				<Box s={[0.155, 0.04, 0.04]} p={[0, 0.09, 0.1]} c="#111" />
			</group>
			{[-0.06, 0.06].map((x) => (
				<Box key={x} s={[0.03, 0.12, 0.03]} p={[x, 0.05, 0]} c="#f2a33a" />
			))}
		</group>
	);
};

/** Mallette (charnière à l'arrière). `open` 0 → 1. */
export const Briefcase: React.FC<{position?: V3; rotation?: V3; scale?: number; open?: number; letter?: boolean}> = ({position, rotation, scale = 1, open = 0, letter = true}) => (
	<group position={position} rotation={rotation} scale={scale}>
		<Box s={[0.9, 0.16, 0.62]} p={[0, 0.08, 0]} c="#5a3a1e" />
		<Box s={[0.82, 0.02, 0.54]} p={[0, 0.16, 0]} c="#2b2120" />
		{letter && open > 0.3 && <Letter position={[0.02, 0.18, 0.02]} rotation={[-Math.PI / 2, 0, 0.08]} scale={0.42} />}
		<group position={[0, 0.16, -0.31]} rotation={[-open * 1.9, 0, 0]}>
			<Box s={[0.9, 0.12, 0.62]} p={[0, 0.06, 0.31]} c="#6b4423" />
			<Box s={[0.08, 0.04, 0.05]} p={[-0.25, 0.06, 0.63]} c="#e3b23c" />
			<Box s={[0.08, 0.04, 0.05]} p={[0.25, 0.06, 0.63]} c="#e3b23c" />
		</group>
		{/* poignée (côté avant) */}
		<Box s={[0.3, 0.05, 0.05]} p={[0, 0.12, 0.36]} c="#3a2614" />
	</group>
);

const letterTex = () =>
	canvasTex('lettre', 512, 680, (g) => {
		g.fillStyle = '#fdfbf4';
		g.fillRect(0, 0, 512, 680);
		g.fillStyle = '#c9c4b5';
		for (let i = 0; i < 5; i++) g.fillRect(50, 70 + i * 34, 300 + ((i * 53) % 110), 12);
		g.fillStyle = '#c0162b';
		g.font = `64px ${FONT}`;
		g.textAlign = 'center';
		g.fillText('...VOUS ÊTES', 256, 340);
		g.fillText('LICENCIÉ...', 256, 410);
		g.fillStyle = '#c9c4b5';
		for (let i = 0; i < 4; i++) g.fillRect(50, 470 + i * 34, 330 + ((i * 41) % 90), 12);
		g.strokeStyle = '#1f4fd8';
		g.lineWidth = 6;
		g.beginPath();
		g.moveTo(300, 640);
		g.bezierCurveTo(340, 590, 380, 650, 440, 600);
		g.stroke();
	});

/** Lettre « ...VOUS ÊTES LICENCIÉ... » (lisible de face, +z). */
export const Letter: React.FC<{position?: V3; rotation?: V3; scale?: number}> = ({position, rotation, scale = 1}) => (
	<mesh position={position} rotation={rotation} scale={scale} castShadow>
		<planeGeometry args={[1.5, 2.0]} />
		<meshStandardMaterial map={letterTex()} side={THREE.DoubleSide} emissive="#ffffff" emissiveMap={letterTex()} emissiveIntensity={0.15} />
	</mesh>
);

/** Boîte à chaussures transformée en lit (papa de 20 cm y dort). */
export const ShoeBoxBed: React.FC<{position?: V3; rotY?: number; scale?: number}> = ({position, rotY = 0, scale = 1}) => {
	const label = textTexture('POINTURE 43', {bg: '#f4a261', fg: '#5b2c0f', w: 512, h: 128, lines: ['POINTURE 43']});
	return (
		<group position={position} rotation={[0, rotY, 0]} scale={scale}>
			<Box s={[1.4, 0.06, 0.8]} p={[0, 0.03, 0]} c="#e98a3c" />
			<Faced s={[1.4, 0.5, 0.05]} p={[0, 0.25, 0.38]} side="#e98a3c" map={label} />
			<Box s={[1.4, 0.5, 0.05]} p={[0, 0.25, -0.38]} c="#e98a3c" />
			<Box s={[0.05, 0.5, 0.8]} p={[-0.68, 0.25, 0]} c="#e98a3c" />
			<Box s={[0.05, 0.5, 0.8]} p={[0.68, 0.25, 0]} c="#e98a3c" />
			{/* couvercle posé contre */}
			<Box s={[1.46, 0.08, 0.86]} p={[0, 0.5, -0.75]} r={[1.2, 0, 0]} c="#f4a261" />
			{/* matelas = chaussette, oreiller = mouchoir */}
			<Box s={[1.25, 0.12, 0.66]} p={[0, 0.12, 0]} c="#ffffff" />
			<Box s={[0.32, 0.1, 0.4]} p={[-0.45, 0.22, 0]} c="#f1faee" />
			<Box s={[0.75, 0.06, 0.68]} p={[0.2, 0.25, 0]} c="#e63946" />
			<Box s={[0.75, 0.065, 0.1]} p={[0.2, 0.25, 0.1]} c="#ffffff" />
		</group>
	);
};

/** Pupitre officiel + micro géant. */
export const Podium: React.FC<{position?: V3; rotY?: number}> = ({position, rotY = 0}) => {
	const seal = textTexture('MAIRIE', {bg: '#1f4fd8', fg: '#ffffff', w: 512, h: 160, lines: ['MAIRIE']});
	return (
		<group position={position} rotation={[0, rotY, 0]}>
			<Box s={[1.4, 2.0, 0.9]} p={[0, 1.0, 0]} c="#7a4420" />
			<Faced s={[1.0, 0.32, 0.04]} p={[0, 1.45, 0.47]} side="#1f4fd8" map={seal} glow={0.1} />
			<Box s={[1.6, 0.12, 1.1]} p={[0, 2.06, 0]} c="#5b3214" />
			{/* micro géant, plus grand que le maire */}
			<group position={[0.35, 2.12, 0.1]}>
				<mesh position={[0, 0.25, 0]} material={M('#2b2b2b')}>
					<cylinderGeometry args={[0.025, 0.04, 0.5, 8]} />
				</mesh>
				<mesh position={[-0.06, 0.55, 0.02]} rotation={[0, 0, 0.5]} material={M('#3a3a3a')}>
					<cylinderGeometry args={[0.04, 0.04, 0.3, 8]} />
				</mesh>
				<mesh position={[-0.16, 0.7, 0.03]} material={M('#9aa0aa')}>
					<sphereGeometry args={[0.12, 14, 10]} />
				</mesh>
			</group>
		</group>
	);
};

/** Poubelle de rue. */
export const TrashCan: React.FC<{position?: V3; rotY?: number}> = ({position, rotY = 0}) => (
	<group position={position} rotation={[0, rotY, 0]}>
		<mesh position={[0, 0.75, 0]} material={M('#2e7d4f')} castShadow>
			<cylinderGeometry args={[0.55, 0.48, 1.5, 14]} />
		</mesh>
		<mesh position={[0, 1.55, 0]} material={M('#225e3b')} castShadow>
			<cylinderGeometry args={[0.6, 0.6, 0.12, 14]} />
		</mesh>
	</group>
);

/** Carnet de détective (tenu en main). */
export const Notebook: React.FC<{position?: V3; rotation?: V3; scale?: number}> = ({position, rotation, scale = 1}) => (
	<group position={position} rotation={rotation} scale={scale}>
		<Box s={[0.36, 0.48, 0.06]} c="#7b4dff" />
		<Box s={[0.32, 0.44, 0.065]} p={[0.01, 0, 0.002]} c="#ffffff" />
		<Box s={[0.2, 0.03, 0.07]} p={[0, 0.1, 0.004]} c="#1b1b1b" />
		<Box s={[0.24, 0.03, 0.07]} p={[0, 0.02, 0.004]} c="#1b1b1b" />
		<Box s={[0.16, 0.03, 0.07]} p={[0, -0.06, 0.004]} c="#1b1b1b" />
	</group>
);

/** Plat de lasagnes fumant. */
export const Lasagna: React.FC<{position?: V3; scale?: number; f?: number}> = ({position, scale = 1, f = 0}) => (
	<group position={position} scale={scale}>
		<Box s={[1.0, 0.24, 0.7]} p={[0, 0.12, 0]} c="#f1f1f1" />
		{[0, 1, 2].map((i) => (
			<Box key={i} s={[0.9, 0.05, 0.6]} p={[0, 0.12 + i * 0.07, 0]} c={i % 2 ? '#f7d774' : '#d1452e'} />
		))}
		<Box s={[0.9, 0.04, 0.6]} p={[0, 0.33, 0]} c="#f2b33d" />
		{[0, 1, 2].map((i) => (
			<mesh key={'s' + i} position={[-0.25 + i * 0.25, 0.5 + ((f / 30 + i * 0.3) % 1) * 0.5, 0]} material={M('#ffffff')} scale={0.06 + ((f / 30 + i * 0.3) % 1) * 0.05}>
				<sphereGeometry args={[1, 8, 6]} />
			</mesh>
		))}
	</group>
);

/** Doudou lapin. */
export const Bunny: React.FC<{position?: V3; rotation?: V3; scale?: number}> = ({position, rotation, scale = 1}) => (
	<group position={position} rotation={rotation} scale={scale}>
		<Box s={[0.3, 0.34, 0.24]} p={[0, 0, 0]} c="#f2e6f7" />
		<Box s={[0.26, 0.24, 0.24]} p={[0, 0.28, 0]} c="#f2e6f7" />
		<Box s={[0.07, 0.26, 0.05]} p={[-0.07, 0.52, 0]} c="#f2e6f7" />
		<Box s={[0.07, 0.26, 0.05]} p={[0.07, 0.52, 0]} c="#f2e6f7" />
		<Box s={[0.04, 0.18, 0.055]} p={[-0.07, 0.52, 0.001]} c="#ff9fc2" />
		<Box s={[0.04, 0.18, 0.055]} p={[0.07, 0.52, 0.001]} c="#ff9fc2" />
		<Box s={[0.04, 0.04, 0.25]} p={[-0.06, 0.3, 0.001]} c="#1b1b1b" />
		<Box s={[0.04, 0.04, 0.25]} p={[0.06, 0.3, 0.001]} c="#1b1b1b" />
	</group>
);

/** Effet « POUF » : boules qui jaillissent et s'effacent en 0,6 s (t en secondes depuis le pouf). */
export const Pouf: React.FC<{t: number; color?: string; size?: number; position?: V3; seed?: number}> = ({t, color = '#ffffff', size = 1, position, seed = 3}) => {
	const mat = useMemo(() => new THREE.MeshStandardMaterial({color, transparent: true, roughness: 1, depthWrite: false, emissive: color, emissiveIntensity: 0.25}), [color]);
	if (t < 0 || t > 0.7) return null;
	const R = rng(seed);
	const k = t / 0.7;
	mat.opacity = 0.95 * (1 - k);
	return (
		<group position={position} scale={size}>
			{Array.from({length: 14}).map((_, i) => {
				const a = R() * Math.PI * 2;
				const e = R() * 1.2 - 0.2;
				const r = (0.3 + R() * 0.9) * (0.3 + k * 1.4);
				const s = (0.25 + R() * 0.35) * (0.6 + k);
				return (
					<mesh key={i} material={mat} position={[Math.cos(a) * r, 0.6 + e * r, Math.sin(a) * r]} scale={s}>
						<sphereGeometry args={[1, 10, 8]} />
					</mesh>
				);
			})}
		</group>
	);
};

/** Larme bleue qui coule (t en s). Coordonnées locales de la tête. */
export const Tear: React.FC<{t: number; position?: V3; scale?: number}> = ({t, position = [0, 0, 0], scale = 1}) => {
	if (t < 0) return null;
	const y = -((t * 0.6) % 0.7);
	return (
		<mesh position={[position[0], position[1] + y * scale, position[2]]} scale={[0.07 * scale, 0.1 * scale, 0.07 * scale]}>
			<sphereGeometry args={[1, 10, 8]} />
			<meshStandardMaterial color="#4fb3ff" emissive="#1e88ff" emissiveIntensity={0.6} />
		</mesh>
	);
};

/**
 * PAPA — sa taille en cm (182 = normal). Le personnage rétrécit, mais son costume NON :
 * veste et pantalon de plus en plus trop grands, cravate qui traîne (effet comique).
 */
export const Papa: React.FC<Omit<CharacterProps, 'look'> & {look: CharacterLook; cm: number; fit?: boolean}> = ({look, cm, fit = false, position = [0, 0, 0], rotation, ...rest}) => {
	const base = look.scale ?? 1;
	const k = Math.max(0.05, cm / 182);
	const baggy = !fit && k < 0.97;
	// le costume ne suit qu'en partie : il reste beaucoup plus grand que papa
	const J = Math.min(1, Math.pow(k, 0.5)) * base;
	const S = k * base;
	const shoulder = 1.82 * S;
	const jacketH = Math.max(0.2, Math.min(1.25 * J, shoulder + 0.05));
	return (
		<group position={position} rotation={rotation}>
			<Character {...rest} look={{...look, scale: S, ...(baggy ? {shirt: look.shirt} : {})}} />
			{baggy && (
				<group>
					{/* veste trop grande, qui tombe des épaules */}
					<Box s={[1.1 * J, jacketH, 0.66 * J]} p={[0, shoulder + 0.06 * S - jacketH / 2, 0]} c={look.shirt} />
					<Box s={[0.42 * J, 0.5 * J, 0.02]} p={[0, shoulder + 0.06 * S - 0.25 * J, 0.335 * J]} c="#ffffff" />
					{/* cravate qui pend jusqu'au sol */}
					<Box s={[0.15 * J, Math.max(0.1, shoulder - 0.02), 0.03]} p={[0, (shoulder - 0.02) / 2 + 0.01, 0.35 * J]} c={look.tie ?? '#1f5fd6'} />
					{/* manches trop longues */}
					{[-1, 1].map((sd) => (
						<Box key={sd} s={[0.36 * J, Math.min(1.05 * J, shoulder), 0.4 * J]} p={[sd * 0.68 * J, Math.max(0.5 * Math.min(1.05 * J, shoulder), shoulder - 0.5 * 1.05 * J), 0.02]} c={look.shirt} />
					))}
					{/* pantalon en accordéon sur le sol */}
					{[-1, 1].map((sd) => (
						<Box key={'p' + sd} s={[0.5 * J, 0.1 * J, 1.3 * J]} p={[sd * 0.26 * J, 0.05 * J, 0.35 * J]} c={look.pants} />
					))}
				</group>
			)}
		</group>
	);
};

/** Cuisine (matin / soir) : table au centre (x=0, z=0), plan de travail au fond, frigo, fenêtre, porte à gauche. */
export const Kitchen: React.FC<{evening?: boolean; plates?: boolean; children?: React.ReactNode}> = ({evening = false, plates = true, children}) => {
	const floor = useMemo(() => {
		const t = stripesTexture('#f1e3c6', '#d9c49c', 2);
		return t;
	}, []);
	const tiles = useMemo(() => stripesTexture('#bfe3dc', '#a9d6cd', 24), []);
	const cloth = stripesTexture('#ffffff', '#ffb703', 14);
	return (
		<group>
			<mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
				<planeGeometry args={[16, 14]} />
				<meshStandardMaterial map={floor} />
			</mesh>
			<mesh position={[0, 3.2, -5]} receiveShadow>
				<planeGeometry args={[16, 6.4]} />
				<meshStandardMaterial map={tiles} />
			</mesh>
			{[-7, 7].map((x) => (
				<mesh key={x} position={[x, 3.2, 0]} rotation={[0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
					<planeGeometry args={[14, 6.4]} />
					<meshStandardMaterial color={evening ? '#e8c9a2' : '#fff1d6'} />
				</mesh>
			))}
			{/* plan de travail + placards */}
			<Box s={[7, 1.5, 1.1]} p={[1.5, 0.75, -4.4]} c="#ffffff" />
			<Box s={[7.1, 0.12, 1.2]} p={[1.5, 1.56, -4.4]} c="#5b6270" />
			{[0, 1, 2, 3].map((i) => (
				<Box key={i} s={[1.5, 1.2, 0.6]} p={[-1.0 + i * 1.7, 3.6, -4.65]} c="#ffd6a5" />
			))}
			{/* frigo */}
			<Box s={[1.5, 3.4, 1.2]} p={[-4.3, 1.7, -4.3]} c="#e9f2fb" />
			<Box s={[0.08, 0.7, 0.1]} p={[-3.75, 2.4, -3.68]} c="#9aa0aa" />
			{/* fenêtre */}
			<group position={[2.2, 3.4, -4.95]}>
				<Box s={[2.6, 1.8, 0.08]} c="#ffffff" />
				<Box s={[2.4, 1.6, 0.1]} c={evening ? '#ff9e5e' : '#9fdcff'} e={evening ? '#ff7a2f' : '#bfe6ff'} ei={0.6} />
			</group>
			{/* porte d'entrée (gauche) */}
			<group position={[-6.95, 0, -1.2]} rotation={[0, Math.PI / 2, 0]}>
				<Box s={[1.9, 3.5, 0.12]} p={[0, 1.75, 0]} c="#9c5a2e" />
				<Box s={[0.12, 0.12, 0.2]} p={[0.7, 1.7, 0.1]} c="#e3b23c" />
			</group>
			{/* table + 4 chaises */}
			<mesh position={[0, 1.25, 0]} castShadow receiveShadow>
				<boxGeometry args={[3.6, 0.14, 2.2]} />
				<meshStandardMaterial map={cloth} />
			</mesh>
			{[[-1.6, -0.9], [1.6, -0.9], [-1.6, 0.9], [1.6, 0.9]].map(([x, z], i) => (
				<Box key={i} s={[0.14, 1.2, 0.14]} p={[x, 0.6, z]} c="#8b5a2b" />
			))}
			{plates &&
				[[-1.0, -0.55], [1.0, -0.55], [-1.0, 0.55], [1.0, 0.55]].map(([x, z], i) => (
					<mesh key={'pl' + i} position={[x, 1.34, z]} material={M('#ffffff')}>
						<cylinderGeometry args={[0.3, 0.26, 0.04, 18]} />
					</mesh>
				))}
			{[[-2.3, 0, Math.PI / 2], [2.3, 0, -Math.PI / 2], [0, -1.6, 0], [0, 1.6, Math.PI]].map(([x, z, r], i) => (
				<group key={'ch' + i} position={[x, 0, z]} rotation={[0, r, 0]}>
					<mesh position={[0, 0.8, 0]} material={M('#c8945a')}>
						<boxGeometry args={[0.8, 0.1, 0.8]} />
					</mesh>
					<mesh position={[0, 1.3, -0.36]} material={M('#c8945a')}>
						<boxGeometry args={[0.8, 1.0, 0.1]} />
					</mesh>
				</group>
			))}
			<pointLight position={[0, 5.2, 0.5]} intensity={evening ? 22 : 10} distance={14} color={evening ? '#ffc27a' : '#fff6e0'} />
			<pointLight position={[2.2, 3.4, -3.5]} intensity={evening ? 4 : 10} distance={9} color={evening ? '#ff9e5e' : '#e6f4ff'} />
			{children}
		</group>
	);
};
