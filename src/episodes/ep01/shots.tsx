/**
 * Ép. 01 — découpage plan par plan.
 * Chaque plan démarre sur une réplique (tl.f('id')) : si la voix change, tout se recale tout seul.
 */
import React from 'react';
import {Character, Pose} from '../../three/Character';
import {Stage, CameraShot, lerpShot, Vec3} from '../../three/Stage';
import {Village, PLACES, Chalet, Mountains, Sapin} from '../../three/Village';
import {BakeryInterior} from '../../three/BakeryInterior';
import {Crowd} from '../../three/Crowd';
import {Sign, Croissant, Buoy, Flashlight, FlourSack, Puffs, Explosion} from '../../three/Props';
import {flourTexture, rng} from '../../three/textures';
import {CAST, villager} from '../cast';
import {blinkAt, punch, ramp, squashAt, pop} from '../../lib/anim';
import {ep01} from './data';

const tl = ep01.tl;
const FPS = 30;

export type ShotCtx = {f: number; g: number; t: number; d: number; p: number};
export type ShotDef = {id: string; from: number; render: (c: ShotCtx) => React.ReactNode};

const mouth = (who: string, t: number) => tl.mouthOpen(who, t);

/**
 * Cadrage « gros plan » : place le visage d'un personnage au tiers haut de l'écran
 * (les sous-titres occupent le centre-bas). `rotY` = orientation du personnage,
 * `side` = décalage angulaire de la caméra autour de lui.
 */
const closeUp = (who: Vec3, rotY: number, dist: number, o: {side?: number; fov?: number; h?: number; scale?: number; shake?: number} = {}): CameraShot => {
	const fov = o.fov ?? 38;
	const headY = who[1] + 2.42 * (o.scale ?? 1);
	const a = rotY + (o.side ?? 0);
	const off = 0.27 * dist * Math.tan(((fov / 2) * Math.PI) / 180);
	return {
		pos: [who[0] + Math.sin(a) * dist, headY + (o.h ?? 0.15), who[2] + Math.cos(a) * dist],
		target: [who[0], headY - off, who[2]],
		fov,
		shake: o.shake,
	};
};

// ——— Positions récurrentes ———
const BELFRY_Y = 10.55;
const LEON_BELFRY: Vec3 = [0, BELFRY_Y, -12.6];
const MAYOR_POS: Vec3 = [PLACES.estrade.x, 0.6, PLACES.estrade.z];
const LEON_DOOR: Vec3 = [-4.3, 0, -2.2];
const KEVIN_POS: Vec3 = [16, 0, -22.6];

/** Plan rapproché de Léon qui hurle en haut du clocher (accroche + climax). */
const belfryScream = (c: ShotCtx, lineId: string) => {
	const at = tl.f(lineId) - (c.g - c.f);
	const k = punch(c.f, at, 7);
	const cam = closeUp(LEON_BELFRY, 0, 4 - k * 0.9, {side: 0.08, fov: 34 - k * 6, shake: k * 0.05});
	return (
		<Stage camera={cam}>
			<Village bellSwing={Math.sin(c.g / 5) * 0.15} />
			<Character look={CAST.leon} position={LEON_BELFRY} emotion="panic" mouthOpen={mouth('leon', c.t)} squash={squashAt(c.f, at, 0.2)}
				pose={{armL: [-0.5, 0.7], armR: [-0.5, 0.7], headNod: -0.1}} />
		</Stage>
	);
};

const CROISSANTS_GROUND: [number, number, number][] = (() => {
	const R = rng(21);
	return Array.from({length: 55}).map(() => [(R() - 0.5) * 22, (R() - 0.5) * 20 - 2, R() * 6]);
})();
const GroundCroissants: React.FC = () => (
	<>
		{CROISSANTS_GROUND.map(([x, z, r], i) =>
			Math.hypot(x, z) < 2.6 ? null : <Croissant key={i} position={[x, 0.16, z]} rotation={[-Math.PI / 2, 0, r]} scale={0.9} />,
		)}
	</>
);

/** Petite rue de nuit pour les amoureux. */
const NightStreet: React.FC<{f: number; children?: React.ReactNode}> = ({f, children}) => {
	const stars = React.useMemo(() => {
		const R = rng(5);
		return Array.from({length: 60}).map(() => [(R() - 0.5) * 160, 25 + R() * 50, -60 - R() * 20] as Vec3);
	}, []);
	return (
		<group>
			<mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
				<planeGeometry args={[200, 200]} />
				<meshStandardMaterial color="#3d4f86" />
			</mesh>
			<Chalet position={[-5, 0, 0]} rotY={Math.PI / 2} w={6} d={5} h={5} night wall="#b5713b" roof="#6e2f1d" shutter="#2e8b57" />
			<Chalet position={[5, 0, 0]} rotY={-Math.PI / 2} w={6} d={5} h={5} night wall="#d69a5b" roof="#8f3b22" shutter="#c0392b" />
			<Chalet position={[-6, 0, -9]} rotY={Math.PI / 2} w={5} d={5} h={4.6} night />
			<Chalet position={[6, 0, -9]} rotY={-Math.PI / 2} w={5} d={5} h={4.6} night wall="#e8b07a" />
			{[[-14, -20], [14, -22], [-3, -26], [4, -30]].map(([x, z], i) => <Sapin key={i} p={[x, 0, z]} s={1.4} />)}
			<Mountains snow="#c9d2ff" tint="#3c3f78" />
			<mesh position={[18, 34, -70]}>
				<sphereGeometry args={[5, 20, 16]} />
				<meshBasicMaterial color="#fff6d0" fog={false} />
			</mesh>
			{stars.map((p, i) => (
				<mesh key={i} position={p}>
					<sphereGeometry args={[0.18 + (i % 3) * 0.08, 4, 4]} />
					<meshBasicMaterial color="#ffffff" fog={false} transparent opacity={0.5 + 0.5 * Math.abs(Math.sin(f / 9 + i))} />
				</mesh>
			))}
			<pointLight position={[0, 6, 4]} color="#ffcf8a" intensity={8} distance={25} />
			{children}
		</group>
	);
};

/** Signal morse : vrai si la lampe est allumée à la frame f. */
const morseOn = (f: number, code: string, unit = 4) => {
	const seq: number[] = [];
	for (const ch of code) {
		if (ch === '.') seq.push(1, 0);
		else if (ch === '-') seq.push(1, 1, 1, 0);
		else seq.push(0, 0, 0);
	}
	seq.push(0, 0, 0, 0);
	return seq[Math.floor(f / unit) % seq.length] === 1;
};

const LOVER_HIM: Vec3 = [-1.9, 2.62, 0];
const LOVER_HER: Vec3 = [1.9, 2.62, 0];

/** Croissants qui tombent du ciel (t en secondes depuis le début de la pluie). */
const CroissantRain: React.FC<{t: number; count?: number}> = ({t, count = 70}) => {
	const R = rng(33);
	const items = Array.from({length: count}).map(() => ({
		x: (R() - 0.5) * 24, z: (R() - 0.5) * 20 - 1, delay: R() * 2.2, rot: R() * 6, spin: 2 + R() * 6, h: 14 + R() * 10,
	}));
	return (
		<>
			{items.map((c, i) => {
				const lt = t - c.delay;
				if (lt < 0) return null;
				const fall = c.h - 0.5 * 18 * lt * lt;
				const landed = fall <= 0.16;
				const y = landed ? 0.16 : fall;
				const sq = landed ? squashAt(lt * FPS, Math.sqrt((c.h - 0.16) / 9) * FPS, 0.5) : 1;
				return (
					<group key={i} position={[c.x, y, c.z]} scale={[1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq)]}>
						<Croissant rotation={landed ? [-Math.PI / 2, 0, c.rot] : [lt * c.spin, c.rot, lt * c.spin * 0.7]} scale={0.95} />
					</group>
				);
			})}
		</>
	);
};

const leonIdle = (f: number): Pose => ({headTilt: Math.sin(f / 18) * 0.05});

// ————————————————————————————————————————————————————————————————
export const SHOTS: ShotDef[] = [
	// 1. ACCROCHE — « COUREZ ! » en très gros plan
	{id: 'hook-scream', from: 0, render: (c) => belfryScream(c, 'hook-courez')},

	// 2. Plan large depuis le clocher, la foule lève la tête
	{
		id: 'hook-wide',
		from: tl.f('hook-1', -0.1),
		render: (c) => {
			const cam = lerpShot(
				{pos: [1.2, 13.6, -11.2], target: [0, 1, 4], fov: 52},
				{pos: [2.6, 16.5, -9.2], target: [0, 0, 5], fov: 58},
				ramp(c.f, 0, c.d),
			);
			return (
				<Stage camera={cam}>
					<Village bellSwing={Math.sin(c.g / 5) * 0.1} />
					<Character look={CAST.leon} position={LEON_BELFRY} emotion="panic" pose={{armL: [-0.6, 0.6], armR: [-0.6, 0.6]}} />
					<Crowd frame={c.g} count={22} mode="lookUp" lookAt={[0, 12, -12.6]} />
				</Stage>
			);
		},
	},

	// 3. Rembobinage → Léon, avant toute l'histoire, montre son solde
	{
		id: 'hook-solde',
		from: tl.f('hook-2', -0.15),
		render: (c) => {
			const k = ramp(c.f, 0, c.d);
			return (
				<Stage camera={closeUp([-3, 0, 4], 0, 5.2 - k * 0.8, {side: 0.12})}>
					<Village />
					<Character look={CAST.leon} position={[-3, 0, 4]} emotion={c.f > 20 ? 'smug' : 'surprised'} blink={blinkAt(c.f)}
						pose={{armR: [-0.2, 2.7 + Math.sin(c.f / 4) * 0.1], ...leonIdle(c.f)}} eyes={[0.3, -0.8]} />
				</Stage>
			);
		},
	},

	// 4. Plan d'ensemble du village (« je reprends depuis le début »)
	{
		id: 'establishing',
		from: tl.f('rewind', -0.05),
		render: (c) => {
			const k = ramp(c.f, 0, c.d);
			const cam = lerpShot({pos: [8, 26, 36], target: [0, 3, -4], fov: 46}, {pos: [4, 11, 22], target: [-2, 3, -4], fov: 46}, k);
			return (
				<Stage camera={cam}>
					<Village />
					<Crowd frame={c.g} count={14} mode="idle" lookAt={[0, 2, 0]} />
					<Character look={CAST.leon} position={[-1 - k * 3, 0, 6 - k * 4]} rotation={[0, -2.4, 0]} walk={c.f * 0.5} emotion="happy" />
				</Stage>
			);
		},
	},

	// 5. Le maire fait son discours… en mime
	{
		id: 'maire-mime',
		from: tl.f('maire-1', -0.1),
		render: (c) => {
			const k = ramp(c.f, 0, c.d);
			const g1 = Math.sin(c.f / 5);
			return (
				<Stage camera={{pos: [0.5 + k * 0.6, 2.9, 1.6], target: [5.8, 3.1, -3], fov: 40}}>
					<Village />
					<Character look={CAST.maire} position={MAYOR_POS} rotation={[0, -Math.PI / 2, 0]} emotion="happy" blink={blinkAt(c.f, 2)}
						pose={{armL: [-0.8 + g1 * 0.6, 1.2 + g1 * 0.5], armR: [-0.8 - g1 * 0.6, 1.2 - g1 * 0.5], headTilt: g1 * 0.1}} />
					<Crowd frame={c.g} count={16} mode="idle" lookAt={[5.8, 2, -3]} seed={8} exclude={(x, z) => (x > 3 && Math.abs(z + 3) < 2.5) || Math.hypot(x - 1, z - 1.6) < 3} />
				</Stage>
			);
		},
	},

	// 6. Gros plan : il mime « budget »… et ça ressemble à une noyade
	{
		id: 'maire-budget',
		from: tl.f('maire-2', -0.05),
		render: (c) => {
			const flail = c.g >= tl.fw('maire-2', 6) - 4;
			const s = Math.sin(c.f * 0.9);
			const pose: Pose = flail
				? {armL: [0, 2.2 + s * 0.7], armR: [0, 2.2 - s * 0.7], headTilt: s * 0.15, headNod: -0.15}
				: {armR: [-1.4, -0.3 + Math.sin(c.f * 1.2) * 0.08], armL: [-1.4, -0.3 - Math.sin(c.f * 1.2) * 0.08]};
			return (
				<Stage camera={closeUp(MAYOR_POS, -Math.PI / 2 + 0.25, 4.6, {scale: 1.08, side: 0.15, fov: 40})}>
					<Village />
					<Character look={CAST.maire} position={MAYOR_POS} rotation={[0, -Math.PI / 2 + 0.25, 0]} emotion={flail ? 'panic' : 'smug'}
						bob={flail ? Math.abs(s) * 0.12 : 0} pose={pose} blink={blinkAt(c.f, 2)} />
				</Stage>
			);
		},
	},

	// 7. Quelqu'un lui lance une bouée
	{
		id: 'maire-bouee',
		from: tl.f('maire-3', -0.05),
		render: (c) => {
			const k = ramp(c.f, 4, 22);
			const s = Math.sin(c.f * 0.9);
			const landed = k >= 1;
			const buoyPos: Vec3 = landed ? [MAYOR_POS[0], MAYOR_POS[1] + 1.45, MAYOR_POS[2]] : [1 + k * 4.8, 2 + Math.sin(k * Math.PI) * 2.6 + k * 0.05, 1 - k * 4];
			const at = tl.fw('maire-3', 5) - (c.g - c.f);
			const z = punch(c.f, at, 6);
			return (
				<Stage camera={{pos: [-1.2 + z, 3.2, 3.6 - z * 1.5], target: [4.6, 2.6, -2.4], fov: 46 - z * 10}}>
					<Village />
					<Character look={CAST.maire} position={MAYOR_POS} rotation={[0, -Math.PI / 2, 0]} emotion={landed ? 'surprised' : 'panic'}
						pose={landed ? {armL: [0, 1.4], armR: [0, 1.4]} : {armL: [0, 2.2 + s * 0.7], armR: [0, 2.2 - s * 0.7]}} squash={landed ? squashAt(c.f, 22, 0.15) : 1} />
					<Buoy position={buoyPos} rotation={landed ? [Math.PI / 2, 0, 0] : [c.f * 0.4, c.f * 0.3, 0]} scale={landed ? 1.25 : 1} />
					<Character look={villager(4)} position={[2.4, 0, 0.6]} rotation={[0, 2.1, 0]} emotion="determined" pose={{armR: [-2.6 + k * 1.5, -0.2]}} />
					<Crowd frame={c.g} count={10} mode="idle" lookAt={[5.8, 2, -3]} seed={8} exclude={(x, z) => (x > 3 && Math.abs(z + 3) < 2.5) || Math.hypot(x + 1, z - 3) < 3.5 || Math.hypot(x - 2.4, z - 0.6) < 1.5} />
				</Stage>
			);
		},
	},

	// 8. La boulangère (travelling latéral dans la boutique)
	{
		id: 'boul-travelling',
		from: tl.f('boul-1', -0.1),
		render: (c) => {
			const k = ramp(c.f, 0, c.d);
			return (
				<Stage camera={{pos: [-4.2 + k * 4.5, 2.9, 7.2], target: [-1 + k * 0.4, 2.3, 1], fov: 44}} ambiance="interior">
					<BakeryInterior steam={-1} />
					<Character look={CAST.boulangere} position={[-0.6, 0, 0.6]} emotion="smug" blink={blinkAt(c.f, 1)} pose={{armL: [-0.4, 0.1]}} />
					<Character look={villager(2)} position={[1.6, 0, 3.2]} rotation={[0, -2.4, 0]} emotion="neutral" pose={{armR: [-1.2, 0]}} />
				</Stage>
			);
		},
	},

	// 9-11. Les pancartes
	...([
		['boul-2', 'BAGUETTE', 'happy', [-1.6, 3.4, 5.4]],
		['boul-3', 'CROISSANT', 'happy', [0.4, 3.3, 5.4]],
		['boul-4', 'PAS DE\nCRÉDIT', 'smug', [-0.6, 3.1, 6.6]],
	] as const).map(([id, text, emo, pos], n) => ({
		id: 'pancarte-' + n,
		from: tl.f(id, -0.12),
		render: (c: ShotCtx) => {
			const s = pop(c.f, 0, FPS, 380, 9);
			const arm = -2.5;
			return (
				<Stage camera={{pos: [(pos as unknown as Vec3)[0], 3.7, 6.4], target: [-0.6, 3.6, 0.6], fov: 44}} ambiance="interior">
					<BakeryInterior steam={-1} />
					<Character look={CAST.boulangere} position={[-0.6, 0, 0.6]} emotion={emo} blink={blinkAt(c.f, 1)}
						pose={{armR: [arm, -0.15], headTilt: -0.12}}>
						<group scale={Math.max(0.01, s)}>
							<Sign text={text} rotation={[-arm, 0, 0]} position={[0, -0.6, 0]} scale={0.95} />
						</group>
					</Character>
					{n === 2 && <Character look={villager(2)} position={[1.8, 0, 3.0]} rotation={[0, -2.4, 0]} emotion="sad" />}
				</Stage>
			);
		},
	})),

	// 12. Les amoureux et leurs lampes de poche (nuit)
	{
		id: 'amour-wide',
		from: tl.f('amour-1', -0.1),
		render: (c) => (
			<Stage camera={{pos: [0, 4.8, 12.5 - ramp(c.f, 0, c.d) * 1.0], target: [0, 3.6, 0], fov: 46}} ambiance="night" fogNear={40} fogFar={160}>
				<NightStreet f={c.g}>
					<Character look={CAST.amoureux} position={LOVER_HIM} rotation={[0, Math.PI / 2, 0]} emotion="happy" pose={{armR: [-1.5, 0]}}>
						<Flashlight on={morseOn(c.f, '.--- .') } rotation={[Math.PI / 2 - 0.05, 0, 0]} position={[0, -0.1, 0.1]} beamLength={4} />
					</Character>
					<Character look={CAST.amoureuse} position={LOVER_HER} rotation={[0, -Math.PI / 2, 0]} emotion="happy" pose={{armR: [-1.5, 0]}}>
						<Flashlight on={morseOn(c.f + 9, '.-.. .')} rotation={[Math.PI / 2 - 0.05, 0, 0]} position={[0, -0.1, 0.1]} beamLength={4} />
					</Character>
				</NightStreet>
			</Stage>
		),
	},

	// 13. Trois ans plus tard… elle est épuisée
	{
		id: 'amour-tired',
		from: tl.f('amour-2', -0.1),
		render: (c) => (
			<Stage camera={closeUp(LOVER_HER, -Math.PI / 2 + 0.5, 3.4, {fov: 40})} ambiance="night" fogNear={40} fogFar={160}>
				<NightStreet f={c.g}>
					<Character look={CAST.amoureuse} position={LOVER_HER} rotation={[0, -Math.PI / 2 + 0.5, 0]} emotion="tired"
						mouthOpen={c.f > 30 && c.f < 50 ? Math.sin(((c.f - 30) / 20) * Math.PI) : 0} pose={{armR: [-1.3, 0], headTilt: 0.15}}>
						<Flashlight on={morseOn(c.f, '.--.')} rotation={[Math.PI / 2 - 0.3, 0.4, 0]} position={[0, -0.1, 0.1]} beamLength={4} />
					</Character>
				</NightStreet>
			</Stage>
		),
	},

	// 14. Le « J » enfin envoyé
	{
		id: 'amour-j',
		from: tl.f('amour-3', -0.1),
		render: (c) => {
			const jAt = tl.fw('amour-3', 4) - (c.g - c.f);
			return (
				<Stage camera={closeUp(LOVER_HIM, Math.PI / 2 - 0.5, 3.4, {fov: 40})} ambiance="night" fogNear={40} fogFar={160}>
					<NightStreet f={c.g}>
						<Character look={CAST.amoureux} position={LOVER_HIM} rotation={[0, Math.PI / 2 - 0.5, 0]} emotion={c.f >= jAt ? 'happy' : 'tired'}
							pose={{armR: [-1.4, 0], headTilt: -0.1}} squash={squashAt(c.f, jAt, 0.15)}>
							<Flashlight on={c.f >= jAt - 12 && morseOn(c.f - jAt + 12, '.---', 3)} rotation={[Math.PI / 2 - 0.2, -0.4, 0]} position={[0, -0.1, 0.1]} beamLength={4} />
						</Character>
					</NightStreet>
				</Stage>
			);
		},
	},

	// 15. Kevin au belvédère
	{
		id: 'kevin-intro',
		from: tl.f('kevin-1', -0.1),
		render: (c) => (
			<Stage camera={closeUp(KEVIN_POS, 0, 5.4 - ramp(c.f, 0, c.d) * 1.0, {side: -0.1})}>
				<Village />
				<Character look={CAST.kevin} position={KEVIN_POS} emotion="smug" blink={blinkAt(c.f)} pose={{armL: [0, 0.6], armR: [0, 0.6], headTilt: 0.1}} />
			</Stage>
		),
	},

	// 16. Il crie « Bonjour ! » à la montagne
	{
		id: 'kevin-cri',
		from: tl.f('kevin-2', 0.4),
		render: (c) => {
			const at = tl.f('kevin-bonjour') - (c.g - c.f);
			const k = punch(c.f, at, 8);
			return (
				<Stage camera={{pos: [17.0 - k * 0.3, 3.4, -17.5 - k * 2], target: [15.6, 3.6, -30], fov: 48 - k * 6}}>
					<Village />
					<Character look={CAST.kevin} position={KEVIN_POS} rotation={[0, Math.PI, 0]} emotion="happy" mouthOpen={mouth('kevin', c.t)}
						squash={squashAt(c.f, at, 0.2)} pose={{armL: [-2.0, -0.55], armR: [-2.0, -0.55], headNod: -0.15}} />
				</Stage>
			);
		},
	},

	// 17. L'écho… payant
	{
		id: 'kevin-echo',
		from: tl.f('kevin-echo', -0.05),
		render: (c) => {
			const e = tl.line('kevin-echo').words.filter((w) => w.start <= c.t).length;
			const emo = e <= 1 ? 'surprised' : e === 2 ? 'panic' : 'sad';
			const z = e * 0.6;
			return (
				<Stage camera={closeUp(KEVIN_POS, Math.PI, 4.2 - z, {side: 0.15})}>
					<Village />
					<Character look={CAST.kevin} position={KEVIN_POS} rotation={[0, Math.PI, 0]} emotion={emo} pose={{armL: [0, 0.3], armR: [0, 0.3], headNod: 0.05}} blink={false} />
				</Stage>
			);
		},
	},

	// 18. « L'écho, ça se paie aussi. »
	{
		id: 'kevin-triste',
		from: tl.f('kevin-3', -0.05),
		render: (c) => (
			<Stage camera={{pos: [14.5, 2.6, -18.3], target: [16, 2.2, -22.6], fov: 44}}>
				<Village />
				<Character look={CAST.kevin} position={KEVIN_POS} rotation={[0, -0.3, 0]} emotion="sad" pose={{lean: 0.15, headNod: 0.3, armL: [0, 0], armR: [0, 0]}} bob={-0.05} />
			</Stage>
		),
	},

	// 19. Léon : « Penser, c'est gratuit. »
	{
		id: 'leon-pense',
		from: tl.f('pense-1', -0.1),
		render: (c) => {
			const tap = Math.max(0, Math.sin(c.f / 3)) * 0.12;
			return (
				<Stage camera={closeUp([-3, 0, 4], 0, 5.4 - ramp(c.f, 0, c.d) * 0.6, {side: 0.15})}>
					<Village />
					<Crowd frame={c.g} count={8} mode="idle" seed={12} exclude={(x, z) => z > 1} />
					<Character look={CAST.leon} position={[-3, 0, 4]} emotion="smug" blink={blinkAt(c.f)} eyes={[0.5, -0.5]}
						pose={{armR: [-2.3 + tap, -0.95], headTilt: 0.08}} />
				</Stage>
			);
		},
	},

	// 20. Ce matin, seul à la boulangerie
	{
		id: 'four-matin',
		from: tl.f('four-1', -0.1),
		render: (c) => {
			const kn = Math.sin(c.f / 3);
			return (
				<Stage camera={closeUp([-0.6, 0, 0.6], 0, 6 - ramp(c.f, 0, c.d), {fov: 42, h: 0.4})} ambiance="interior">
					<BakeryInterior gauge={0.4} />
					<Character look={CAST.leon} position={[-0.6, 0, 0.6]} emotion="happy" blink={blinkAt(c.f)}
						pose={{armL: [-1.1 + kn * 0.2, -0.2], armR: [-1.1 - kn * 0.2, -0.2], headTilt: kn * 0.05}} bob={Math.abs(kn) * 0.03} />
				</Stage>
			);
		},
	},

	// 21. Le four fait un drôle de bruit
	{
		id: 'four-bruit',
		from: tl.f('four-2', -0.1),
		render: (c) => {
			const turn = ramp(c.f, 12, 22);
			return (
				<Stage camera={{pos: [2.0, 3.1, 6.2], target: [-0.2, 2.0, -1.6], fov: 48, shake: 0.03}} ambiance="interior">
					<BakeryInterior ovenShake={c.f} gauge={0.6} steam={c.f / 30} />
					<Character look={CAST.leon} position={[-0.6, 0, 0.6]} rotation={[0, turn * Math.PI * 0.85, 0]} emotion={turn > 0.5 ? 'surprised' : 'happy'}
						squash={squashAt(c.f, 12, 0.12)} />
				</Stage>
			);
		},
	},

	// 22. L'aiguille dans le rouge → « Il va exploser »
	{
		id: 'four-jauge',
		from: tl.f('four-3', -0.1),
		render: (c) => {
			const at = tl.f('four-4') - (c.g - c.f);
			const v = Math.min(0.97, 0.55 + ramp(c.f, 0, at) * 0.38) + (c.f > at ? Math.sin(c.f * 2.5) * 0.02 : 0);
			const k = punch(c.f, at + 6, 6);
			return (
				<Stage camera={{pos: [0.25, 2.62, -0.6 - k * 0.7], target: [0.25, 2.55, -2.55], fov: 34 - k * 6, shake: c.f > at ? 0.02 : 0.005}} ambiance="interior">
					<BakeryInterior ovenShake={c.f} gauge={v} steam={c.f / 25} glow={1.4} />
				</Stage>
			);
		},
	},

	// 23. Tout le village est sur la place
	{
		id: 'place-pleine',
		from: tl.f('four-5', -0.1),
		render: (c) => {
			const k = ramp(c.f, 0, c.d);
			return (
				<Stage camera={{pos: [-1 + k * 2, 7.5 - k, 15], target: [-3, 1.8, -2], fov: 52}}>
					<Village />
					<group position={[-10.2, 8.6, -3.5]}>
						<Puffs t={c.f / 20} count={8} color="#555" spread={1.2} rise={5} size={0.8} opacity={0.75} />
					</group>
					<Crowd frame={c.g} count={26} mode="idle" seed={5} />
				</Stage>
			);
		},
	},

	// 24. Léon panique : 15 mots maximum
	{
		id: 'leon-panique',
		from: tl.f('four-6', -0.1),
		render: (c) => {
			const k = ramp(c.f, 0, c.d);
			return (
				<Stage camera={closeUp(LEON_DOOR, Math.PI / 2, 5 - k * 1.2, {side: 0.2, shake: 0.01})}>
					<Village />
					<group position={[-10.2, 8.6, -3.5]}>
						<Puffs t={c.f / 20} count={6} color="#555" spread={1} rise={4} size={0.7} />
					</group>
					<Character look={CAST.leon} position={LEON_DOOR} rotation={[0, Math.PI / 2, 0]} emotion="panic" blink={false}
						pose={{armL: [0, 0.6 + Math.sin(c.f) * 0.1], armR: [0, 0.6 + Math.cos(c.f) * 0.1]}} />
				</Stage>
			);
		},
	},

	// 25. « Euh… » (ça compte !)
	{
		id: 'leon-euh',
		from: tl.f('euh', -0.1),
		render: (c) => {
			const end = tl.f('euh', 0.15, 'end') - (c.g - c.f);
			const cover = ramp(c.f, end, end + 5);
			return (
				<Stage camera={closeUp(LEON_DOOR, Math.PI / 2, 3.8, {side: 0.15})}>
					<Village />
					<Character look={CAST.leon} position={LEON_DOOR} rotation={[0, Math.PI / 2, 0]} emotion={cover > 0.5 ? 'surprised' : 'neutral'}
						mouthOpen={mouth('leon', c.t)} squash={squashAt(c.f, end, 0.15)}
						pose={{armL: [-2.5 * cover, -0.45 * cover], armR: [-2.5 * cover, -0.45 * cover]}} />
				</Stage>
			);
		},
	},

	// 26. Il réfléchit : chaque phrase a un prix
	{
		id: 'leon-choix',
		from: tl.f('choix-1', -0.1),
		render: (c) => (
			<Stage camera={closeUp(LEON_DOOR, Math.PI / 2, 5.6 - ramp(c.f, 0, c.d) * 0.8, {side: 0.45, fov: 40})}>
				<Village />
				<Character look={CAST.leon} position={LEON_DOOR} rotation={[0, Math.PI / 2 + 0.3, 0]} emotion="neutral" eyes={[0.6, -0.8]} blink={blinkAt(c.f)}
					pose={{armR: [-2.0, -0.75], armL: [-0.6, -0.4], headTilt: 0.12}} />
			</Stage>
		),
	},

	// 27. … et personne ne l'écoute
	{
		id: 'personne-ecoute',
		from: tl.f('choix-3', -0.1),
		render: (c) => (
			<Stage camera={{pos: [-6.8, 4.6, 5.2], target: [2, 1.2, -2], fov: 50}}>
				<Village />
				<Character look={CAST.leon} position={[-2.5, 0, 1.5]} rotation={[0, Math.PI / 2, 0]} emotion="sad" pose={{armR: [0, 2.6 + Math.sin(c.f / 3) * 0.3]}} />
				<Crowd frame={c.g} count={20} mode="ignore" seed={6} exclude={(x, z) => Math.hypot(x + 2.5, z - 1.5) < 2.5 || Math.hypot(x + 6.8, z - 5.2) < 3} />
			</Stage>
		),
	},

	// 28. Idée !
	{
		id: 'leon-idee',
		from: tl.f('idee-1', -0.1),
		render: (c) => (
			<Stage camera={closeUp(LEON_DOOR, Math.PI / 2, 4.2 - ramp(c.f, 0, 10) * 0.5, {side: 0.1})}>
				<Village />
				<Character look={CAST.leon} position={LEON_DOOR} rotation={[0, Math.PI / 2, 0]} emotion={c.f > 8 ? 'determined' : 'surprised'}
					squash={squashAt(c.f, 8, 0.15)} pose={{armR: [-0.4, 2.9]}} />
			</Stage>
		),
	},

	// 29. Vue du dessus : il dessine « BOUM » dans la farine
	{
		id: 'farine',
		from: tl.f('idee-2', -0.1),
		render: (c) => {
			const p = ramp(c.f, 0, c.d - 4, (x) => x);
			const W = 8;
			const left = 0.5 - W / 2;
			const tex = flourTexture('BOUM');
			const reveal = Math.max(0.001, p);
			// on révèle le dessin de droite à gauche (Léon court vers la boulangerie)
			tex.repeat.set(reveal, 1);
			tex.offset.set(1 - reveal, 0);
			const leonX = left + W - p * W;
			return (
				<Stage camera={{pos: [0.5, 23, 13], target: [0.5, 0, 4.6], fov: 46}}>
					<Village />
					<mesh position={[left + W - (reveal * W) / 2, 0.06, 6]} rotation={[-Math.PI / 2, 0, 0]} scale={[reveal, 1, 1]}>
						<planeGeometry args={[W, W]} />
						<meshStandardMaterial map={tex} transparent depthWrite={false} roughness={1} />
					</mesh>
					<Character look={CAST.leon} position={[leonX - 0.4, 0, 6.6 + Math.sin(p * 18) * 1.4]} rotation={[0, -Math.PI / 2, 0]} walk={c.f * 0.8} walkAmp={1.3} emotion="determined"
						leftHand={<FlourSack position={[0, -0.3, -0.3]} />} pose={{armL: [0.5, 0.3]}} />
					<Crowd frame={c.g} count={12} mode="ignore" seed={6} exclude={(x, z) => z > 1.5} />
				</Stage>
			);
		},
	},

	// 30a. Il sonne les cloches
	{
		id: 'cloches',
		from: tl.f('idee-3', -0.1),
		render: (c) => {
			const swing = Math.sin(c.f / 6) * 0.55;
			const pull = Math.max(0, Math.sin(c.f / 6));
			return (
				<Stage camera={{pos: [-1.5, 12.9, -7.4], target: [0.3, 12.0, -13.0], fov: 44, shake: 0.01}}>
					<Village bellSwing={swing} />
					<Character look={CAST.leon} position={[0.3, BELFRY_Y, -12.7]} rotation={[0, -0.33, 0]} emotion="determined"
						pose={{armL: [-2.8 + pull * 0.5, -0.2], armR: [-2.8 + pull * 0.5, -0.2]}} squash={1 - pull * 0.06} />
					<mesh position={[0.1, 13.3 - pull * 0.3, -13.3]} rotation={[0, 0, 0.1]}>
						<cylinderGeometry args={[0.05, 0.05, 1.6, 6]} />
						<meshStandardMaterial color="#c8a46a" />
					</mesh>
				</Stage>
			);
		},
	},

	// 30b. Tout le monde lève la tête (le dessin est au sol)
	{
		id: 'foule-leve',
		from: tl.fw('idee-3', 3, 'start'),
		render: (c) => {
			const tex = flourTexture('BOUM');
			tex.repeat.set(1, 1);
			tex.offset.set(0, 0);
			return (
				<Stage camera={{pos: [3.5, 1.6, 15], target: [0, 5, -6], fov: 50}}>
					<Village bellSwing={Math.sin(c.g / 6) * 0.55} />
					<mesh position={[0.5, 0.06, 6]} rotation={[-Math.PI / 2, 0, 0]}>
						<planeGeometry args={[8, 8]} />
						<meshStandardMaterial map={tex} transparent depthWrite={false} />
					</mesh>
					<Crowd frame={c.g} count={22} mode="lookUp" lookAt={[0, 12, -12.6]} seed={6} exclude={(x, z) => z > 1.5 && Math.abs(x - 0.5) < 4.5} />
				</Stage>
			);
		},
	},

	// 31. « COUREZ ! » (même cadrage que l'accroche)
	{id: 'courez', from: tl.f('courez', -0.15), render: (c) => belfryScream(c, 'courez')},

	// 32. L'écho revient des montagnes…
	{
		id: 'echo-montagne',
		from: tl.line('courez-echo').words[0].start * FPS,
		render: (c) => (
			<Stage camera={{pos: [2, 2.2, 15 + ramp(c.f, 0, c.d) * 2], target: [0, 11, -14], fov: 50}}>
				<Village />
				<Character look={CAST.leon} position={LEON_BELFRY} emotion="surprised" pose={{armL: [0, 0.3], armR: [0, 0.3]}} />
				<Crowd frame={c.g} count={18} mode="lookUp" lookAt={[0, 12, -12.6]} seed={6} />
			</Stage>
		),
	},

	// 33. … et Léon se décompose
	{
		id: 'echo-decompose',
		from: Math.round(tl.line('courez-echo').words[2].start * FPS) - 2,
		render: (c) => (
			<Stage camera={closeUp(LEON_BELFRY, 0, 3.8, {side: -0.1})}>
				<Village />
				<Character look={CAST.leon} position={LEON_BELFRY} emotion="sad" pose={{armL: [0, 0.1], armR: [0, 0.1], headNod: 0.15}} />
			</Stage>
		),
	},

	// 34. « J'avais oublié l'écho. » (facepalm)
	{
		id: 'facepalm',
		from: tl.f('echo-oubli', -0.1),
		render: (c) => {
			const k = ramp(c.f, 2, 9);
			return (
				<Stage camera={closeUp(LEON_BELFRY, 0, 4.4, {side: -0.25, h: -0.4})}>
					<Village />
					<Character look={CAST.leon} position={LEON_BELFRY} emotion="sad" pose={{armR: [-2.6 * k, -0.45 * k], headNod: 0.2 * k}} squash={squashAt(c.f, 9, 0.08)} />
				</Stage>
			);
		},
	},

	// 35. Tout le monde court
	{
		id: 'fuite',
		from: tl.f('chute-1', -0.15),
		render: (c) => (
			<Stage camera={{pos: [9, 10, 17], target: [-2, 1, -2], fov: 50}}>
				<Village />
				<Crowd frame={c.g} count={24} mode="run" runT={c.f / FPS} fleeFrom={[-9, 0, -2]} seed={5} />
			</Stage>
		),
	},

	// 36. BOUM
	{
		id: 'explosion',
		from: tl.f('chute-2', -0.1),
		render: (c) => {
			const boom = tl.fw('chute-2', 2, 'end') + 4 - (c.g - c.f);
			const et = (c.f - boom) / 30;
			const shake = c.f < boom ? ramp(c.f, 0, boom) * 0.06 : Math.max(0, 0.6 - et * 0.5);
			return (
				<Stage camera={{pos: [5, 4, 9], target: [-7, 3.2, -2], fov: 52, shake}}>
					<Village />
					<group position={[-7, 0, -2]}>
						<Explosion t={et} />
					</group>
					{et > 0 && <CroissantRain t={et} count={30} />}
				</Stage>
			);
		},
	},

	// 37. Il pleut des croissants
	{
		id: 'pluie-croissants',
		from: tl.f('chute-3', -0.1),
		render: (c) => (
			<Stage camera={{pos: [3, 2.2, 13 - ramp(c.f, 0, c.d) * 2], target: [0, 4.5, -3], fov: 52}}>
				<Village />
				<CroissantRain t={c.f / FPS + 0.4} count={80} />
				<Crowd frame={c.g} count={16} mode="happy" lookAt={[0, 12, 0]} seed={9} />
			</Stage>
		),
	},

	// 38. Le maire s'approche, ému
	{
		id: 'maire-approche',
		from: tl.f('merci-1', -0.1),
		render: (c) => {
			const k = ramp(c.f, 0, c.d * 0.55);
			const z = ramp(c.f, c.d * 0.6, c.d);
			const cam = lerpShot({pos: [-0.2, 3.4, 13], target: [0.2, 2.2, 4], fov: 46}, closeUp([1.2, 0, 3.6], -Math.PI / 2 + 0.3, 4.4, {scale: 1.08, side: -0.5}), z);
			return (
				<Stage camera={cam}>
					<Village />
					<GroundCroissants />
					<Character look={CAST.leon} position={[-1.6, 0, 4]} rotation={[0, Math.PI / 2 - 0.3, 0]} emotion="surprised" blink={blinkAt(c.f)} />
					<Character look={CAST.maire} position={[6 - k * 4.8, 0, 3.6]} rotation={[0, -Math.PI / 2 + 0.3 * z, 0]} walk={k < 1 ? c.f * 0.45 : undefined} emotion="moved"
						mouthOpen={z > 0.6 ? 0.15 : 0} />
				</Stage>
			);
		},
	},

	// 39. « Merci. »
	{
		id: 'merci',
		from: tl.f('merci', -0.15),
		render: (c) => (
			<Stage camera={closeUp([1.2, 0, 3.6], -Math.PI / 2 + 0.6, 3.8, {scale: 1.08, fov: 36})}>
				<Village />
				<GroundCroissants />
				<Character look={CAST.maire} position={[1.2, 0, 3.6]} rotation={[0, -Math.PI / 2 + 0.6, 0]} emotion="moved" mouthOpen={mouth('maire', c.t)} />
			</Stage>
		),
	},

	// 40. Le plus gros pourboire de l'histoire
	{
		id: 'pourboire',
		from: tl.f('merci-2', -0.1),
		render: (c) => (
			<Stage camera={closeUp([-1.6, 0, 4], Math.PI / 2 - 0.3, 5 - ramp(c.f, 0, c.d) * 0.6, {side: -0.9})}>
				<Village />
				<GroundCroissants />
				<Character look={CAST.leon} position={[-1.6, 0, 4]} rotation={[0, Math.PI / 2 - 0.3, 0]} emotion="moved" blink={blinkAt(c.f)} pose={{armL: [-1.2, 0.2], armR: [-1.2, -0.2]}} />
				<Character look={CAST.maire} position={[1.2, 0, 3.6]} rotation={[0, -Math.PI / 2 + 0.3, 0]} emotion="moved" />
			</Stage>
		),
	},

	// 41. Il me reste 10 € (clin d'œil caméra)
	{
		id: 'fin',
		from: tl.f('fin-1', -0.1),
		render: (c) => {
			const wink = c.g >= tl.fw('fin-2', 5) - 2;
			const at = tl.fw('fin-2', 6) - (c.g - c.f);
			return (
				<Stage camera={closeUp([-1.6, 0, 4], 0, 5 - ramp(c.f, 0, c.d) * 0.8)}>
					<Village />
					<GroundCroissants />
					<Character look={CAST.leon} position={[-1.6, 0, 4]} emotion={wink ? 'wink' : 'smug'} blink={!wink && blinkAt(c.f)}
						bob={c.f >= at ? Math.max(0, Math.sin(((c.f - at) / 10) * Math.PI)) * 0.4 : 0} squash={squashAt(c.f, at + 10, 0.15)}
						pose={{armR: wink ? [-0.3, 1.2] : [0, -0.1]}} />
					<Croissant position={[-1.6, 4.55, 4]} rotation={[-Math.PI / 2, 0, 0.4]} scale={1.1} />
				</Stage>
			);
		},
	},

	// 42. Question au public : le village sous les croissants
	{
		id: 'cta',
		from: tl.f('cta-1', -0.2),
		render: (c) => {
			const a = 0.9 + (c.f / c.d) * 0.6;
			return (
				<Stage camera={{pos: [Math.sin(a) * 11, 17, Math.cos(a) * 11 - 3], target: [0, 1, -3], fov: 52}} ambiance="sunset">
					<Village />
					<GroundCroissants />
					<Crowd frame={c.g} count={18} mode="happy" lookAt={[0, 12, 0]} seed={9} />
				</Stage>
			);
		},
	},
];

export const shotsInOrder = () => [...SHOTS].sort((a, b) => a.from - b.from).map((s) => ({...s, from: Math.max(0, Math.round(s.from))}));
