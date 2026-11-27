/**
 * Ép. 06 « Rapetipeto » — village citrouille (réutilisable).
 * Citrouilles PBR (côtes, brillant, taches, lumière qui traverse la peau) avec 3 états :
 *   health 1 = orange vivante · health 0 = ridée gris-vert affaissée · glow > 0 = regonflée brillante.
 */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {Character, CharacterLook} from './Character';
import {Puffs} from './Props';
import {rng, textTexture} from './textures';
import {noiseTex, LOOK} from './look';
import {FONT} from '../lib/fonts';

type V3 = [number, number, number];
const ORANGE = new THREE.Color('#ff7a12');
const ROT = new THREE.Color('#7f8a6a');

const ctex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]) => {
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
	if (repeat) {
		t.wrapS = t.wrapT = THREE.RepeatWrapping;
		t.repeat.set(repeat[0], repeat[1]);
	}
	c.set(key, t);
	return t;
};

/** Taches et nervures de la peau de citrouille (multiplie la couleur). */
const pumpkinSkin = () =>
	ctex('pskin', 512, 256, (g) => {
		g.fillStyle = '#ffffff';
		g.fillRect(0, 0, 512, 256);
		const R = rng(5);
		for (let i = 0; i < 900; i++) {
			g.fillStyle = `rgba(${120 + R() * 60},${70 + R() * 40},${20},${0.08 + R() * 0.15})`;
			g.beginPath();
			g.ellipse(R() * 512, R() * 256, 0.8 + R() * 2.5, 0.8 + R() * 1.8, R() * 3, 0, Math.PI * 2);
			g.fill();
		}
		for (let i = 0; i < 60; i++) {
			g.strokeStyle = `rgba(255,240,200,${0.12 + R() * 0.12})`;
			g.lineWidth = 1 + R() * 1.5;
			const x = R() * 512;
			g.beginPath();
			g.moveTo(x, 0);
			g.bezierCurveTo(x + 6, 80, x - 6, 170, x + 3, 256);
			g.stroke();
		}
	});

const geoCache = new Map<string, THREE.BufferGeometry>();
/** Géométrie de citrouille : côtes, creux aux pôles ; rides et affaissement quand elle pourrit. */
const pumpkinGeo = (health: number, ribs = 10, seed = 1) => {
	const h = Math.round(health * 20) / 20;
	const k = `${h}_${ribs}_${seed}`;
	let g = geoCache.get(k);
	if (g) return g;
	g = new THREE.SphereGeometry(1, 72, 48);
	const pos = g.attributes.position as THREE.BufferAttribute;
	const col = new Float32Array(pos.count * 3);
	const v = new THREE.Vector3();
	const rot = 1 - h;
	for (let i = 0; i < pos.count; i++) {
		v.fromBufferAttribute(pos, i);
		const th = Math.atan2(v.z, v.x);
		const yy = v.y;
		const ring = Math.sqrt(Math.max(0, 1 - yy * yy));
		const rib = Math.abs(Math.cos((ribs * th) / 2)); // 1 au sommet de la côte, 0 dans le creux
		const groove = Math.pow(1 - rib, 3);
		let r = 1 - 0.085 * groove * ring;
		// rides (pourriture)
		r += rot * 0.05 * Math.sin(th * 23 + yy * 17 + seed) * Math.sin(yy * 31 + th * 5) * ring;
		let y = yy * (0.78 - 0.26 * rot);
		// creux du pédoncule et du dessous
		y -= 0.16 * Math.pow(Math.max(0, yy), 12) - 0.1 * Math.pow(Math.max(0, -yy), 10);
		const bulge = 1 + 0.16 * rot * Math.max(0, -yy + 0.2); // s'affaisse et s'étale en bas
		v.set(v.x * r * bulge, y, v.z * r * bulge);
		pos.setXYZ(i, v.x, v.y, v.z);
		const shade = 0.72 + 0.28 * rib;
		col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = shade;
	}
	g.setAttribute('color', new THREE.BufferAttribute(col, 3));
	g.computeVertexNormals();
	geoCache.set(k, g);
	return g;
};

const matCache = new Map<string, THREE.Material>();
const pumpkinMat = (health: number, glow: number) => {
	const h = Math.round(health * 20) / 20;
	const gl = Math.round(glow * 10) / 10;
	const k = `${h}_${gl}_${LOOK.cine}`;
	let m = matCache.get(k);
	if (m) return m;
	const c = ORANGE.clone().lerp(ROT, 1 - h);
	if (LOOK.cine) {
		m = new THREE.MeshPhysicalMaterial({
			color: c, vertexColors: true, map: pumpkinSkin(), roughness: 0.42 + 0.45 * (1 - h), clearcoat: 0.35 * h, clearcoatRoughness: 0.4,
			sheen: 0.6 * h, sheenColor: new THREE.Color('#ffb066'), sheenRoughness: 0.5, bumpMap: noiseTex(7, 30, [3, 2]), bumpScale: 0.6 + 2 * (1 - h),
			// lumière qui traverse un peu la peau (subsurface simulé) + éclat quand elle revit
			emissive: new THREE.Color('#ff5a00'), emissiveIntensity: 0.07 * h + 0.9 * gl,
		});
	} else {
		m = new THREE.MeshStandardMaterial({color: c, vertexColors: true, roughness: 0.6, emissive: new THREE.Color('#ff5a00'), emissiveIntensity: 0.6 * gl});
	}
	matCache.set(k, m);
	return m;
};

/** Citrouille simple (sans maison). */
export const Pumpkin: React.FC<{position?: V3; scale?: number; health?: number; glow?: number; seed?: number; rotY?: number}> = ({position, scale = 1, health = 1, glow = 0, seed = 1, rotY = 0}) => {
	const sag = 1 - 0.18 * (1 - health);
	return (
		<group position={position} rotation={[0, rotY, 0]} scale={[scale, scale * sag, scale]}>
			<mesh geometry={pumpkinGeo(health, 10, seed)} material={pumpkinMat(health, glow)} position={[0, 0.78 - 0.26 * (1 - health), 0]} castShadow receiveShadow />
			<mesh position={[0.03, 1.5 - 0.3 * (1 - health), 0]} rotation={[0, 0, -0.35 - 0.6 * (1 - health)]} castShadow>
				<cylinderGeometry args={[0.07, 0.12, 0.42, 8]} />
				<meshStandardMaterial color={health > 0.5 ? '#5a6b2a' : '#4a4a3a'} roughness={0.8} />
			</mesh>
		</group>
	);
};

const doorTex = () =>
	ctex('door', 256, 256, (g) => {
		g.fillStyle = '#7a4a22';
		g.fillRect(0, 0, 256, 256);
		for (let x = 0; x < 256; x += 42) {
			g.fillStyle = x % 84 ? '#6a3f1c' : '#82502a';
			g.fillRect(x, 0, 40, 256);
			g.strokeStyle = 'rgba(40,20,5,0.5)';
			g.lineWidth = 3;
			g.strokeRect(x, 0, 42, 256);
		}
		g.fillStyle = '#d9a640';
		g.beginPath();
		g.arc(200, 140, 10, 0, Math.PI * 2);
		g.fill();
	});

/**
 * Maison-citrouille : porte ronde, 2 fenêtres, cheminée qui fume.
 * size : 's' | 'm' | 'l' · health 0..1 · glow (éclat orange quand elle se regonfle) · lit : fenêtres allumées.
 */
export const PumpkinHouse: React.FC<{
	position?: V3; rotY?: number; size?: 's' | 'm' | 'l'; health?: number; glow?: number; lit?: number; f?: number; seed?: number; smoke?: boolean; pop?: number;
}> = ({position, rotY = 0, size = 'm', health = 1, glow = 0, lit = 0, f = 0, seed = 1, smoke = true, pop = 1}) => {
	const R = {s: 2.3, m: 3.0, l: 3.8}[size];
	const sag = 1 - 0.18 * (1 - health);
	const H = R * (0.78 - 0.26 * (1 - health)) * sag; // demi-hauteur
	const surf = (ang: number, y: number): V3 => {
		const rr = R * Math.sqrt(Math.max(0.05, 1 - Math.pow(y / (H * 1.02), 2))) * 0.985;
		return [Math.sin(ang) * rr, H + y, Math.cos(ang) * rr];
	};
	const winCol = new THREE.Color('#ffcf6a');
	return (
		<group position={position} rotation={[0, rotY, 0]} scale={pop}>
			<mesh geometry={pumpkinGeo(health, 12, seed)} material={pumpkinMat(health, glow)} position={[0, H, 0]} scale={[R, R * sag, R]} castShadow receiveShadow />
			{/* tige */}
			<mesh position={[0.1 * R, 2 * H - 0.05 * R + 0.25 * R * (1 - 0.6 * (1 - health)), 0]} rotation={[0.2, 0, -0.4 - 0.7 * (1 - health)]} castShadow>
				<cylinderGeometry args={[0.09 * R, 0.16 * R, 0.55 * R, 10]} />
				<meshStandardMaterial color={health > 0.5 ? '#5d6e2c' : '#4b4a3c'} roughness={0.85} bumpMap={noiseTex(9, 40, [1, 3])} bumpScale={1.5} />
			</mesh>
			{/* porte ronde */}
			<group position={surf(0, -H + 0.52 * R * 0.55)} rotation={[0, 0, 0]}>
				<mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
					<cylinderGeometry args={[0.38 * R * 0.6, 0.38 * R * 0.6, 0.12, 28]} />
					<meshStandardMaterial map={doorTex()} roughness={0.8} bumpMap={noiseTex(4, 50, [1, 2])} bumpScale={1.2} />
				</mesh>
				<mesh position={[0, 0, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
					<torusGeometry args={[0.38 * R * 0.6, 0.05, 8, 28]} />
					<meshStandardMaterial color="#5a3a1a" />
				</mesh>
			</group>
			{/* fenêtres */}
			{[-0.62, 0.62].map((a, i) => (
				<group key={i} position={surf(a, 0.15 * R)} rotation={[0, a, 0]}>
					<mesh rotation={[Math.PI / 2, 0, 0]}>
						<cylinderGeometry args={[0.2 * R, 0.2 * R, 0.1, 20]} />
						<meshStandardMaterial color={lit > 0 ? '#ffd27a' : '#2a3a4a'} emissive={winCol} emissiveIntensity={lit * 1.4} roughness={0.15} metalness={0.1} />
					</mesh>
					<mesh position={[0, 0, 0.04]}>
						<torusGeometry args={[0.2 * R, 0.035, 8, 20]} />
						<meshStandardMaterial color="#3a2614" />
					</mesh>
					<mesh position={[0, 0, 0.05]}>
						<boxGeometry args={[0.03, 0.4 * R, 0.02]} />
						<meshStandardMaterial color="#3a2614" />
					</mesh>
				</group>
			))}
			{lit > 0 && <pointLight position={[0, H * 0.9, R * 1.2]} intensity={6 * lit} distance={R * 3} color="#ffbf6a" />}
			{/* cheminée */}
			<group position={[-0.42 * R, 2 * H - 0.18 * R, -0.25 * R]}>
				<mesh castShadow>
					<cylinderGeometry args={[0.17 * R, 0.2 * R, 0.7 * R, 10]} />
					<meshStandardMaterial color="#8a8178" roughness={0.95} bumpMap={noiseTex(12, 60, [2, 2])} bumpScale={2} />
				</mesh>
				{smoke && health > 0.3 && (
					<group position={[0, 0.4 * R, 0]}>
						<Puffs t={f / 70 + seed * 0.37} count={8} color="#e9e2da" spread={0.25 * R} rise={1.6 * R} seed={seed + 3} size={0.09 * R} opacity={0.35} />
					</group>
				)}
			</group>
		</group>
	);
};

/** Panneau en bois sur deux poteaux. */
export const WoodSign: React.FC<{lines: string[]; position?: V3; rotY?: number; w?: number; h?: number; bg?: string; fg?: string; post?: number}> = ({
	lines, position, rotY = 0, w = 4.6, h = 2.0, bg = '#c8873e', fg = '#3a1a05', post = 1.8,
}) => {
	const tex = textTexture(lines.join('|'), {bg, fg, w: 1024, h: Math.round((1024 * h) / w), border: '#5a3010', lines});
	return (
		<group position={position} rotation={[0, rotY, 0]}>
			{[-w * 0.4, w * 0.4].map((x) => (
				<mesh key={x} position={[x, (post + h) / 2, -0.12]} castShadow>
					<boxGeometry args={[0.22, post + h, 0.22]} />
					<meshStandardMaterial color="#5a3a1c" roughness={0.9} bumpMap={noiseTex(4, 50, [1, 4])} bumpScale={1.5} />
				</mesh>
			))}
			<mesh position={[0, post + h / 2, 0]} castShadow>
				<boxGeometry args={[w, h, 0.14]} />
				{[0, 1, 2, 3, 5].map((i) => (
					<meshStandardMaterial key={i} attach={`material-${i}`} color="#6a4220" roughness={0.9} />
				))}
				<meshStandardMaterial attach="material-4" map={tex} roughness={0.85} bumpMap={noiseTex(4, 40, [2, 1])} bumpScale={0.8} />
			</mesh>
		</group>
	);
};

/** Affiche officielle (papier) — « CHANSON INTERDITE ». */
export const Poster: React.FC<{lines: string[]; position?: V3; rotation?: V3; w?: number; h?: number; slam?: number}> = ({lines, position, rotation, w = 1.6, h = 2.1, slam = 1}) => {
	const tex = textTexture(lines.join('|'), {bg: '#fff6dc', fg: '#c0162b', w: 512, h: Math.round((512 * h) / w), border: '#c0162b', lines});
	return (
		<mesh position={position} rotation={rotation} scale={[slam, slam, 1]} castShadow>
			<planeGeometry args={[w, h]} />
			<meshStandardMaterial map={tex} roughness={0.9} side={THREE.DoubleSide} />
		</mesh>
	);
};

/** Lampion en papier. */
export const Lantern: React.FC<{position?: V3; color?: string; lit?: number; s?: number}> = ({position, color = '#ff8a2a', lit = 0.8, s = 1}) => (
	<group position={position} scale={s}>
		<mesh>
			<sphereGeometry args={[0.28, 14, 10]} />
			<meshStandardMaterial color={color} emissive={color} emissiveIntensity={lit} roughness={0.7} transparent opacity={0.95} />
		</mesh>
		<mesh position={[0, 0.3, 0]}>
			<cylinderGeometry args={[0.12, 0.12, 0.06, 10]} />
			<meshStandardMaterial color="#2a2a2a" />
		</mesh>
	</group>
);

/** Kiosque à musique (octogonal) + guirlandes de lampions vers les mâts. */
export const Kiosk: React.FC<{position?: V3; f?: number; lit?: number; poster?: number}> = ({position = [0, 0, 0], f = 0, lit = 0.8, poster = 0}) => {
	const posts = Array.from({length: 8}).map((_, i) => (i / 8) * Math.PI * 2 + Math.PI / 8);
	const lanterns: V3[] = [];
	const cols = ['#ff8a2a', '#ffcf3a', '#e63946', '#ff6b1a'];
	// guirlandes : du toit vers 6 mâts autour
	const masts = Array.from({length: 6}).map((_, i) => (i / 6) * Math.PI * 2);
	masts.forEach((a) => {
		for (let k = 1; k < 7; k++) {
			const u = k / 7;
			const rr = 3.4 + u * 6.6;
			lanterns.push([Math.sin(a) * rr, 4.6 - u * 1.2 - Math.sin(u * Math.PI) * 0.8, Math.cos(a) * rr]);
		}
	});
	return (
		<group position={position}>
			<mesh position={[0, 0.35, 0]} castShadow receiveShadow>
				<cylinderGeometry args={[3.6, 3.8, 0.7, 8]} />
				<meshStandardMaterial color="#b9a38a" roughness={0.95} bumpMap={noiseTex(15, 60, [4, 1])} bumpScale={2} />
			</mesh>
			<mesh position={[0, 0.72, 0]} receiveShadow>
				<cylinderGeometry args={[3.5, 3.5, 0.06, 8]} />
				<meshStandardMaterial color="#8a5a32" roughness={0.8} bumpMap={noiseTex(4, 50, [6, 6])} bumpScale={1} />
			</mesh>
			{posts.map((a, i) => (
				<mesh key={i} position={[Math.sin(a) * 3.2, 2.6, Math.cos(a) * 3.2]} castShadow>
					<cylinderGeometry args={[0.1, 0.12, 3.8, 8]} />
					<meshStandardMaterial color="#f3ead8" roughness={0.6} />
				</mesh>
			))}
			{/* garde-corps */}
			{posts.map((a, i) => {
				const b = a + Math.PI / 4;
				const m = (a + b) / 2;
				return (
					<mesh key={'r' + i} position={[Math.sin(m) * 3.05, 1.3, Math.cos(m) * 3.05]} rotation={[0, m, 0]}>
						<boxGeometry args={[2.4, 0.08, 0.08]} />
						<meshStandardMaterial color="#f3ead8" />
					</mesh>
				);
			})}
			{/* toit */}
			<mesh position={[0, 5.0, 0]} castShadow>
				<coneGeometry args={[4.3, 1.9, 8]} />
				<meshStandardMaterial color="#c8461a" roughness={0.7} bumpMap={noiseTex(16, 60, [6, 2])} bumpScale={1.5} />
			</mesh>
			<mesh position={[0, 6.2, 0]}>
				<sphereGeometry args={[0.28, 12, 10]} />
				<meshStandardMaterial color="#e3b23c" metalness={0.7} roughness={0.3} />
			</mesh>
			{masts.map((a, i) => (
				<mesh key={'m' + i} position={[Math.sin(a) * 10, 1.9, Math.cos(a) * 10]} castShadow>
					<cylinderGeometry args={[0.07, 0.09, 3.8, 6]} />
					<meshStandardMaterial color="#4a3020" />
				</mesh>
			))}
			{lanterns.map((p, i) => (
				<Lantern key={i} position={p} color={cols[i % 4]} lit={lit * (0.8 + 0.2 * Math.sin(f / 12 + i))} s={0.9} />
			))}
			{poster > 0 && <Poster lines={['CHANSON', 'INTERDITE', '—', 'AMENDE :', '100 CITROUILLES']} position={[0, 2.3, 3.32]} rotation={[0, Math.PI / 8 * 0, 0]} w={1.5} h={1.9} slam={poster} />}
		</group>
	);
};

/** Arbre d'automne (feuillage en boules ocre/orange). */
export const AutumnTree: React.FC<{position?: V3; s?: number; seed?: number; f?: number}> = ({position, s = 1, seed = 1, f = 0}) => {
	const R = rng(seed);
	const cols = ['#d9771e', '#c4501a', '#e3a230', '#b8862a', '#8fa03a'];
	const blobs = Array.from({length: 7}).map(() => [(R() - 0.5) * 2.4, 3.6 + R() * 1.8, (R() - 0.5) * 2.4, 0.9 + R() * 0.7, cols[Math.floor(R() * cols.length)]] as const);
	const sway = Math.sin(f / 40 + seed) * 0.03;
	return (
		<group position={position} scale={s} rotation={[0, 0, sway]}>
			<mesh position={[0, 1.6, 0]} castShadow>
				<cylinderGeometry args={[0.18, 0.3, 3.2, 8]} />
				<meshStandardMaterial color="#5a3a22" roughness={0.95} bumpMap={noiseTex(18, 70, [1, 4])} bumpScale={2} />
			</mesh>
			{blobs.map(([x, y, z, r, c], i) => (
				<mesh key={i} position={[x, y, z]} castShadow>
					<icosahedronGeometry args={[r, 1]} />
					<meshStandardMaterial color={c} roughness={0.85} flatShading bumpMap={noiseTex(19, 60, [2, 2])} bumpScale={1} />
				</mesh>
			))}
		</group>
	);
};

/** Feuilles mortes qui tombent autour d'un point (déterministe : même image à chaque rendu). */
export const FallingLeaves: React.FC<{center: V3; f: number; n?: number; spread?: number; wind?: number}> = ({center, f, n = 26, spread = 6, wind = 1}) => {
	const R = rng(77);
	const cols = ['#d9771e', '#c4501a', '#e3a230', '#a8481a'];
	const mats = useMemo(() => cols.map((c) => new THREE.MeshStandardMaterial({color: c, side: THREE.DoubleSide, roughness: 0.8})), []);
	return (
		<group position={center}>
			{Array.from({length: n}).map((_, i) => {
				const x0 = (R() - 0.5) * spread * 2;
				const z0 = (R() - 0.5) * spread * 2;
				const sp = 0.012 + R() * 0.01;
				const ph = R() * 10;
				const y = 7 - ((f * sp + R() * 7) % 7);
				return (
					<mesh key={i} material={mats[i % 4]} position={[x0 + Math.sin(f / 20 + ph) * 0.6 + wind * (7 - y) * 0.15, y, z0 + Math.cos(f / 25 + ph) * 0.4]}
						rotation={[f / 14 + ph, f / 19 + ph, f / 23]}>
						<planeGeometry args={[0.22, 0.15]} />
					</mesh>
				);
			})}
		</group>
	);
};

/** Touffes d'herbe qui bougent au vent. */
export const Grass: React.FC<{center: V3; f: number; n?: number; r?: number; seed?: number}> = ({center, f, n = 120, r = 8, seed = 3}) => {
	const ref = React.useRef<THREE.InstancedMesh>(null);
	const R = rng(seed);
	const pts = useMemo(() => Array.from({length: n}).map(() => [(R() - 0.5) * 2 * r, (R() - 0.5) * 2 * r, 0.5 + R() * 0.7, R() * 6] as const), [n, r]);
	const geo = useMemo(() => {
		const g = new THREE.ConeGeometry(0.06, 0.5, 4, 1);
		g.translate(0, 0.25, 0);
		return g;
	}, []);
	const mat = useMemo(() => new THREE.MeshStandardMaterial({color: '#6f8f3a', roughness: 0.9}), []);
	React.useLayoutEffect(() => {
		const m = new THREE.Matrix4();
		const q = new THREE.Quaternion();
		pts.forEach(([x, z, s, ph], i) => {
			q.setFromEuler(new THREE.Euler(Math.sin(f / 18 + ph + x * 0.2) * 0.25, ph, 0));
			m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s, s));
			ref.current?.setMatrixAt(i, m);
		});
		if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
	});
	return <instancedMesh ref={ref} args={[geo, mat, n]} position={center} castShadow />;
};

/** Pluie : traits qui tombent autour de la caméra + gouttes. */
export const Rain: React.FC<{center: V3; f: number; n?: number; r?: number}> = ({center, f, n = 420, r = 9}) => {
	const ref = React.useRef<THREE.InstancedMesh>(null);
	const R = rng(91);
	const pts = useMemo(() => Array.from({length: n}).map(() => [(R() - 0.5) * 2 * r, (R() - 0.5) * 2 * r, R() * 12, 0.8 + R() * 0.5] as const), [n, r]);
	const geo = useMemo(() => new THREE.BoxGeometry(0.012, 0.55, 0.012), []);
	const mat = useMemo(() => new THREE.MeshBasicMaterial({color: '#bcd0ff', transparent: true, opacity: 0.45, fog: false}), []);
	React.useLayoutEffect(() => {
		const m = new THREE.Matrix4();
		const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.12));
		pts.forEach(([x, z, y0, sp], i) => {
			const y = 12 - ((y0 + f * 0.55 * sp) % 12);
			m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
			ref.current?.setMatrixAt(i, m);
		});
		if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
	});
	return <instancedMesh ref={ref} args={[geo, mat, n]} position={center} />;
};

/** Flaque qui reflète (sol très lisse) + ronds de pluie. */
export const Puddle: React.FC<{position?: V3; r?: number; f?: number; rain?: boolean}> = ({position, r = 1.2, f = 0, rain = false}) => (
	<group position={position}>
		<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
			<circleGeometry args={[r, 32]} />
			<meshStandardMaterial color="#2a3346" roughness={0.04} metalness={0.35} />
		</mesh>
		{rain &&
			[0, 1, 2].map((i) => {
				const u = ((f / 20 + i * 0.37) % 1);
				return (
					<mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[Math.sin(i * 2.1) * r * 0.4, 0.04, Math.cos(i * 1.7) * r * 0.4]}>
						<ringGeometry args={[u * 0.5, u * 0.5 + 0.02, 24]} />
						<meshBasicMaterial color="#cfe0ff" transparent opacity={0.6 * (1 - u)} />
					</mesh>
				);
			})}
	</group>
);

/** Grenouille (cubique) qui saute de temps en temps. */
export const Frog: React.FC<{position?: V3; rotY?: number; f?: number; seed?: number; s?: number}> = ({position = [0, 0, 0], rotY = 0, f = 0, seed = 0, s = 1}) => {
	const cyc = (f + seed * 13) % 45;
	const hop = cyc < 12 ? Math.sin((cyc / 12) * Math.PI) : 0;
	const fwd = Math.floor((f + seed * 13) / 45) * 0.35 + (cyc < 12 ? (cyc / 12) * 0.35 : 0.35);
	const throat = 1 + 0.25 * Math.max(0, Math.sin(f * 0.5 + seed)) * (cyc > 20 ? 1 : 0);
	return (
		<group position={[position[0] + Math.sin(rotY) * fwd, position[1] + hop * 0.45 * s, position[2] + Math.cos(rotY) * fwd]} rotation={[-hop * 0.4, rotY, 0]} scale={s}>
			<mesh position={[0, 0.14, 0]} castShadow>
				<boxGeometry args={[0.34, 0.22, 0.4]} />
				<meshStandardMaterial color="#4f9a3a" roughness={0.35} />
			</mesh>
			<mesh position={[0, 0.07, 0.14]} scale={[1, throat, 1]}>
				<boxGeometry args={[0.24, 0.08, 0.14]} />
				<meshStandardMaterial color="#d9e8a0" />
			</mesh>
			{[-0.1, 0.1].map((x) => (
				<group key={x} position={[x, 0.29, 0.1]}>
					<mesh>
						<sphereGeometry args={[0.07, 10, 8]} />
						<meshStandardMaterial color="#ffffff" roughness={0.2} />
					</mesh>
					<mesh position={[0, 0.01, 0.05]}>
						<sphereGeometry args={[0.035, 8, 6]} />
						<meshStandardMaterial color="#111" roughness={0.1} />
					</mesh>
				</group>
			))}
			{[-0.16, 0.16].map((x) => (
				<mesh key={'l' + x} position={[x, 0.06, -0.1 + hop * 0.1]} rotation={[hop * 0.8, 0, 0]}>
					<boxGeometry args={[0.1, 0.08, 0.26]} />
					<meshStandardMaterial color="#3f8a2e" />
				</mesh>
			))}
		</group>
	);
};

/** Botte de foin (cachette). */
export const HayBale: React.FC<{position?: V3; rotY?: number}> = ({position, rotY = 0}) => {
	const straw = ctex('straw', 256, 256, (g) => {
		g.fillStyle = '#d8b25a';
		g.fillRect(0, 0, 256, 256);
		const R = rng(31);
		for (let i = 0; i < 700; i++) {
			g.strokeStyle = `rgba(${150 + R() * 90},${110 + R() * 70},${30 + R() * 30},0.8)`;
			g.lineWidth = 1 + R();
			const x = R() * 256;
			const y = R() * 256;
			g.beginPath();
			g.moveTo(x, y);
			g.lineTo(x + (R() - 0.5) * 30, y + (R() - 0.5) * 8);
			g.stroke();
		}
	}, [2, 1]);
	return (
		<group position={position} rotation={[0, rotY, 0]}>
			<mesh position={[0, 0.75, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
				<cylinderGeometry args={[0.75, 0.75, 1.9, 24]} />
				<meshStandardMaterial map={straw} roughness={1} bumpMap={straw} bumpScale={2} />
			</mesh>
		</group>
	);
};

/** Le village citrouille : place pavée, kiosque au centre, maisons-citrouilles en cercle, arbres d'automne. */
export type HouseSpot = {p: V3; size: 's' | 'm' | 'l'; seed: number};
export const HOUSES: HouseSpot[] = (() => {
	const R = rng(64);
	const out: HouseSpot[] = [];
	const n = 16;
	for (let i = 0; i < n; i++) {
		const a = (i / n) * Math.PI * 2 + (R() - 0.5) * 0.15;
		const rr = 15 + (i % 3) * 3.5 + R() * 2;
		out.push({p: [Math.sin(a) * rr, 0, Math.cos(a) * rr], size: (['m', 'l', 's'] as const)[i % 3], seed: i + 1});
	}
	return out;
})();
/** maison de Grisou */
export const GRISOU_HOUSE = 5;
export const LEON_HOUSE = 0;

const groundTex = () =>
	ctex('ground', 512, 512, (g) => {
		g.fillStyle = '#7c8a3c';
		g.fillRect(0, 0, 512, 512);
		const R = rng(8);
		for (let i = 0; i < 5000; i++) {
			const c = ['#6d7c33', '#8a9a46', '#9a8a3a', '#a8742a', '#5f6e2c'][Math.floor(R() * 5)];
			g.fillStyle = c;
			g.fillRect(R() * 512, R() * 512, 2 + R() * 4, 2 + R() * 4);
		}
	}, [40, 40]);
const cobbleTex2 = () =>
	ctex('cobble2', 512, 512, (g) => {
		g.fillStyle = '#6e655c';
		g.fillRect(0, 0, 512, 512);
		const R = rng(12);
		for (let y = 0; y < 512; y += 32)
			for (let x = (y / 32) % 2 ? 16 : 0; x < 512; x += 32) {
				const v = 150 + R() * 50;
				g.fillStyle = `rgb(${v},${v - 12},${v - 26})`;
				g.beginPath();
				g.roundRect(x + 2, y + 2, 28, 28, 8);
				g.fill();
			}
	}, [10, 10]);

export const PumpkinVillage: React.FC<{
	f: number; health?: (i: number) => number; glow?: (i: number) => number; pop?: (i: number) => number; lit?: number; kiosk?: boolean; poster?: number; wet?: boolean; children?: React.ReactNode;
}> = ({f, health = () => 1, glow = () => 0, pop = () => 1, lit = 0, kiosk = true, poster = 0, wet = false, children}) => {
	const trees = useMemo(() => {
		const R = rng(21);
		return Array.from({length: 26}).map((_, i) => {
			const a = R() * Math.PI * 2;
			const d = 27 + R() * 26;
			return {p: [Math.sin(a) * d, 0, Math.cos(a) * d] as V3, s: 1 + R() * 0.8, seed: i + 2};
		});
	}, []);
	return (
		<group>
			<mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
				<planeGeometry args={[400, 400]} />
				<meshStandardMaterial map={groundTex()} roughness={wet ? 0.35 : 0.95} bumpMap={noiseTex(2, 60, [60, 60])} bumpScale={1.5} />
			</mesh>
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
				<circleGeometry args={[11.5, 64]} />
				<meshStandardMaterial map={cobbleTex2()} roughness={wet ? 0.18 : 0.85} metalness={wet ? 0.15 : 0} bumpMap={cobbleTex2()} bumpScale={1.5} />
			</mesh>
			{kiosk && <Kiosk f={f} lit={lit > 0 ? 1.2 : 0.6} poster={poster} />}
			{HOUSES.map((h, i) => (
				<PumpkinHouse key={i} position={h.p} rotY={Math.atan2(-h.p[0], -h.p[2])} size={h.size} seed={h.seed} health={health(i)} glow={glow(i)} pop={pop(i)} lit={lit} f={f} />
			))}
			{trees.map((t, i) => (
				<AutumnTree key={i} position={t.p} s={t.s} seed={t.seed} f={f} />
			))}
			{children}
		</group>
	);
};

/** Foule du village (pulls d'automne). */
export const AUTUMN = ['#c8622a', '#d9a400', '#7a3e22', '#a0522d', '#6b8e23', '#b5651d', '#8b3a3a', '#d2691e', '#556b2f', '#cd853f'];
export const autumnVillager = (i: number): CharacterLook => ({
	skin: ['#ffd2b3', '#f0bf96', '#d9a07a', '#a8714e', '#ffe0c7', '#c98b62'][(i * 7) % 6],
	shirt: AUTUMN[(i * 3 + 1) % AUTUMN.length],
	pants: ['#3a3a48', '#4a3b2a', '#2f3e5c', '#3d2b1f'][i % 4],
	hair: ['#2b1b10', '#7a3e12', '#e0b04a', '#1f1f1f', '#b9b9b9', '#a0391b'][(i * 5) % 6],
	hairStyle: (['short', 'long', 'bun', 'spiky', 'bald'] as const)[(i * 11) % 5],
	hat: i % 4 === 0 ? 'beanie' : 'none',
	hatColor: AUTUMN[(i * 7 + 3) % AUTUMN.length],
	scale: 0.88 + ((i * 37) % 17) / 100,
});
export const Villager: React.FC<{i: number; position: V3; rotY?: number; f?: number; sing?: number; frozen?: boolean; umbrella?: boolean}> = ({i, position, rotY = 0, f = 0, sing = 0, frozen = false, umbrella = false}) => (
	<Character look={autumnVillager(i)} position={position} rotation={[0, rotY, 0]} emotion={frozen ? 'surprised' : sing ? 'happy' : 'neutral'}
		mouthOpen={frozen ? 0.9 : sing * (0.4 + 0.6 * Math.abs(Math.sin(f * 0.35 + i)))} bob={sing ? Math.abs(Math.sin(f * 0.2 + i)) * 0.06 : 0}
		pose={umbrella ? {armR: [-2.4, -0.1]} : sing ? {armL: [-0.3 - 0.3 * Math.sin(f * 0.2 + i), 0.3], armR: [-0.3 - 0.3 * Math.sin(f * 0.2 + i + 1), -0.3]} : undefined}>
		{umbrella && (
			<group position={[0, -0.1, 0]} rotation={[Math.PI, 0, 0]}>
				<mesh position={[0, -1.0, 0]}>
					<cylinderGeometry args={[0.03, 0.03, 2.0, 6]} />
					<meshStandardMaterial color="#222" />
				</mesh>
				<mesh position={[0, -2.0, 0]} rotation={[Math.PI, 0, 0]} castShadow>
					<coneGeometry args={[1.1, 0.45, 10, 1, true]} />
					<meshStandardMaterial color={AUTUMN[i % AUTUMN.length]} side={THREE.DoubleSide} roughness={0.4} />
				</mesh>
			</group>
		)}
	</Character>
);

export const FONT_ = FONT;
