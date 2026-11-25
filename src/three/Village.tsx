import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useCurrentFrame} from 'remotion';
import {M} from './Character';
import {cobbleTexture, grassTexture, rng, stripesTexture, textTexture, woodTexture} from './textures';

/** Repères du village (pour viser la caméra depuis les plans). */
export const PLACES = {
	fountain: new THREE.Vector3(0, 0, 0),
	bakery: new THREE.Vector3(-9, 0, -2),
	bakeryDoor: new THREE.Vector3(-6.3, 0, -2),
	mairie: new THREE.Vector3(9.5, 0, -3),
	estrade: new THREE.Vector3(5.8, 0, -3),
	church: new THREE.Vector3(0, 0, -14),
	belfry: new THREE.Vector3(0, 11.4, -14),
	belvedere: new THREE.Vector3(16, 0, -22),
};

type V3 = [number, number, number];

const Box: React.FC<{s: V3; p?: V3; r?: V3; c: string; map?: THREE.Texture; emissive?: string; e?: number}> = ({
	s, p, r, c, map, emissive, e = 0,
}) => {
	const material = useMemo(
		() =>
			map || emissive
				? new THREE.MeshStandardMaterial({color: c, map, roughness: 0.8, emissive: emissive ?? '#000', emissiveIntensity: e})
				: M(c),
		[c, map, emissive, e],
	);
	return (
		<mesh position={p} rotation={r} castShadow receiveShadow material={material}>
			<boxGeometry args={s} />
		</mesh>
	);
};

/** Maison à pignon : murs + toit à deux pans + fenêtres à volets + balcon. */
export const Chalet: React.FC<{
	w?: number;
	d?: number;
	h?: number;
	wall?: string;
	stone?: string;
	roof?: string;
	shutter?: string;
	position?: V3;
	rotY?: number;
	balcony?: boolean;
	night?: boolean;
	floors?: number;
	children?: React.ReactNode;
}> = ({w = 5, d = 5, h = 5, wall = '#c8864a', stone = '#e9dfcf', roof = '#8f3b22', shutter = '#2e8b57', position = [0, 0, 0], rotY = 0, balcony = true, night = false, floors = 2, children}) => {
	const ridge = w * 0.42;
	const geom = useMemo(() => {
		const s = new THREE.Shape();
		s.moveTo(-w / 2, 0);
		s.lineTo(w / 2, 0);
		s.lineTo(w / 2, h);
		s.lineTo(0, h + ridge);
		s.lineTo(-w / 2, h);
		s.closePath();
		const g = new THREE.ExtrudeGeometry(s, {depth: d, bevelEnabled: false});
		g.translate(0, 0, -d / 2);
		return g;
	}, [w, d, h, ridge]);
	const wallMat = useMemo(
		() => new THREE.MeshStandardMaterial({color: '#ffffff', map: woodTexture(wall, [w / 3, h / 3]), roughness: 0.85}),
		[wall, w, h],
	);
	const a = Math.atan2(ridge, w / 2);
	const L = Math.hypot(w / 2, ridge) + 0.9;
	const winC = night ? '#ffd76a' : '#3d6fa8';
	const winE = night ? 1.4 : 0;
	const storey = h / floors;
	const cols = Math.max(2, Math.round(w / 2.2));
	return (
		<group position={position} rotation={[0, rotY, 0]}>
			{/* soubassement en pierre */}
			<Box s={[w + 0.06, storey * 0.95, d + 0.06]} p={[0, (storey * 0.95) / 2, 0]} c={stone} />
			<mesh geometry={geom} material={wallMat} castShadow receiveShadow />
			{/* toit */}
			{[-1, 1].map((sd) => (
				<group key={sd} position={[0, h + ridge, 0]} rotation={[0, 0, -sd * a]}>
					<Box s={[L, 0.3, d + 1.2]} p={[(sd * L) / 2 - sd * 0.15, 0.15, 0]} c={roof} />
				</group>
			))}
			{/* fenêtres façade avant (+z) et arrière */}
			{Array.from({length: floors}).map((_, f) =>
				Array.from({length: cols}).map((__, i) => {
					const x = -w / 2 + ((i + 0.5) * w) / cols;
					const y = storey * f + storey * 0.55;
					if (f === 0 && i === Math.floor(cols / 2)) {
						return (
							<group key={`${f}-${i}`}>
								<Box s={[1.1, 2.0, 0.12]} p={[x, 1.0, d / 2 + 0.03]} c="#6b3d1f" />
								<Box s={[0.12, 0.12, 0.1]} p={[x + 0.35, 1.0, d / 2 + 0.12]} c="#ffd23f" />
							</group>
						);
					}
					return (
						<group key={`${f}-${i}`} position={[x, y, d / 2 + 0.02]}>
							<Box s={[1.0, 1.1, 0.1]} c="#ffffff" />
							<Box s={[0.8, 0.9, 0.12]} c={winC} emissive={night ? '#ffb347' : undefined} e={winE} />
							<Box s={[0.08, 0.9, 0.14]} c="#ffffff" />
							<Box s={[0.42, 1.1, 0.08]} p={[-0.75, 0, 0]} c={shutter} />
							<Box s={[0.42, 1.1, 0.08]} p={[0.75, 0, 0]} c={shutter} />
							{f > 0 && (
								<>
									<Box s={[1.1, 0.25, 0.35]} p={[0, -0.68, 0.15]} c="#8b4a22" />
									{[-0.35, 0, 0.35].map((fx, k) => (
										<mesh key={k} position={[fx, -0.48, 0.18]} material={M(k % 2 ? '#ff3d6e' : '#ff2a2a')} castShadow>
											<sphereGeometry args={[0.16, 8, 6]} />
										</mesh>
									))}
								</>
							)}
						</group>
					);
				}),
			)}
			{[-1, 1].map((sd) => (
				<group key={'s' + sd} position={[sd * (w / 2 + 0.02), storey * (floors - 0.45), 0]} rotation={[0, sd * Math.PI / 2, 0]}>
					<Box s={[0.9, 1.0, 0.1]} c={winC} emissive={night ? '#ffb347' : undefined} e={winE} />
					<Box s={[0.38, 1.0, 0.08]} p={[-0.66, 0, 0.02]} c={shutter} />
					<Box s={[0.38, 1.0, 0.08]} p={[0.66, 0, 0.02]} c={shutter} />
				</group>
			))}
			{balcony && floors > 1 && (
				<group position={[0, storey + 0.05, d / 2 + 0.55]}>
					<Box s={[w * 0.92, 0.14, 1.1]} c="#7a4420" />
					<Box s={[w * 0.92, 0.12, 0.1]} p={[0, 0.85, 0.5]} c="#7a4420" />
					{Array.from({length: Math.round(w * 2)}).map((_, i) => (
						<Box key={i} s={[0.08, 0.8, 0.08]} p={[-w * 0.44 + (i * w * 0.88) / (Math.round(w * 2) - 1), 0.45, 0.5]} c="#9a5a2c" />
					))}
				</group>
			)}
			{/* cheminée */}
			<Box s={[0.6, 1.6, 0.6]} p={[w * 0.22, h + ridge * 0.6, -d * 0.2]} c="#a39486" />
			{children}
		</group>
	);
};

const Sapin: React.FC<{p: V3; s?: number}> = ({p, s = 1}) => (
	<group position={p} scale={s}>
		<mesh position={[0, 0.6, 0]} material={M('#6b4226')} castShadow>
			<cylinderGeometry args={[0.22, 0.28, 1.2, 6]} />
		</mesh>
		{[0, 1, 2].map((i) => (
			<mesh key={i} position={[0, 1.6 + i * 1.05, 0]} material={M(['#1f7a3a', '#26904a', '#2fa857'][i])} castShadow>
				<coneGeometry args={[1.6 - i * 0.4, 1.9, 7]} />
			</mesh>
		))}
	</group>
);

const Fountain: React.FC = () => {
	const frame = useCurrentFrame();
	const water = useMemo(
		() => new THREE.MeshStandardMaterial({color: '#4fc3f7', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85}),
		[],
	);
	return (
		<group>
			<mesh position={[0, 0.35, 0]} material={M('#c9c2b8')} castShadow receiveShadow>
				<cylinderGeometry args={[2.2, 2.4, 0.7, 24]} />
			</mesh>
			<mesh position={[0, 0.66, 0]} material={water}>
				<cylinderGeometry args={[1.95, 1.95, 0.06, 24]} />
			</mesh>
			<mesh position={[0, 1.4, 0]} material={M('#bdb5aa')} castShadow>
				<cylinderGeometry args={[0.3, 0.4, 1.6, 10]} />
			</mesh>
			<mesh position={[0, 2.2, 0]} material={M('#c9c2b8')} castShadow>
				<cylinderGeometry args={[0.95, 0.5, 0.35, 16]} />
			</mesh>
			<mesh position={[0, 2.4, 0]} material={water}>
				<cylinderGeometry args={[0.85, 0.85, 0.05, 16]} />
			</mesh>
			{/* jets d'eau animés */}
			{Array.from({length: 10}).map((_, i) => {
				const a = (i / 10) * Math.PI * 2;
				const t = ((frame + i * 3) % 30) / 30;
				const r = 0.3 + t * 0.75;
				const y = 2.75 + Math.sin(t * Math.PI) * 0.6 - t * 0.5;
				return (
					<mesh key={i} position={[Math.cos(a) * r, y, Math.sin(a) * r]} material={water}>
						<sphereGeometry args={[0.09, 6, 4]} />
					</mesh>
				);
			})}
			<mesh position={[0, 2.85, 0]} material={water}>
				<sphereGeometry args={[0.18, 8, 6]} />
			</mesh>
		</group>
	);
};

/** Boulangerie : chalet + vitrine + auvent rayé + enseigne. */
export const Bakery: React.FC<{night?: boolean}> = ({night}) => {
	const sign = textTexture('BOULANGERIE', {bg: '#5b2c0f', fg: '#ffd98a', w: 1024, h: 180, radius: 30});
	const awning = stripesTexture('#e63946', '#fff4e6', 10);
	return (
		<Chalet w={7} d={6} h={6} wall="#f2c48d" stone="#f6efe2" roof="#7b2d1a" shutter="#c0392b" position={PLACES.bakery.toArray() as V3} rotY={Math.PI / 2} balcony={false} night={night}>
			{/* vitrine */}
			<Box s={[2.4, 1.7, 0.12]} p={[-1.9, 1.35, 3.05]} c="#ffffff" />
			<Box s={[2.1, 1.45, 0.14]} p={[-1.9, 1.35, 3.06]} c="#bfe6ff" emissive="#fff1c1" e={0.25} />
			{/* pains en vitrine */}
			{[-2.6, -2.0, -1.4].map((x, i) => (
				<mesh key={i} position={[x, 0.85, 3.2]} rotation={[0, 0, Math.PI / 2]} material={M('#d08a3a')} castShadow>
					<capsuleGeometry args={[0.14, 0.4, 4, 8]} />
				</mesh>
			))}
			{/* auvent */}
			<mesh position={[0, 2.75, 3.55]} rotation={[0.45, 0, 0]} castShadow>
				<boxGeometry args={[6.6, 0.08, 1.3]} />
				<meshStandardMaterial map={awning} roughness={0.8} />
			</mesh>
			{/* enseigne */}
			<mesh position={[0, 3.55, 3.1]}>
				<boxGeometry args={[5.2, 0.92, 0.12]} />
				<meshStandardMaterial attach="material-4" map={sign} roughness={0.7} />
				<meshStandardMaterial attach="material-0" color="#5b2c0f" />
				<meshStandardMaterial attach="material-1" color="#5b2c0f" />
				<meshStandardMaterial attach="material-2" color="#5b2c0f" />
				<meshStandardMaterial attach="material-3" color="#5b2c0f" />
				<meshStandardMaterial attach="material-5" color="#5b2c0f" />
			</mesh>
			{/* bretzel / pain doré au-dessus */}
			<mesh position={[2.9, 3.6, 3.25]} material={M('#e0a040')}>
				<torusGeometry args={[0.32, 0.12, 8, 16]} />
			</mesh>
		</Chalet>
	);
};

export const Mairie: React.FC<{night?: boolean}> = ({night}) => {
	const frame = useCurrentFrame();
	const sign = textTexture('MAIRIE', {bg: '#f5efe0', fg: '#22314f', w: 512, h: 128});
	const flagWave = Math.sin(frame / 6) * 0.15;
	return (
		<group position={PLACES.mairie.toArray() as V3} rotation={[0, -Math.PI / 2, 0]}>
			<Box s={[9, 7, 6]} p={[0, 3.5, 0]} c="#efe4cf" />
			<Box s={[9.3, 0.4, 6.3]} p={[0, 7.1, 0]} c="#d8c9ad" />
			{/* toit en ardoise (pyramide) */}
			<mesh position={[0, 8.5, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1.55, 1, 1.05]} material={M('#4b5d78')} castShadow>
				<coneGeometry args={[4.6, 2.8, 4]} />
			</mesh>
			{/* horloge */}
			<mesh position={[0, 8.2, 2.5]} rotation={[Math.PI / 2 - 0.5, 0, 0]} material={M('#ffffff')}>
				<cylinderGeometry args={[0.7, 0.7, 0.1, 20]} />
			</mesh>
			<mesh position={[0, 5.9, 3.05]}>
				<planeGeometry args={[3.4, 0.85]} />
				<meshStandardMaterial map={sign} />
			</mesh>
			{/* fenêtres */}
			{[-3.2, -1.6, 1.6, 3.2].map((x) =>
				[1.9, 4.4].map((y) => (
					<group key={`${x}${y}`} position={[x, y, 3.02]}>
						<Box s={[1.0, 1.6, 0.08]} c="#ffffff" />
						<Box s={[0.8, 1.4, 0.1]} c={night ? '#ffd76a' : '#3d6fa8'} emissive={night ? '#ffb347' : undefined} e={night ? 1.2 : 0} />
					</group>
				)),
			)}
			<Box s={[1.6, 2.8, 0.12]} p={[0, 1.4, 3.03]} c="#3a5a8a" />
			{[0, 1, 2].map((i) => (
				<Box key={i} s={[3.4 - i * 0.4, 0.2, 0.6]} p={[0, 0.1 + i * 0.2, 3.3 + 0.6 * (2 - i)]} c="#d8d0c2" />
			))}
			{/* drapeau */}
			<Box s={[0.1, 3, 0.1]} p={[3.8, 8.3, 3.1]} c="#888" />
			<group position={[3.85, 9.3, 3.1]} rotation={[0, flagWave, 0]}>
				<Box s={[0.5, 0.9, 0.03]} p={[0.25, 0, 0]} c="#1f4fd8" />
				<Box s={[0.5, 0.9, 0.03]} p={[0.75, 0, 0]} c="#ffffff" />
				<Box s={[0.5, 0.9, 0.03]} p={[1.25, 0, 0]} c="#e6262f" />
			</group>
		</group>
	);
};

export const Estrade: React.FC = () => (
	<group position={PLACES.estrade.toArray() as V3} rotation={[0, -Math.PI / 2, 0]}>
		<Box s={[3.2, 0.6, 2.2]} p={[0, 0.3, 0]} c="#9a5a2c" />
		<Box s={[3.24, 0.18, 0.06]} p={[0, 0.4, 1.12]} c="#1f4fd8" />
		<Box s={[1.0, 1.2, 0.6]} p={[0, 1.2, 0.6]} c="#7a4420" />
	</group>
);

/** Cloche (profil tourné). */
export const Bell: React.FC<{swing?: number; scale?: number}> = ({swing = 0, scale = 1}) => {
	const geom = useMemo(() => {
		const pts = [
			[0, 0.95], [0.18, 0.95], [0.3, 0.85], [0.36, 0.6], [0.42, 0.3], [0.55, 0.06], [0.62, 0],
		].map(([x, y]) => new THREE.Vector2(x, y - 1));
		return new THREE.LatheGeometry(pts, 20);
	}, []);
	return (
		<group rotation={[0, 0, swing]} scale={scale}>
			<mesh geometry={geom} castShadow>
				<meshStandardMaterial color="#e3b23c" metalness={0.7} roughness={0.3} side={THREE.DoubleSide} />
			</mesh>
			<mesh position={[0, -0.95, 0]} material={M('#6b5524')}>
				<sphereGeometry args={[0.12, 8, 6]} />
			</mesh>
		</group>
	);
};

export const Church: React.FC<{bellSwing?: number; night?: boolean}> = ({bellSwing = 0}) => (
	<group position={PLACES.church.toArray() as V3}>
		{/* nef */}
		<Chalet w={7} d={10} h={6} wall="#efe8da" stone="#e5dccb" roof="#6c7a8c" shutter="#efe8da" position={[0, 0, -6]} balcony={false} floors={1} />
		{/* clocher */}
		<Box s={[3.4, 10, 3.4]} p={[0, 5, 0]} c="#ebe2d0" />
		<Box s={[3.7, 0.4, 3.7]} p={[0, 10.1, 0]} c="#cfc3ab" />
		<group position={[0, 10.3, 0]}>
			{/* étage des cloches : 4 piliers */}
			{[[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]].map(([x, z], i) => (
				<Box key={i} s={[0.4, 2.6, 0.4]} p={[x, 1.3, z]} c="#ebe2d0" />
			))}
			<Box s={[3.6, 0.4, 3.6]} p={[0, 0.05, 0]} c="#d8cdb6" />
			<Box s={[3.7, 0.4, 3.7]} p={[0, 2.7, 0]} c="#cfc3ab" />
			<group position={[0, 2.3, 0]}>
				<Bell swing={bellSwing} scale={1.5} />
			</group>
		</group>
		<mesh position={[0, 15.6, 0]} rotation={[0, Math.PI / 4, 0]} material={M('#4b5d78')} castShadow>
			<coneGeometry args={[2.7, 5, 4]} />
		</mesh>
		<Box s={[0.12, 1.2, 0.12]} p={[0, 18.6, 0]} c="#e3b23c" />
		<Box s={[0.6, 0.12, 0.12]} p={[0, 18.7, 0]} c="#e3b23c" />
		{/* horloge */}
		<group position={[0, 8.3, 1.72]}>
			<mesh rotation={[Math.PI / 2, 0, 0]} material={M('#ffffff')}>
				<cylinderGeometry args={[0.9, 0.9, 0.08, 24]} />
			</mesh>
			<Box s={[0.08, 0.6, 0.05]} p={[0, 0.25, 0.06]} c="#222" />
			<Box s={[0.45, 0.08, 0.05]} p={[0.2, 0, 0.06]} c="#222" />
		</group>
		<Box s={[1.4, 2.4, 0.12]} p={[0, 1.2, 1.72]} c="#6b3d1f" />
	</group>
);

const Mountains: React.FC<{snow?: string; tint?: string}> = ({snow = '#ffffff', tint = '#7d8fb3'}) => {
	const peaks: [number, number, number, number][] = [
		// x, z, rayon, hauteur
		[-70, -110, 38, 62], [-25, -125, 42, 78], [25, -115, 36, 66], [70, -120, 44, 72], [0, -150, 50, 95],
		[-110, -90, 34, 50], [110, -95, 36, 54], [-45, 115, 40, 60], [40, 120, 42, 66], [110, 60, 34, 48], [-110, 50, 34, 46],
	];
	return (
		<group>
			{peaks.map(([x, z, r, h], i) => (
				<group key={i} position={[x, -2, z]}>
					<mesh position={[0, h / 2, 0]} material={M(i % 2 ? tint : '#8c9cbf')}>
						<coneGeometry args={[r, h, 7]} />
					</mesh>
					<mesh position={[0, h - h * 0.17, 0]} material={M(snow)}>
						<coneGeometry args={[r * 0.345, h * 0.345, 7]} />
					</mesh>
				</group>
			))}
		</group>
	);
};

const CableCar: React.FC = () => {
	const frame = useCurrentFrame();
	const a = new THREE.Vector3(-30, 6, -40);
	const b = new THREE.Vector3(-25, 58, -122);
	const t = 0.25 + ((frame / 900) % 0.5);
	const p = a.clone().lerp(b, t);
	const len = a.distanceTo(b);
	const mid = a.clone().add(b).multiplyScalar(0.5);
	const dir = b.clone().sub(a).normalize();
	const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
	return (
		<group>
			<mesh position={mid} quaternion={q} material={M('#333')}>
				<cylinderGeometry args={[0.06, 0.06, len, 4]} />
			</mesh>
			<group position={a.toArray() as V3}>
				<Box s={[4, 6, 4]} p={[0, -3, 0]} c="#b0b8c4" />
				<Box s={[4.6, 0.5, 4.6]} p={[0, 0.2, 0]} c="#c0392b" />
			</group>
			<group position={p.toArray() as V3}>
				<Box s={[0.1, 1.4, 0.1]} p={[0, -0.7, 0]} c="#333" />
				<Box s={[1.8, 1.5, 1.4]} p={[0, -2, 0]} c="#e63946" />
				<Box s={[1.82, 0.6, 1.3]} p={[0, -1.8, 0]} c="#bfe6ff" />
			</group>
		</group>
	);
};

const CLOUD = new THREE.MeshBasicMaterial({color: '#ffffff', fog: false});
const Clouds: React.FC = () => {
	const frame = useCurrentFrame();
	const list: V3[] = [[-40, 32, -70], [10, 40, -90], [50, 30, -60], [-15, 36, -40], [35, 44, 60], [-50, 38, 50]];
	return (
		<group>
			{list.map(([x, y, z], i) => (
				<group key={i} position={[x + ((frame * 0.03 * (1 + i * 0.2)) % 40), y, z]}>
					{[[0, 0, 0, 4], [3.5, -0.6, 0.5, 3], [-3.4, -0.8, 0, 2.8], [1.4, 1.4, -0.5, 2.8]].map(([cx, cy, cz, r], k) => (
						<mesh key={k} position={[cx, cy, cz]} material={CLOUD}>
							<sphereGeometry args={[r, 10, 8]} />
						</mesh>
					))}
				</group>
			))}
		</group>
	);
};

const CHALETS: {p: V3; r: number; w: number; d: number; h: number; wall: string; roof: string; sh: string}[] = (() => {
	const out = [];
	const R = rng(42);
	const walls = ['#c8864a', '#b5713b', '#d69a5b', '#a8653a', '#e8b07a'];
	const roofs = ['#8f3b22', '#6e2f1d', '#a2492b', '#5e6b7d'];
	const shutters = ['#2e8b57', '#c0392b', '#1f6fb2', '#2e8b57', '#d4a017'];
	const spots: [number, number][] = [
		[-11, 9], [-17, 16], [18, 15], [12, 9], [-16, -10], [16, -12], [-14, 2], [17, 3], [-8, -15], [8, -16],
		[-22, -4], [23, -4], [-25, 10], [26, 8], [-13, 25], [14, 26], [-27, -16], [28, -18], [-30, 22], [31, 24],
	];
	for (const [x, z] of spots) {
		const rot = Math.atan2(-x, -z) + (R() - 0.5) * 0.4;
		out.push({
			p: [x, 0, z] as V3, r: rot,
			w: 4.5 + R() * 2.2, d: 4.5 + R() * 2, h: 4.6 + R() * 1.6,
			wall: walls[Math.floor(R() * walls.length)], roof: roofs[Math.floor(R() * roofs.length)],
			sh: shutters[Math.floor(R() * shutters.length)],
		});
	}
	return out;
})();

const TREES: [V3, number][] = (() => {
	const R = rng(9);
	const out: [V3, number][] = [];
	for (let i = 0; i < 70; i++) {
		const a = R() * Math.PI * 2;
		const d = 30 + R() * 45;
		out.push([[Math.cos(a) * d, 0, Math.sin(a) * d], 1 + R() * 1.4]);
	}
	for (const p of [[-13, 0, -4], [13, 0, 10], [-18, 0, 8], [20, 0, -10], [-5, 0, -19], [6, 0, -21]] as V3[]) out.push([p, 0.9]);
	return out;
})();

/** Fleurs + bancs sur la place. */
const Square: React.FC = () => (
	<group>
		{[[-4, 0, 5, 0.4], [4, 0, 5, -0.4]].map(([x, y, z, r], i) => (
			<group key={i} position={[x, y, z]} rotation={[0, r, 0]}>
				<Box s={[2.2, 0.15, 0.7]} p={[0, 0.7, 0]} c="#9a5a2c" />
				<Box s={[2.2, 0.6, 0.12]} p={[0, 1.05, -0.3]} c="#9a5a2c" />
				<Box s={[0.15, 0.7, 0.6]} p={[-0.95, 0.35, 0]} c="#333" />
				<Box s={[0.15, 0.7, 0.6]} p={[0.95, 0.35, 0]} c="#333" />
			</group>
		))}
		{/* lampadaires */}
		{[[-6, 6], [6, 6], [-6, -7], [6, -7]].map(([x, z], i) => (
			<group key={i} position={[x, 0, z]}>
				<mesh position={[0, 1.8, 0]} material={M('#2b2b2b')}>
					<cylinderGeometry args={[0.08, 0.12, 3.6, 6]} />
				</mesh>
				<Box s={[0.5, 0.6, 0.5]} p={[0, 3.8, 0]} c="#fff3c4" emissive="#ffd37a" e={0.3} />
			</group>
		))}
	</group>
);

export type VillageProps = {
	night?: boolean;
	bellSwing?: number;
	hideBakery?: boolean;
	children?: React.ReactNode;
};

/** Le décor complet du village (réutilisable dans tous les épisodes). */
export const Village: React.FC<VillageProps> = ({night = false, bellSwing = 0, hideBakery = false, children}) => {
	const grass = useMemo(() => grassTexture(60), []);
	const cobble = useMemo(() => cobbleTexture(7), []);
	return (
		<group>
			<mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
				<planeGeometry args={[400, 400]} />
				<meshStandardMaterial map={grass} color={night ? '#5a6aa0' : '#ffffff'} roughness={1} />
			</mesh>
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -3]} receiveShadow>
				<circleGeometry args={[12.5, 48]} />
				<meshStandardMaterial map={cobble} color={night ? '#8890b8' : '#ffffff'} roughness={0.95} />
			</mesh>
			<Fountain />
			<Square />
			{!hideBakery && <Bakery night={night} />}
			<Mairie night={night} />
			<Estrade />
			<Church bellSwing={bellSwing} night={night} />
			{CHALETS.map((c, i) => (
				<Chalet key={i} position={c.p} rotY={c.r} w={c.w} d={c.d} h={c.h} wall={c.wall} roof={c.roof} shutter={c.sh} night={night} />
			))}
			{TREES.map(([p, s], i) => (
				<Sapin key={i} p={p} s={s} />
			))}
			{/* belvédère avec barrière */}
			<group position={PLACES.belvedere.toArray() as V3}>
				{Array.from({length: 9}).map((_, i) => (
					<Box key={i} s={[0.18, 1.2, 0.18]} p={[-4 + i, 0.6, -2]} c="#8b5a2b" />
				))}
				<Box s={[8.4, 0.16, 0.14]} p={[0, 1.1, -2]} c="#8b5a2b" />
				<Box s={[8.4, 0.16, 0.14]} p={[0, 0.6, -2]} c="#8b5a2b" />
			</group>
			<Mountains snow={night ? '#c9d2ff' : '#ffffff'} tint={night ? '#3c3f78' : '#7d8fb3'} />
			<CableCar />
			{!night && <Clouds />}
			{children}
		</group>
	);
};
