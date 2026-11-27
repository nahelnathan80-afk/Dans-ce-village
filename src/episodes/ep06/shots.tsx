/**
 * Ép. 06 — « Rapetipeto » : découpage plan par plan (moteur v3 : dialogues, chansons, rendu cinéma).
 * Tout est calé sur les mots (W) : si la voix change, le montage se recale tout seul.
 */
import React from 'react';
import {Character, CharacterLook} from '../../three/Character';
import {Stage, Vec3, Ambiance, CameraShot} from '../../three/Stage';
import {FallingLeaves, Frog, GRISOU_HOUSE, Grass, HayBale, HOUSES, Puddle, PumpkinVillage, Rain, Villager, WoodSign} from '../../three/Pumpkins';
import {GrisouRoom, Megaphone, MusicNotes, OmelettePan, WateringCan} from '../../three/Grisou';
import {Notebook, Tear} from '../../three/Papa';
import {blinkAt, ramp} from '../../lib/anim';
import {buildShots, BuiltShot, ShotCtx, ShotDef} from '../../engine/shots';
import {fit, glide, move, orbit} from '../../engine/framing';
import {CAST6, FPS, houseAt, tl, ws} from './data';

const L = {
	leon: CAST6.leon as CharacterLook,
	lou: CAST6.lou as CharacterLook,
	grisou: CAST6.grisou as CharacterLook,
	maire: CAST6.maire as CharacterLook,
	rose: CAST6.rose as CharacterLook,
};
const W = (id: string, txt: string, off = -0.1, n = 1) => Math.round((ws(id, txt, n) + off) * FPS);
const S = (id: string, off = -0.08) => Math.round((tl.line(id).start + off) * FPS);
const E = (id: string, off = 0) => Math.round((tl.line(id).end + off) * FPS);
const mouth = (who: string, t: number) => tl.mouthOpen(who, t);
const singing = (t: number) => tl.lines.some((l) => (l as {type?: string}).type === 'chanson' && t >= l.start && t <= l.end);

// ——— repères
const H5 = HOUSES[GRISOU_HOUSE];
const toC = (p: Vec3) => {
	const d = Math.hypot(p[0], p[2]);
	return [-p[0] / d, 0, -p[2] / d] as Vec3;
};
const front = (i: number, dist: number): Vec3 => {
	const h = HOUSES[i];
	const R = {s: 2.3, m: 3.0, l: 3.8}[h.size];
	const d = toC(h.p);
	return [h.p[0] + d[0] * (R + dist), 0, h.p[2] + d[2] * (R + dist)];
};
const faceC = (p: Vec3) => Math.atan2(-p[0], -p[2]); // rotation pour regarder le centre
const GDOOR = front(GRISOU_HOUSE, 0.6); // devant la porte de Grisou
const GROT = faceC(GDOOR);
const SIGN: Vec3 = [3.5, 0, 24];
const DC = toC(H5.p); // direction maison de Grisou → centre
const PERP: Vec3 = [DC[2], 0, -DC[0]];
/** point à `k` m devant la porte de Grisou (côté place), décalé de `side` m, à la hauteur `y` */
const G = (k: number, side = 0, y = 0): Vec3 => [GDOOR[0] + DC[0] * k + PERP[0] * side, y, GDOOR[2] + DC[2] * k + PERP[2] * side];
const KIOSK_TOP = 0.72;

/** Le village, avec l'état réel de chaque citrouille à l'instant t (compteur). */
const village = (c: ShotCtx, o: {lit?: number; wet?: boolean; poster?: number; beat?: boolean; children?: React.ReactNode} = {}) => {
	const b = o.beat ? 0.35 + 0.35 * Math.max(0, Math.sin(c.t * Math.PI * 2 * 1.53)) : 0;
	return (
		<PumpkinVillage f={c.g} lit={o.lit} wet={o.wet} poster={o.poster}
			health={(i) => houseAt(i, c.t).health} glow={(i) => houseAt(i, c.t).glow + b} pop={(i) => houseAt(i, c.t).pop}>
			<WoodSign lines={['VILLAGE CITROUILLE', '— ICI, ON CHANTE —']} position={SIGN} rotY={0.1} />
			{o.children}
		</PumpkinVillage>
	);
};

/** Foule autour d'un point, tournée vers `look`. */
const Crowd: React.FC<{c: ShotCtx; at: Vec3; look: Vec3; n?: number; r?: number; arc?: number; sing?: number; frozen?: boolean; umbrella?: boolean}> = ({c, at, look, n = 14, r = 3.5, arc = Math.PI, sing = 0, frozen, umbrella}) => (
	<>
		{Array.from({length: n}).map((_, i) => {
			const base = Math.atan2(at[0] - look[0], at[2] - look[2]);
			const a = base - arc / 2 + (arc * (i + 0.5)) / n;
			const rr = r + (i % 3) * 1.3;
			const p: Vec3 = [look[0] + Math.sin(a) * rr, 0, look[2] + Math.cos(a) * rr];
			return <Villager key={i} i={i + 3} position={p} rotY={Math.atan2(look[0] - p[0], look[2] - p[2])} f={c.g} sing={sing} frozen={frozen} umbrella={umbrella} />;
		})}
	</>
);

const Grisou: React.FC<{c: ShotCtx; p: Vec3; r?: number; emo?: Parameters<typeof Character>[0]['emotion']; phones?: boolean; pose?: Parameters<typeof Character>[0]['pose']; sing?: boolean; blinkClosed?: boolean; children?: React.ReactNode; leftHand?: React.ReactNode}> = ({
	c, p, r = 0, emo = 'angry', phones = true, pose, sing, blinkClosed, children, leftHand,
}) => (
	<Character look={{...L.grisou, headphones: phones ? L.grisou.headphones : undefined}} position={p} rotation={[0, r, 0]} emotion={emo}
		mouthOpen={sing ? 0.3 + 0.6 * Math.abs(Math.sin(c.f * 0.4)) : mouth('grisou', c.t)} blink={blinkClosed || blinkAt(c.f, 5)} pose={pose} leftHand={leftHand}>
		{children}
	</Character>
);
const CROSSED = {armL: [-1.25, -0.55] as [number, number], armR: [-1.25, 0.55] as [number, number]};

const AMB_DAY: Ambiance = 'autumnMorning';

/**
 * Caméra anti-obstacle : si une maison-citrouille, le kiosque ou un mât de guirlande se trouve entre
 * la caméra et le sujet, la caméra avance juste devant (le sujet n'est jamais caché).
 */
type Obst = {kind: 'sphere'; c: Vec3; r: number} | {kind: 'cyl'; c: Vec3; r: number; h: number};
const OBST: Obst[] = [
	...HOUSES.map((h) => {
		const R = {s: 2.3, m: 3.0, l: 3.8}[h.size];
		return {kind: 'sphere' as const, c: [h.p[0], R * 0.8, h.p[2]] as Vec3, r: R * 1.08};
	}),
	{kind: 'cyl', c: [0, 0, 0], r: 3.95, h: 6.3},
	...Array.from({length: 6}).map((_, i) => ({kind: 'cyl' as const, c: [Math.sin((i / 6) * Math.PI * 2) * 10, 0, Math.cos((i / 6) * Math.PI * 2) * 10] as Vec3, r: 0.45, h: 4})),
];
const hit = (o: Obst, a: Vec3, d: Vec3, L: number): number | null => {
	if (o.kind === 'sphere') {
		const m = [a[0] - o.c[0], a[1] - o.c[1], a[2] - o.c[2]];
		if (Math.hypot(m[0], m[1], m[2]) < o.r) return null; // le sujet est dans l'obstacle : on l'ignore
		const b = m[0] * d[0] + m[1] * d[1] + m[2] * d[2];
		const cc = m[0] * m[0] + m[1] * m[1] + m[2] * m[2] - o.r * o.r;
		const disc = b * b - cc;
		if (disc < 0) return null;
		const t = -b - Math.sqrt(disc);
		return t > 0.3 && t < L ? t : null;
	}
	const mx = a[0] - o.c[0];
	const mz = a[2] - o.c[2];
	if (Math.hypot(mx, mz) < o.r && a[1] < o.h) return null;
	const A = d[0] * d[0] + d[2] * d[2];
	if (A < 1e-6) return null;
	const B = mx * d[0] + mz * d[2];
	const C = mx * mx + mz * mz - o.r * o.r;
	const disc = B * B - A * C;
	if (disc < 0) return null;
	const t = (-B - Math.sqrt(disc)) / A;
	const y = a[1] + d[1] * t;
	return t > 0.3 && t < L && y >= 0 && y <= o.h ? t : null;
};
const clear = (cam: CameraShot): CameraShot => {
	const a = cam.target;
	const v: Vec3 = [cam.pos[0] - a[0], cam.pos[1] - a[1], cam.pos[2] - a[2]];
	const L = Math.hypot(v[0], v[1], v[2]);
	const d: Vec3 = [v[0] / L, v[1] / L, v[2] / L];
	let tmin = L;
	for (const o of OBST) {
		const t = hit(o, a, d, L);
		if (t !== null && t < tmin) tmin = t;
	}
	if (tmin >= L) return cam;
	const nl = Math.max(0.8, tmin - 0.6);
	return {...cam, pos: [a[0] + d[0] * nl, a[1] + d[1] * nl, a[2] + d[2] * nl]};
};

// ————————————————————————————————————————————————————————————————
const SHOTS: ShotDef[] = [
	// 1. LA RÈGLE, dite ET montrée : panneau, survol, une citrouille se dégonfle
	{id: 'p01-panneau', from: 0, shows: ['panneau « VILLAGE CITROUILLE — ICI, ON CHANTE »', 'maisons-citrouilles'], move: 'travelling avant',
		render: (c) => (
			<Stage camera={clear(glide(c, [SIGN[0], 3.2, SIGN[2]], 4.0, {w: 6.2, pitch: 0.12}, 0.85, 0.08))} ambiance={AMB_DAY}>
				{village(c, {children: <><Grass center={[SIGN[0], 0, SIGN[2] + 2]} f={c.g} r={5} /><FallingLeaves center={[SIGN[0], 0, SIGN[2] + 3]} f={c.g} /></>})}
			</Stage>
		)},
	{id: 'p01-survol', from: W('plan01', 'habite'), shows: ['maisons-citrouilles', 'kiosque'], move: 'survol',
		render: (c) => (
			<Stage camera={clear(move({pos: [14, 16, 34], target: [0, 2, 6], fov: 50}, {pos: [4, 12, 28], target: [0, 2, 2], fov: 48}, c))} ambiance={AMB_DAY}>
				{village(c, {beat: true})}
			</Stage>
		)},
	{id: 'p01-pfffuit', from: W('plan01', 'arrête'), shows: ['citrouille qui se dégonfle (−1)'], move: 'zoom avant',
		render: (c) => (
			<Stage camera={clear(glide(c, [HOUSES[9].p[0], 2.6, HOUSES[9].p[2]], 5.5, {w: 6.5, yaw: faceC(HOUSES[9].p), pitch: 0.18}, 0.85, 0.1))} ambiance={AMB_DAY}>
				{village(c)}
			</Stage>
		)},

	// 2. FLASH-FORWARD : nuit, pluie, toutes grises sauf une
	{id: 'p02-nuit', from: S('plan02'), shows: ['citrouilles grises sous la pluie', 'Léon seul'], move: 'travelling latéral',
		render: (c) => (
			<Stage camera={clear(glide(c, [2, 2.0, 6], 4.6, {w: 7, yaw: 0.25, pitch: 0.42}, 0.9, 0.1))} ambiance="rainNight">
				{village(c, {wet: true, lit: 0.4, children: <>
					<Rain center={[2, 0, 8]} f={c.g} />
					<Puddle position={[2.6, 0, 6.6]} r={1.3} f={c.g} rain />
					<Character look={L.leon} position={[2, 0, 6]} rotation={[0, 0.25, 0]} emotion="sad" />
					<pointLight position={[2, 3.5, 8]} intensity={8} distance={9} color="#ffcf8a" />
				</>})}
			</Stage>
		)},
	{id: 'p02-une', from: W('plan02', "qu'une", -0.15), shows: ['la dernière citrouille orange'], move: 'zoom avant',
		render: (c) => (
			<Stage camera={clear(glide(c, [H5.p[0], 2.4, H5.p[2]], 4.8, {w: 5, yaw: faceC(H5.p) + 0.3, pitch: 0.12}, 0.82, 0.06))} ambiance="rainNight">
				{village(c, {wet: true, lit: 0.6, children: <Rain center={[H5.p[0] - 4, 0, H5.p[2] + 2]} f={c.g} />})}
			</Stage>
		)},

	// 3. Rembobinage → dimanche matin
	{id: 'p03-dimanche', from: S('plan03'), shows: ['village au matin doré', 'kiosque'], move: 'survol',
		render: (c) => (
			<Stage camera={clear(move({pos: [-12, 11, 26], target: [0, 2, 0], fov: 48}, {pos: [-8, 8, 22], target: [0, 2.4, 0], fov: 46}, c))} ambiance={AMB_DAY}>
				{village(c)}
			</Stage>
		)},

	// 4. ♪ 1 : tout le village chante (orbite autour du kiosque)
	{id: 'p04-chorale', from: S('plan04', 0), shows: ['tout le village qui chante', 'kiosque', 'citrouilles qui brillent'], move: 'orbite',
		render: (c) => (
			<Stage camera={clear(orbit(c, [0, 2.4, 0], 6.5, 0.4, 1.0, {w: 9, pitch: 0.22}))} ambiance={AMB_DAY}>
				{village(c, {beat: true, lit: 0.6, children: <><Crowd c={c} at={[0, 0, 8]} look={[0, 0, 0]} n={18} r={5} arc={Math.PI * 1.6} sing={1} /><FallingLeaves center={[0, 0, 5]} f={c.g} n={30} /></>})}
			</Stage>
		)},
	{id: 'p04-rapetipeto', from: W('plan04', 'rapetipeto', -0.05), shows: ['villageois qui chantent (gros plan)'], move: 'travelling latéral',
		render: (c) => (
			<Stage camera={move({pos: [0.6, 2.4, 1.6], target: [-0.4, 1.95, 6.2], fov: 42, dof: 1}, {pos: [-0.4, 2.35, 1.8], target: [0.6, 1.95, 6.2], fov: 40, dof: 1}, c)} ambiance={AMB_DAY}>
				{village(c, {beat: true, lit: 0.6, children: <Crowd c={c} at={[0, 0, 8]} look={[0, 0, 0]} n={18} r={5} arc={Math.PI * 1.6} sing={1} />})}
			</Stage>
		)},

	// 5. Léon, Lou… sauf lui
	{id: 'p05-leon', from: S('plan05'), shows: ['Léon'], move: 'zoom lent',
		render: (c) => (
			<Stage camera={clear(glide(c, [1.5, 1.95, 12], 1.5, {yaw: 0.25, dof: 1, fov: 38}, 0.88, 0.08))} ambiance={AMB_DAY}>
				{village(c, {children: <>
					<Character look={L.leon} position={[1.5, 0, 12]} rotation={[0, 0.25, 0]} emotion="happy" blink={blinkAt(c.f, 1)} pose={{armR: [-0.5, -0.2]}} leftHand={<Notebook position={[0, -0.1, 0.25]} rotation={[-0.3, 0, 0]} />} />
					<FallingLeaves center={[1.5, 0, 12]} f={c.g} n={14} spread={3} />
				</>})}
			</Stage>
		)},
	{id: 'p05-lou', from: W('plan05', 'tout', -0.12), shows: ['Lou et sa grenouille en peluche'], move: 'travelling',
		render: (c) => (
			<Stage camera={clear(glide(c, [3.0, 1.35, 12.3], 1.4, {yaw: -0.2, dof: 1, fov: 38}, 0.88, -0.1))} ambiance={AMB_DAY}>
				{village(c, {children: <>
					<Character look={L.lou} position={[3.0, 0, 12.3]} rotation={[0, -0.2, 0]} emotion="happy" mouthOpen={0.4 + 0.4 * Math.abs(Math.sin(c.f * 0.4))} blink={blinkAt(c.f, 2)}
						leftHand={<Frog position={[0, -0.25, 0.15]} rotY={0} s={1.4} />} />
				</>})}
			</Stage>
		)},
	{id: 'p05-grisou', from: W('plan05', 'sauf', -0.12), shows: ['M. Grisou bras croisés, casque sur les oreilles', 'sa maison'], move: 'travelling avant',
		render: (c) => (
			<Stage camera={clear(move(fit([GDOOR[0], 2.2, GDOOR[2]], 6, {yaw: GROT, pitch: 0.1}), fit([GDOOR[0], 2.4, GDOOR[2]], 3.2, {yaw: GROT + 0.15, pitch: 0.05, dof: 1}), c))} ambiance={AMB_DAY}>
				{village(c, {children: <Grisou c={c} p={GDOOR} r={GROT} emo="angry" pose={CROSSED} />})}
			</Stage>
		)},

	// 6. Grisou au mégaphone sur le kiosque — le maire
	{id: 'p06-megaphone', from: S('plan06a'), shows: ['Grisou sur le kiosque avec son mégaphone'], move: 'contre-plongée',
		render: (c) => (
			<Stage camera={clear(glide(c, [0, KIOSK_TOP + 2.0, 0.6], 3.6, {yaw: 0.2, pitch: -0.18}, 0.85, 0.1))} ambiance={AMB_DAY}>
				{village(c, {children: <>
					<Grisou c={c} p={[0, KIOSK_TOP, 0.6]} r={0.2} emo="angry" pose={{armR: [-1.5, -0.1], armL: [-0.3, 0.2]}}>
						<Megaphone position={[0, -0.05, 0.1]} rotation={[-Math.PI / 2 + 0.1, 0, 0]} />
					</Grisou>
					<Crowd c={c} at={[0, 0, -8]} look={[0, 0, 0]} n={12} r={5.5} arc={Math.PI * 1.2} />
				</>})}
			</Stage>
		)},
	{id: 'p06-maire', from: S('plan06b'), shows: ['M. le Maire (chapeau-citrouille)'], move: 'zoom',
		render: (c) => (
			<Stage camera={clear(glide(c, [2.6, 2.6, 5.2], 1.9, {yaw: -0.5, dof: 1, fov: 38}, 0.88, 0.06))} ambiance={AMB_DAY}>
				{village(c, {children: <Character look={L.maire} position={[2.6, 0, 5.2]} rotation={[0, -0.5, 0]} emotion="surprised" mouthOpen={mouth('maire', c.t)} pose={{armR: [-1.0, -0.4]}} />})}
			</Stage>
		)},
	{id: 'p06-amende', from: S('plan06c'), shows: ['Grisou crie dans le mégaphone (gros plan)'], move: 'zoom avant',
		render: (c) => (
			<Stage camera={clear(glide(c, [0, KIOSK_TOP + 2.5, 0.6], 1.6, {yaw: 0.35, pitch: 0, dof: 1, fov: 38}, 0.85, -0.1))} ambiance={AMB_DAY}>
				{village(c, {children: <Grisou c={c} p={[0, KIOSK_TOP, 0.6]} r={0.35} emo="angry" pose={{armR: [-1.5, -0.1]}}><Megaphone position={[0, -0.05, 0.1]} rotation={[-Math.PI / 2 + 0.1, 0, 0]} /></Grisou>})}
			</Stage>
		)},

	// 7. SCRATCH : tout le monde se fige, l'affiche claque. Lundi, plus personne ne chante.
	{id: 'p07-fige', from: E('plan06c', 0.02), shows: ['villageois figés bouche ouverte', 'affiche « CHANSON INTERDITE »'], move: 'zoom sec',
		render: (c) => (
			<Stage camera={clear(glide(c, [1.5, 2.2, 3.4], 3.6, {w: 4.5, yaw: -0.3, pitch: 0.35}, 0.8, 0))} ambiance={AMB_DAY}>
				{village(c, {poster: Math.min(1, 0.4 + c.f / 4), children: <Crowd c={c} at={[6, 0, 4]} look={[0, 0, 0]} n={10} r={5} arc={Math.PI * 0.6} frozen />})}
			</Stage>
		)},
	{id: 'p07-lundi', from: W('plan07', 'personne', -0.12), shows: ['place grise et vide', 'affiche', 'citrouilles qui ternissent'], move: 'travelling',
		render: (c) => (
			<Stage camera={clear(move({pos: [10, 6, 16], target: [0, 2, 0], fov: 46}, {pos: [7, 5, 15], target: [0, 2, 0], fov: 46}, c))} ambiance="autumnGrey">
				{village(c, {poster: 1, children: <><Villager i={5} position={[4, 0, 6]} rotY={-2.5} f={c.g} /><Villager i={8} position={[-3, 0, 7]} rotY={2.6} f={c.g} /></>})}
			</Stage>
		)},

	// 8. Les citrouilles se rident — pluie
	{id: 'p08-rose', from: S('plan08a'), shows: ['Mamie Rose et sa citrouille ridée', 'arrosoir'], move: 'travelling',
		render: (c) => {
			const p = front(3, 1.2);
			return (
				<Stage camera={clear(glide(c, [p[0], 2.0, p[2]], 3.6, {w: 4, yaw: faceC(p) - 0.6, pitch: 0.12}, 0.88, 0.1))} ambiance="autumnGrey">
					{village(c, {children: <Character look={L.rose} position={p} rotation={[0, faceC(p) - 0.6, 0]} emotion="surprised" mouthOpen={mouth('rose', c.t)} pose={{armR: [-1.0, -0.2]}}>
						<WateringCan position={[0, -0.1, 0.1]} />
					</Character>})}
				</Stage>
			);
		}},
	{id: 'p08-lou', from: S('plan08b'), shows: ['Lou se bouche le nez'], move: 'zoom',
		render: (c) => {
			const p = front(0, 1.0);
			return (
				<Stage camera={clear(glide(c, [p[0], 1.35, p[2]], 1.5, {yaw: faceC(p), dof: 1, fov: 38}, 0.85, -0.1))} ambiance="autumnGrey">
					{village(c, {children: <Character look={L.lou} position={p} rotation={[0, faceC(p), 0]} emotion="angry" mouthOpen={mouth('lou', c.t)} pose={{armR: [-2.5, 0.5]}} />})}
				</Stage>
			);
		}},
	{id: 'p08-pluie', from: S('plan08c'), shows: ['villageois sous des parapluies', 'citrouilles grises sous la pluie'], move: 'survol bas',
		render: (c) => (
			<Stage camera={move({pos: [2.2, 3.0, 6.2], target: [0, 1.8, 11.2], fov: 46}, {pos: [1.2, 2.8, 6.6], target: [0, 1.8, 11.2], fov: 44}, c)} ambiance="rainNight">
				{village(c, {wet: true, lit: 0.3, poster: 1, children: <>
					<Rain center={[0.5, 0, 9]} f={c.g} />
					<Puddle position={[0.8, 0, 9]} r={1.4} f={c.g} rain />
					<pointLight position={[0, 4, 9]} intensity={10} distance={10} color="#ffcf8a" />
					<Crowd c={c} at={[0, 0, 12]} look={[0, 0, 8]} n={8} r={3} arc={Math.PI * 0.9} umbrella />
				</>})}
			</Stage>
		)},
	{id: 'p08-dormait', from: W('plan08c', 'dormait', -0.12), shows: ['villageois endormis sous la pluie, dehors'], move: 'travelling',
		render: (c) => {
			const p = front(13, 1.0);
			return (
				<Stage camera={clear(glide(c, [p[0], 1.2, p[2]], 3.0, {w: 4, yaw: faceC(p) + 0.4, pitch: 0.35}, 0.88, 0.1))} ambiance="rainNight">
					{village(c, {wet: true, lit: 0.2, children: <>
						<Rain center={p} f={c.g} />
						<Character look={L.rose} position={p} rotation={[-Math.PI / 2 + 0.05, faceC(p), 0]} emotion="tired" blink />
						<Puddle position={[p[0] + 1.2, 0, p[2] + 0.5]} r={0.9} f={c.g} rain />
					</>})}
				</Stage>
			);
		}},
	{id: 'p08-froid', from: S('plan08d'), shows: ['Lou trempée, grenouille en peluche'], move: 'zoom',
		render: (c) => (
			<Stage camera={clear(glide(c, [1.0, 1.35, 9.6], 1.5, {yaw: 0.3, dof: 1, fov: 38}, 0.85, 0.08))} ambiance="rainNight">
				{village(c, {wet: true, lit: 0.3, children: <>
					<Rain center={[1, 0, 10]} f={c.g} r={5} />
					<Character look={L.lou} position={[1.0, 0, 9.6]} rotation={[0, 0.3, 0]} emotion="sad" mouthOpen={mouth('lou', c.t)} squash={1 + 0.03 * Math.sin(c.f * 1.7)}
						leftHand={<Frog position={[0, -0.25, 0.15]} s={1.4} />} />
				</>})}
			</Stage>
		)},
	{id: 'p08-pourquoi', from: S('plan08e'), shows: ['Léon décidé, carnet'], move: 'contre-plongée',
		render: (c) => (
			<Stage camera={clear(glide(c, [2.2, 1.85, 9.3], 1.6, {yaw: -0.25, pitch: -0.1, dof: 1, fov: 38}, 0.85, -0.08))} ambiance="rainNight">
				{village(c, {wet: true, lit: 0.3, children: <>
					<Rain center={[2, 0, 9]} f={c.g} r={5} />
					<Character look={L.leon} position={[2.2, 0, 9.3]} rotation={[0, -0.25, 0]} emotion="determined" mouthOpen={mouth('leon', c.t)} pose={{armL: [-1.3, 0.2]}}
						leftHand={<Notebook position={[0, -0.1, 0.25]} rotation={[-0.3, 0, 0]} />} />
				</>})}
			</Stage>
		)},

	// 9. INDICES 1 et 2 : la citrouille de Grisou reste orange — son casque
	{id: 'p09-bizarre', from: S('plan09'), shows: ['citrouille de Grisou orange au milieu des grises'], move: 'survol',
		render: (c) => (
			<Stage camera={clear(move({pos: [4, 12, 8], target: [H5.p[0], 1.5, H5.p[2]], fov: 46}, {pos: [8, 9, 5], target: [H5.p[0], 2, H5.p[2]], fov: 44}, c))} ambiance="autumnGrey">
				{village(c, {poster: 1})}
			</Stage>
		)},
	{id: 'p09-orange', from: W('plan09', 'restait', -0.12), shows: ['maison de Grisou, orange et brillante (INDICE 1)'], move: 'zoom avant',
		render: (c) => (
			<Stage camera={move({pos: G(9.5, 1.5, 3.6), target: [H5.p[0], 2.4, H5.p[2]], fov: 42}, {pos: G(8.0, 0.8, 3.3), target: [H5.p[0], 2.4, H5.p[2]], fov: 40}, c)} ambiance="autumnGrey">
				{village(c, {poster: 1})}
			</Stage>
		)},
	{id: 'p09-casque', from: W('plan09', 'jamais', -0.12), shows: ['casque audio de Grisou (INDICE 2)'], move: 'orbite serrée',
		render: (c) => (
			<Stage camera={move({pos: G(1.0, 2.9, 2.75), target: [GDOOR[0], 2.5, GDOOR[2]], fov: 34, dof: 1}, {pos: G(0.6, 2.6, 2.7), target: [GDOOR[0], 2.5, GDOOR[2]], fov: 32, dof: 1}, c)} ambiance="autumnGrey">
				{village(c, {poster: 1, children: <Grisou c={c} p={GDOOR} r={GROT} emo="angry" pose={CROSSED} />})}
			</Stage>
		)},

	// 10. Mercredi soir : Léon espionne, derrière une botte de foin
	{id: 'p10-foin', from: S('plan10'), shows: ['Léon caché derrière une botte de foin', 'maison de Grisou éclairée'], move: 'travelling',
		render: (c) => {
			const hb = front(GRISOU_HOUSE, 6);
			return (
				<Stage camera={clear(glide(c, [hb[0], 1.3, hb[2]], 3.2, {w: 4.5, yaw: GROT + 0.5, pitch: 0.15}, 0.88, 0.1))} ambiance="rainNight">
					{village(c, {lit: 0.8, children: <>
						<HayBale position={hb} rotY={GROT + Math.PI / 2} />
						<pointLight position={[hb[0], 3, hb[2]]} intensity={10} distance={8} color="#ffbf70" />
						<Character look={L.leon} position={[hb[0] - Math.sin(GROT) * 0.9, 0, hb[2] - Math.cos(GROT) * 0.9]} rotation={[0, GROT + Math.PI, 0]} emotion="determined" pose={{lean: 0.3, armL: [-1.2, 0.2]}}
							leftHand={<Notebook position={[0, -0.1, 0.25]} rotation={[-0.3, 0, 0]} />} />
					</>})}
				</Stage>
			);
		}},
	{id: 'p10-grenouille', from: W('plan10', 'espionné', -0.15), shows: ['une grenouille saute sur la botte de Léon'], move: 'plan bas',
		render: (c) => {
			const hb = front(GRISOU_HOUSE, 6);
			const lp: Vec3 = [hb[0] - Math.sin(GROT) * 0.9, 0, hb[2] - Math.cos(GROT) * 0.9];
			return (
				<Stage camera={clear(glide(c, [lp[0], 0.6, lp[2]], 1.4, {yaw: GROT + Math.PI + 0.6, pitch: 0.1, dof: 1, fov: 38}, 0.85, 0.1))} ambiance="rainNight">
					{village(c, {lit: 0.8, children: <>
						<HayBale position={hb} rotY={GROT + Math.PI / 2} />
						<pointLight position={[lp[0], 1.8, lp[2]]} intensity={8} distance={5} color="#ffbf70" />
						<Character look={L.leon} position={lp} rotation={[0, GROT + Math.PI, 0]} emotion="surprised" pose={{lean: 0.3}} />
						<Frog position={[lp[0] + Math.sin(GROT + Math.PI + 0.6) * 0.9, 0, lp[2] + Math.cos(GROT + Math.PI + 0.6) * 0.9]} rotY={GROT} f={c.f} seed={2} s={1.3} />
					</>})}
				</Stage>
			);
		}},

	// 11. ♪ 2 : par la fenêtre ronde, Grisou chante en cachette (son « radio »)
	{id: 'p11-fenetre', from: S('plan11a', 0), shows: ['Grisou sans casque qui chante devant son tourne-disque (par la fenêtre ronde)'], move: 'zoom lent',
		render: (c) => (
			<Stage camera={glide(c, [0.6, 2.1, -1.4], 2.8, {w: 3.4, yaw: 0.3, pitch: 0.05}, 0.9, 0.05)} ambiance="interiorWarm">
				<GrisouRoom f={c.g}>
					<Grisou c={c} p={[0.4, 0, -1.4]} r={0.3} emo="moved" phones={false} sing pose={{armL: [-0.8, 0.3], armR: [-0.6, -0.3]}} />
					<MusicNotes position={[1.4, 1.3, -2.2]} f={c.g} />
				</GrisouRoom>
			</Stage>
		)},
	{id: 'p11-cachette', from: S('plan11b'), shows: ['Grisou chante les yeux fermés (gros plan)'], move: 'zoom avant',
		render: (c) => (
			<Stage camera={glide(c, [0.4, 2.45, -1.4], 1.3, {yaw: 0.45, pitch: 0.02, dof: 1, fov: 36}, 0.85, 0.08)} ambiance="interiorWarm">
				<GrisouRoom f={c.g}>
					<Grisou c={c} p={[0.4, 0, -1.4]} r={0.3} emo="moved" phones={false} sing blinkClosed />
				</GrisouRoom>
			</Stage>
		)},

	// 12. INDICE 3 : sa chanson, écrite à 8 ans — l'école s'est moquée
	{id: 'p12-paroles', from: S('plan12'), shows: ['feuille jaunie « LA MAISON CITROUILLE — paroles de Gaston, 8 ans »'], move: 'travelling latéral',
		render: (c) => (
			<Stage camera={move({pos: [-2.3, 2.95, -2.2], target: [-1.9, 2.85, -4.45], fov: 40}, {pos: [-1.7, 2.85, -2.4], target: [-1.9, 2.8, -4.45], fov: 38}, c)} ambiance="interiorWarm">
				<GrisouRoom f={c.g} />
			</Stage>
		)},
	{id: 'p12-ecole', from: W('plan12', 'toute', -0.12), shows: ['feuille « OMELETTE AUX HANNETONS ? BEURK ! »'], move: 'travelling latéral',
		render: (c) => (
			<Stage camera={move({pos: [-0.4, 3.15, -2.7], target: [0.1, 3.05, -4.45], fov: 38}, {pos: [0.4, 3.1, -2.8], target: [0.2, 3.05, -4.45], fov: 37}, c)} ambiance="interiorWarm">
				<GrisouRoom f={c.g} />
			</Stage>
		)},
	{id: 'p12-photo', from: W('plan12', 'moquée', -0.12), shows: ['photo de classe : tous les enfants rient du petit Gaston'], move: 'zoom avant',
		render: (c) => (
			<Stage camera={move({pos: [2.0, 2.75, -2.3], target: [2.0, 2.65, -4.43], fov: 40}, {pos: [2.0, 2.72, -2.9], target: [2.0, 2.65, -4.43], fov: 38}, c)} ambiance="interiorWarm">
				<GrisouRoom f={c.g} />
			</Stage>
		)},

	// 13. Ping-pong : Léon / Grisou — retour au flash-forward
	{id: 'p13-porte', from: S('plan13a'), shows: ['Léon pousse la porte'], move: 'contre-champ',
		render: (c) => (
			<Stage camera={glide(c, [-2.6, 1.8, 2.6], 1.8, {yaw: -2.4, pitch: 0.05, dof: 1, fov: 38}, 0.88, 0.06)} ambiance="interiorWarm">
				<GrisouRoom f={c.g}>
					<Character look={L.leon} position={[-2.6, 0, 2.6]} rotation={[0, -2.4, 0]} emotion="surprised" mouthOpen={mouth('leon', c.t)} />
				</GrisouRoom>
			</Stage>
		)},
	{id: 'p13-vaten', from: S('plan13b'), shows: ['Grisou : « Va-t\'en ! » (gros plan)'], move: 'zoom sec',
		render: (c) => (
			<Stage camera={glide(c, [0.4, 2.45, -1.4], 1.25, {yaw: 0.8, dof: 1, fov: 36}, 0.82, 0.05)} ambiance="interiorWarm">
				<GrisouRoom f={c.g}>
					<Grisou c={c} p={[0.4, 0, -1.4]} r={0.8} emo="angry" pose={{armR: [-1.4, -0.3]}} />
				</GrisouRoom>
			</Stage>
		)},
	{id: 'p13-ecrite', from: S('plan13c'), shows: ['Léon : « C\'est vous qui l\'avez écrite ! » (gros plan)'], move: 'zoom',
		render: (c) => (
			<Stage camera={glide(c, [-2.6, 1.85, 2.6], 1.15, {yaw: -2.4, dof: 1, fov: 36}, 0.85, -0.06)} ambiance="interiorWarm">
				<GrisouRoom f={c.g}>
					<Character look={L.leon} position={[-2.6, 0, 2.6]} rotation={[0, -2.4, 0]} emotion="determined" mouthOpen={mouth('leon', c.t)} pose={{armR: [-1.6, -0.2]}} />
				</GrisouRoom>
			</Stage>
		)},
	{id: 'p13-tous', from: S('plan13d'), shows: ['Grisou, la voix qui se casse (gros plan)'], move: 'zoom lent',
		render: (c) => (
			<Stage camera={glide(c, [0.4, 2.45, -1.4], 1.15, {yaw: 0.7, dof: 1, fov: 36}, 0.85, 0.04)} ambiance="interiorWarm">
				<GrisouRoom f={c.g}>
					<Grisou c={c} p={[0.4, 0, -1.4]} r={0.7} emo="sad" phones={false} pose={{headNod: 0.2}} />
				</GrisouRoom>
			</Stage>
		)},
	{id: 'p13-retour', from: W('plan13d', 'tous', -0.1), shows: ['retour au flash-forward : la dernière citrouille orange sous la pluie'], move: 'zoom avant',
		render: (c) => (
			<Stage camera={clear(glide(c, [H5.p[0], 2.4, H5.p[2]], 4.4, {w: 5, yaw: faceC(H5.p) + 0.3, pitch: 0.12}, 0.85, -0.06))} ambiance="rainNight">
				{village(c, {wet: true, lit: 0.6, children: <Rain center={[H5.p[0] - 4, 0, H5.p[2] + 2]} f={c.g} />})}
			</Stage>
		)},

	// 14. PAUSE DRAMATIQUE : une larme sur la moustache
	{id: 'p14-larme', from: S('plan14', 0), keep: true, shows: ['larme sur la moustache de Grisou'], move: 'zoom lent',
		render: (c) => (
			<Stage camera={glide(c, [0.4, 2.35, -1.4], 0.75, {yaw: 0.7, dof: 1, fov: 34, up: 0.02}, 0.9, 0.02)} ambiance="interiorWarm">
				<GrisouRoom f={c.g}>
					<Grisou c={c} p={[0.4, 0, -1.4]} r={0.7} emo="sad" phones={false} />
					<group position={[0.4, 0, -1.4]} rotation={[0, 0.7, 0]}>
						<Tear t={c.t - tl.line('plan14').start + 0.3} position={[0.18, 2.32, 0.52]} scale={0.8} />
					</group>
				</GrisouRoom>
			</Stage>
		)},

	// 15. Le lendemain : tout le village devant sa porte, avec des lampions
	{id: 'p15-village', from: S('plan15'), shows: ['Léon devant la porte de Grisou, tout le village derrière avec des lampions'], move: 'grue',
		render: (c) => {
			const lp = front(GRISOU_HOUSE, 2.2);
			return (
				<Stage camera={move({pos: G(0.6, 4.2, 9.5), target: G(3.6, -0.4, 1.0), fov: 56}, {pos: G(0.6, 3.4, 8.6), target: G(3.6, -0.4, 1.0), fov: 54}, c)} ambiance="brightMorning">
					{village(c, {lit: 1, children: <>
						<Character look={L.leon} position={lp} rotation={[0, GROT + Math.PI, 0]} emotion="determined" />
						<Crowd c={c} at={front(GRISOU_HOUSE, 8)} look={GDOOR} n={16} r={4} arc={Math.PI * 0.8} />
						<FallingLeaves center={lp} f={c.g} />
					</>})}
				</Stage>
			);
		}},
	{id: 'p15-porte', from: W('plan15', 'devant', -0.12), shows: ['la porte ronde de Grisou'], move: 'zoom avant',
		render: (c) => (
			<Stage camera={clear(glide(c, [GDOOR[0], 1.4, GDOOR[2]], 3.0, {w: 3.4, yaw: GROT, pitch: 0.05}, 0.85, 0.06))} ambiance="brightMorning">
				{village(c, {lit: 1})}
			</Stage>
		)},

	// 16. ♪ 3 : chorale finale — les citrouilles se regonflent (POUF), Grisou chante avec eux
	{id: 'p16-ouvre', from: S('plan16', 0), shows: ['Grisou ouvre la porte et enlève son casque'], move: 'travelling arrière',
		render: (c) => (
			<Stage camera={clear(move(fit([GDOOR[0], 2.2, GDOOR[2]], 3.0, {yaw: GROT, dof: 1}), fit([GDOOR[0], 2.2, GDOOR[2]], 4.2, {yaw: GROT - 0.15}), c))} ambiance="brightMorning">
				{village(c, {lit: 1, children: <Grisou c={c} p={GDOOR} r={GROT} emo="moved" phones={c.f < 18} pose={c.f < 18 ? {armL: [-2.8, 0.6], armR: [-2.8, -0.6]} : {armL: [-0.4, 0.3]}} />})}
			</Stage>
		)},
	{id: 'p16-rapetipeto', from: W('plan16', 'rapetipeto', -0.05), shows: ['tout le village chante', 'citrouilles qui se regonflent (POUF)'], move: 'orbite',
		render: (c) => {
			const at = front(GRISOU_HOUSE, 5);
			return (
				<Stage camera={move({pos: G(1.2, -1.4, 2.6), target: G(5.2, 0.6, 1.9), fov: 50, dof: 1}, {pos: G(1.2, 1.4, 2.6), target: G(5.2, -0.6, 1.9), fov: 48, dof: 1}, c)} ambiance="brightMorning">
					{village(c, {lit: 1, children: <><Crowd c={c} at={front(GRISOU_HOUSE, 8)} look={GDOOR} n={16} r={4} arc={Math.PI * 0.9} sing={1} /><FallingLeaves center={at} f={c.g} n={34} /></>})}
				</Stage>
			);
		}},
	{id: 'p16-pouf', from: W('plan16', 'pardon', -0.1), shows: ['une citrouille se regonfle d\'un coup, éclat orange'], move: 'zoom',
		render: (c) => (
			<Stage camera={clear(glide(c, [HOUSES[6].p[0], 2.6, HOUSES[6].p[2]], 5.5, {w: 6, yaw: faceC(HOUSES[6].p), pitch: 0.15}, 0.85, 0.1))} ambiance="brightMorning">
				{village(c, {lit: 1})}
			</Stage>
		)},
	{id: 'p16-foule', from: W('plan16', 'embrouilles', -0.15), shows: ['villageois qui chantent (gros plan)', 'lampions'], move: 'travelling latéral',
		render: (c) => {
			const at = front(GRISOU_HOUSE, 6.5);
			return (
				<Stage camera={move({pos: G(1.6, 2.2, 2.2), target: G(5.0, -1.0, 1.9), fov: 44, dof: 1}, {pos: G(1.6, 0.8, 2.2), target: G(5.0, -1.8, 1.9), fov: 42, dof: 1}, c)} ambiance="brightMorning">
					{village(c, {lit: 1, children: <Crowd c={c} at={front(GRISOU_HOUSE, 8)} look={GDOOR} n={16} r={4} arc={Math.PI * 0.9} sing={1} />})}
				</Stage>
			);
		}},
	{id: 'p16-grisou', from: W('plan16', 'mouille', -0.15), shows: ['Grisou chante la dernière ligne avec le village'], move: 'zoom',
		render: (c) => (
			<Stage camera={clear(glide(c, [GDOOR[0], 2.4, GDOOR[2]], 1.8, {yaw: GROT + 0.25, dof: 1, fov: 38}, 0.85, 0.1))} ambiance="brightMorning">
				{village(c, {lit: 1, children: <Grisou c={c} p={GDOOR} r={GROT} emo="happy" phones={false} sing pose={{armL: [-2.4, 0.5], armR: [-2.4, -0.5]}} />})}
			</Stage>
		)},
	{id: 'p16-final', from: W('plan16', 'omelette', -0.15), shows: ['tout le village orange, feuilles qui volent'], move: 'orbite large',
		render: (c) => {
			const at = front(GRISOU_HOUSE, 4);
			return (
				<Stage camera={clear(orbit(c, [at[0], 3, at[2]], 9, GROT + Math.PI + 0.4, GROT + Math.PI + 0.9, {w: 12, pitch: 0.4}))} ambiance="brightMorning">
					{village(c, {lit: 1, children: <>
						<Grisou c={c} p={GDOOR} r={GROT} emo="happy" phones={false} sing pose={{armL: [-2.4, 0.5], armR: [-2.4, -0.5]}} />
						<Crowd c={c} at={front(GRISOU_HOUSE, 8)} look={GDOOR} n={16} r={4} arc={Math.PI * 0.9} sing={1} />
						<FallingLeaves center={at} f={c.g} n={40} spread={8} />
					</>})}
				</Stage>
			);
		}},

	// 17. Chute : l'omelette aux hannetons — boucle sur le panneau
	{id: 'p17-poele', from: S('plan17a'), shows: ['Grisou avec une poêle fumante : omelette aux hannetons'], move: 'zoom',
		render: (c) => (
			<Stage camera={clear(glide(c, [GDOOR[0], 2.1, GDOOR[2]], 2.4, {yaw: GROT - 0.2, dof: 1, fov: 38}, 0.85, 0.1))} ambiance="brightMorning">
				{village(c, {lit: 1, children: <Grisou c={c} p={GDOOR} r={GROT} emo="happy" phones={false} pose={{armR: [-1.3, -0.1]}}>
					<OmelettePan position={[0, -0.05, 0.25]} rotation={[Math.PI / 2 - 0.2, 0, 0]} f={c.g} />
				</Grisou>})}
			</Stage>
		)},
	{id: 'p17-beurk', from: S('plan17b'), shows: ['le maire dégoûté : « Rapeti-beurk »', 'tout le monde rit'], move: 'zoom',
		render: (c) => {
			const p = front(GRISOU_HOUSE, 2.4);
			return (
				<Stage camera={move({pos: G(0.3, -4.2, 3.1), target: G(1.8, 0, 2.45), fov: 46, dof: 1}, {pos: G(0.4, -3.6, 3.0), target: G(1.8, 0, 2.45), fov: 44, dof: 1}, c)} ambiance="brightMorning">
					{village(c, {lit: 1, children: <>
						<Character look={L.maire} position={p} rotation={[0, GROT + Math.PI + 0.3, 0]} emotion="tired" mouthOpen={mouth('maire', c.t)} squash={1 - 0.04 * Math.abs(Math.sin(c.f * 0.6))} />
						<Crowd c={c} at={front(GRISOU_HOUSE, 8)} look={GDOOR} n={10} r={4.5} arc={Math.PI * 0.7} sing={0.8} />
					</>})}
				</Stage>
			);
		}},
	{id: 'p17-boucle', from: E('plan17b', 0.05), keep: true, shows: ['panneau « VILLAGE CITROUILLE — ICI, ON CHANTE » (boucle), toutes les citrouilles orange'], move: 'travelling avant',
		render: (c) => (
			<Stage camera={clear(glide(c, [SIGN[0], 3.2, SIGN[2]], 4.2, {w: 6.4, pitch: 0.12}, 0.92, -0.05))} ambiance="brightMorning">
				{village(c, {lit: 0.6, children: <FallingLeaves center={[SIGN[0], 0, SIGN[2] + 3]} f={c.g} />})}
			</Stage>
		)},
];

export const shotsInOrder = (): BuiltShot[] => buildShots(SHOTS, tl, tl.durationInFrames);
export {singing};
