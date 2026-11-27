/**
 * Ép. 03 — « Maison n°12 » : découpage plan par plan (≈ 1 changement de cadrage toutes les 1,5–2 s).
 * Chaque plan démarre sur une réplique (tl.f / tl.fw) : tout se recale si la voix change.
 */
import React from 'react';
import {Character, CharacterLook, Pose} from '../../three/Character';
import {Stage, lerpShot, Vec3, CameraShot} from '../../three/Stage';
import {Chalet, Village} from '../../three/Village';
import {closeUp} from '../../three/camera';
import {Crowd} from '../../three/Crowd';
import {Cat} from '../../three/Cat';
import {Suitcase} from '../../three/Shop';
import {Billboard, CardboardBox, CartonShop, DinnerTable, EmptyLot, LightColumn, LivingRoom, NumberBall, PhotoFrame, RoadSign, Urn, Valley} from '../../three/Town';
import {villager} from '../cast';
import {blinkAt, punch, ramp, squashAt} from '../../lib/anim';
import {CAST3, ep03} from './data';

const tl = ep03.tl;
const FPS = 30;

export type ShotCtx = {f: number; g: number; t: number; d: number; p: number};
export type ShotDef = {id: string; from: number; render: (c: ShotCtx) => React.ReactNode};

const F = (id: string, off = 0) => tl.f(id, off);
/** frame du mot qui contient `txt` dans la réplique `id` */
const Wt = (id: string, txt: string, off = 0) => {
	const ws = tl.line(id).words;
	const i = Math.max(0, ws.findIndex((w) => w.text.toLowerCase().includes(txt.toLowerCase())));
	return Math.round((ws[i].start + off) * FPS);
};

const L = {
	noe: CAST3.noe as CharacterLook,
	lila: CAST3.lila as CharacterLook,
	odette: CAST3.odette as CharacterLook,
	odetteCoat: {...(CAST3.odette as CharacterLook), coat: '#4a2f7a'} as CharacterLook,
	maire: CAST3.maire as CharacterLook,
	marcel: CAST3.marcel as CharacterLook,
};
const CAT = CAST3.pistache;

// ——— Repères ———
const H12 = {pos: [9.5, 0, -3] as Vec3, rotY: -Math.PI / 2, door: [6.5, 0, -3] as Vec3};
const URN: Vec3 = [0, 2.55, 4.4];
const MAIRE: Vec3 = [1.35, 0, 4.85];
const MAIRE_ROT = Math.atan2(URN[0] - MAIRE[0], URN[2] - MAIRE[2]);
const BILL: Vec3 = [-4.5, 0, -8.5];
const FAMILY = {odette: [5.1, 0, -4.3] as Vec3, noe: [5.0, 0, -3.5] as Vec3, lila: [5.0, 0, -2.8] as Vec3, cat: [4.7, 0, -2.2] as Vec3};

/** Maison n°12 (avec tremblement, élévation, lumière). */
const House12: React.FC<{night?: boolean; shake?: number; rise?: number; glow?: number}> = ({night, shake = 0, rise = 0, glow = 0}) => {
	const sx = shake ? Math.sin(shake * 2.3) * 0.08 : 0;
	const sz = shake ? Math.cos(shake * 1.7) * 0.06 : 0;
	return (
		<group position={[sx, rise, sz]}>
			<Chalet position={H12.pos} rotY={H12.rotY} w={7} d={6} h={5.6} number={12} wall="#e8b07a" roof="#8f3b22" shutter="#2e8b57" night={night} balcony />
			{glow > 0 && (
				<mesh position={[H12.door[0] - 0.06, 1.1, H12.door[2]]} rotation={[0, -Math.PI / 2, 0]}>
					<planeGeometry args={[1.2, 2.1]} />
					<meshBasicMaterial color="#ffffff" transparent opacity={Math.min(1, glow)} toneMapped={false} />
				</mesh>
			)}
		</group>
	);
};

type TownOpts = {night?: boolean; shake?: number; rise?: number; glow?: number; billboard?: string[]; urn?: boolean; sign?: boolean};
const town = (o: TownOpts = {}) => (
	<Village
		night={o.night}
		numbered
		replaceMairie={<House12 night={o.night} shake={o.shake} rise={o.rise} glow={o.glow} />}
		replaceBakery={<EmptyLot position={[-9, 0, -2]} rotY={Math.PI / 2} />}
	>
		<Billboard lines={o.billboard ?? ['CE SOIR :', 'MAISON', 'N°12']} position={BILL} rotY={0.35} lit={o.night ? 1 : 0} w={4.4} h={4.6} />
		{o.urn !== false && (
			<group>
				<mesh position={[URN[0], 0.8, URN[2]]}>
					<cylinderGeometry args={[0.55, 0.7, 1.6, 16]} />
					<meshStandardMaterial color="#e9dfcf" />
				</mesh>
				<Urn position={URN} />
			</group>
		)}
		{o.sign !== false && <RoadSign lines={['INTERDIT', 'DE RESTER', 'DEDANS']} position={[5.4, 0, -5.6]} rotY={-Math.PI / 2 + 0.3} />}
	</Village>
);

const family = (f: number, o: {lilaEmo?: React.ComponentProps<typeof Character>['emotion']; noeEmo?: React.ComponentProps<typeof Character>['emotion']; noePose?: Pose; noe?: boolean} = {}) => (
	<>
		<Character look={L.odette} position={FAMILY.odette} rotation={[0, -Math.PI / 2 + 0.2, 0]} emotion="neutral" blink={blinkAt(f, 4)} />
		{o.noe !== false && <Character look={L.noe} position={FAMILY.noe} rotation={[0, -Math.PI / 2, 0]} emotion={o.noeEmo ?? 'happy'} blink={blinkAt(f)} pose={o.noePose} />}
		<Character look={L.lila} position={FAMILY.lila} rotation={[0, -Math.PI / 2 - 0.15, 0]} emotion={o.lilaEmo ?? 'happy'} blink={blinkAt(f, 2)} pose={{armR: [0, 2.6 + Math.sin(f / 4) * 0.3]}} />
		<Cat position={FAMILY.cat} rotation={[0, -Math.PI / 2 - 0.4, 0]} fur={CAT.fur} stripes={CAT.stripes} tail={f / 6} blink={blinkAt(f, 7)} />
	</>
);

/** Portail de la maison : mur sombre percé d'une porte, la vallée derrière. */
const Doorway: React.FC<{open: number}> = ({open}) => (
	<group position={[0, 0, 2]}>
		{[[-4.3, 1.25, 6], [4.3, 1.25, 6]].map(([x, , w], i) => (
			<mesh key={i} position={[x, 3, 0]}>
				<boxGeometry args={[w, 6, 0.3]} />
				<meshStandardMaterial color="#2b2440" />
			</mesh>
		))}
		<mesh position={[0, 4.6, 0]}>
			<boxGeometry args={[2.6, 2.8, 0.3]} />
			<meshStandardMaterial color="#2b2440" />
		</mesh>
		<group position={[-1.3, 0, 0.05]} rotation={[0, open * 1.6, 0]}>
			<mesh position={[1.3, 1.6, 0]}>
				<boxGeometry args={[2.6, 3.2, 0.08]} />
				<meshStandardMaterial color="#6b3d1f" />
			</mesh>
		</group>
	</group>
);

const H7: Vec3 = [5.5, 0, -8];
const valleyScene = (f: number, extra?: React.ReactNode) => (
	<Valley>
		<Chalet position={H7} rotY={-0.25} number={7} w={6} wall="#d69a5b" roof="#6e2f1d" shutter="#1f6fb2" />
		<Chalet position={[-9, 0, 1]} rotY={0.6} number={12} w={7} d={6} h={5.6} wall="#e8b07a" roof="#8f3b22" shutter="#2e8b57" />
		<DinnerTable position={[3.6, 0, -3.2]} rotY={-0.25} />
		<Character look={L.marcel} position={[5.0, 0, -4.6]} rotation={[0, -0.6, 0]} emotion="happy" blink={blinkAt(f, 5)} pose={{armR: [0, 2.4 + Math.sin(f / 5) * 0.25]}} />
		{extra}
	</Valley>
);

// ————————————————————————————————————————————————————————————————
export const SHOTS: ShotDef[] = [
	// P01 — la règle, dite ET montrée tout de suite : panneau géant
	{
		id: 'p01-panneau',
		from: 0,
		render: (c) => {
			const k = ramp(c.f, 0, c.d, (x) => 1 - (1 - x) * (1 - x));
			const cam = lerpShot({pos: [-0.6, 4.2, 4.5], target: [-4.5, 4.0, -8.5], fov: 50}, {pos: [-2.0, 4.6, 0.6], target: [-4.5, 4.1, -8.5], fov: 46}, k);
			return (
				<Stage camera={cam} ambiance="nightblue" fogNear={30} fogFar={150}>
					{town({night: true})}
				</Stage>
			);
		},
	},
	{
		id: 'p01-maison',
		from: Wt('plan01', 'maison', -0.1),
		render: (c) => (
			<Stage camera={{pos: [1.0, 2.6, 1.0 - ramp(c.f, 0, c.d) * 0.8], target: [H12.door[0], 2.6, H12.door[2]], fov: 48}} ambiance="nightblue" fogNear={30} fogFar={150}>
				{town({night: true})}
			</Stage>
		),
	},

	// P02 — flash-forward : Noé seul devant sa maison qui tremble
	{
		id: 'p02-seul',
		from: F('plan02', -0.1),
		render: (c) => (
			<Stage camera={{pos: [1.0, 2.0, -1.6], target: [6, 2.4, -3], fov: 50, shake: 0.03}} ambiance="nightblue" fogNear={30} fogFar={150}>
				{town({night: true, shake: c.f, glow: 0.7 + 0.3 * Math.sin(c.f / 2)})}
				<LightColumn position={[H12.pos[0], 0, H12.pos[2]]} intensity={0.25} radius={4.5} />
				<Character look={L.noe} position={[3.8, 0, -3]} rotation={[0, Math.PI / 2, 0]} emotion="panic" pose={{armL: [0, 0.4], armR: [0, 0.4]}} />
			</Stage>
		),
	},
	{
		id: 'p02-visage',
		from: Wt('plan02', 'mienne', -0.35),
		render: (c) => {
			const k = punch(c.f, 6, 7);
			return (
				<Stage camera={closeUp([3.8, 0, -3], -Math.PI / 2, 3.6 - k, {scale: 0.82, shake: 0.03, fov: 38 - k * 6})} ambiance="nightblue" fogNear={30} fogFar={150}>
					{town({night: true, shake: c.f, glow: 1})}
					<LightColumn position={[H12.pos[0], 0, H12.pos[2]]} intensity={0.3} radius={4.5} />
					<Character look={L.noe} position={[3.8, 0, -3]} rotation={[0, -Math.PI / 2, 0]} emotion="panic" blink={false} pose={{armL: [-0.4, 0.6], armR: [-0.4, 0.6]}} />
				</Stage>
			);
		},
	},

	// P03 — rembobinage → matin
	{
		id: 'p03-matin',
		from: F('plan03', -0.1),
		render: (c) => {
			const k = ramp(c.f, 0, c.d);
			return (
				<Stage camera={lerpShot({pos: [16, 20, 26], target: [0, 2, -2], fov: 48}, {pos: [8, 9, 18], target: [0, 2, 0], fov: 48}, k)} ambiance="morning">
					{town({billboard: ['TIRAGE', 'DU JOUR']})}
					<Crowd frame={c.g} count={14} mode="idle" lookAt={URN} seed={21} exclude={(x, z) => Math.hypot(x - URN[0], z - URN[2]) < 2.2} />
				</Stage>
			);
		},
	},

	// P04 — le tirage : le maire plonge la main dans l'urne
	{
		id: 'p04-main',
		from: F('plan04', -0.1),
		render: (c) => {
			const reach = Math.sin(c.f / 6) * 0.15;
			return (
				<Stage camera={closeUp(MAIRE, MAIRE_ROT, 6.2, {scale: 1.18, side: 0.7, h: -0.4, fov: 40})} ambiance="morning">
					{town({billboard: ['TIRAGE', 'DU JOUR']})}
					<Character look={L.maire} position={MAIRE} rotation={[0, MAIRE_ROT, 0]} emotion="determined" blink={blinkAt(c.f, 3)} pose={{armR: [-1.75 + reach, -0.25], headNod: 0.15}} />
				</Stage>
			);
		},
	},
	{
		id: 'p04-foule',
		from: Wt('plan04', 'Toute', -0.1),
		render: (c) => (
			<Stage camera={{pos: [0.4, 2.7, 4.0], target: [0, 2.0, 12], fov: 50}} ambiance="morning">
				{town({billboard: ['TIRAGE', 'DU JOUR']})}
				<Crowd frame={c.g} count={22} mode="lookUp" lookAt={[URN[0], 1.2, URN[2]]} seed={21} exclude={(x, z) => z < 6.2 || Math.hypot(x, z - 4) < 2.5} />
				{Array.from({length: 10}).map((_, i) => (
					<Character key={i} look={villager(i + 40)} position={[-4 + i * 0.9, 0, 9 + (i % 3)]} rotation={[0, Math.PI, 0]} emotion={i % 2 ? 'surprised' : 'panic'} blink={false} />
				))}
			</Stage>
		),
	},
	{
		id: 'p04-urne',
		from: Wt('plan04', 'souffle', -0.25),
		render: (c) => (
			<Stage camera={{pos: [URN[0] - 2.4, URN[1] + 0.6, URN[2] + 2.6 - ramp(c.f, 0, c.d) * 0.5], target: URN, fov: 42}} ambiance="morning">
				{town({billboard: ['TIRAGE', 'DU JOUR']})}
				<Character look={L.maire} position={MAIRE} rotation={[0, MAIRE_ROT, 0]} emotion="determined" pose={{armR: [-1.75, -0.25]}} />
			</Stage>
		),
	},

	// P05 — on déménage devant le magasin de cartons
	{
		id: 'p05-magasin',
		from: F('plan05', -0.1),
		render: (c) => (
			<Stage camera={{pos: [-2.5, 3.2, 10 - ramp(c.f, 0, c.d) * 1.5], target: [0, 2.8, 2], fov: 48}} ambiance="morning">
				<StreetSet f={c.g} />
			</Stage>
		),
	},
	{
		id: 'p05-course',
		from: Wt('plan05', 'minuit', -0.2),
		render: (c) => (
			<Stage camera={{pos: [3.5, 2.6, 9.5], target: [-1, 1.6, 4.5], fov: 50, shake: 0.01}} ambiance="morning">
				<StreetSet f={c.g} runners={c.f / FPS + 1} />
			</Stage>
		),
	},

	// P06 — la règle + la boucle ouverte
	{
		id: 'p06-panneau',
		from: F('plan06', -0.1),
		render: (c) => (
			<Stage camera={{pos: [0.6, 2.9, -3.6 - ramp(c.f, 0, c.d) * 0.4], target: [5.4, 2.6, -5.6], fov: 42}} ambiance="morning">
				{town({billboard: ['TIRAGE', 'DU JOUR']})}
			</Stage>
		),
	},
	{
		id: 'p06-dedans',
		from: Wt('plan06', 'dedans', -0.1),
		render: (c) => {
			const k = punch(c.f, 3, 6);
			return (
				<Stage camera={{pos: [2.6 + k, 2.55, -4.6], target: [5.4, 2.5, -5.6], fov: 36 - k * 8}} ambiance="morning">
					{town({billboard: ['TIRAGE', 'DU JOUR']})}
				</Stage>
			);
		},
	},
	{
		id: 'p06-passant',
		from: Wt('plan06', 'Personne', -0.1),
		render: (c) => (
			<Stage camera={closeUp([3.4, 0, -6.6], -Math.PI / 2 - 0.6, 4.0, {side: 0.2})} ambiance="morning">
				{town({billboard: ['TIRAGE', 'DU JOUR']})}
				<Character look={villager(52)} position={[3.4, 0, -6.6]} rotation={[0, -Math.PI / 2 - 0.6, 0]} emotion="sad" blink={blinkAt(c.f, 5)} pose={{headNod: 0.2}} />
			</Stage>
		),
	},
	{
		id: 'p06-revenu',
		from: Wt('plan06', 'revenu', -0.15),
		render: (c) => {
			const k = punch(c.f, 4, 6);
			return (
				<Stage camera={{pos: [3.4 + k * 1.2, 1.9, -1.4], target: [6.4, 1.3, -3], fov: 44 - k * 14}} ambiance="morning">
					{town({billboard: ['TIRAGE', 'DU JOUR'], sign: false})}
					<EmptyLot position={[0.4, 0, 12]} rotY={Math.PI} label={['ICI ÉTAIT', 'LE N°3']} />
				</Stage>
			);
		},
	},

	// P07 — INDICE 1 : terrain vide « ICI ÉTAIT LE N°7 », photo de papi
	{
		id: 'p07-terrain',
		from: F('plan07', -0.1),
		render: (c) => (
			<Stage camera={{pos: [-1.6, 2.9, 0.2 - ramp(c.f, 0, c.d) * 0.6], target: [-6.0, 1.9, -3.4], fov: 46}} ambiance="golden">
				{town({billboard: ['TIRAGE', 'DU JOUR']})}
			</Stage>
		),
	},
	{
		id: 'p07-photo',
		from: Wt('plan07', "C'était", -0.1),
		render: (c) => (
			<Stage camera={{pos: [-2.7, 2.35, 0.6], target: [-3.85, 1.85, -0.35], fov: 36}} ambiance="golden">
				{town({billboard: ['TIRAGE', 'DU JOUR']})}
				<Character look={L.odette} position={[-4.2, 0, -0.6]} rotation={[0, 0.9, 0]} emotion="moved" blink={blinkAt(c.f, 4)} pose={{armR: [-1.5, -0.25], armL: [-1.5, 0.25]}}>
					<PhotoFrame position={[-0.3, -0.05, 0.25]} rotation={[1.5, 0, 0]} scale={0.95} />
				</Character>
			</Stage>
		),
	},
	{
		id: 'p07b-mamie',
		from: F('plan07b', -0.1),
		render: (c) => (
			<Stage camera={closeUp([-4.2, 0, -0.6], 0.9, 3.4, {scale: 0.92, side: 0.3})} ambiance="golden">
				{town({billboard: ['TIRAGE', 'DU JOUR']})}
				<Character look={L.odette} position={[-4.2, 0, -0.6]} rotation={[0, 0.9 + ramp(c.f, 0, c.d) * 0.6, 0]} emotion="sad" blink={blinkAt(c.f, 4)} eyes={[0.6, 0.3]}
					pose={{armR: [-0.6, -0.1], armL: [-0.6, 0.1], headNod: 0.15}} />
			</Stage>
		),
	},

	// P08 — la famille devant le n°12 (pastilles de nom)
	{
		id: 'p08-noe',
		from: F('plan08', -0.1),
		render: (c) => (
			<Stage camera={closeUp(FAMILY.noe, -Math.PI / 2, 3.8, {scale: 0.82, side: 0.15})} ambiance="golden">
				{town({billboard: ['TIRAGE', 'DU JOUR']})}
				{family(c.g, {noePose: {armR: [-0.3, 2.4 + Math.sin(c.f / 4) * 0.2]}})}
			</Stage>
		),
	},
	{
		id: 'p08-famille',
		from: Wt('plan08', 'Avec', -0.1),
		render: (c) => (
			<Stage camera={{pos: [-5.6, 2.9, -3.3], target: [5.0, 1.5, -3.3], fov: 48}} ambiance="golden">
				{town({billboard: ['TIRAGE', 'DU JOUR']})}
				{family(c.g)}
			</Stage>
		),
	},
	{
		id: 'p08-pistache',
		from: Wt('plan08', 'Pistache', -0.1),
		render: (c) => (
			<Stage camera={{pos: [2.4, 1.6, -0.8], target: [4.7, 0.7, -2.2], fov: 42}} ambiance="golden">
				{town({billboard: ['TIRAGE', 'DU JOUR']})}
				{family(c.g)}
			</Stage>
		),
	},

	// P09 — la boule « 12 » (son coupé + zoom brusque)
	{
		id: 'p09-tire',
		from: F('plan09', -0.1),
		render: (c) => {
			const up = ramp(c.f, 4, 20);
			return (
				<Stage camera={closeUp(MAIRE, MAIRE_ROT, 5.2, {scale: 1.18, side: 0.55})} ambiance="morning">
					{town({billboard: ['TIRAGE', 'DU JOUR']})}
					<Character look={L.maire} position={MAIRE} rotation={[0, MAIRE_ROT, 0]} emotion="surprised" pose={{armR: [-1.6 - up * 1.2, -0.2]}}>
						<NumberBall n={12} position={[0, -0.12, 0.1]} />
					</Character>
				</Stage>
			);
		},
	},
	{
		id: 'p09-douze',
		from: Wt('plan09', 'douze', -0.1),
		render: (c) => {
			const k = punch(c.f, 0, 6);
			return (
				<Stage camera={{pos: [0, 1.75, 2.6 - k * 0.7], target: [0, 1.35, 0], fov: 34 - k * 10}} ambiance="morning">
					<mesh position={[0, 0, 0]}>
						<sphereGeometry args={[30, 16, 12]} />
						<meshBasicMaterial color="#1b1b2f" side={1} />
					</mesh>
					<pointLight position={[1, 3, 3]} intensity={30} distance={10} />
					<NumberBall n={12} position={[0, 1.6, 0]} rotation={[0, Math.sin(c.f / 10) * 0.15, 0]} scale={2.2} />
				</Stage>
			);
		},
	},

	// P10 — déménagement en accéléré
	{
		id: 'p10-cartons',
		from: F('plan10', -0.1),
		render: (c) => (
			<Stage camera={{pos: [0.6, 3.4, 2.2], target: [5.5, 1.4, -3], fov: 50}} ambiance="golden">
				{town({billboard: ['TIRAGE', 'DU JOUR']})}
				{Array.from({length: 8}).map((_, i) => {
					const t = ((c.f * 1.6 + i * 9) % 40) / 40;
					const p: Vec3 = [H12.door[0] - t * 3.8, 0.8 + Math.sin(t * Math.PI) * 2.2, H12.door[2] + (i % 3 - 1) * 1.1 * t];
					return <CardboardBox key={i} position={p} rotation={[t * 6, t * 4, 0]} s={[0.7, 0.5, 0.5]} />;
				})}
				{Array.from({length: 9}).map((_, i) => (
					<CardboardBox key={'s' + i} position={[2.2 + (i % 3) * 0.75, Math.floor(i / 3) * 0.5, -2.6 + (i % 2) * 0.3]} s={[0.7, 0.5, 0.5]} label={i === 1 ? 'JOUETS' : i === 4 ? 'VAISSELLE' : undefined} />
				))}
				<Character look={L.noe} position={[4.4 - ((c.f * 0.15) % 2), 0, -1.6]} rotation={[0, -Math.PI / 2, 0]} walk={c.f * 1.2} walkAmp={1.3} emotion="determined" pose={{armL: [-1.3, -0.3], armR: [-1.3, -0.3]}}>
					<CardboardBox position={[0.65, -0.3, 0.3]} s={[0.8, 0.55, 0.55]} />
				</Character>
			</Stage>
		),
	},
	{
		id: 'p10-chat',
		from: Wt('plan10', 'vaisselle', -0.1),
		render: (c) => (
			<Stage camera={{pos: [1.6, 1.8, 0.8], target: [3.4, 0.6, -1.6], fov: 42}} ambiance="golden">
				{town({billboard: ['TIRAGE', 'DU JOUR']})}
				<mesh position={[3.4, 0.25, -1.6]}>
					<cylinderGeometry args={[0.55, 0.45, 0.5, 16, 1, true]} />
					<meshStandardMaterial color="#c89b63" side={2} />
				</mesh>
				<Cat position={[3.4, 0.1, -1.6]} rotation={[0, 0.5, 0]} fur={CAT.fur} stripes={CAT.stripes} tail={c.f / 4} pose="sit" scale={0.9} blink={blinkAt(c.f, 7)} />
			</Stage>
		),
	},
	{
		id: 'p10b-presque',
		from: F('plan10b', -0.1),
		render: (c) => {
			const look = c.g >= Wt('plan10b', 'Presque', -0.3);
			return (
				<Stage camera={{pos: [-1.2, 2.6, -1.0], target: [6.2, 2.6, -3.4], fov: 48}} ambiance="golden">
					{town({billboard: ['TIRAGE', 'DU JOUR']})}
					{Array.from({length: 6}).map((_, i) => (
						<CardboardBox key={i} position={[2.4 + (i % 3) * 0.75, Math.floor(i / 3) * 0.5, -1.4]} s={[0.7, 0.5, 0.5]} />
					))}
					<Character look={L.noe} position={[3.2, 0, -2.6]} rotation={[0, look ? Math.PI / 2 : -Math.PI / 2, 0]} emotion={look ? 'surprised' : 'happy'} blink={blinkAt(c.f)} />
					<Character look={L.lila} position={[2.6, 0, -3.4]} rotation={[0, -Math.PI / 2, 0]} emotion="happy" />
					<Cat position={[2.4, 0, -2.2]} rotation={[0, -1.2, 0]} fur={CAT.fur} stripes={CAT.stripes} tail={c.f / 6} />
				</Stage>
			);
		},
	},
	{
		id: 'p10b-noe',
		from: Wt('plan10b', 'Presque', -0.25),
		render: (c) => {
			const k = punch(c.f, 6, 6);
			return (
				<Stage camera={closeUp([3.2, 0, -2.6], Math.PI / 2, 3.4 - k * 0.8, {scale: 0.82, side: -0.6, fov: 38 - k * 6})} ambiance="golden">
					{town({billboard: ['TIRAGE', 'DU JOUR']})}
					<Character look={L.noe} position={[3.2, 0, -2.6]} rotation={[0, Math.PI / 2, 0]} emotion="surprised" blink={false} />
				</Stage>
			);
		},
	},

	// P11 — sauf mamie, dans son fauteuil, entourée d'horloges
	{
		id: 'p11-salon',
		from: F('plan11', -0.1),
		render: (c) => (
			<Stage camera={{pos: [0.6, 3.6, 6.4 - ramp(c.f, 0, c.d) * 0.8], target: [0, 2.4, -2.6], fov: 48}} ambiance="interior">
				<LivingRoom clockTime={(i) => 3 + i * 0.7 + c.g / 90} boxes>
					<Character look={L.odette} position={[0, 0.2, -2.1]} sit emotion="smug" blink={blinkAt(c.f, 4)} pose={{armL: [-0.9, 0.1], armR: [-0.9, -0.1]}} />
				</LivingRoom>
			</Stage>
		),
	},
	{
		id: 'p11-mamie',
		from: Wt('plan11', 'fauteuil', -0.4),
		render: (c) => (
			<Stage camera={closeUp([0, 0.2, -2.1], 0, 3.4, {headY: 2.2, scale: 0.92, side: 0.25})} ambiance="interior">
				<LivingRoom clockTime={(i) => 3 + i * 0.7 + c.g / 90}>
					<Character look={L.odette} position={[0, 0.2, -2.1]} sit emotion="smug" blink={blinkAt(c.f, 4)} pose={{armL: [-0.9, 0.1], armR: [-0.9, -0.1]}} />
				</LivingRoom>
			</Stage>
		),
	},

	// P12 — INDICE 2 : toutes les horloges sur minuit · INDICE 3 : la valise derrière le fauteuil
	{
		id: 'p12-horloges',
		from: F('plan12', -0.1),
		render: (c) => (
			<Stage camera={{pos: [-1.4, 3.0, -1.4], target: [-1.6, 2.9, -4.9], fov: 44}} ambiance="interior">
				<LivingRoom clockTime={() => 12} />
			</Stage>
		),
	},
	{
		id: 'p12-valise',
		from: Wt('plan12', 'arrêtées', -0.1),
		render: (c) => (
			<Stage camera={{pos: [3.4, 3.0, 4.2 - ramp(c.f, 0, c.d) * 0.6], target: [-0.6, 1.4, -2.6], fov: 46}} ambiance="interior">
				<LivingRoom clockTime={() => 12}>
					<Character look={L.odette} position={[0, 0.2, -2.1]} sit emotion="neutral" blink={blinkAt(c.f, 4)} pose={{armL: [-0.9, 0.1], armR: [-0.9, -0.1]}} />
				</LivingRoom>
			</Stage>
		),
	},

	// P13 — nuit : dehors, il manque mamie et Lila
	{
		id: 'p13-dehors',
		from: F('plan13', -0.1),
		render: (c) => (
			<Stage camera={{pos: [5.2, 4.2, 3.2], target: [1.8, 1.2, -4.6], fov: 56}} ambiance="nightblue" fogNear={30} fogFar={150}>
				{town({night: true, sign: false})}
				<Character look={L.noe} position={[3.6, 0, -3.4]} rotation={[0, Math.PI / 2 - 0.5, 0]} emotion="surprised" />
				{Array.from({length: 9}).map((_, i) => (
					<Character key={i} look={villager(i + 60)} position={[1.0 + (i % 3) * 1.1, 0, -6.4 + Math.floor(i / 3) * 1.4 + (i % 2) * 0.3]} rotation={[0, Math.PI / 2, 0]} emotion="sad" blink={blinkAt(c.f, i)} />
				))}
			</Stage>
		),
	},
	{
		id: 'p13-compte',
		from: Wt('plan13', 'manquait', -0.15),
		render: (c) => {
			const pts = Math.floor(c.f / 9) % 3;
			return (
				<Stage camera={closeUp([3.6, 0, -3.4], -Math.PI / 2 + 0.4, 3.6, {scale: 0.82, side: -0.2})} ambiance="nightblue" fogNear={30} fogFar={150}>
					{town({night: true})}
					<Character look={L.noe} position={[3.6, 0, -3.4]} rotation={[0, -Math.PI / 2 + 0.4, 0]} emotion={c.g > Wt('plan13', 'Lila') ? 'panic' : 'surprised'} blink={false}
						pose={{armR: [-1.6, -0.2 + pts * 0.25], headTurn: (pts - 1) * 0.3}} />
				</Stage>
			);
		},
	},
	{
		id: 'p13-lila',
		from: Wt('plan13', 'Lila', -0.2),
		render: (c) => {
			const k = punch(c.f, 4, 6);
			return (
				<Stage camera={closeUp([3.6, 0, -3.4], -Math.PI / 2 + 0.4, 2.8 - k * 0.7, {scale: 0.82, side: 0.25, fov: 36 - k * 8, shake: 0.02})} ambiance="nightblue" fogNear={30} fogFar={150}>
					{town({night: true})}
					<Character look={L.noe} position={[3.6, 0, -3.4]} rotation={[0, -Math.PI / 2 + 0.4, 0]} emotion="panic" blink={false} />
				</Stage>
			);
		},
	},
	{
		id: 'p13b-crie',
		from: F('plan13b', -0.1),
		render: (c) => (
			<Stage camera={{pos: [1.2, 2.2, -1.8], target: [6.5, 2.6, -3.2], fov: 46, shake: 0.01}} ambiance="nightblue" fogNear={30} fogFar={150}>
				{town({night: true, glow: 0.5 + 0.3 * Math.sin(c.f / 3)})}
				<Character look={L.noe} position={[3.4, 0, -3.0]} rotation={[0, Math.PI / 2, 0]} emotion="panic" squash={squashAt(c.f, 4, 0.12)} pose={{armL: [-2.0, -0.55], armR: [-2.0, -0.55]}} />
			</Stage>
		),
	},
	{
		id: 'p13b-maison',
		from: Wt('plan13b', 'Personne', -0.1),
		render: (c) => (
			<Stage camera={{pos: [0.5, 3.6, -1.0 - ramp(c.f, 0, c.d) * 0.6], target: [9.0, 3.2, -3], fov: 46}} ambiance="nightblue" fogNear={30} fogFar={150}>
				{town({night: true, glow: 0.6 + 0.3 * Math.sin(c.f / 2)})}
			</Stage>
		),
	},

	// P14 — il rentre (la seule chose interdite)
	{
		id: 'p14-hesite',
		from: F('plan14', -0.1),
		render: (c) => (
			<Stage camera={{pos: [3.6, 2.4, 0.4], target: [5.3, 1.9, -3.2], fov: 46, shake: 0.006}} ambiance="nightblue" fogNear={30} fogFar={150}>
				{town({night: true, glow: 0.35})}
				<Character look={L.noe} position={[5.1, 0, -3]} rotation={[0, Math.PI / 2 - 0.4 + Math.sin(c.f / 8) * 0.3, 0]} emotion="panic" blink={blinkAt(c.f)} />
			</Stage>
		),
	},
	{
		id: 'p14-fonce',
		from: Wt('plan14', 'Je', -0.1),
		render: (c) => {
			const k = ramp(c.f, 0, c.d * 0.8, (x) => x);
			return (
				<Stage camera={{pos: [2.4, 2.2, -3], target: [6.5, 1.6, -3], fov: 50, shake: 0.03}} ambiance="nightblue" fogNear={30} fogFar={150}>
					{town({night: true, glow: 0.35})}
					<Character look={L.noe} position={[4.6 + k * 2.4, 0, -3]} rotation={[0, Math.PI / 2, 0]} walk={c.f * 0.9} walkAmp={1.4} emotion="determined" />
				</Stage>
			);
		},
	},

	// P15 — mamie, valise à la main, Lila et Pistache dans les bras
	{
		id: 'p15-mamie',
		from: F('plan15', -0.1),
		render: (c) => (
			<Stage camera={{pos: [0.8, 3.0, 4.6 - ramp(c.f, 0, c.d) * 0.6], target: [0, 2.0, -1.4], fov: 48}} ambiance="interiorNight">
				<LivingRoom clockTime={() => 12} night suitcase={false}>
					<Character look={L.odetteCoat} position={[0, 0, -1.2]} emotion="happy" blink={blinkAt(c.f, 4)} pose={{armR: [-1.3, -0.3], armL: [0, 0.15]}}>
						<Cat position={[-0.15, -0.05, 0.25]} rotation={[1.3, Math.PI, 0]} scale={0.55} fur={CAT.fur} stripes={CAT.stripes} pose="curl" />
					</Character>
					<Suitcase position={[-1.0, 0, -1.0]} rotY={0.2} color="#8b3a3a" />
					<Character look={L.lila} position={[1.0, 0, -1.0]} rotation={[0, -0.2, 0]} emotion="happy" blink={blinkAt(c.f, 2)} pose={{armL: [0, 2.6]}} />
				</LivingRoom>
			</Stage>
		),
	},
	{
		id: 'p15-valise',
		from: Wt('plan15', 'valise', -0.25),
		render: (c) => (
			<Stage camera={{pos: [-2.4, 1.2, 0.8], target: [-1.0, 0.6, -1.0], fov: 40}} ambiance="interiorNight">
				<LivingRoom clockTime={() => 12} night suitcase={false}>
					<Suitcase position={[-1.0, 0, -1.0]} rotY={0.2} color="#8b3a3a" />
					<Character look={L.odetteCoat} position={[0, 0, -1.2]} emotion="happy" />
				</LivingRoom>
			</Stage>
		),
	},
	{
		id: 'p15-lila',
		from: Wt('plan15', 'Lila', -0.1),
		render: (c) => (
			<Stage camera={closeUp([1.0, 0, -1.0], -0.2, 2.8, {scale: 0.66, side: 0.2})} ambiance="interiorNight">
				<LivingRoom clockTime={() => 12} night suitcase={false}>
					<Character look={L.lila} position={[1.0, 0, -1.0]} rotation={[0, -0.2, 0]} emotion="happy" blink={blinkAt(c.f, 2)} pose={{armL: [0, 2.6 + Math.sin(c.f / 4) * 0.3]}} />
					<Character look={L.odetteCoat} position={[0, 0, -1.2]} emotion="happy" />
				</LivingRoom>
			</Stage>
		),
	},
	{
		id: 'p15-noe',
		from: tl.f('plan15', 0.05, 'end'),
		render: (c) => (
			<Stage camera={closeUp([0.4, 0, 2.6], Math.PI, 3.4, {scale: 0.82, side: 0.25})} ambiance="interiorNight">
				<LivingRoom clockTime={() => 12} night suitcase={false}>
					<Character look={L.noe} position={[0.4, 0, 2.6]} rotation={[0, Math.PI, 0]} emotion={c.f > 24 ? 'happy' : 'surprised'} blink={blinkAt(c.f)} />
				</LivingRoom>
			</Stage>
		),
	},

	// P16 — « Minuit. » : les horloges repartent, la maison tremble et s'élève
	{
		id: 'p16-horloges',
		from: F('plan16', -0.2),
		render: (c) => (
			<Stage camera={{pos: [-1.4, 3.0, -1.6], target: [-1.6, 2.9, -4.9], fov: 44, shake: 0.03 + c.f * 0.002}} ambiance="interiorNight">
				<LivingRoom clockTime={(i) => 12 + c.f * (0.05 + (i % 5) * 0.02)} night shake={c.f} />
			</Stage>
		),
	},
	{
		id: 'p16-envol',
		from: tl.f('plan16', 0.3, 'end'),
		render: (c) => {
			const rise = Math.max(0, ramp(c.f, 6, c.d, (x) => x * x) * 14);
			return (
				<Stage camera={{pos: [-3.5, 3.0, 4.5], target: [7.5, 4 + rise * 0.6, -3], fov: 52, shake: 0.08}} ambiance="nightblue" fogNear={30} fogFar={150}>
					{town({night: true, shake: c.f, rise, glow: 1})}
					<LightColumn position={[H12.pos[0], 0, H12.pos[2]]} intensity={0.6 + ramp(c.f, 0, c.d) * 0.6} radius={5} />
				</Stage>
			);
		},
	},

	// P17 — la porte s'ouvre sur la vallée
	{
		id: 'p17-porte',
		from: F('plan17', -0.15),
		render: (c) => {
			const open = ramp(c.f, 0, 18);
			return (
				<Stage camera={{pos: [0.3, 4.0, 10.5], target: [0, 2.2, -6], fov: 44}} ambiance="valley">
					{valleyScene(c.g)}
					<Doorway open={open} />
					<Character look={L.noe} position={[-0.5, 0, 2.5]} rotation={[0, Math.PI, 0]} emotion="surprised" />
					<Character look={L.lila} position={[0.8, 0, 2.6]} rotation={[0, Math.PI, 0]} emotion="happy" />
				</Stage>
			);
		},
	},
	{
		id: 'p17-vallee',
		from: Wt('plan17', 'partaient', -0.15),
		render: (c) => {
			const k = ramp(c.f, 0, c.d);
			return (
				<Stage camera={lerpShot({pos: [0, 4, 10], target: [2, 2, -10], fov: 52}, {pos: [-4, 14, 20], target: [2, 1, -12], fov: 54}, k)} ambiance="valley">
					{valleyScene(c.g)}
				</Stage>
			);
		},
	},
	{
		id: 'p17b-soleil',
		from: F('plan17b', -0.1),
		render: (c) => (
			<Stage camera={{pos: [-2 + ramp(c.f, 0, c.d) * 3, 2.2, 6], target: [3, 3.2, -10], fov: 50}} ambiance="valley">
				{valleyScene(c.g)}
			</Stage>
		),
	},
	{
		id: 'p17b-ciel',
		from: Wt('plan17b', 'Juste', -0.1),
		render: (c) => (
			<Stage camera={{pos: [6, 1.2 + ramp(c.f, 0, c.d) * 1.5, 4], target: [-4, 6, -20], fov: 54}} ambiance="valley">
				{valleyScene(c.g)}
			</Stage>
		),
	},

	// P18 — papi Marcel et les quatre chaises (récolte de l'indice 1)
	{
		id: 'p18-papi',
		from: F('plan18', -0.1),
		render: (c) => (
			<Stage camera={{pos: [0.6, 2.8, 2.2 - ramp(c.f, 0, c.d) * 0.6], target: [4.4, 1.8, -4.6], fov: 46}} ambiance="valley">
				{valleyScene(c.g)}
			</Stage>
		),
	},
	{
		id: 'p18-chaises',
		from: Wt('plan18', 'chaises', -0.25),
		render: (c) => (
			<Stage camera={{pos: [1.6, 3.6, 0.4], target: [3.6, 0.8, -3.2], fov: 44}} ambiance="valley">
				{valleyScene(c.g)}
			</Stage>
		),
	},

	// P19 — carte-question
	{
		id: 'p19-cta',
		from: F('plan19', -0.2),
		render: (c) => {
			const a = 0.3 + (c.f / c.d) * 0.5;
			return (
				<Stage camera={{pos: [Math.sin(a) * 14, 9, Math.cos(a) * 14 - 4], target: [2, 1, -4], fov: 52}} ambiance="valley">
					{valleyScene(
						c.g,
						<>
							<Character look={L.noe} position={[2.6, 0, -2.2]} rotation={[0, -2.6, 0]} emotion="happy" />
							<Character look={L.odette} position={[4.6, 0, -2.4]} rotation={[0, 2.8, 0]} emotion="happy" />
							<Character look={L.lila} position={[3.4, 0, -1.8]} rotation={[0, 3.0, 0]} emotion="happy" pose={{armR: [0, 2.6]}} />
						</>,
					)}
				</Stage>
			);
		},
	},
];

/** Petite rue commerçante (magasin de cartons + familles qui courent). */
const StreetSet: React.FC<{f: number; runners?: number}> = ({f, runners = 0}) => (
	<group>
		<mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
			<planeGeometry args={[200, 200]} />
			<meshStandardMaterial color="#b7a58c" />
		</mesh>
		<CartonShop position={[0, 0, 0]} />
		<Chalet position={[-9, 0, 0]} number={14} w={6} />
		<Chalet position={[9, 0, 0]} number={16} w={6} wall="#e8b07a" />
		{Array.from({length: 5}).map((_, i) => {
			const x = ((runners * 3.2 + i * 3.1) % 18) - 9;
			return (
				<Character key={i} look={villager(i + 70)} position={[x, 0, 4.2 + (i % 2) * 1.2]} rotation={[0, Math.PI / 2, 0]} walk={f * 0.8 + i} walkAmp={1.3} emotion="panic"
					pose={{armL: [-1.3, -0.3], armR: [-1.3, -0.3]}}>
					<CardboardBox position={[0.65, -0.3, 0.3]} s={[0.8, 0.55, 0.55]} />
				</Character>
			);
		})}
	</group>
);

export const shotsInOrder = () => [...SHOTS].sort((a, b) => a.from - b.from).map((s) => ({...s, from: Math.max(0, Math.round(s.from))}));
export type {CameraShot};
