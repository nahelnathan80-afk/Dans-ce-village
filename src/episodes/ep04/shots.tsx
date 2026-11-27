/**
 * Ép. 04 — « Le mur de minuit » : découpage plan par plan, calé sur la voix accélérée (1,3x).
 * Un changement de cadrage toutes les 1,5 à 3 s.
 */
import React from 'react';
import {Character, CharacterLook, Pose, M} from '../../three/Character';
import {Stage, lerpShot, Vec3} from '../../three/Stage';
import {Village, CHALETS, Chalet} from '../../three/Village';
import {closeUp} from '../../three/camera';
import {Flashlight} from '../../three/Props';
import {LivingRoom} from '../../three/Town';
import {Apple, AppleTree, BedRoom, Flag, FlagCode, LongTable, PaperNote, PaperPlane, Wall, WALL} from '../../three/World';
import {villager} from '../cast';
import {blinkAt, punch, ramp, squashAt} from '../../lib/anim';
import {CAST4, ep04} from './data';
import {buildShots, BuiltShot} from '../../engine/shots';

const tl = ep04.tl;
const FPS = 30;

export type ShotCtx = {f: number; g: number; t: number; d: number; p: number};
export type ShotDef = {id: string; from: number; render: (c: ShotCtx) => React.ReactNode};

const F = (id: string, off = 0, edge: 'start' | 'end' = 'start') => tl.f(id, off, edge);
const Wt = (id: string, txt: string, off = 0) => {
	const ws = tl.line(id).words;
	const i = Math.max(0, ws.findIndex((w) => w.text.toLowerCase().includes(txt.toLowerCase())));
	return Math.round((ws[i].start + off) * FPS);
};

/** frame de la n-ième occurrence d'un mot dans une réplique */
const Wn = (id: string, txt: string, n: number, off = 0) => {
	const ws = tl.line(id).words.filter((w) => w.text.toLowerCase().includes(txt.toLowerCase()));
	const w = ws[Math.min(ws.length - 1, n - 1)];
	return Math.round((w.start + off) * FPS);
};

const L = {
	leo: CAST4.leo as CharacterLook,
	yuki: CAST4.yuki as CharacterLook,
	mere: CAST4.mere as CharacterLook,
	odette: CAST4.odette as CharacterLook,
	maire: CAST4.maire as CharacterLook,
};

// drapeaux sur les balcons : 4 pays à l'ouest du mur (côté Léo), 4 à l'est (côté Yuki)
const FLAGS: Record<number, FlagCode> = {6: 'fr', 0: 'cn', 4: 'br', 1: 'gb', 3: 'jp', 7: 'us', 5: 'ru', 9: 'de'};
const GATE: Vec3 = [WALL.x, 0, WALL.gateZ];

type TownOpts = {night?: boolean; wall?: number; close?: number; apple?: boolean; frame: number};
const town = (o: TownOpts) => (
	<Village
		night={o.night}
		replaceFountain={<AppleTree position={[0, 0, -1]} apple={o.apple ?? false} sway={o.frame / 20} />}
		decorateChalet={(i, c) =>
			FLAGS[i] ? <Flag code={FLAGS[i]} position={[c.w * 0.42, c.h / 2 + 0.2, c.d / 2 + 1.05]} rotation={[0, -0.5, 0]} wave={o.frame / 3 + i} scale={1.15} /> : null
		}
	>
		{(o.wall ?? 1) > 0 && <Wall height={o.wall ?? 1} close={o.close ?? 0} night={o.night} />}
	</Village>
);

/** Villageois qui brandit un drapeau (fâché). */
const Angry: React.FC<{i: number; code: FlagCode; p: Vec3; rot: number; f: number; shout?: boolean}> = ({i, code, p, rot, f, shout}) => {
	const arm = -2.6 + Math.sin(f / 3 + i) * 0.35;
	return (
		<Character look={villager(i)} position={p} rotation={[0, rot, 0]} emotion="angry" mouthOpen={shout ? 0.6 + 0.4 * Math.abs(Math.sin(f / 2 + i)) : 0}
			pose={{armR: [arm, -0.15], armL: [0, 0.3 + Math.abs(Math.sin(f / 4 + i)) * 0.4]}}>
			<Flag code={code} position={[0, -0.1, 0.05]} rotation={[-arm, 0, 0]} scale={0.7} pole={1.3} wave={f / 2 + i} />
		</Character>
	);
};

const WEST = (z: number): Vec3 => [WALL.x - 2.2, 0, z];
const EAST = (z: number): Vec3 => [WALL.x + 2.2, 0, z];

// Positions de la course finale (Léo à l'ouest, Yuki à l'est)
const runPos = (side: -1 | 1, k: number): Vec3 => [WALL.x + side * (9 - k * 8.6), 0, WALL.gateZ + side * 0.2];

const LEO_HOME = CHALETS[6];

// ————————————————————————————————————————————————————————————————
export const SHOTS: ShotDef[] = [
	// 1. ACCROCHE — Léo de dos devant le mur, la nuit
	{
		id: 'p01-mur',
		from: 0,
		render: (c) => (
			<Stage camera={{pos: [-6.5, 2.4, WALL.gateZ + 1.5 - ramp(c.f, 0, c.d) * 1.2], target: [WALL.x, 2.6, WALL.gateZ], fov: 46}} ambiance="nightblue" fogNear={30} fogFar={150}>
				{town({night: true, close: 0.75, frame: c.g})}
				<Character look={L.leo} position={[WALL.x - 2.6, 0, WALL.gateZ]} rotation={[0, Math.PI / 2, 0]} emotion="sad" />
			</Stage>
		),
	},
	{
		id: 'p01-profil',
		from: Wt('plan01', 'personne', -0.15),
		render: (c) => (
			<Stage camera={closeUp([WALL.x - 2.6, 0, WALL.gateZ], Math.PI / 2 - 0.3, 3.4, {side: -0.7})} ambiance="nightblue" fogNear={30} fogFar={150}>
				{town({night: true, close: 0.75, frame: c.g})}
				<Character look={L.leo} position={[WALL.x - 2.6, 0, WALL.gateZ]} rotation={[0, Math.PI / 2 - 0.3, 0]} emotion="sad" blink={blinkAt(c.f)} eyes={[0.6, 0]} />
			</Stage>
		),
	},

	// 2. AVANT — village de jour, grande table commune
	{
		id: 'p02-village',
		from: F('plan02', -0.15),
		render: (c) => {
			const k = ramp(c.f, 0, c.d);
			return (
				<Stage camera={lerpShot({pos: [14, 16, 26], target: [0, 2, 0], fov: 50}, {pos: [6, 8, 18], target: [0, 1.5, 3], fov: 48}, k)} ambiance="morning">
					{town({wall: 0, apple: true, frame: c.g})}
					<LongTable position={[0, 0, 6]} length={11} frame={c.g} guests={Array.from({length: 14}).map((_, i) => villager(i + 3))} />
				</Stage>
			);
		},
	},
	{
		id: 'p02-table',
		from: Wt('plan02', 'mangeait', -0.2),
		render: (c) => (
			<Stage camera={{pos: [0.8, 3.4, 11.5], target: [0, 1.3, 6], fov: 46}} ambiance="morning">
				{town({wall: 0, apple: true, frame: c.g})}
				<LongTable position={[0, 0, 6]} length={11} frame={c.g} guests={[L.leo, L.yuki, ...Array.from({length: 12}).map((_, i) => villager(i + 3))]} />
			</Stage>
		),
	},
	{
		id: 'p02-drapeaux',
		from: Wt('plan02', 'chaque', -0.1),
		render: (c) => (
			<Stage camera={{pos: [-2.5, 3.6, 4.5], target: [-14, 4.2, 2], fov: 40}} ambiance="morning">
				{town({wall: 0, apple: true, frame: c.g})}
			</Stage>
		),
	},

	// 3. LE DÉCLENCHEUR — l'arbre, la branche vide, les accusations
	{
		id: 'p03-arbre',
		from: F('plan03', -0.15),
		render: (c) => {
			const k = ramp(c.f, 0, c.d, (x) => x * x);
			return (
				<Stage camera={lerpShot({pos: [0, 2.6, 9], target: [0, 3.8, -1], fov: 50}, {pos: [-0.6, 4.0, 1.6], target: [-0.9, 4.3, -0.8], fov: 34}, k)} ambiance="morning">
					{town({wall: 0, apple: false, frame: c.g})}
				</Stage>
			);
		},
	},
	{
		id: 'p03-accuse',
		from: Wt('plan03', 'Chaque', -0.15),
		render: (c) => (
			<Stage camera={{pos: [0.5, 2.6, 9.5], target: [0.5, 1.8, 4], fov: 46, shake: 0.01}} ambiance="morning">
				{town({wall: 0, apple: false, frame: c.g})}
				{[[-2.2, 4.2, 1.2, 'fr'], [2.6, 4.0, -1.3, 'jp'], [-0.6, 2.6, 0.2, 'br'], [1.2, 2.4, -0.4, 'us']].map(([x, z, r, code], i) => (
					<Character key={i} look={villager(i + 20)} position={[x as number, 0, z as number]} rotation={[0, r as number, 0]} emotion="angry"
						pose={{armR: [-1.5, -0.15 + Math.sin(c.f / 3 + i) * 0.1]}}>
						<Flag code={code as FlagCode} position={[0, -0.1, 0.05]} rotation={[1.5, 0, 0]} scale={0.5} pole={1.2} wave={c.f / 2} />
					</Character>
				))}
			</Stage>
		),
	},
	{
		id: 'p03-accuse2',
		from: Wt('plan03', 'accusé', -0.1),
		render: (c) => (
			<Stage camera={closeUp([2.6, 0, 4.0], -1.3, 3.4, {side: 0.25, shake: 0.01})} ambiance="morning">
				{town({wall: 0, apple: false, frame: c.g})}
				<Character look={villager(21)} position={[2.6, 0, 4.0]} rotation={[0, -1.3, 0]} emotion="angry" mouthOpen={0.6 + 0.4 * Math.abs(Math.sin(c.f / 2))} pose={{armR: [-1.5, -0.1]}} />
			</Stage>
		),
	},

	// 4. LA GUERRE — montage rapide
	{
		id: 'p04-drapeaux',
		from: F('plan04', -0.15),
		render: (c) => (
			<Stage camera={{pos: [-2.0, 2.4, 6.5], target: [-3.6, 2.6, 2.5], fov: 44, shake: 0.015}} ambiance="golden">
				{town({wall: 0, frame: c.g})}
				<Angry i={30} code="fr" p={[-3.6, 0, 2.4]} rot={0.4} f={c.g} />
				<Angry i={31} code="cn" p={[-5.2, 0, 1.8]} rot={0.6} f={c.g} />
				<Angry i={32} code="br" p={[-2.4, 0, 1.2]} rot={0.2} f={c.g} />
			</Stage>
		),
	},
	{
		id: 'p04-mur',
		from: Wt('plan04', 'mur', -0.15),
		render: (c) => {
			const h = ramp(c.f, 0, c.d * 1.6);
			return (
				<Stage camera={{pos: [-9, 6.5, 14], target: [WALL.x, 2, 0], fov: 50, shake: 0.04}} ambiance="golden">
					{town({wall: Math.max(0.02, h), frame: c.g})}
				</Stage>
			);
		},
	},
	{
		id: 'p04-maire',
		from: Wt('plan04', 'maire', -0.15),
		render: (c) => (
			<Stage camera={closeUp([-0.8, 0, 5.2], 0.3, 4.4, {scale: 1.18, side: 0.3})} ambiance="golden">
				{town({wall: 0.8, frame: c.g})}
				<Character look={L.maire} position={[-0.8, 0, 5.2]} rotation={[0, 0.3, 0]} emotion="angry" mouthOpen={0} blink={blinkAt(c.f, 3)}
					pose={{armR: [-1.65 + Math.sin(c.f / 2) * 0.08, -0.25]}} squash={squashAt(c.f, Wt('plan04', 'voleur') - Wt('plan04', 'maire', -0.15), 0.12)} />
			</Stage>
		),
	},
	{
		id: 'p04-ouest',
		from: Wn('plan04', 'Les', 2, -0.1),
		render: (c) => (
			<Stage camera={{pos: [-1.8, 3.8, 13], target: [-1.6, 1.6, 3.2], fov: 46, shake: 0.02}} ambiance="golden">
				{town({wall: 1, close: 0, frame: c.g})}
				{(['fr', 'cn', 'br', 'gb', 'fr', 'br'] as FlagCode[]).map((code, i) => (
					<Angry key={i} i={40 + i} code={code} p={[-0.2 - (i % 3) * 1.4, 0, 2.4 + Math.floor(i / 3) * 1.5]} rot={Math.PI / 2 + 0.3} f={c.g} shout={i % 2 === 0} />
				))}
			</Stage>
		),
	},
	{
		id: 'p04-est',
		from: Wt('plan04', 'place', -0.1),
		render: (c) => (
			<Stage camera={{pos: [8.2, 3.8, 13], target: [6.6, 1.6, 3.2], fov: 46, shake: 0.02}} ambiance="golden">
				{town({wall: 1, close: 0, frame: c.g})}
				{(['jp', 'us', 'ru', 'de', 'us', 'de'] as FlagCode[]).map((code, i) => (
					<Angry key={i} i={50 + i} code={code} p={[5.2 + (i % 3) * 1.4, 0, 2.4 + Math.floor(i / 3) * 1.5]} rot={-Math.PI / 2 - 0.3} f={c.g} shout={i % 2 === 1} />
				))}
			</Stage>
		),
	},
	{
		id: 'p04-coupe',
		from: Wt('plan04', 'voleur', -0.1),
		render: (c) => (
			<Stage camera={{pos: [WALL.x - 1, 22 - ramp(c.f, 0, c.d) * 3, 18], target: [WALL.x, 0, 0], fov: 50}} ambiance="golden">
				{town({wall: 1, close: 0, frame: c.g})}
			</Stage>
		),
	},

	// 5. ELLE — Yuki de l'autre côté
	{
		id: 'p05-leo',
		from: F('plan05', -0.15),
		render: (c) => (
			<Stage camera={{pos: [WALL.x - 7.5, 3.4, WALL.gateZ - 4.8], target: [WALL.x + 2.4, 1.6, WALL.gateZ + 0.8], fov: 44}} ambiance="golden">
				{town({wall: 1, close: 0, frame: c.g})}
				<Character look={L.leo} position={WEST(WALL.gateZ - 1.2)} rotation={[0, Math.PI / 2 + 0.3, 0]} emotion="neutral" />
				<Character look={L.yuki} position={EAST(WALL.gateZ + 0.8)} rotation={[0, -Math.PI / 2 - 0.4, 0]} emotion="happy" mouthOpen={0.5 + 0.5 * Math.abs(Math.sin(c.f / 3))} />
			</Stage>
		),
	},
	{
		id: 'p05-yuki',
		from: Wt('plan05', 'riait', -0.3),
		render: (c) => (
			<Stage camera={closeUp(EAST(WALL.gateZ + 0.8), -Math.PI / 2 - 0.4, 3.4, {scale: 0.95, side: 0.2})} ambiance="golden">
				{town({wall: 1, close: 0, frame: c.g})}
				<Character look={L.yuki} position={EAST(WALL.gateZ + 0.8)} rotation={[0, -Math.PI / 2 - 0.4, 0]} emotion="happy" mouthOpen={0.4 + 0.6 * Math.abs(Math.sin(c.f / 2.5))}
					pose={{headTilt: Math.sin(c.f / 3) * 0.12, armL: [-0.5, 0.2]}} bob={Math.abs(Math.sin(c.f / 3)) * 0.06} />
				<Character look={villager(61)} position={[WALL.x + 3.6, 0, WALL.gateZ + 2.2]} rotation={[0, -2.6, 0]} emotion="happy" />
			</Stage>
		),
	},
	{
		id: 'p05-timide',
		from: Wt('plan05', 'jamais', -0.3),
		render: (c) => (
			<Stage camera={closeUp(WEST(WALL.gateZ - 1.2), Math.PI / 2 + 0.3, 3.2, {side: -0.3})} ambiance="golden">
				{town({wall: 1, close: 0, frame: c.g})}
				<Character look={L.leo} position={WEST(WALL.gateZ - 1.2)} rotation={[0, Math.PI / 2 + 0.3, 0]} emotion="sad" blink={blinkAt(c.f)} eyes={[-0.5, 0.4]} pose={{headNod: 0.15}} />
			</Stage>
		),
	},
	{
		id: 'p05-loin',
		from: Wt('plan05', 'osé', -0.1),
		render: (c) => (
			<Stage camera={{pos: [WALL.x - 9, 3.4, WALL.gateZ - 5], target: [WALL.x + 2, 1.6, WALL.gateZ + 0.5], fov: 44}} ambiance="golden">
				{town({wall: 1, close: 0, frame: c.g})}
				<Character look={L.leo} position={WEST(WALL.gateZ - 1.2)} rotation={[0, Math.PI / 2 + 0.3, 0]} emotion="neutral" />
				<Character look={L.yuki} position={EAST(WALL.gateZ + 0.8)} rotation={[0, -Math.PI / 2 - 0.4, 0]} emotion="happy" />
			</Stage>
		),
	},

	// 6. L'AMOUR — avions en papier, la nuit
	{
		id: 'p06-avion',
		from: F('plan06', -0.15),
		render: (c) => {
			const k = ramp(c.f, 0, c.d, (x) => x);
			const p: Vec3 = [WALL.x + 5 - k * 10, 3.2 + Math.sin(k * Math.PI) * 3.6, WALL.gateZ - 3 + k * 1.5];
			return (
				<Stage camera={{pos: [WALL.x - 2, 3.0, WALL.gateZ + 9], target: [WALL.x, 4.4, WALL.gateZ - 2], fov: 50}} ambiance="nightblue" fogNear={30} fogFar={150}>
					{town({night: true, close: 0.75, frame: c.g})}
					<PaperPlane position={p} rotation={[0, -Math.PI / 2, Math.sin(c.f / 5) * 0.2]} scale={0.9} />
				</Stage>
			);
		},
	},
	{
		id: 'p06-mot1',
		from: Wt('plan06', 'sien', -0.2),
		render: (c) => (
			<Stage camera={{pos: [6, 1.7, 13.6], target: [6, 1.6, 9.5], fov: 40}} ambiance="nightblue" fogNear={30} fogFar={150}>
				{town({night: true, close: 0.75, frame: c.g})}
				<PaperNote text="Tu me manques." position={[6, 1.6, 9.7]} rotation={[-0.15, Math.sin(c.f / 12) * 0.08, 0.04]} scale={1.0} />
				<pointLight position={[6.6, 2.4, 11.2]} intensity={8} distance={5} color="#ffd9a0" />
			</Stage>
		),
	},
	{
		id: 'p06-mot2',
		from: Wt('plan06', 'mien', -0.2),
		render: (c) => (
			<Stage camera={{pos: [-3, 1.7, 13.6], target: [-3, 1.6, 9.5], fov: 40}} ambiance="nightblue" fogNear={30} fogFar={150}>
				{town({night: true, close: 0.75, frame: c.g})}
				<PaperNote text="Moi aussi." position={[-3, 1.6, 9.7]} rotation={[-0.15, Math.sin(c.f / 12) * 0.08, -0.04]} scale={1.0} />
				<pointLight position={[-2.4, 2.4, 11.2]} intensity={8} distance={5} color="#ffd9a0" />
			</Stage>
		),
	},
	{
		id: 'p06-sourire',
		from: Wt('plan06', 'Moi', -0.05),
		render: (c) => (
			<Stage camera={closeUp([-1.5, 0, 7.5], 0.3, 3.3, {side: 0.2})} ambiance="nightblue" fogNear={30} fogFar={150}>
				{town({night: true, close: 0.75, frame: c.g})}
				<Character look={L.leo} position={[-1.5, 0, 7.5]} rotation={[0, 0.3, 0]} emotion="happy" blink={blinkAt(c.f)} pose={{armR: [-1.3, -0.25], armL: [-1.3, 0.25]}}>
					<PaperNote text="Tu me manques." position={[-0.33, -0.05, 0.3]} rotation={[1.25, 0, 0]} scale={0.45} />
				</Character>
			</Stage>
		),
	},
	{
		id: 'p06-retour',
		from: Wt('plan06', 'par-dessus', -0.1),
		render: (c) => {
			const k = ramp(c.f, 0, c.d, (x) => x);
			const p: Vec3 = [WALL.x - 5 + k * 10, 3.0 + Math.sin(k * Math.PI) * 3.4, WALL.gateZ - 1];
			return (
				<Stage camera={{pos: [WALL.x - 1.5, 2.4, WALL.gateZ + 10], target: [WALL.x, 4.2, WALL.gateZ - 1], fov: 50}} ambiance="nightblue" fogNear={30} fogFar={150}>
					{town({night: true, close: 0.75, frame: c.g})}
					<PaperPlane position={p} rotation={[0, Math.PI / 2, Math.sin(c.f / 5) * 0.2]} scale={0.9} />
				</Stage>
			);
		},
	},

	// 7. LA TENSION — le maire fouille, une maison après l'autre (+ indice : objet rouge sous le lit)
	{
		id: 'p07-porte1',
		from: F('plan07', -0.15),
		render: (c) => (
			<Stage camera={{pos: [-4.6, 2.6, 8.6], target: [-8, 1.9, 3], fov: 46}} ambiance="nightblue" fogNear={30} fogFar={150}>
				<MayorStreet f={c.g} mayorX={-8} knock />
			</Stage>
		),
	},
	{
		id: 'p07-porte2',
		from: Wn('plan07', 'Chaque', 2, -0.15),
		render: (c) => (
			<Stage camera={{pos: [3.4, 2.6, 8.6], target: [0, 1.9, 3], fov: 46}} ambiance="nightblue" fogNear={30} fogFar={150}>
				<MayorStreet f={c.g} mayorX={0} knock />
			</Stage>
		),
	},
	// INDICE (0,5 s) : Léo glisse un objet rouge sous son lit — jamais expliqué
	{
		id: 'p07-indice',
		from: Wt('plan07', 'rapprochait', -0.1),
		render: (c) => {
			const k = ramp(c.f, 0, 12);
			return (
				<Stage camera={{pos: [-1.5, 0.8, 1.9], target: [0.1, 0.3, -0.7], fov: 46}} ambiance="interiorNight">
					<BedRoom>
						<Character look={L.leo} position={[1.1, -0.55, 0.6]} rotation={[0, -2.6, 0]} emotion="panic" pose={{armR: [-1.3, 0.3], lean: 0.45, legL: -1.4, legR: -1.4}} />
						<Apple position={[-0.2 + k * 0.1, 0.18, -0.2 - k * 1.0]} scale={0.9} />
					</BedRoom>
				</Stage>
			);
		},
	},
	{
		id: 'p07-approche',
		from: Wt('plan07', 'mienne', -0.1),
		render: (c) => (
			<Stage camera={{pos: [10.5, 3.2, 9.5], target: [3, 1.6, 3.4], fov: 48}} ambiance="nightblue" fogNear={30} fogFar={150}>
				<MayorStreet f={c.g} mayorX={1 + ramp(c.f, 0, c.d, (x) => x) * 6.6} walk />
			</Stage>
		),
	},
	{
		id: 'p07-frappe',
		from: Wt('plan07', 'maire', -0.1),
		render: (c) => (
			<Stage camera={{pos: [11.8, 2.9, 9.2], target: [8.4, 2.3, 2.4], fov: 46, shake: 0.01}} ambiance="nightblue" fogNear={30} fogFar={150}>
				<MayorStreet f={c.g} mayorX={8} knock leoWindow />
			</Stage>
		),
	},

	// 8. LE CHOIX — la mère, puis mamie Odette
	{
		id: 'p08-minuit',
		from: F('plan08', -0.15),
		render: (c) => (
			<Stage camera={{pos: [-1.4, 3.0, -1.6], target: [-1.6, 2.9, -4.9], fov: 44}} ambiance="interiorNight">
				<LivingRoom night clockTime={() => 11 + 55 / 60 + c.f / 30 / 3600} suitcase={false} />
			</Stage>
		),
	},
	{
		id: 'p08-mere',
		from: Wt('plan08', 'mère', -0.4),
		render: (c) => (
			<Stage camera={closeUp([1.6, 0, 0.6], -0.5, 3.4, {side: 0.2})} ambiance="interiorNight">
				<LivingRoom night clockTime={() => 11.95} suitcase={false}>
					<Character look={L.mere} position={[1.6, 0, 0.6]} rotation={[0, -0.5, 0]} emotion="sad" blink={blinkAt(c.f, 2)} pose={{armL: [-1.2, 0.2], armR: [-1.2, -0.2]}} />
				</LivingRoom>
			</Stage>
		),
	},
	{
		id: 'p08-odette',
		from: Wt('plan08', 'Mamie', -0.15),
		render: (c) => {
			const k = ramp(c.f, 0, c.d);
			return (
				<Stage camera={closeUp([0, 0.2, -2.1], 0, 3.8 - k * 0.8, {headY: 2.2, scale: 0.92, side: 0.2})} ambiance="interiorNight">
					<LivingRoom night clockTime={(i) => 11.95 + i * 0.001} suitcase={false}>
						<Character look={L.odette} position={[0, 0.2, -2.1]} sit emotion="neutral" blink={c.f % 70 < 3} pose={{armL: [-0.9, 0.1], armR: [-0.9, -0.1]}} />
					</LivingRoom>
				</Stage>
			);
		},
	},
	{
		id: 'p08-cours',
		from: Wn('plan08', 'dit', 2, -0.25),
		render: (c) => {
			const k = punch(c.f, 4, 6);
			return (
				<Stage camera={closeUp([0, 0.2, -2.1], 0, 2.8 - k * 0.6, {headY: 2.2, scale: 0.92, side: -0.1, fov: 38 - k * 8})} ambiance="interiorNight">
					<LivingRoom night clockTime={() => 11.95} suitcase={false}>
						<Character look={L.odette} position={[0, 0.2, -2.1]} sit emotion="determined" pose={{armL: [-0.9, 0.1], armR: [-1.6, -0.2]}} />
					</LivingRoom>
				</Stage>
			);
		},
	},
	{
		id: 'p08-depart',
		from: Wt('plan08', 'cours', 0.25),
		render: (c) => {
			const k = ramp(c.f, 0, c.d, (x) => x);
			return (
				<Stage camera={{pos: [3.2, 3.0, 5.2], target: [0, 1.6, 0], fov: 50}} ambiance="interiorNight">
					<LivingRoom night clockTime={() => 11.97} suitcase={false}>
						<Character look={L.leo} position={[-1.5 + k * 5, 0, 1.4]} rotation={[0, Math.PI / 2, 0]} walk={c.f * 0.8} walkAmp={1.3} emotion="determined" />
						<Character look={L.odette} position={[0, 0.2, -2.1]} sit emotion="happy" />
					</LivingRoom>
				</Stage>
			);
		},
	},

	// 9. CLIMAX — montage alterné, la porte se referme
	...([
		['p09-leo1', F('plan09', -0.15), -1, 0.0],
		['p09-porte', Wt('plan09', 'secondes', -0.1), 0, 0.4],
		['p09-yuki1', Wt('plan09', 'Cinq', -0.12), 1, 0.6],
		['p09-yuki2', Wt('plan09', 'Elle', -0.1), 1, 0.85],
	] as [string, number, number, number][]).map(([id, from, who, k0]) => ({
		id,
		from,
		render: (c: ShotCtx) => {
			const k = Math.min(1, k0 + (c.f / FPS) * 0.11);
			const close = 0.35 + k * 0.5;
			const s = Math.sin(c.f * 0.8);
			if (who === 0) {
				return (
					<Stage camera={{pos: [WALL.x - 7, 1.2, WALL.gateZ + 5], target: [WALL.x, 2.6, WALL.gateZ], fov: 50, shake: 0.03}} ambiance="nightblue" fogNear={30} fogFar={150}>
						{town({night: true, close, frame: c.g})}
						<Character look={L.leo} position={runPos(-1, k)} rotation={[0, Math.PI / 2, 0]} walk={c.f * 0.9} walkAmp={1.5} emotion="determined" />
					</Stage>
				);
			}
			const look = who < 0 ? L.leo : L.yuki;
			const p = runPos(who as -1 | 1, k);
			const rot = who < 0 ? Math.PI / 2 : -Math.PI / 2;
			return (
				<Stage camera={{pos: [p[0] + who * 4.2, 2.2, p[2] + 2.6], target: [p[0] - who * 1, 1.9, p[2]], fov: 48, shake: 0.04}} ambiance="nightblue" fogNear={30} fogFar={150}>
					{town({night: true, close, frame: c.g})}
					<Character look={look} position={p} rotation={[0, rot, 0]} walk={c.f * 0.9} walkAmp={1.5} emotion="determined" pose={{armL: [s * 0.9, 0.1], armR: [-s * 0.9, -0.1]}} />
				</Stage>
			);
		},
	})),

	// 10-12 : décor dédié « porte du mur » (porte en x=0, z=0 ; Léo à l'ouest, Yuki à l'est)
	{
		id: 'p10-milieu',
		from: F('plan10', -0.15),
		render: (c) => (
			<Stage camera={{pos: [6.2 - ramp(c.f, 0, c.d) * 1.2, 2.8, 5.2], target: [0, 1.6, 0], fov: 44}} ambiance="nightblue" fogNear={30} fogFar={150}>
				<GateSet f={c.g} />
				<Character look={L.leo} position={[-0.45, 0, 0]} rotation={[0, Math.PI / 2, 0]} emotion="surprised" bob={Math.sin(c.f / 12) * 0.03} />
				<Character look={L.yuki} position={[0.45, 0, 0]} rotation={[0, -Math.PI / 2, 0]} emotion="surprised" bob={Math.sin(c.f / 12 + 1) * 0.03} />
			</Stage>
		),
	},
	{
		id: 'p10-main',
		from: Wt('plan10', 'pris', -0.3),
		render: (c) => {
			const k = ramp(c.f, 0, 30);
			return (
				<Stage camera={{pos: [2.8, 2.3, -3.4], target: [0.05, 1.25, -0.45], fov: 44}} ambiance="nightblue" fogNear={30} fogFar={150}>
					<GateSet f={c.g} />
					<Character look={L.leo} position={[-0.45, 0, 0]} rotation={[0, Math.PI / 2, 0]} emotion="surprised" pose={{armR: [-0.9, 0.1]}} />
					<Character look={L.yuki} position={[0.45, 0, 0]} rotation={[0, -Math.PI / 2, 0]} emotion="happy" pose={{armL: [-0.9 * k, -0.1 * k]}} />
				</Stage>
			);
		},
	},
	{
		id: 'p10-ralenti',
		from: Wt('plan10', 'pile', -0.1),
		render: (c) => (
			<Stage camera={{pos: [-6.2 + ramp(c.f, 0, c.d) * 1.2, 2.8, -5.2], target: [0, 1.6, 0], fov: 44}} ambiance="nightblue" fogNear={30} fogFar={150}>
				<GateSet f={c.g} />
				<Character look={L.leo} position={[-0.45, 0, 0]} rotation={[0, Math.PI / 2, 0]} emotion="sad" pose={{armR: [-0.9, 0.1]}} />
				<Character look={L.yuki} position={[0.45, 0, 0]} rotation={[0, -Math.PI / 2, 0]} emotion="surprised" pose={{armL: [-0.9, -0.1]}} />
			</Stage>
		),
	},
	{
		id: 'p11-pomme',
		from: F('plan11', -0.15),
		render: (c) => {
			const open = ramp(c.f, 4, 20);
			return (
				<Stage camera={{pos: [2.1, 1.95, -2.7], target: [0.2, 1.2, -0.6], fov: 42}} ambiance="nightblue" fogNear={30} fogFar={150}>
					<GateSet f={c.g} />
					<Character look={L.leo} position={[-0.45, 0, 0]} rotation={[0, Math.PI / 2, 0]} emotion="sad" pose={{armR: [-0.9 - open * 0.35, 0.1]}}>
						<Apple position={[0, -0.12, 0.14]} scale={0.6 + open * 0.25} glow={0.3 * open} />
					</Character>
					<Character look={L.yuki} position={[0.45, 0, 0]} rotation={[0, -Math.PI / 2, 0]} emotion="surprised" />
					<pointLight position={[0.8, 2.2, -1.6]} intensity={6} distance={4} color="#ffd9a0" />
				</Stage>
			);
		},
	},
	{
		id: 'p11-silence',
		from: Wt('plan11', 'Pour', -0.1),
		render: (c) => (
			<Stage camera={{pos: [1.9, 1.85, -2.5], target: [0.3, 1.3, -0.6], fov: 40}} ambiance="nightblue" fogNear={30} fogFar={150}>
				<GateSet f={c.g} />
				<Character look={L.leo} position={[-0.45, 0, 0]} rotation={[0, Math.PI / 2, 0]} emotion="sad" pose={{armR: [-1.25, 0.1]}}>
					<Apple position={[0, -0.12, 0.14]} scale={0.85} glow={0.3} />
				</Character>
				<pointLight position={[0.8, 2.2, -1.6]} intensity={6} distance={4} color="#ffd9a0" />
			</Stage>
		),
	},
	// 10. LE MOMENT — au milieu de la porte, ralenti
	{
		id: 'p10-sent',
		from: Wt('plan10', 'senti', -0.15),
		render: (c) => (
			<Stage camera={closeUp([WALL.x + 0.45, 0, WALL.gateZ], -Math.PI / 2, 2.8, {scale: 0.95, side: 0.35})} ambiance="nightblue" fogNear={30} fogFar={150}>
				{town({night: true, close: 0.35, frame: c.g})}
				<Character look={L.yuki} position={[WALL.x + 0.45, 0, WALL.gateZ]} rotation={[0, -Math.PI / 2, 0]} emotion="surprised" eyes={[0, 0.8]} pose={{armL: [-0.9, 0.4], headNod: 0.2}} />
			</Stage>
		),
	},

	// 11. LA RÉVÉLATION — la pomme
	{
		id: 'p11-leo',
		from: Wt('plan11', "n'avais", -0.2),
		render: (c) => (
			<Stage camera={closeUp([WALL.x - 0.45, 0, WALL.gateZ], Math.PI / 2, 2.8, {side: -0.4})} ambiance="nightblue" fogNear={30} fogFar={150}>
				{town({night: true, close: 0.35, frame: c.g})}
				<Character look={L.leo} position={[WALL.x - 0.45, 0, WALL.gateZ]} rotation={[0, Math.PI / 2, 0]} emotion="sad" blink={blinkAt(c.f)} eyes={[0, 0.5]} pose={{headNod: 0.15}} />
			</Stage>
		),
	},
	{
		id: 'p11-yuki',
		from: Wt('plan11', 'donner', -0.1),
		render: (c) => (
			<Stage camera={closeUp([WALL.x + 0.45, 0, WALL.gateZ], -Math.PI / 2, 2.9, {scale: 0.95, side: 0.3})} ambiance="nightblue" fogNear={30} fogFar={150}>
				{town({night: true, close: 0.35, frame: c.g})}
				<Character look={L.yuki} position={[WALL.x + 0.45, 0, WALL.gateZ]} rotation={[0, -Math.PI / 2, 0]} emotion="surprised" eyes={[0, 0.8]} pose={{headNod: 0.25}} />
			</Stage>
		),
	},

	// 12. LE CHOC — Yuki, puis la lampe du maire s'allume derrière eux
	{
		id: 'p12-choc',
		from: F('plan12', -0.15),
		render: (c) => (
			<Stage camera={closeUp([WALL.x + 0.45, 0, WALL.gateZ], -Math.PI / 2, 2.6, {scale: 0.95, side: 0.15})} ambiance="nightblue" fogNear={30} fogFar={150}>
				{town({night: true, close: 0.35, frame: c.g})}
				<Character look={L.yuki} position={[WALL.x + 0.45, 0, WALL.gateZ]} rotation={[0, -Math.PI / 2, 0]} emotion="surprised" blink={false} />
			</Stage>
		),
	},

	{
		id: 'p12-maire',
		from: Wt('plan12', 'fille', -0.1),
		render: (c) => {
			const on = c.f >= 10;
			return (
				<Stage camera={{pos: [4.2, 2.4, 1.3], target: [-5, 1.7, 0], fov: 46}} ambiance="nightblue" fogNear={30} fogFar={150}>
					<GateSet f={c.g} />
					<Character look={L.leo} position={[-0.45, 0, 0]} rotation={[0, Math.PI / 2, 0]} emotion="sad" />
					<Character look={L.yuki} position={[0.45, 0, 0]} rotation={[0, -Math.PI / 2, 0]} emotion="surprised" />
					<Character look={L.maire} position={[-6.5, 0, 0.4]} rotation={[0, Math.PI / 2, 0]} emotion="surprised" pose={{armR: [-1.45, -0.05]}}>
						<Flashlight on={on} position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]} beamLength={6} />
					</Character>
					{on && <pointLight position={[-4.5, 2.0, 0.4]} intensity={16} distance={10} color="#fff3c0" />}
				</Stage>
			);
		},
	},

	// 13. Carte-question PENDANT la dernière phrase, sur l'image du début (boucle)
	{
		id: 'p13-boucle',
		from: F('plan13', -0.15),
		render: (c) => (
			<Stage camera={{pos: [-6.5, 2.4, WALL.gateZ + 2.7 - ramp(c.f, 0, c.d) * 1.2], target: [WALL.x, 2.6, WALL.gateZ], fov: 46}} ambiance="nightblue" fogNear={30} fogFar={150}>
				{town({night: true, close: 0.75, frame: c.g})}
				<Character look={L.leo} position={[WALL.x - 2.6, 0, WALL.gateZ]} rotation={[0, Math.PI / 2, 0]} emotion="sad" />
			</Stage>
		),
	},
];

/** Décor « porte du mur, de nuit » : la porte est en (0, 0, 0), le mur suit l'axe z. */
const GateSet: React.FC<{f: number; close?: number}> = ({f, close = 0.35}) => (
	<group>
		<mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
			<planeGeometry args={[200, 200]} />
			<meshStandardMaterial color="#5f6488" />
		</mesh>
		<group position={[-WALL.x, 0, -WALL.gateZ]}>
			<Wall height={1} close={close} night />
		</group>
		<Chalet position={[-11, 0, -7]} rotY={0.9} night number={undefined} wall="#8ecae6">
			<Flag code="fr" position={[2.2, 2.7, 3.2]} rotation={[0, -0.5, 0]} wave={f / 3} scale={1.15} />
		</Chalet>
		<Chalet position={[11, 0, 7]} rotY={-2.2} night wall="#e8b07a">
			<Flag code="jp" position={[2.2, 2.7, 3.2]} rotation={[0, -0.5, 0]} wave={f / 3 + 1} scale={1.15} />
		</Chalet>
		<Chalet position={[-12, 0, 8]} rotY={2.2} night />
		<Chalet position={[12, 0, -8]} rotY={-0.9} night wall="#d69a5b" />
	</group>
);

/** Rue nocturne : maisons Chine, Brésil, France (chez Léo, à droite). Le maire et sa lampe. */
const MayorStreet: React.FC<{f: number; mayorX: number; knock?: boolean; walk?: boolean; leoWindow?: boolean}> = ({f, mayorX, knock, walk, leoWindow}) => {
	const k = knock ? Math.max(0, Math.sin(f / 2.2)) : 0;
	return (
		<group>
			<mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
				<planeGeometry args={[200, 200]} />
				<meshStandardMaterial color="#6c6a8a" />
			</mesh>
			{([[-8, 'cn', '#c8864a'], [0, 'br', '#e8b07a'], [8, 'fr', '#8ecae6']] as [number, FlagCode, string][]).map(([x, code, wall]) => (
				<Chalet key={x} position={[x, 0, 0]} w={6} d={5} h={5} night wall={wall}>
					<Flag code={code} position={[2.5, 2.7, 3.55]} rotation={[0, -0.5, 0]} wave={f / 3 + x} scale={1.15} />
				</Chalet>
			))}
			{[-4, 4, 12].map((x) => (
				<group key={x} position={[x, 0, 4.2]}>
					<mesh position={[0, 1.8, 0]} material={M('#2b2b2b')}>
						<cylinderGeometry args={[0.08, 0.12, 3.6, 6]} />
					</mesh>
					<mesh position={[0, 3.8, 0]}>
						<boxGeometry args={[0.5, 0.6, 0.5]} />
						<meshStandardMaterial color="#fff3c4" emissive="#ffd37a" emissiveIntensity={1.6} />
					</mesh>
					<pointLight position={[0, 3.6, 0]} intensity={10} distance={12} color="#ffcf8a" />
				</group>
			))}
			<Character look={L.maire} position={[mayorX, 0, 3.4]} rotation={[0, walk ? Math.PI / 2 : Math.PI, 0]} walk={walk ? f * 0.45 : undefined} walkAmp={0.7}
				emotion="determined" pose={{armR: [-1.6 + k * 0.45, -0.1], armL: [-1.3, 0.3]}}>
				<Flashlight on position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]} beamLength={4} />
			</Character>
			{leoWindow && <Character look={L.leo} position={[10.0, 2.6, 2.3]} rotation={[0, 0.3, 0]} emotion="panic" />}
		</group>
	);
};

const SHOWS: Record<string, string[]> = {"p01-mur": ["Léo", "mur"], "p01-profil": ["Léo"], "p02-village": ["village", "pays", "table"], "p02-table": ["table", "villageois"], "p02-drapeaux": ["drapeaux", "maisons"], "p03-arbre": ["arbre", "pomme"], "p03-accuse": ["villageois", "drapeaux"], "p03-accuse2": ["villageois qui accuse"], "p04-drapeaux": ["drapeaux", "villageois"], "p04-mur": ["mur"], "p04-maire": ["maire"], "p04-ouest": ["villageois qui crient"], "p04-est": ["place", "villageois"], "p04-coupe": ["mur", "maire"], "p05-leo": ["Léo"], "p05-yuki": ["Yuki"], "p05-timide": ["Léo"], "p05-loin": ["Léo", "Yuki"], "p06-avion": ["avion en papier", "mur"], "p06-mot1": ["message « Tu me manques »"], "p06-mot2": ["message « Moi aussi »"], "p06-sourire": ["Yuki"], "p06-retour": ["avion en papier"], "p07-porte1": ["maire", "maison"], "p07-porte2": ["maire", "maison"], "p07-indice": ["Léo", "objet rouge"], "p07-approche": ["maire", "maison de Léo"], "p07-frappe": ["maire"], "p08-minuit": ["horloge", "porte du mur"], "p08-mere": ["mère"], "p08-odette": ["mamie Odette"], "p08-cours": ["mamie Odette"], "p08-depart": ["Léo qui court"], "p09-leo1": ["Léo qui court"], "p09-porte": ["porte qui se ferme", "Léo"], "p09-yuki1": ["Yuki qui court"], "p09-yuki2": ["Yuki qui court"], "p10-milieu": ["Léo", "Yuki", "porte"], "p10-main": ["main", "Yuki"], "p10-ralenti": ["Léo", "Yuki"], "p10-sent": ["main"], "p11-pomme": ["pomme"], "p11-silence": ["Yuki", "pomme"], "p11-leo": ["Léo"], "p11-yuki": ["Yuki"], "p12-choc": ["Yuki"], "p12-maire": ["maire"], "p13-boucle": ["Léo", "mur"]};

/** Moteur v2 : cadrages triés, recoupés au besoin sur un mot (≤ 2,2 s), avec ce qu'ils montrent. */
export const shotsInOrder = (): BuiltShot[] =>
	buildShots(SHOTS.map((s) => ({...s, shows: SHOWS[s.id]})), tl, tl.durationInFrames);
export type {Pose};
