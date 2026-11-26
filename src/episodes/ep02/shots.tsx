/**
 * Ép. 02 — « Le coffret des 30 ans » : découpage plan par plan.
 * Chaque plan démarre sur une réplique (tl.f('id')) : tout se recale si la voix change.
 */
import React from 'react';
import {Character} from '../../three/Character';
import {Stage, lerpShot, Vec3} from '../../three/Stage';
import {Village} from '../../three/Village';
import {closeUp} from '../../three/camera';
import {Puffs, Sign} from '../../three/Props';
import {Armchair, Card, Coffret, ShopInterior, SleepingBag, SoupBowl, Suitcase, Tent, Thermos, ToyShop, SHOP} from '../../three/Shop';
import {rng} from '../../three/textures';
import {CAST, cousin, villager} from '../cast';
import {blinkAt, punch, ramp, squashAt} from '../../lib/anim';
import {ep02} from './data';

const tl = ep02.tl;
const FPS = 30;

export type ShotCtx = {f: number; g: number; t: number; d: number; p: number};
export type ShotDef = {id: string; from: number; render: (c: ShotCtx) => React.ReactNode};

const mouth = (who: string, t: number) => tl.mouthOpen(who, t);

// ——— La file d'attente : un anneau autour de la fontaine, qui part de la porte du magasin ———
const QC: [number, number] = [0, -1];
const ring = (k: number, R: number, a0: number, sp = 1.6) => {
	const th = a0 + (k * sp) / R;
	const p: Vec3 = [QC[0] + R * Math.cos(th), 0, QC[1] + R * Math.sin(th)];
	// regarde vers la personne devant (vers la porte)
	const rot = Math.atan2(Math.sin(th), -Math.cos(th));
	return {p, rot};
};
const slot = (k: number) => (k < 20 ? ring(k, 5.6, -0.35) : ring(k - 20, 9.6, -0.2, 1.8));

const GISELE = slot(0);
const MAIRE = slot(1);
const KEVIN = slot(2);
const JR = slot(3);
const TENT_COLORS = ['#ff6b35', '#3a86ff', '#ffbe0b', '#8338ec', '#06d6a0', '#e63946'];

type QueueMode = 'night' | 'day' | 'rush';

/** Toute la file : tentes, duvets, figurants, cousins. `skip` = emplacements dessinés à part. */
const Queue: React.FC<{frame: number; mode: QueueMode; runT?: number; skip?: number[]; count?: number}> = ({frame, mode, runT = 0, skip = [], count = 52}) => {
	const R = rng(12);
	const items: React.ReactNode[] = [];
	for (let k = 1; k < count; k++) {
		const r1 = R();
		const r2 = R();
		if (skip.includes(k)) continue;
		let {p, rot} = slot(k);
		const isCousin = k >= 4 && k < 16;
		const look = k === 3 ? CAST.jeanRevente : isCousin ? cousin(k) : k === 2 ? CAST.kevin : k === 1 ? CAST.mairePyjama : villager(k);
		if (mode === 'rush') {
			// tout le monde fonce vers la porte
			const door = SHOP.door;
			const dx = door[0] - p[0];
			const dz = door[2] - p[2];
			const dist = Math.hypot(dx, dz);
			const go = Math.min(1, (runT * (6 + r1 * 3)) / Math.max(dist, 0.1));
			const stopAt = 1.2 + r2 * 2.2;
			const travel = Math.min(go * dist, Math.max(0, dist - stopAt));
			p = [p[0] + (dx / dist) * travel, 0, p[2] + (dz / dist) * travel];
			rot = Math.atan2(dx, dz);
			const s = Math.sin(frame * 0.7 + k);
			items.push(
				<Character key={k} look={look} position={p} rotation={[0, rot, 0]} emotion={isCousin ? 'determined' : 'panic'}
					walk={travel < dist - stopAt - 0.01 ? frame * 0.7 + k : undefined} walkAmp={1.3} pose={{armL: [s * 0.8, 2.4], armR: [-s * 0.8, 2.4]}} />,
			);
			continue;
		}
		if (mode === 'night' && !isCousin && k > 3) {
			// la nuit : tentes et duvets
			if (r1 < 0.45) {
				items.push(<Tent key={'t' + k} position={p} rotY={rot + Math.PI / 2} color={TENT_COLORS[k % TENT_COLORS.length]} />);
				continue;
			}
			items.push(<SleepingBag key={'b' + k} position={p} rotY={rot + Math.PI / 2} color={TENT_COLORS[(k + 2) % TENT_COLORS.length]} />);
			continue;
		}
		if (k === 1 && mode === 'night') {
			items.push(<Tent key="tm" position={p} rotY={rot + Math.PI / 2} color="#1f4fd8" />);
			continue;
		}
		items.push(
			<Character key={k} look={look} position={p} rotation={[0, rot, 0]} emotion={isCousin ? 'smug' : mode === 'night' ? 'tired' : 'neutral'}
				blink={blinkAt(frame, k)} bob={Math.sin(frame / 14 + k) * 0.03} pose={{headTilt: Math.sin(frame / 25 + k) * 0.06}} />,
		);
		if (isCousin || k === 3) items.push(<Suitcase key={'s' + k} position={[p[0] + 0.6, 0, p[2]]} rotY={rot} color={k % 2 ? '#264653' : '#1d1d1d'} />);
	}
	return <>{items}</>;
};

/** Gisèle dans son fauteuil (avec soupe et thermos). */
const GiseleSeat: React.FC<{frame: number; at?: Vec3; rot?: number; emotion?: React.ComponentProps<typeof Character>['emotion']; sip?: number; mouthOpen?: number; props?: boolean; children?: React.ReactNode}> = ({
	frame, at = GISELE.p, rot = GISELE.rot, emotion = 'happy', sip = 0, mouthOpen = 0, props = true, children,
}) => (
	<group position={at} rotation={[0, rot, 0]}>
		<Armchair />
		<Character look={CAST.gisele} position={[0, 0.2, 0.1]} sit emotion={emotion} blink={blinkAt(frame, 3)} mouthOpen={mouthOpen}
			pose={{armR: [-1.2 - sip * 1.2, -0.25], armL: [-0.9, 0.1]}}>
			{children}
		</Character>
		{props && (
			<>
				<Thermos position={[0.95, 0, 0.5]} />
				<SoupBowl position={[-0.55, 1.15, 0.65]} />
				<group position={[-0.55, 1.2, 0.65]}>
					<Puffs t={frame / 40} count={4} spread={0.15} rise={0.8} size={0.12} opacity={0.6} />
				</group>
			</>
		)}
	</group>
);

const village = (night = false) => <Village night={night} replaceMairie={<ToyShop night={night} />} />;
const shopFace = (y = 2.6): Vec3 => [SHOP.door[0], y, SHOP.door[2]];

/** Studio sombre pour présenter le coffret. */
const Studio: React.FC<{f: number; children: React.ReactNode}> = ({f, children}) => {
	const R = rng(8);
	const sp = Array.from({length: 26}).map(() => [R() * Math.PI * 2, 1.2 + R() * 1.6, (R() - 0.5) * 2.4, R()]);
	return (
		<group>
			{sp.map(([a, r, y, s], i) => {
				const ang = a + f * 0.03 * (0.5 + s);
				return (
					<mesh key={i} position={[Math.cos(ang) * r, 2.4 + y, Math.sin(ang) * r]}>
						<sphereGeometry args={[0.03 + s * 0.04, 6, 4]} />
						<meshBasicMaterial color="#ffe680" fog={false} transparent opacity={0.4 + 0.6 * Math.abs(Math.sin(f / 5 + i))} />
					</mesh>
				);
			})}
			<mesh position={[0, 0.5, 0]}>
				<cylinderGeometry args={[1.2, 1.4, 1, 32]} />
				<meshStandardMaterial color="#2a1458" emissive="#5b2bb5" emissiveIntensity={0.4} />
			</mesh>
			<pointLight position={[0, 4.5, 3]} intensity={25} distance={12} color="#fff1c1" />
			<pointLight position={[-2.5, 2.5, -1]} intensity={12} distance={8} color="#b58cff" />
			{children}
		</group>
	);
};

// ————————————————————————————————————————————————————————————————
export const SHOTS: ShotDef[] = [
	// 1. ACCROCHE — drone de nuit au-dessus de la file
	{
		id: 'hook-drone',
		from: 0,
		render: (c) => {
			const k = ramp(c.f, 0, c.d);
			const cam = lerpShot({pos: [6, 8, 12], target: [3, 1, -2], fov: 46}, {pos: [10, 22, 22], target: [0, 0, -2], fov: 52}, k);
			return (
				<Stage camera={cam} ambiance="night" fogNear={50} fogFar={200}>
					{village(true)}
					<Queue frame={c.g} mode="night" />
					<GiseleSeat frame={c.g} emotion="tired" />
				</Stage>
			);
		},
	},

	// 2. La façade du magasin, tout le monde dort
	{
		id: 'hook-shop',
		from: tl.f('hook-2', -0.1),
		render: (c) => (
			<Stage camera={{pos: [-1.5 + ramp(c.f, 0, c.d) * 1.5, 3.6, 4.5], target: [7, 2.6, -3.5], fov: 50}} ambiance="night" fogNear={50} fogFar={200}>
				{village(true)}
				<Queue frame={c.g} mode="night" />
				<GiseleSeat frame={c.g} emotion="tired" />
			</Stage>
		),
	},

	// 3. Le coffret (studio)
	{
		id: 'coffret',
		from: tl.f('coffret-1', -0.1),
		render: (c) => {
			const k = ramp(c.f, 0, c.d);
			return (
				<Stage camera={{pos: [0, 3.1, 6.2 - k * 1.4], target: [0, 2.35, 0], fov: 40}} ambiance="night" fogNear={30} fogFar={80}>
					<Studio f={c.f}>
						<Coffret position={[0, 2.25, 0]} rotation={[0, Math.sin(c.f / 25) * 0.5 + (1 - k) * 0.8, 0]} scale={1.2} glow={1} />
					</Studio>
				</Stage>
			);
		},
	},

	// 4. La carte dorée sort du coffret
	{
		id: 'carte',
		from: tl.f('coffret-3', -0.1),
		render: (c) => {
			const up = ramp(c.f, 0, 18);
			return (
				<Stage camera={{pos: [0, 2.9, 4.6], target: [0, 2.6, 0], fov: 42}} ambiance="night" fogNear={30} fogFar={80}>
					<Studio f={c.f}>
						<Coffret position={[0, 2.0, -0.4]} scale={1.1} glow={1} />
						<Card position={[0, 2.0 + up * 1.2, 0.3]} rotation={[0, (1 - up) * Math.PI * 2 + Math.sin(c.f / 12) * 0.25, 0]} scale={1.0 + up * 0.5} />
					</Studio>
				</Stage>
			);
		},
	},

	// 5. … et il n'y en a qu'un (vitrine)
	{
		id: 'un-seul',
		from: tl.f('coffret-4', -0.1),
		render: (c) => (
			<Stage camera={{pos: [3.2, 2.0, 0.6], target: [6.4, 1.6, -0.6], fov: 44}} ambiance="night" fogNear={50} fogFar={200}>
				{village(true)}
				<Coffret position={[6.35, 1.45, -0.6]} rotation={[0, -Math.PI / 2, 0]} scale={0.55} glow={0.6 + 0.4 * Math.sin(c.f / 4)} />
			</Stage>
		),
	},

	// 6. Gisèle, 78 ans, première de la file
	{
		id: 'gisele',
		from: tl.f('gisele-1', -0.1),
		render: (c) => (
			<Stage camera={closeUp(GISELE.p, GISELE.rot, 5.2 - ramp(c.f, 0, c.d) * 0.8, {side: -0.4, headY: 2.2, scale: 0.92})} ambiance="sunset">
				{village()}
				<Queue frame={c.g} mode="night" skip={[1, 2, 3]} />
				<GiseleSeat frame={c.g} emotion="smug" />
			</Stage>
		),
	},

	// 7. Soupe et thermos
	{
		id: 'gisele-soupe',
		from: tl.f('gisele-3', -0.1),
		render: (c) => {
			const sip = Math.max(0, Math.sin(c.f / 10));
			return (
				<Stage camera={closeUp(GISELE.p, GISELE.rot, 3.6, {side: 0.35, headY: 2.2, scale: 0.92})} ambiance="sunset">
					{village()}
					<GiseleSeat frame={c.g} emotion="happy" sip={sip} />
				</Stage>
			);
		},
	},

	// 8. Le maire et sa tente
	{
		id: 'maire-tente',
		from: tl.f('maire-1', -0.1),
		render: (c) => {
			const out = ramp(c.f, 8, 22);
			const p = MAIRE.p;
			return (
				<Stage camera={closeUp(p, MAIRE.rot + Math.PI / 2, 5.4, {side: 0.2, scale: 1.08})} ambiance="sunset">
					{village()}
					<Tent position={p} rotY={MAIRE.rot + Math.PI / 2} color="#1f4fd8" />
					<Character look={CAST.mairePyjama} position={[p[0] + Math.sin(MAIRE.rot + Math.PI / 2) * (out * 1.6), 0, p[2] + Math.cos(MAIRE.rot + Math.PI / 2) * (out * 1.6)]}
						rotation={[0, MAIRE.rot + Math.PI / 2, 0]} emotion="tired" squash={0.85 + out * 0.15} blink={blinkAt(c.f, 2)} />
					<GiseleSeat frame={c.g} />
				</Stage>
			);
		},
	},

	// 9. Il « inspecte la file »… en pyjama
	{
		id: 'maire-inspecte',
		from: tl.f('maire-2', -0.1),
		render: (c) => {
			const k = ramp(c.f, 0, c.d, (x) => x);
			const s = slot(4 + k * 5);
			const look = Math.sin(c.f / 8);
			return (
				<Stage camera={closeUp([s.p[0] * 0.82, 0, s.p[2] * 0.82], s.rot + Math.PI, 5.2, {scale: 1.08, side: 0.5})} ambiance="sunset">
					{village()}
					<Queue frame={c.g} mode="day" skip={[1]} />
					<Character look={CAST.mairePyjama} position={[s.p[0] * 0.82, 0, s.p[2] * 0.82]} rotation={[0, s.rot + Math.PI, 0]} walk={c.f * 0.35} walkAmp={0.6}
						emotion="smug" pose={{armR: [-1.6, -0.1], armL: [0, 0.1], headTurn: look * 0.4}} />
					<GiseleSeat frame={c.g} />
				</Stage>
			);
		},
	},

	// 10-11. Kevin vend puis rachète sa place
	...([['kevin-1', 'happy', 0.4], ['kevin-2', 'surprised', -0.4]] as const).map(([id, emo, side], n) => ({
		id: 'kevin-' + n,
		from: tl.f(id, -0.1),
		render: (c: ShotCtx) => {
			const give = ramp(c.f, 18, 28);
			const other = {p: [KEVIN.p[0] + Math.sin(KEVIN.rot + 1.6) * 1.8, 0, KEVIN.p[2] + Math.cos(KEVIN.rot + 1.6) * 1.8] as Vec3};
			return (
				<Stage camera={closeUp(KEVIN.p, KEVIN.rot + 0.8, 5.6, {side})} ambiance="sunset">
					{village()}
					<Queue frame={c.g} mode="day" skip={[1, 2]} />
					<Character look={CAST.kevin} position={KEVIN.p} rotation={[0, KEVIN.rot + 1.2, 0]} emotion={emo} blink={blinkAt(c.f)}
						pose={{armR: [-1.4 * give, -0.2]}} squash={squashAt(c.f, 28, 0.12)}>
						<mesh position={[0, -0.05, 0.1]} visible={give > 0.2}>
							<boxGeometry args={[0.5, 0.04, 0.25]} />
							<meshStandardMaterial color="#5cb85c" />
						</mesh>
					</Character>
					<Character look={villager(n + 30)} position={other.p} rotation={[0, KEVIN.rot + 1.2 + Math.PI, 0]} emotion={n === 0 ? 'smug' : 'happy'} pose={{armR: [-1.4 * give, -0.2]}} />
				</Stage>
			);
		},
	})),

	// 12. Le « business plan » de Kevin
	{
		id: 'kevin-plan',
		from: tl.f('kevin-3', -0.1),
		render: (c) => (
			<Stage camera={{...closeUp(KEVIN.p, KEVIN.rot + 1.0, 7), target: [KEVIN.p[0], 2.9, KEVIN.p[2]]}} ambiance="sunset">
				{village()}
				<Character look={CAST.kevin} position={KEVIN.p} rotation={[0, KEVIN.rot + 1.0, 0]} emotion={c.f > c.d / 2 ? 'panic' : 'smug'} blink={blinkAt(c.f)} pose={{armR: [-2.4, -0.2]}}>
					<Sign text={'BUSINESS\nPLAN ?'} rotation={[2.4, 0, 0]} position={[0, -0.4, 0]} scale={0.9} />
				</Character>
			</Stage>
		),
	},

	// 13. Jean-Revente, contre-plongée « héroïque »
	{
		id: 'jr-intro',
		from: tl.f('jr-1', -0.1),
		render: (c) => {
			const k = ramp(c.f, 0, c.d);
			const a = JR.rot + 1.3;
			return (
				<Stage camera={{pos: [JR.p[0] + Math.sin(a) * (4.6 - k), 0.9, JR.p[2] + Math.cos(a) * (4.6 - k)], target: [JR.p[0], 2.7, JR.p[2]], fov: 46}} ambiance="sunset">
					{village()}
					<Character look={CAST.jeanRevente} position={JR.p} rotation={[0, a, 0]} emotion="smug" pose={{armL: [0, 0.5], armR: [0, 0.5]}} />
					<Suitcase position={[JR.p[0] + 0.9, 0, JR.p[2]]} rotY={a} />
					<Suitcase position={[JR.p[0] - 0.9, 0, JR.p[2]]} rotY={a} color="#1d1d1d" />
				</Stage>
			);
		},
	},

	// 14. « Il aime les marges »
	{
		id: 'jr-marges',
		from: tl.f('jr-2', -0.1),
		render: (c) => (
			<Stage camera={closeUp(JR.p, JR.rot + 1.3, 3.8, {side: 0.2, shake: 0.005})} ambiance="sunset">
				{village()}
				<Character look={CAST.jeanRevente} position={JR.p} rotation={[0, JR.rot + 1.3, 0]} emotion="smug" blink={false}
					pose={{armR: [-2.5, -0.15], headTilt: 0.1}}>
					<Sign text={'€€€'} rotation={[2.5, 0, 0]} position={[0, -0.4, 0]} scale={0.8} color="#d8f3dc" />
				</Character>
			</Stage>
		),
	},

	// 15. Les 47 cousins (travelling)
	{
		id: 'cousins',
		from: tl.f('jr-3', -0.1),
		render: (c) => {
			const k = ramp(c.f, 0, c.d, (x) => x);
			const s = slot(4 + k * 8);
			const a = s.rot - Math.PI / 2;
			return (
				<Stage camera={{pos: [s.p[0] + Math.sin(a) * 6.5, 2.8, s.p[2] + Math.cos(a) * 6.5], target: [s.p[0], 2.0, s.p[2]], fov: 46}} ambiance="sunset">
					{village()}
					<Queue frame={c.g} mode="day" />
					<GiseleSeat frame={c.g} />
				</Stage>
			);
		},
	},

	// 16. Les moustaches de travers
	{
		id: 'moustaches',
		from: tl.f('jr-4', -0.1),
		render: (c) => {
			const s = slot(6);
			return (
				<Stage camera={closeUp(s.p, s.rot - Math.PI / 2, 4.2 - ramp(c.f, 0, c.d) * 0.6, {side: -0.6})} ambiance="sunset">
					{village()}
					<Queue frame={c.g} mode="day" />
				</Stage>
			);
		},
	},

	// 17. Jeudi, 9 h : la porte
	{
		id: 'ouverture',
		from: tl.f('ouv-1', -0.1),
		render: (c) => (
			<Stage camera={{pos: [2.2, 2.9, -7.0 + ramp(c.f, 0, c.d) * 0.6], target: shopFace(2.0), fov: 46}}>
				{village()}
				<Queue frame={c.g} mode="day" />
				<GiseleSeat frame={c.g} emotion="determined" />
			</Stage>
		),
	},

	// 18. La vendeuse : « Un coffret par personne ! »
	{
		id: 'vendeuse',
		from: tl.f('ouv-2', -0.15),
		render: (c) => {
			const open = ramp(c.f, 0, 8);
			const at = tl.f('ouv-2') - (c.g - c.f);
			const k = punch(c.f, at, 7);
			const pos: Vec3 = [SHOP.door[0] - 0.4, 0, SHOP.door[2]];
			return (
				<Stage camera={closeUp(pos, -Math.PI / 2, 4.2 - k, {side: 0.25, fov: 40 - k * 6})}>
					{village()}
					<ToyShop doorOpen={open} />
					<Character look={CAST.vendeuse} position={pos} rotation={[0, -Math.PI / 2, 0]} emotion="happy" mouthOpen={mouth('vendeuse', c.t)}
						pose={{armR: [-0.3, 2.5]}} squash={squashAt(c.f, at, 0.12)} />
				</Stage>
			);
		},
	},

	// 19. « Il n'y en a qu'un. » — toute la file se fige
	{
		id: 'fige',
		from: tl.f('ouv-3', -0.1),
		render: (c) => (
			<Stage camera={{pos: [2, 13, 14], target: [1, 1, -2], fov: 50}}>
				{village()}
				<Queue frame={c.g} mode="day" />
				<GiseleSeat frame={c.g} emotion="surprised" />
			</Stage>
		),
	},

	// 20. La ruée des cousins
	{
		id: 'ruee',
		from: tl.f('ruee-1', -0.1),
		render: (c) => (
			<Stage camera={{pos: [-3, 11, 13], target: [3, 0.5, -2], fov: 50, shake: 0.04}}>
				{village()}
				<Queue frame={c.g} mode="rush" runT={c.f / FPS} />
				<GiseleSeat frame={c.g} emotion="determined" />
			</Stage>
		),
	},

	// 21. Gisèle en fauteuil roulant… à fond
	{
		id: 'gisele-fonce',
		from: tl.f('ruee-2', -0.1),
		render: (c) => {
			const k = ramp(c.f, 0, c.d, (x) => x);
			const start = slot(10).p;
			const at: Vec3 = [start[0] + (SHOP.door[0] - 1.6 - start[0]) * k, 0, start[2] + (SHOP.door[2] - start[2]) * k];
			const rot = Math.atan2(SHOP.door[0] - start[0], SHOP.door[2] - start[2]);
			return (
				<Stage camera={{pos: [at[0] + Math.cos(rot) * 4.5, 2.6, at[2] - Math.sin(rot) * 4.5], target: [at[0], 1.6, at[2]], fov: 48, shake: 0.05}}>
					{village()}
					<Queue frame={c.g} mode="rush" runT={0.6 + c.f / FPS} />
					<GiseleSeat frame={c.g} at={at} rot={rot} emotion="determined" props={false} />
					<group position={[at[0] - Math.sin(rot) * 1.2, 0.3, at[2] - Math.cos(rot) * 1.2]}>
						<Puffs t={c.f / 10} count={4} color="#d9c7a8" spread={0.4} rise={0.5} size={0.22} opacity={0.6} />
					</group>
				</Stage>
			);
		},
	},

	// 22. Léon, déjà à l'intérieur
	{
		id: 'leon-dedans',
		from: tl.f('climax-1', -0.1),
		render: (c) => (
			<Stage camera={closeUp([1.4, 0, -0.6], 0, 5.4 - ramp(c.f, 0, c.d) * 0.8, {side: 0.15})} ambiance="interior">
				<ShopInterior>
					<Character look={CAST.leon} position={[1.4, 0, -0.6]} emotion={c.f > 20 ? 'smug' : 'happy'} blink={blinkAt(c.f)}
						pose={{armR: [0, 2.6 + Math.sin(c.f / 3) * 0.2]}} />
				</ShopInterior>
			</Stage>
		),
	},

	// 23. Il donne le coffret à Gisèle
	{
		id: 'don',
		from: tl.f('climax-3', -0.1),
		render: (c) => {
			const give = ramp(c.f, 10, 30);
			return (
				<Stage camera={{pos: [3.8, 3.0, 5.4], target: [0.4, 1.9, 1.2], fov: 48}} ambiance="interior">
					<ShopInterior coffret={false}>
						<Character look={CAST.leon} position={[1.6, 0, -0.6]} rotation={[0, -0.5, 0]} emotion="happy" pose={{armR: [-1.4, 0], armL: [-1.4, 0]}}>
							{give < 0.95 && <Coffret position={[0.6, -0.2, 0.3]} rotation={[0, 0, 0]} scale={0.45} glow={0.8} />}
						</Character>
						<GiseleSeat frame={c.g} at={[-0.6, 0, 2.2]} rot={2.3} emotion={give > 0.9 ? 'moved' : 'surprised'} props={false}>
							{give >= 0.95 && <Coffret position={[0.4, -0.1, 0.4]} scale={0.45} glow={0.8} />}
						</GiseleSeat>
					</ShopInterior>
				</Stage>
			);
		},
	},

	// 24. « Merci, mon petit ! »
	{
		id: 'merci',
		from: tl.f('merci', -0.15),
		render: (c) => (
			<Stage camera={closeUp([-0.6, 0.2, 2.2], 2.3, 3.4, {headY: 2.2, scale: 0.92, side: -0.3})} ambiance="interior">
				<ShopInterior coffret={false}>
					<GiseleSeat frame={c.g} at={[-0.6, 0, 2.2]} rot={2.3} emotion="moved" mouthOpen={mouth('gisele', c.t)} props={false}>
						<Coffret position={[0.4, -0.1, 0.4]} scale={0.45} glow={0.8} />
					</GiseleSeat>
				</ShopInterior>
			</Stage>
		),
	},

	// 25. Jean-Revente propose 2 000 €
	{
		id: 'offre',
		from: tl.f('climax-4', -0.1),
		render: (c) => {
			const lean = ramp(c.f, 0, 15);
			return (
				<Stage camera={{pos: [-5.6, 3.2, 3.6], target: [-1.6, 2.1, 1.3], fov: 48}} ambiance="interior">
					<ShopInterior coffret={false}>
						<GiseleSeat frame={c.g} at={[-0.6, 0, 2.2]} rot={2.3} emotion="neutral" props={false}>
							<Coffret position={[0.4, -0.1, 0.4]} scale={0.45} glow={0.8} />
						</GiseleSeat>
						<Character look={CAST.jeanRevente} position={[-2.6, 0, 0.4]} rotation={[0, 0.8, 0]} emotion="smug" pose={{lean: lean * 0.25, armR: [-1.5, -0.1]}}>
							<mesh position={[0, -0.05, 0.12]}>
								<boxGeometry args={[0.55, 0.12, 0.3]} />
								<meshStandardMaterial color="#5cb85c" />
							</mesh>
						</Character>
					</ShopInterior>
				</Stage>
			);
		},
	},

	// 26. « Non. » — c'est pour son petit-fils
	{
		id: 'non',
		from: tl.f('climax-5', -0.1),
		render: (c) => (
			<Stage camera={closeUp([-0.6, 0.2, 2.2], 2.3, 3.6, {headY: 2.2, scale: 0.92, side: 0.35})} ambiance="interior">
				<ShopInterior coffret={false}>
					<GiseleSeat frame={c.g} at={[-0.6, 0, 2.2]} rot={2.3} emotion={c.f < 25 ? 'determined' : 'moved'} props={false}>
						<Card position={[0.1, 0.5, 0.3]} rotation={[-1.2, 0, 0]} scale={0.8} />
					</GiseleSeat>
				</ShopInterior>
			</Stage>
		),
	},

	// 27. Flash info : réédition illimitée
	{
		id: 'flash',
		from: tl.f('chute-1', -0.1),
		render: (c) => (
			<Stage camera={{pos: [-0.5, 3.2, 3.5 - ramp(c.f, 0, c.d)], target: shopFace(2.4), fov: 48}}>
				{village()}
				<Character look={CAST.jeanRevente} position={[SHOP.door[0] - 2.4, 0, SHOP.door[2] + 1.6]} rotation={[0, -0.7, 0]} emotion={c.f > 15 ? 'panic' : 'surprised'}
					pose={{armL: [0, 2.6], armR: [0, 2.6]}} squash={squashAt(c.f, 15, 0.2)} />
			</Stage>
		),
	},

	// 28. Jean-Revente redort devant le magasin
	{
		id: 'jr-dort',
		from: tl.f('chute-2', -0.1),
		render: (c) => (
			<Stage camera={{pos: [1.8, 2.4, 1.6], target: [SHOP.door[0] - 1.2, 0.8, SHOP.door[2] + 0.6], fov: 44}} ambiance="sunset">
				{village()}
				<SleepingBag position={[SHOP.door[0] - 1.4, 0, SHOP.door[2] + 0.6]} rotY={0.2} color="#6a4c93" />
				<Character look={CAST.jeanRevente} position={[SHOP.door[0] - 2.4, 0.42, SHOP.door[2] + 0.6]} rotation={[-Math.PI / 2, 0, -Math.PI / 2 - 0.2]} emotion="sad" blink />
			</Stage>
		),
	},

	// 29. … avec 47 coffrets à rembourser
	{
		id: 'pile',
		from: tl.f('chute-3', -0.1),
		render: (c) => {
			const base: Vec3 = [SHOP.door[0] - 1.4, 0, SHOP.door[2] - 1.6];
			const k = ramp(c.f, 0, c.d);
			return (
				<Stage camera={{pos: [base[0] - 5.5 + k, 3.2, base[2] + 5.5 - k], target: [base[0], 2.4, base[2]], fov: 48}} ambiance="sunset">
					{village()}
					{Array.from({length: 47}).map((_, i) => {
						const layer = Math.floor(i / 9);
						const j = i % 9;
						return <Coffret key={i} position={[base[0] + (j % 3) * 0.7 - 0.7, 0.8 + layer * 1.62, base[2] + Math.floor(j / 3) * 0.45 - 0.45]} scale={0.6} />;
					})}
					<Character look={CAST.jeanRevente} position={[base[0] + 1.2, 0, base[2] + 1.8]} rotation={[0, -0.6, 0]} emotion="sad" pose={{lean: 0.15, headNod: 0.3}} />
				</Stage>
			);
		},
	},

	// 30. Question au public
	{
		id: 'cta',
		from: tl.f('cta-1', -0.2),
		render: (c) => {
			const a = 0.6 + (c.f / c.d) * 0.6;
			return (
				<Stage camera={{pos: [Math.sin(a) * 13, 14, Math.cos(a) * 13 - 2], target: [1, 1, -2], fov: 52}} ambiance="sunset">
					{village()}
					<Queue frame={c.g} mode="day" />
					<GiseleSeat frame={c.g} />
				</Stage>
			);
		},
	},
];

export const shotsInOrder = () => [...SHOTS].sort((a, b) => a.from - b.from).map((s) => ({...s, from: Math.max(0, Math.round(s.from))}));
