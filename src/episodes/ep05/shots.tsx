/**
 * Ép. 05 — « Papa rapetisse » : découpage plan par plan (moteur v2).
 * Un cadrage par mot fort, caméra toujours en mouvement, chaque cadrage montre un personnage
 * en action ou l'objet que la voix nomme. Tout est calé sur les mots (ws) : si la voix change,
 * le montage se recale tout seul.
 */
import React from 'react';
import {Character, CharacterLook} from '../../three/Character';
import {Stage, lerpShot, Vec3, CameraShot} from '../../three/Stage';
import {Village} from '../../three/Village';
import {Flashlight} from '../../three/Props';
import {BedRoom} from '../../three/World';
import {Bench, Briefcase, Bunny, Kitchen, Lasagna, Letter, Notebook, Papa, Pigeon, Podium, Pouf, ShoeBoxBed, StreetSign, Tear, Toise, TrashCan, TVScreen} from '../../three/Papa';
import {villager} from '../cast';
import {blinkAt, ramp} from '../../lib/anim';
import {buildShots, BuiltShot, ShotCtx, ShotDef} from '../../engine/shots';
import {CAST5, FPS, sizeAt, tl, ws} from './data';

const L = {
	noah: CAST5.noah as CharacterLook,
	papa: CAST5.papa as CharacterLook,
	maman: CAST5.maman as CharacterLook,
	lou: CAST5.lou as CharacterLook,
	maire: CAST5.maire as CharacterLook,
	passant: CAST5.passant as CharacterLook,
	tele: CAST5.homme_tele as CharacterLook,
};

/** frame d'un mot (+ décalage en s) */
const W = (id: string, txt: string, off = -0.1, n = 1) => Math.round((ws(id, txt, n) + off) * FPS);
const S = (id: string, off = -0.1) => Math.round((tl.line(id).start + off) * FPS);
const E = (id: string, off = 0) => Math.round((tl.line(id).end + off) * FPS);
const mouth = (who: string, t: number) => tl.mouthOpen(who, t);
const lerpV = (a: Vec3, b: Vec3, k: number): Vec3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const move = (a: CameraShot, b: CameraShot, c: ShotCtx) => lerpShot(a, b, ramp(c.f, 0, c.d, (x) => x));

/**
 * Cadrage automatique (format vertical) : le sujet (centre `c`, hauteur `h`, largeur `w`) occupe ~50 % de la
 * hauteur et se place au-dessus du centre (les sous-titres sont au milieu). yaw = angle de la caméra autour
 * du sujet (= rotation du personnage pour voir son visage), pitch = plongée.
 */
const fit = (c: Vec3, h: number, o: {w?: number; yaw?: number; pitch?: number; fov?: number; up?: number} = {}): CameraShot => {
	const fov = o.fov ?? 44;
	const vspan = Math.max(h / 0.5, (o.w ?? 0) / 0.5625 / 0.9);
	const dist = vspan / (2 * Math.tan(((fov / 2) * Math.PI) / 180));
	const yaw = o.yaw ?? 0;
	const pitch = o.pitch ?? 0.12;
	const t: Vec3 = [c[0], c[1] - (o.up ?? 0.12) * vspan, c[2]];
	return {pos: [t[0] + Math.sin(yaw) * Math.cos(pitch) * dist, t[1] + Math.sin(pitch) * dist, t[2] + Math.cos(yaw) * Math.cos(pitch) * dist], target: t, fov};
};
/** Travelling : du cadrage `a` vers le même un peu plus serré / tourné. */
const glide = (c: ShotCtx, at: Vec3, h: number, o: Parameters<typeof fit>[2] = {}, k = 0.88, dyaw = 0.12) =>
	move(fit(at, h, o), fit(at, h * k, {...o, yaw: (o.yaw ?? 0) + dyaw}), c);

// ——— Repères du village
const SIGN: Vec3 = [-2.6, 0, 12];
const TOISE: Vec3 = [0.9, 0, 12.3];
const PODIUM: Vec3 = [0, 0, 7.5];
const TV: Vec3 = [-3, 0, -8];
const RULE: Vec3 = [4.5, 0, -1];
const BENCH: Vec3 = [8.5, 0, 13.5];
const BIN: Vec3 = [3.2, 0, 17.5];
const NOAH_SPY: Vec3 = [3.95, 0, 17.8];

const extras = (f: number) => (
	<>
		<StreetSign lines={['ICI, LES MENTEURS', 'RAPETISSENT']} position={SIGN} w={4.6} h={2.2} />
		<Toise position={TOISE} />
		<TVScreen position={TV} frame={f} />
		<StreetSign lines={['MENSONGE POUR', "PROTÉGER QUELQU'UN", '= DOUBLE']} position={RULE} w={4.4} h={2.6} bg="#1f4fd8" fg="#ffffff" border="#0b2a7a" />
		<Podium position={PODIUM} />
		<Bench position={BENCH} rotY={-0.25} />
		<TrashCan position={BIN} />
	</>
);
const town = (f: number, children?: React.ReactNode, night = false) => (
	<Village night={night}>
		{extras(f)}
		{children}
	</Village>
);

/** Papa (taille du compteur à l'instant t, sauf si `cm` est imposé). */
const PapaAt: React.FC<{c: ShotCtx; cm?: number; p: Vec3; r?: number; emotion?: Parameters<typeof Character>[0]['emotion']; walk?: boolean; fit?: boolean; pose?: Parameters<typeof Character>[0]['pose']; children?: React.ReactNode; sit?: boolean}> = ({
	c, cm, p, r = 0, emotion = 'happy', walk, fit, pose, children, sit,
}) => (
	<Papa look={L.papa} cm={cm ?? sizeAt(c.t)} position={p} rotation={[0, r, 0]} emotion={emotion} walk={walk ? c.f * 0.45 : undefined} fit={fit} pose={pose} blink={blinkAt(c.f, 3)} mouthOpen={mouth('papa', c.t)} sit={sit}>
		{children}
	</Papa>
);

/** La famille autour de la table (Noah, Lou, Maman ; papa à part). */
const Family: React.FC<{c: ShotCtx; emo?: 'happy' | 'surprised' | 'sad' | 'moved' | 'panic' | 'neutral'; noahUp?: boolean}> = ({c, emo = 'happy', noahUp}) => (
	<>
		{noahUp ? (
			<Character look={L.noah} position={[0.4, 0, 1.75]} rotation={[0, Math.PI, 0]} emotion="determined" pose={{armR: [-1.2, -0.1]}} />
		) : (
			<Character look={L.noah} position={[0, 0.25, 1.75]} rotation={[0, Math.PI, 0]} sit emotion={emo} blink={blinkAt(c.f, 1)} />
		)}
		<Character look={L.lou} position={[-2.35, 0.5, 0]} rotation={[0, Math.PI / 2, 0]} sit emotion={emo} blink={blinkAt(c.f, 2)} leftHand={<Bunny position={[0, -0.1, 0.2]} scale={1.2} />} />
		<Character look={L.maman} position={[2.35, 0.25, 0]} rotation={[0, -Math.PI / 2, 0]} sit emotion={emo} blink={blinkAt(c.f, 4)} />
	</>
);

// ————————————————————————————————————————————————————————————————
const SHOTS: ShotDef[] = [
	// 1. LA RÈGLE, dite ET montrée dès la 1re image
	{
		id: 'p01-panneau',
		from: 0,
		shows: ['panneau « ICI, LES MENTEURS RAPETISSENT »', 'passant', 'toise'],
		move: 'travelling avant',
		render: (c) => (
			<Stage camera={glide(c, [-0.9, 2.3, 12.3], 4.6, {w: 6.4, pitch: 0.08}, 0.9, 0.08)} ambiance="morning">
				{town(c.g)}
				<Character look={L.passant} position={[0.1, 0, 12.7]} rotation={[0, -0.25, 0]} emotion="smug" mouthOpen={0.5 + 0.5 * Math.abs(Math.sin(c.f * 0.6))} pose={{armR: [-0.6, -0.5]}} />
			</Stage>
		),
	},
	{
		id: 'p01-pouf',
		from: W('plan01', 'rapetisser', -0.15),
		shows: ['passant qui rapetisse', 'toise'],
		move: 'zoom lent',
		render: (c) => {
			const k = c.t - ws('plan01', 'rapetisser');
			const sc = k < 0.05 ? 1 : 0.86;
			return (
				<Stage camera={glide(c, [0.45, 1.5, 12.5], 3.2, {w: 2.4, yaw: -0.2}, 0.85, 0.1)} ambiance="morning">
					{town(c.g)}
					<Character look={{...L.passant, scale: sc}} position={[0.1, 0, 12.7]} rotation={[0, -0.25, 0]} emotion={k < 0.05 ? 'smug' : 'panic'} squash={k > 0.05 && k < 0.4 ? 0.85 : 1} />
					<Pouf t={k} position={[0.1, 0.2, 12.7]} size={1.3} />
				</Stage>
			);
		},
	},

	// 2. FLASH-FORWARD : papa de 20 cm dans une boîte à chaussures
	{
		id: 'p02-boite',
		from: S('plan02', -0.05),
		shows: ['papa de 20 cm', 'boîte à chaussures', 'lampe'],
		move: 'plongée qui descend',
		render: (c) => (
			<Stage camera={glide(c, [-0.15, 0.32, -0.4], 0.75, {w: 1.25, pitch: 1.05, fov: 40}, 0.8, 0.1)} ambiance="interiorNight">
				<BedRoom night>
					<ShoeBoxBed position={[0, 0, -0.4]} scale={1.3} />
					<Papa look={L.papa} cm={20} position={[-0.2, 0.32, -0.4]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} emotion="tired" blink />
					<Character look={L.noah} position={[1.45, 0, -0.35]} rotation={[0, -Math.PI / 2, 0]} emotion="sad" pose={{lean: 0.4, armR: [-1.4, -0.1]}}>
						<Flashlight on position={[0, 0, 0.1]} rotation={[Math.PI / 2 + 0.6, 0, 0]} beamLength={2.2} />
					</Character>
				</BedRoom>
			</Stage>
		),
	},

	// 3. REMBOBINAGE → lundi matin
	{
		id: 'p03-lundi',
		from: S('plan03', -0.05),
		shows: ['ville au matin', 'papa qui part au travail'],
		move: 'survol rapide',
		render: (c) => (
			<Stage camera={move({pos: [16, 14, 30], target: [0, 2, 6], fov: 50}, {pos: [6, 9, 24], target: [0, 2, 8], fov: 48}, c)} ambiance="morning">
				{town(c.g)}
				<PapaAt c={c} cm={182} p={[-3 + c.f * 0.05, 0, 14]} r={Math.PI / 2} walk emotion="happy">
					<Briefcase position={[0, -0.2, 0]} rotation={[Math.PI / 2, 0, 0]} scale={0.8} />
				</PapaAt>
			</Stage>
		),
	},

	// 4. Les menteurs se voient : le maire de 20 cm
	{
		id: 'p04-place',
		from: S('plan04'),
		shows: ['place', 'habitants petits et grands', 'maire sur son pupitre'],
		move: 'survol',
		render: (c) => (
			<Stage camera={move({pos: [13, 9.5, 23], target: [0, 1.5, 7], fov: 46}, {pos: [9, 7.5, 19], target: [0, 1.8, 7.5], fov: 44}, c)} ambiance="morning">
				{town(c.g)}
				{[[-4, 9, 0.5, 1], [-2.3, 10.5, 0.4, 0.55], [2.4, 10, -0.2, 0.75], [4.2, 9.2, -0.5, 0.4], [-5.5, 6.5, 0.8, 0.85]].map(([x, z, r, s], i) => (
					<Character key={i} look={{...villager(i + 4), scale: (s as number) * 0.95}} position={[x, 0, z]} rotation={[0, r, 0]} walk={c.f * 0.35 + i} walkAmp={0.5} emotion={s < 0.6 ? 'sad' : 'happy'} />
				))}
				<Character look={L.maire} position={[PODIUM[0] - 0.15, 2.12, PODIUM[2] + 0.1]} emotion="smug" pose={{armR: [-2.4, -0.3]}} />
			</Stage>
		),
	},
	{
		id: 'p04-maire',
		from: W('plan04', 'maire', -0.15),
		shows: ['maire de 20 cm', 'pupitre', 'micro géant'],
		move: 'travelling avant bas',
		render: (c) => (
			<Stage camera={glide(c, [PODIUM[0] - 0.05, 2.38, PODIUM[2] + 0.1], 0.7, {w: 0.85, pitch: 0.05, fov: 40}, 0.85, 0.15)} ambiance="morning">
				{town(c.g)}
				<Character look={L.maire} position={[PODIUM[0] - 0.15, 2.12, PODIUM[2] + 0.1]} emotion="smug" mouthOpen={0.5 + 0.5 * Math.abs(Math.sin(c.f * 0.7))} pose={{armR: [-2.4 + Math.sin(c.f * 0.3) * 0.3, -0.3]}} />
			</Stage>
		),
	},

	// 5. INDICE 1 : la vérité fait regrandir (télé EN DIRECT) — INDICE 2 : panneau « = DOUBLE »
	{
		id: 'p05-tele',
		from: S('plan05'),
		shows: ['écran télé « EN DIRECT »', 'homme qui avoue'],
		move: 'zoom lent',
		render: (c) => (
			<Stage camera={glide(c, [TV[0], 3.9, TV[2]], 3.4, {w: 5.4, pitch: 0.04}, 0.9, 0.08)} ambiance="morning">
				{town(c.g)}
				<group position={TV}>
					<group position={[0, 2.44, -0.55]}>
						<Character look={{...L.tele, scale: 0.42}} position={[0, 0, 0]} emotion="sad" mouthOpen={0.5 * Math.abs(Math.sin(c.f * 0.5))} pose={{armR: [-1.2, -0.2], headNod: 0.2}} />
					</group>
				</group>
			</Stage>
		),
	},
	{
		id: 'p05-regrandit',
		from: W('plan05', 'regrandir', -0.15),
		shows: ['homme qui regrandit (pouf vert)', 'écran télé'],
		move: 'zoom avant',
		render: (c) => {
			const k = c.t - ws('plan05', 'regrandir');
			const sc = k < 0.08 ? 0.42 : 0.9;
			return (
				<Stage camera={glide(c, [TV[0], 3.4, TV[2] - 0.55], 2.4, {w: 2.8, pitch: 0.04}, 0.85, -0.1)} ambiance="morning">
					{town(c.g)}
					<group position={TV}>
						<group position={[0, 2.44, -0.55]}>
							<Character look={{...L.tele, scale: sc}} position={[0, 0, 0]} emotion={k < 0.08 ? 'sad' : 'happy'} pose={{armL: [-2.6, 0.3], armR: [-2.6, -0.3]}} />
							<Pouf t={k} color="#4dff88" size={0.9} />
						</group>
					</group>
				</Stage>
			);
		},
	},
	{
		id: 'p05-double',
		from: W('plan05', 'mentir', -0.12),
		shows: ['panneau « MENSONGE POUR PROTÉGER QUELQU\'UN = DOUBLE »'],
		move: 'travelling avant',
		render: (c) => (
			<Stage camera={glide(c, [RULE[0], 3.5, RULE[2]], 2.8, {w: 4.8, pitch: 0.05}, 0.9, -0.08)} ambiance="morning">
				{town(c.g)}
				<Character look={villager(9)} position={[5.6, 0, 6.2]} rotation={[0, 0.9, 0]} emotion="surprised" walk={c.f * 0.4} walkAmp={0.4} />
			</Stage>
		),
	},

	// 6. Cuisine : Noah, Lou, Maman, Papa (182 cm)
	{
		id: 'p06-noah',
		from: S('plan06'),
		shows: ['Noah', 'carnet de détective'],
		move: 'travelling latéral',
		render: (c) => (
			<Stage camera={move({pos: [1.6, 2.2, 5.6], target: [0.2, 1.75, 2.4], fov: 40}, {pos: [0.9, 2.15, 5.3], target: [0.2, 1.72, 2.4], fov: 38}, c)} ambiance="interior">
				<Kitchen>
					<Character look={L.noah} position={[0.2, 0, 2.6]} rotation={[0, 0.15, 0]} emotion="wink" mouthOpen={0} pose={{armR: [-1.3, -0.25]}}>
						<Notebook position={[0, -0.1, 0.25]} rotation={[-0.3, 0, 0]} />
					</Character>
				</Kitchen>
			</Stage>
		),
	},
	{
		id: 'p06-famille',
		from: W('plan06', 'mesurait', -0.12),
		shows: ['famille à table', 'Lou', 'Maman', 'Papa'],
		move: 'orbite',
		render: (c) => (
			<Stage camera={move({pos: [0.8, 7.2, 6.4], target: [0, 1.2, -0.5], fov: 58}, {pos: [-0.4, 6.8, 6.0], target: [0, 1.2, -0.5], fov: 56}, c)} ambiance="interior">
				<Kitchen>
					<Family c={c} />
					<PapaAt c={c} cm={182} p={[0, 0, -1.9]} emotion="happy" pose={{armR: [-2.6, -0.4]}} />
				</Kitchen>
			</Stage>
		),
	},
	{
		id: 'p06-182',
		from: W('plan06', 'mètre', -0.15),
		shows: ['Papa en entier (1,82 m)'],
		move: 'contre-plongée qui monte',
		render: (c) => (
			<Stage camera={glide(c, [-4.5, 1.65, 1.8], 3.4, {pitch: -0.12, fov: 50}, 0.9, 0.15)} ambiance="interior">
				<Kitchen>
					<PapaAt c={c} cm={182} p={[-4.5, 0, 1.8]} emotion="happy" pose={{armL: [0, 0.4], armR: [0, -0.4]}} />
				</Kitchen>
			</Stage>
		),
	},

	// 7. Lundi : « Grosse journée au bureau ! » — moins deux centimètres
	{
		id: 'p07-porte',
		from: S('plan07'),
		shows: ['Papa à la porte', 'mallette', 'sourire forcé'],
		move: 'travelling avant',
		render: (c) => (
			<Stage camera={glide(c, [-5.8, 1.7, -0.6], 3.5, {w: 2.8, yaw: 0.75}, 0.88, 0.1)} ambiance="interior">
				<Kitchen>
					<PapaAt c={c} p={[-5.8, 0, -0.6]} r={0.9} emotion="smug" pose={{armR: [-0.3, -0.1], armL: [-2.5, 0.3]}}>
						<Briefcase position={[0, -0.15, 0.05]} rotation={[Math.PI / 2, 0, 0]} scale={0.8} />
					</PapaAt>
				</Kitchen>
			</Stage>
		),
	},
	{
		id: 'p07-moins2',
		from: W('plan07', 'moins', -0.12),
		shows: ['Papa qui rapetisse de 2 cm', 'sourire forcé'],
		move: 'zoom avant',
		render: (c) => {
			const k1 = c.t - ws('plan07', 'moins');
			const k2 = c.t - ws('plan07', 'deux');
			return (
				<Stage camera={glide(c, [-5.8, 2.3, -0.6], 2.0, {yaw: 0.8}, 0.85, 0.1)} ambiance="interior">
					<Kitchen>
						<PapaAt c={c} p={[-5.8, 0, -0.6]} r={0.9} emotion="smug" pose={{armR: [-0.3, -0.1]}}>
							<Briefcase position={[0, -0.15, 0.05]} rotation={[Math.PI / 2, 0, 0]} scale={0.8} />
						</PapaAt>
						<Pouf t={k1} position={[-5.8, 2.2, -0.6]} size={0.6} />
						<Pouf t={k2} position={[-5.8, 2.2, -0.6]} size={0.6} seed={9} />
					</Kitchen>
				</Stage>
			);
		},
	},

	// 8. Montage : Lou le dépasse, le costume traîne par terre
	{
		id: 'p08-lou',
		from: S('plan08'),
		shows: ['Lou qui dépasse Papa (dos à dos)', 'toise de la cuisine'],
		move: 'travelling latéral',
		render: (c) => (
			<Stage camera={glide(c, [-4.1, 1.7, 2.2], 3.2, {w: 2.8, pitch: 0.1}, 0.88, 0.12)} ambiance="interior">
				<Kitchen>
					{/* Lou, fière, sur un tabouret */}
					<mesh position={[-4.65, 0.42, 2.2]}>
						<cylinderGeometry args={[0.4, 0.4, 0.85, 12]} />
						<meshStandardMaterial color="#e63946" />
					</mesh>
					<Character look={L.lou} position={[-4.65, 0.85, 2.2]} rotation={[0, 0.25, 0]} emotion="happy" pose={{armL: [-2.8, 0.2], armR: [-2.8, -0.2]}} />
					<PapaAt c={c} p={[-3.55, 0, 2.2]} r={-0.25} emotion="surprised" />
				</Kitchen>
			</Stage>
		),
	},
	{
		id: 'p08-costume',
		from: W('plan08', 'jeudi', -0.12),
		shows: ['Papa dans un costume trop grand', 'costume qui traîne'],
		move: 'travelling qui suit Papa',
		render: (c) => {
			const x = -5 + c.f * 0.035;
			return (
				<Stage camera={fit([x + 0.3, 0.9, 3.0], 2.2, {w: 2.2, yaw: 0.45, pitch: 0.15})} ambiance="interior">
					<Kitchen>
						<PapaAt c={c} p={[x, 0, 3.0]} r={Math.PI / 2} walk emotion="smug">
							<Briefcase position={[0, -0.1, 0.05]} rotation={[Math.PI / 2, 0, 0]} scale={0.8} />
						</PapaAt>
					</Kitchen>
				</Stage>
			);
		},
	},
	{
		id: 'p08-traine',
		from: W('plan08', 'traînait', -0.12),
		shows: ['pantalon et cravate qui traînent par terre'],
		move: 'travelling bas',
		render: (c) => {
			const x = -3 + c.f * 0.03;
			return (
				<Stage camera={fit([x, 0.45, 3.0], 1.1, {w: 1.6, yaw: 0.7, pitch: 0.08})} ambiance="interior">
					<Kitchen>
						<PapaAt c={c} p={[x, 0, 3.0]} r={Math.PI / 2} walk emotion="smug" />
					</Kitchen>
				</Stage>
			);
		},
	},

	// 9. Vendredi, je l'ai suivi
	{
		id: 'p09-rue',
		from: S('plan09'),
		shows: ['Noah caché derrière une poubelle', 'Papa qui marche'],
		move: 'travelling par-dessus l\'épaule',
		render: (c) => {
			const px = 0.5 + c.f * 0.04;
			return (
				<Stage camera={glide(c, [2.4, 1.3, 16.2], 2.6, {w: 4.4, yaw: 0.3, pitch: 0.25}, 0.9, 0.06)} ambiance="morning">
					{town(c.g)}
					<Character look={L.noah} position={NOAH_SPY} rotation={[0, Math.PI + 0.3, 0]} emotion="determined" pose={{lean: 0.25, armR: [-1.2, -0.2]}}>
						<Notebook position={[0, -0.1, 0.25]} rotation={[-0.3, 0, 0]} />
					</Character>
					<PapaAt c={c} p={[px, 0, 14.4]} r={Math.PI / 2} walk emotion="neutral">
						<Briefcase position={[0, -0.1, 0.05]} rotation={[Math.PI / 2, 0, 0]} scale={0.8} />
					</PapaAt>
				</Stage>
			);
		},
	},

	// 10. Pas au bureau : sur un banc, toute la journée
	{
		id: 'p10-passe',
		from: S('plan10'),
		shows: ['Papa qui passe devant le bureau sans entrer'],
		move: 'panoramique qui suit',
		render: (c) => {
			const px = 4.6 + c.f * 0.035;
			return (
				<Stage camera={fit([px + 0.2, 1.6, 13.2], 3.4, {w: 4.6, yaw: -0.1, pitch: 0.1})} ambiance="day">
					{town(c.g)}
					<StreetSign lines={['BUREAUX', 'ENTRÉE →']} position={[5.0, 0, 11.6]} w={2.6} h={1.2} bg="#ffffff" fg="#1b1b1b" post={1.6} />
					<PapaAt c={c} p={[px, 0, 14.0]} r={Math.PI / 2 - 0.2} walk emotion="sad">
						<Briefcase position={[0, -0.1, 0.05]} rotation={[Math.PI / 2, 0, 0]} scale={0.8} />
					</PapaAt>
				</Stage>
			);
		},
	},
	{
		id: 'p10-journee',
		from: W('plan10', 'resté', -0.15),
		shows: ['Papa sur le banc, le soleil tourne', 'pigeons'],
		move: 'orbite (accéléré)',
		render: (c) => {
			const a = -0.9 + ramp(c.f, 0, c.d, (x) => x) * 1.3;
			return (
				<Stage camera={{pos: [8.5 + Math.sin(a) * 5, 2.4, 13.6 + Math.cos(a) * 5], target: [8.5, 1.0, 13.6], fov: 44}} ambiance={c.p < 0.5 ? 'day' : 'golden'}>
					{town(c.g)}
					<PapaAt c={c} p={[8.4, 0.62, 13.65]} r={-0.25} sit emotion="sad" pose={{armR: [-1.0, -0.3]}} />
					{[0, 1, 2, 3, 4, 5].map((i) => (
						<Pigeon key={i} position={[7.0 + i * 0.55, 0, 14.5 + (i % 2) * 0.5]} rotY={Math.PI + (i - 2) * 0.4} f={c.f * 3} seed={i} />
					))}
				</Stage>
			);
		},
	},

	// 11. INDICE 3 : la mallette vide, une seule lettre
	{
		id: 'p11-mallette',
		from: S('plan11'),
		shows: ['mallette qui s\'ouvre', 'Papa'],
		move: 'plongée qui descend',
		render: (c) => (
			<Stage camera={glide(c, [8.05, 1.05, 13.85], 1.2, {w: 1.5, yaw: -0.25, pitch: 0.85, fov: 40}, 0.85, 0.08)} ambiance="golden">
				{town(c.g)}
				<PapaAt c={c} p={[8.9, 0.62, 13.5]} r={-0.6} sit emotion="sad" pose={{armL: [-0.9, 0.5], headNod: 0.4}} />
				<Briefcase position={[8.0, 0.95, 13.85]} rotation={[0, -0.25, 0]} scale={0.95} open={ramp(c.f, 4, 24)} />
			</Stage>
		),
	},
	{
		id: 'p11-lettre',
		from: W('plan11', 'une', -0.1),
		shows: ['lettre « ...VOUS ÊTES LICENCIÉ... »'],
		move: 'zoom avant',
		render: (c) => (
			<Stage camera={glide(c, [8.0, 1.1, 13.86], 0.85, {w: 0.75, pitch: 1.2, fov: 40, up: 0.3}, 0.85, 0.05)} ambiance="golden">
				{town(c.g)}
				<Briefcase position={[8.0, 0.95, 13.85]} rotation={[0, 0, 0]} scale={0.95} open={1} />
			</Stage>
		),
	},
	{
		id: 'p11-noah',
		from: W('plan11', 'perdu', -0.15),
		shows: ['Noah qui comprend (gros plan)'],
		move: 'zoom lent',
		render: (c) => (
			<Stage camera={glide(c, [NOAH_SPY[0], 1.75, NOAH_SPY[2]], 1.7, {yaw: Math.PI - 0.6, pitch: 0.06, fov: 40}, 0.85, 0.08)} ambiance="golden">
				{town(c.g)}
				<Character look={L.noah} position={NOAH_SPY} rotation={[0, Math.PI - 0.6, 0]} emotion="surprised" eyes={[0.4, 0]} pose={{armR: [-1.3, -0.2]}}>
					<Notebook position={[0, -0.1, 0.25]} rotation={[-0.3, 0, 0]} />
				</Character>
			</Stage>
		),
	},

	// 12. Chaque soir, il mentait pour nous
	{
		id: 'p12-table',
		from: S('plan12'),
		shows: ['Papa de 30 cm qui monte sur la table', 'famille'],
		move: 'travelling avant',
		render: (c) => (
			<Stage camera={glide(c, [0, 1.6, -0.1], 2.4, {w: 3.4, yaw: 0.55, pitch: 0.45}, 0.85, 0.1)} ambiance="interior">
				<Kitchen evening>
					<Family c={c} emo="happy" />
					<PapaAt c={c} p={[0, 1.32, -0.1]} emotion="smug" pose={{armL: [-2.6, 0.4], armR: [-2.6, -0.4]}} />
				</Kitchen>
			</Stage>
		),
	},
	{
		id: 'p12-mini',
		from: W('plan12', 'rapetissait', -0.15),
		shows: ['Papa minuscule au sourire forcé'],
		move: 'zoom avant',
		render: (c) => (
			<Stage camera={glide(c, [0, 1.6, -0.1], 0.9, {yaw: 0.1, pitch: 0.12, fov: 40, up: 0.02}, 0.8, 0.1)} ambiance="interior">
				<Kitchen evening>
					<PapaAt c={c} p={[0, 1.32, -0.1]} emotion="smug" pose={{armL: [-2.6, 0.4], armR: [-2.6, -0.4]}} />
				</Kitchen>
			</Stage>
		),
	},
	{
		id: 'p12-retour',
		from: W('plan12', 'pour', -0.1, 2),
		shows: ['papa de 20 cm dans la boîte à chaussures (retour au flash-forward)'],
		move: 'plongée qui descend',
		render: (c) => (
			<Stage camera={glide(c, [-0.15, 0.32, -0.4], 0.75, {w: 1.25, pitch: 1.05, fov: 40}, 0.8, -0.1)} ambiance="interiorNight">
				<BedRoom night>
					<ShoeBoxBed position={[0, 0, -0.4]} scale={1.3} />
					<Papa look={L.papa} cm={20} position={[-0.2, 0.32, -0.4]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} emotion="tired" blink />
					<pointLight position={[0.2, 1.6, 0.6]} intensity={4} distance={3} color="#fff2c0" />
				</BedRoom>
			</Stage>
		),
	},

	// 13. PAUSE DRAMATIQUE (0,5 s) : Noah prend sa décision
	{
		id: 'p13-decision',
		from: S('plan13', 0),
		shows: ['Noah qui prend sa décision (gros plan)'],
		move: 'zoom lent',
		render: (c) => (
			<Stage camera={glide(c, [0.2, 1.95, 1.6], 1.35, {yaw: -0.1, pitch: 0.04, fov: 40}, 0.85, 0.05)} ambiance="interiorNight">
				<BedRoom night>
					<Character look={L.noah} position={[0.2, 0, 1.6]} rotation={[0, -0.1, 0]} emotion="determined" />
					<pointLight position={[0.0, 1.9, 2.6]} intensity={3} distance={3} color="#fff2c0" />
				</BedRoom>
			</Stage>
		),
	},

	// 14. Le lendemain : la lettre sur la table — « Papa, on sait. »
	{
		id: 'p14-lettre',
		from: S('plan14', -0.05),
		shows: ['lettre sur la table', 'papa minuscule'],
		move: 'plongée',
		render: (c) => (
			<Stage camera={glide(c, [0.15, 1.45, 0.2], 1.2, {w: 1.1, pitch: 0.85, fov: 40}, 0.85, 0.06)} ambiance="morning">
				<Kitchen>
					<Letter position={[0.3, 1.33, 0.75]} rotation={[-Math.PI / 2, 0, 0.1]} scale={0.32} />
					<PapaAt c={c} p={[0, 1.32, -0.45]} emotion="surprised" />
				</Kitchen>
			</Stage>
		),
	},
	{
		id: 'p14-onsait',
		from: W('plan14', 'papa', -0.12),
		shows: ['toute la famille regarde Papa'],
		move: 'travelling arrière',
		render: (c) => (
			<Stage camera={glide(c, [0, 1.8, 0.4], 2.6, {w: 4.6, yaw: Math.PI, pitch: 0.2}, 0.9, 0.08)} ambiance="morning">
				<Kitchen>
					<Family c={c} emo="moved" noahUp />
					<PapaAt c={c} p={[0, 1.32, -0.45]} r={Math.PI} emotion="surprised" />
				</Kitchen>
			</Stage>
		),
	},

	// 15. Pour la première fois, la vérité
	{
		id: 'p15-larme',
		from: S('plan15'),
		shows: ['Papa minuscule qui baisse la tête', 'larme bleue'],
		move: 'zoom avant',
		render: (c) => (
			<Stage camera={glide(c, [0, 1.56, -0.45], 0.7, {yaw: 0, pitch: 0.12, fov: 40, up: 0.02}, 0.85, 0.08)} ambiance="morning">
				<Kitchen>
					<PapaAt c={c} p={[0, 1.32, -0.45]} emotion="sad" pose={{headNod: 0.35}} />
					<Tear t={c.t - tl.line('plan15').start} position={[0.035, 1.32 + 0.27, -0.45 + 0.07]} scale={0.12} />
					<Letter position={[0.3, 1.33, 0.75]} rotation={[-Math.PI / 2, 0, 0.1]} scale={0.32} />
				</Kitchen>
			</Stage>
		),
	},
	{
		id: 'p15-verite',
		from: W('plan15', 'vérité', -0.15),
		shows: ['famille émue', 'Papa minuscule'],
		move: 'orbite',
		render: (c) => (
			<Stage camera={glide(c, [0, 1.6, -0.2], 2.2, {w: 3.6, yaw: -0.75, pitch: 0.3}, 0.88, 0.1)} ambiance="morning">
				<Kitchen>
					<Family c={c} emo="moved" />
					<PapaAt c={c} p={[0, 1.32, -0.45]} emotion="moved" pose={{headNod: 0.2}} />
				</Kitchen>
			</Stage>
		),
	},

	// 16. POUF : 1,82 m, le costume lui va enfin
	{
		id: 'p16-pouf',
		from: S('plan16'),
		shows: ['Papa qui regrandit d\'un coup (pouf vert)'],
		move: 'travelling arrière',
		render: (c) => {
			const k = c.t - ws('plan16', 'pouf');
			const big = k > 0.05;
			return (
				<Stage camera={fit([0, 1.8, -1.2], 3.6, {w: 4.4, yaw: 0.55, pitch: 0.3})} ambiance="morning">
					<Kitchen>
						<Family c={c} emo={big ? 'surprised' : 'moved'} />
						<PapaAt c={c} p={big ? [0, 0, -1.9] : [0, 1.32, -0.45]} cm={big ? 182 : 20} fit={big} emotion={big ? 'surprised' : 'sad'} pose={big ? {armL: [-2.7, 0.5], armR: [-2.7, -0.5]} : undefined} />
						<Pouf t={k} color="#4dff88" size={2.4} position={[0, 0.4, -1.4]} />
					</Kitchen>
				</Stage>
			);
		},
	},
	{
		id: 'p16-calin',
		from: W('plan16', 'quatre', -0.12),
		shows: ['câlin de famille', 'costume qui va enfin'],
		move: 'orbite',
		render: (c) => {
			const a = 0.35 - ramp(c.f, 0, c.d, (x) => x) * 0.5;
			return (
				<Stage camera={fit([0.15, 1.7, -0.9], 3.6, {w: 3.6, yaw: a * 0.4, pitch: 0.35})} ambiance="morning">
					<Kitchen>
						<PapaAt c={c} cm={182} fit p={[0, 0, -1.3]} emotion="moved" pose={{armL: [-1.3, 0.2], armR: [-1.3, -0.2]}} />
						<Character look={L.noah} position={[-0.55, 0, -0.55]} rotation={[0, Math.PI - 0.3, 0]} emotion="happy" pose={{armL: [-1.4, 0.2], armR: [-1.4, -0.2]}} />
						<Character look={L.lou} position={[0.35, 0, -0.5]} rotation={[0, Math.PI + 0.2, 0]} emotion="happy" pose={{armL: [-2.6, 0.3], armR: [-2.6, -0.3]}} />
						<Character look={L.maman} position={[0.95, 0, -1.0]} rotation={[0, -Math.PI / 2 - 0.4, 0]} emotion="moved" pose={{armL: [-1.3, 0.3], armR: [-1.3, -0.3]}} />
					</Kitchen>
				</Stage>
			);
		},
	},

	// 17. Les lasagnes de maman — carte-question pendant la phrase — boucle sur le panneau
	{
		id: 'p17-lasagnes',
		from: S('plan17'),
		shows: ['Maman qui sert des lasagnes', 'Papa à table'],
		move: 'travelling latéral',
		render: (c) => (
			<Stage camera={glide(c, [0.3, 1.7, -0.9], 3.0, {w: 3.8, yaw: 0.45, pitch: 0.32}, 0.88, -0.1)} ambiance="interior">
				<Kitchen evening>
					<Character look={L.noah} position={[0, 0.25, 1.75]} rotation={[0, Math.PI, 0]} sit emotion="happy" />
					<Character look={L.lou} position={[-2.35, 0.5, 0]} rotation={[0, Math.PI / 2, 0]} sit emotion="happy" />
					<Character look={L.maman} position={[0.9, 0, -1.05]} rotation={[0, -0.4, 0]} emotion="happy" pose={{armL: [-1.3, 0.2], armR: [-1.3, -0.2]}} />
					<Lasagna position={[0.55, 1.33, -0.35]} scale={0.9} f={c.f} />
					<PapaAt c={c} cm={182} fit p={[-0.4, 0.25, -1.75]} sit emotion="happy" />
				</Kitchen>
			</Stage>
		),
	},
	{
		id: 'p17-bof',
		from: W('plan17', 'vérité', -0.12),
		shows: ['Papa qui goûte les lasagnes : « Bof. »', 'lasagnes'],
		move: 'zoom avant',
		render: (c) => (
			<Stage camera={glide(c, [-0.4, 2.35, -1.75], 1.6, {yaw: 0.05, pitch: 0.08, fov: 40}, 0.85, 0.08)} ambiance="interior">
				<Kitchen evening>
					<Lasagna position={[0.3, 1.33, -0.6]} scale={0.9} f={c.f} />
					<PapaAt c={c} cm={182} fit p={[-0.4, 0.25, -1.75]} sit emotion="tired" pose={{armR: [-1.6, -0.2]}} />
				</Kitchen>
			</Stage>
		),
	},
	{
		id: 'p17-choc',
		from: W('plan17', 'lasagnes', -0.12),
		shows: ['Maman choquée', 'tout le monde rit'],
		move: 'orbite',
		render: (c) => (
			<Stage camera={glide(c, [0.6, 1.9, -1.0], 2.8, {w: 3.4, yaw: -0.35, pitch: 0.2}, 0.88, -0.1)} ambiance="interior">
				<Kitchen evening>
					<Character look={L.maman} position={[0.9, 0, -1.05]} rotation={[0, -0.4, 0]} emotion="panic" pose={{armL: [-2.8, 0.4], armR: [-2.8, -0.4]}} />
					<Character look={L.noah} position={[0, 0.25, 1.75]} rotation={[0, Math.PI, 0]} sit emotion="happy" mouthOpen={0.8} />
					<Character look={L.lou} position={[-2.35, 0.5, 0]} rotation={[0, Math.PI / 2, 0]} sit emotion="happy" mouthOpen={0.8} />
					<PapaAt c={c} cm={182} fit p={[-0.4, 0.25, -1.75]} sit emotion="wink" />
					<Lasagna position={[0.3, 1.33, -0.6]} scale={0.9} f={c.f} />
				</Kitchen>
			</Stage>
		),
	},
	{
		id: 'p17-boucle',
		from: E('plan17', 0.05),
		keep: true,
		shows: ['panneau « ICI, LES MENTEURS RAPETISSENT » (boucle vers le début)'],
		move: 'travelling avant',
		render: (c) => (
			<Stage camera={glide(c, [-0.9, 2.3, 12.3], 4.6, {w: 6.4, pitch: 0.08}, 0.92, -0.06)} ambiance="morning">
				{town(c.g)}
				<Character look={L.passant} position={[0.1, 0, 12.7]} rotation={[0, -0.25, 0]} emotion="smug" />
			</Stage>
		),
	},
];

export const shotsInOrder = (): BuiltShot[] => buildShots(SHOTS, tl, tl.durationInFrames);
