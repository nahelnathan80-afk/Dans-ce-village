/**
 * Visuels fixes pour un carrousel TikTok (1080×1920), un par composition « Photo1 » … « Photo6 ».
 * Même style que la série : 3D low-poly + police Lilita One + pastilles.
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {FontGate} from '../lib/FontGate';
import {FONT} from '../lib/fonts';
import {Stage, Vec3} from '../three/Stage';
import {Character, CharacterLook} from '../three/Character';
import {Chalet, Village} from '../three/Village';
import {Card, Coffret} from '../three/Shop';
import {Billboard, LightColumn} from '../three/Town';
import {Apple, AppleTree, Flag, Wall, WALL} from '../three/World';
import {Crowd} from '../three/Crowd';
import {closeUp} from '../three/camera';
import {CAST, villager} from '../episodes/cast';
import ep03 from '../episodes/ep03/script.json';
import ep04 from '../episodes/ep04/script.json';

const C3 = ep03.cast as unknown as Record<string, CharacterLook>;
const C4 = ep04.cast as unknown as Record<string, CharacterLook>;

const SAFE_W = 1080 - 150;
const txt = (size: number, color = '#fff', stroke = 14): React.CSSProperties => ({
	fontFamily: FONT,
	fontSize: size,
	color,
	WebkitTextStroke: `${stroke}px #000`,
	paintOrder: 'stroke fill',
	textShadow: '0 8px 0 rgba(0,0,0,0.8)',
	lineHeight: 1.05,
	textAlign: 'center',
});

/** Pastille du haut (même design que les épisodes). */
const Pill: React.FC<{label: string; value: string; red?: boolean}> = ({label, value, red}) => {
	const c = red ? ['#ff3b3b', '#c40d1d', '#6e0610'] : ['#ffb703', '#fb8500', '#9a4a00'];
	return (
		<div style={{position: 'absolute', top: 175, left: 0, width: SAFE_W, display: 'flex', justifyContent: 'center', paddingLeft: 75}}>
			<div style={{background: `linear-gradient(180deg, ${c[0]} 0%, ${c[1]} 100%)`, borderRadius: 999, padding: '16px 40px 18px', border: '7px solid #fff',
				boxShadow: `0 10px 0 ${c[2]}, 0 14px 30px rgba(0,0,0,0.35)`, fontFamily: FONT, color: '#fff', display: 'flex', gap: 16, alignItems: 'center',
				textShadow: '0 4px 0 rgba(0,0,0,0.35)', whiteSpace: 'nowrap'}}>
				<span style={{fontSize: 46}}>{label}</span>
				<span style={{fontSize: 72}}>{value}</span>
			</div>
		</div>
	);
};

/** Étiquette « ÉPISODE N » + titre. */
const Title: React.FC<{tag: string; lines: string[]; top?: number; accent?: number; bg?: string}> = ({tag, lines, top = 1080, accent = -1, bg = '#ffe14d'}) => (
	<div style={{position: 'absolute', top, left: 40, width: SAFE_W - 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18}}>
		<div style={{background: bg, border: '7px solid #1b1b1b', borderRadius: 22, padding: '8px 28px 4px', boxShadow: '0 10px 0 #1b1b1b', transform: 'rotate(-2deg)',
			...txt(54, '#1b1b1b', 0), textShadow: 'none'}}>
			{tag}
		</div>
		{lines.map((l, i) => (
			<div key={i} style={{...txt(i === accent ? 112 : 96, i === accent ? '#ffe14d' : '#ffffff', 15)}}>{l}</div>
		))}
	</div>
);

const Footer: React.FC<{text: string}> = ({text}) => (
	<div style={{position: 'absolute', top: 1520, left: 40, width: SAFE_W - 10, ...txt(46, '#ffffff', 10), opacity: 0.95}}>{text}</div>
);

// ——— 1. Couverture ———
const P1: React.FC = () => (
	<>
		<Stage camera={{pos: [10, 9, 20], target: [0, 3, -3], fov: 50}} ambiance="sunset">
			<Village />
			<Crowd frame={20} count={18} mode="happy" lookAt={[0, 10, 0]} seed={9} />
		</Stage>
		<AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)'}} />
		<div style={{position: 'absolute', top: 300, left: 40, width: SAFE_W - 10, ...txt(104, '#ffe14d', 16), whiteSpace: 'nowrap'}}>DANS CE VILLAGE…</div>
		<div style={{position: 'absolute', top: 440, left: 40, width: SAFE_W - 10, ...txt(64, '#ffffff', 12)}}>chaque histoire commence par une règle absurde</div>
		<Title tag="LA SÉRIE" lines={['4 RÈGLES.', '4 HISTOIRES.', '1 VILLAGE.']} top={1050} accent={2} />
		<Footer text="Glisse pour découvrir les épisodes →" />
	</>
);

// ——— 2. Épisode 1 ———
const P2: React.FC = () => {
	const leon: Vec3 = [0, 10.55, -12.6];
	return (
		<>
			<Stage camera={closeUp(leon, 0, 4.4, {side: 0.08, fov: 34})}>
				<Village />
				<Character look={CAST.leon} position={leon} emotion="panic" mouthOpen={1} pose={{armL: [-0.5, 0.7], armR: [-0.5, 0.7]}} />
			</Stage>
			<Pill label="SOLDE :" value="13 €" red />
			<div style={{position: 'absolute', top: 360, left: 560, ...txt(110, '#ff2b2b', 14), transform: 'rotate(-8deg)'}}>−1 €</div>
			<Title tag="ÉPISODE 1" lines={['ICI, CHAQUE MOT', 'COÛTE 1 €']} accent={1} />
			<Footer text="Léon n'a plus que 15 € pour sauver le village." />
		</>
	);
};

// ——— 3. Épisode 2 ———
const P3: React.FC = () => (
	<>
		<Stage camera={{pos: [0, 2.9, 5.4], target: [0, 2.25, 0], fov: 42}} ambiance="night" fogNear={30} fogFar={80}>
			<mesh position={[0, 0.5, 0]}>
				<cylinderGeometry args={[1.2, 1.4, 1, 32]} />
				<meshStandardMaterial color="#2a1458" emissive="#5b2bb5" emissiveIntensity={0.4} />
			</mesh>
			<Coffret position={[-0.45, 2.25, 0]} rotation={[0, 0.35, 0]} scale={1.1} glow={1} />
			<Card position={[0.75, 2.45, 0.6]} rotation={[0, -0.35, 0.08]} scale={1.15} />
			<pointLight position={[0, 4.5, 3]} intensity={25} distance={12} color="#fff1c1" />
			<pointLight position={[-2.5, 2.5, -1]} intensity={12} distance={8} color="#b58cff" />
		</Stage>
		<Pill label="FILE :" value="459" />
		<Title tag="ÉPISODE 2" lines={['1 COFFRET.', '459 PERSONNES.']} accent={1} />
		<Footer text="Gisèle, 78 ans, campe devant le magasin depuis mardi." />
	</>
);

// ——— 4. Épisode 3 ———
const P4: React.FC = () => (
	<>
		<Stage camera={closeUp([3.6, 0, -3], -Math.PI / 2, 5.2, {scale: 0.82, side: 0.35, fov: 46})} ambiance="nightblue" fogNear={30} fogFar={150}>
			<Village
				night
				replaceMairie={
					<group>
						<Chalet position={[9.5, 0, -3]} rotY={-Math.PI / 2} w={7} d={6} h={5.6} number={12} wall="#e8b07a" night />
						<mesh position={[6.44, 1.1, -3]} rotation={[0, -Math.PI / 2, 0]}>
							<planeGeometry args={[1.2, 2.1]} />
							<meshBasicMaterial color="#ffffff" toneMapped={false} />
						</mesh>
					</group>
				}
			>
				<Billboard lines={['CE SOIR :', 'MAISON', 'N°12']} position={[-4.5, 0, -8.5]} rotY={0.35} lit={1} w={4.4} h={4.6} />
			</Village>
			<LightColumn position={[9.5, 0, -3]} intensity={0.35} radius={4.5} />
			<Character look={C3.noe} position={[3.6, 0, -3]} rotation={[0, -Math.PI / 2 + 0.2, 0]} emotion="panic" pose={{armL: [-0.4, 0.6], armR: [-0.4, 0.6]}} />
		</Stage>
		<Pill label="MINUIT DANS" value="00:00:10" red />
		<Title tag="ÉPISODE 3" lines={['CHAQUE NUIT,', 'UNE MAISON', 'DISPARAÎT']} accent={2} />
		<Footer text="Et cette nuit-là… c'était la sienne." />
	</>
);

// ——— 5. Épisode 4 ———
const P5: React.FC = () => (
	<>
		<Stage camera={closeUp([-1.0, 0, -0.2], Math.PI, 5.0, {side: 0.1, fov: 44})} ambiance="nightblue" fogNear={30} fogFar={150}>
			<mesh rotation={[-Math.PI / 2, 0, 0]}>
				<planeGeometry args={[200, 200]} />
				<meshStandardMaterial color="#5f6488" />
			</mesh>
			<group position={[-WALL.x + 1.2, 0, -WALL.gateZ + 4.5]}>
				<Wall height={1} close={0.4} night />
			</group>
			<Character look={C4.leo} position={[-1.0, 0, -0.2]} rotation={[0, Math.PI - 0.2, 0]} emotion="sad" eyes={[0.3, 0]} pose={{armR: [-1.75, -0.3], headTilt: 0.08}}>
				<Apple position={[0, -0.12, 0.16]} scale={1.0} glow={0.35} />
			</Character>
			<Character look={C4.yuki} position={[0.6, 0, 0.5]} rotation={[0, -2.0, 0]} emotion="surprised" eyes={[-0.5, 0]} />
			<pointLight position={[-0.6, 2.6, -2.2]} intensity={12} distance={6} color="#ffd9a0" />
		</Stage>
		<Pill label="MUR FERMÉ DANS" value="00:00:01" red />
		<Title tag="ÉPISODE 4" lines={['UNE GUERRE…', 'POUR UNE POMME']} accent={1} />
		<Footer text="Léo n'avait jamais osé lui parler." />
	</>
);

// ——— 6. Question au public ———
const P6: React.FC = () => (
	<>
		<Stage camera={{pos: [12, 14, 16], target: [0, 1, -2], fov: 50}} ambiance="nightblue" fogNear={30} fogFar={150}>
			<Village night replaceFountain={<AppleTree position={[0, 0, -1]} apple />} />
			{Array.from({length: 6}).map((_, i) => (
				<Character key={i} look={villager(i + 80)} position={[-3 + i * 1.3, 0, 5 + (i % 2)]} rotation={[0, Math.PI - 0.3, 0]} emotion="surprised" pose={{headNod: -0.4}} />
			))}
		</Stage>
		<div style={{position: 'absolute', top: 420, left: 40, width: SAFE_W - 10, display: 'flex', justifyContent: 'center'}}>
			<div style={{transform: 'rotate(-2deg)', background: '#fff', border: '9px solid #1b1b1b', borderRadius: 40, padding: '34px 40px', boxShadow: '0 16px 0 #1b1b1b'}}>
				<div style={{...txt(70, '#1b1b1b', 0), textShadow: 'none'}}>ÉPISODE 5 :</div>
				<div style={{...txt(92, '#ff2b2b', 0), textShadow: 'none'}}>TOI, TU INVENTES</div>
				<div style={{...txt(70, '#1b1b1b', 0), textShadow: 'none'}}>QUELLE RÈGLE ABSURDE ?</div>
			</div>
		</div>
		<div style={{position: 'absolute', top: 1060, left: 40, width: SAFE_W - 10, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
			<div style={{...txt(72, '#ffe14d', 14)}}>DIS-LE EN COMMENTAIRE</div>
			<div style={{...txt(52, '#ffffff', 10), marginTop: 14}}>La meilleure devient un épisode</div>
			<svg width={160} height={200} viewBox="0 0 160 200" style={{marginTop: 24}}>
				<path d="M55 10 H105 V110 H145 L80 190 L15 110 H55 Z" fill="#ffe14d" stroke="#1b1b1b" strokeWidth={12} strokeLinejoin="round" />
			</svg>
		</div>
	</>
);

const ALL = [P1, P2, P3, P4, P5, P6];

export const Poster: React.FC<{n: number}> = ({n}) => {
	const P = ALL[n - 1];
	return (
		<AbsoluteFill style={{background: '#000'}}>
			<FontGate>
				<P />
			</FontGate>
		</AbsoluteFill>
	);
};
