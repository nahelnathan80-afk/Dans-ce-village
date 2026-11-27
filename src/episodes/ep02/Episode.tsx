import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useVideoConfig} from 'remotion';
import {FontGate} from '../../lib/FontGate';
import {BalanceCounter} from '../../overlay/BalanceCounter';
import {Subtitles} from '../../overlay/Subtitles';
import {TextPop, TextPops} from '../../overlay/TextPops';
import {Banner, BreakingNews, CallToAction, Stamp} from '../../overlay/Fx';
import {At, ShotRunner, piecewise} from '../common';
import {ep02, FPS} from './data';
import {shotsInOrder} from './shots';

const tl = ep02.tl;
const F = (id: string, off = 0, edge: 'start' | 'end' = 'start') => tl.f(id, off, edge);
/** frame du premier mot de la réplique qui contient `txt` */
const Wt = (id: string, txt: string, edge: 'start' | 'end' = 'start') => {
	const words = tl.line(id).words;
	const i = Math.max(0, words.findIndex((w) => w.text.toLowerCase().includes(txt.toLowerCase())));
	return tl.fw(id, i, edge);
};
const S = (id: string, off = 0) => tl.line(id).start + off;
const E = (id: string, off = 0) => tl.line(id).end + off;

// ——— Compteur « FILE » ———
const fileCount = piecewise([
	[0, 459],
	[S('coffret-1'), 459],
	[S('coffret-1', 0.5), 0],
	[S('gisele-1') - 0.01, 0],
	[S('gisele-1'), 1],
	[S('maire-1') - 0.01, 1],
	[S('maire-1'), 2],
	[S('kevin-1') - 0.01, 2],
	[S('kevin-1'), 3],
	[S('jr-3'), 3],
	[E('jr-3'), 51],
	[S('jr-4'), 51],
	[E('ouv-1'), 459],
	[S('ruee-1'), 459],
	[S('climax-1'), 0],
	[S('chute-2') - 0.01, 0],
	[S('chute-2'), 1],
]);

const pops = (): TextPop[] => [
	{at: F('gisele-1'), text: '+1', x: 720, y: 400},
	{at: F('maire-1'), text: '+1', x: 720, y: 400},
	{at: F('kevin-1'), text: '+1', x: 720, y: 400},
	{at: Wt('kevin-1', '50'), text: '+50 €', x: 500, y: 640, color: '#5cff7a'},
	{at: Wt('kevin-2', '80'), text: '−80 €', x: 500, y: 640, color: '#ff3b3b'},
	{at: Wt('jr-3', '47'), text: '+47', x: 720, y: 400, size: 140},
	{at: Wt('climax-4', '2'), text: '2 000 €', x: 480, y: 600, color: '#ffd84d', size: 140},
];

type Sfx = {at: number; name: string; vol?: number};
const sfxList = (): Sfx[] => {
	const L: Sfx[] = [];
	const add = (at: number, name: string, vol = 0.7) => L.push({at: Math.round(at), name, vol});
	add(0, 'whoosh', 0.4);
	add(F('hook-1', 0.3), 'pop', 0.6);
	add(F('hook-2', 0.2), 'pop', 0.6);
	add(F('coffret-1', -0.1), 'whoosh', 0.6);
	add(F('coffret-3', 0.1), 'ding', 0.8);
	add(Wt('coffret-4', 'seul'), 'thud', 0.8);
	for (const id of ['gisele-1', 'maire-1', 'kevin-1']) add(F(id), 'ding', 0.5);
	add(F('gisele-2', 0.2), 'pop', 0.5);
	add(F('maire-3', 0.2), 'pop', 0.5);
	add(Wt('kevin-1', '50'), 'cash', 0.6);
	add(Wt('kevin-2', '80'), 'cash', 0.6);
	add(F('jr-1', -0.1), 'whoosh', 0.5);
	for (let i = 0; i < 10; i++) add(F('jr-3') + i * 4, 'pop', 0.3);
	add(F('ouv-1', 0.1), 'bell', 0.7);
	add(F('ouv-1', 0.9), 'thud', 0.7);
	add(F('ouv-2', -0.1), 'click', 0.8);
	add(F('ouv-3', 0.2), 'gasp', 0.6);
	add(F('ruee-1', -0.1), 'whoosh', 0.7);
	add(F('ruee-1'), 'rumble', 0.7);
	add(F('ruee-2', -0.1), 'whoosh', 0.6);
	add(F('climax-1', -0.1), 'whoosh', 0.4);
	add(F('climax-3', 0.4), 'ding', 0.6);
	add(Wt('climax-4', '2'), 'cash', 0.7);
	add(F('climax-5', 0.1), 'thud', 0.8);
	add(F('chute-1', -0.1), 'alarm', 0.3);
	add(F('chute-1', 0.1), 'whoosh', 0.5);
	add(Wt('chute-3', '47'), 'thud', 0.8);
	add(F('cta-1', -0.2), 'whoosh', 0.5);
	add(F('cta-1', 0), 'pop', 0.6);
	return L;
};

const Music: React.FC = () => {
	const {durationInFrames} = useVideoConfig();
	return (
		<Audio
			src={staticFile('music/village-loop.wav')}
			volume={(f) => {
				let v = 0.14;
				if (f >= F('ouv-3') && f < F('ruee-1')) v = 0.05; // suspense
				if (f >= F('cta-1', -0.2)) v = 0.24;
				return v * interpolate(f, [0, 8, durationInFrames - 30, durationInFrames], [0, 1, 1, 0], {extrapolateRight: 'clamp'});
			}}
		/>
	);
};

export const Episode02: React.FC = () => {
	const {durationInFrames} = useVideoConfig();
	const shots = shotsInOrder();
	const ctaFrom = F('cta-1', -0.2);
	return (
		<AbsoluteFill style={{background: '#000'}}>
			<FontGate>
				{shots.map((s, i) => {
					const to = i + 1 < shots.length ? shots[i + 1].from : durationInFrames;
					return (
						<Sequence key={s.id} from={s.from} durationInFrames={to - s.from} name={s.id}>
							<ShotRunner from={s.from} d={to - s.from} render={s.render} />
						</Sequence>
					);
				})}

				<At from={F('hook-1', 0.2)} to={F('hook-2', -0.1)}>
					<Banner lines={['412 HABITANTS']} top={360} size={86} />
				</At>
				<At from={F('hook-2', 0.1)} to={F('coffret-1', -0.1)}>
					<Banner lines={['459 DANS LA FILE']} top={360} size={86} bg="#ff4d4d" color="#ffffff" />
				</At>
				<At from={Wt('coffret-4', 'seul')} to={F('gisele-1', -0.1)}>
					<Stamp text="STOCK : 1" top={420} />
				</At>
				<At from={F('gisele-2')} to={F('maire-1', -0.1)}>
					<Banner lines={['CAMPE DEPUIS : MARDI']} top={380} size={66} bg="#ffffff" />
				</At>
				<At from={F('maire-3')} to={F('kevin-1', -0.1)}>
					<Banner lines={['INSPECTION : NUIT 3']} top={380} size={66} bg="#a9d6ff" />
				</At>
				<At from={F('ouv-1', 0.8)} to={F('ouv-2', -0.15)}>
					<Stamp text="JEUDI 9:00" top={420} color="#1d3557" />
				</At>
				<At from={F('climax-5', 0.05)} to={F('chute-1', -0.1)}>
					<Stamp text="NON !" top={420} size={150} />
				</At>
				<At from={F('chute-1', 0.1)} to={F('chute-2', -0.1)}>
					<BreakingNews title="RÉÉDITION ILLIMITÉE DU COFFRET 30 ANS" ticker="Les revendeurs en larmes • Stock infini annoncé • Gisèle refuse 2 000 € • " />
				</At>
				<At from={Wt('chute-3', '47')} to={F('cta-1', -0.2)}>
					<Stamp text="REMBOURSEMENT : 47" top={430} size={92} />
				</At>
				<At from={ctaFrom} to={durationInFrames}>
					<CallToAction question={['TU DORMIRAIS', 'COMBIEN', 'DE NUITS DEVANT UN MAGASIN ?']} hint="DIS-LE EN COMMENTAIRE" />
				</At>

				<BalanceCounter tl={tl} label="FILE" unit="" valueAt={fileCount} color={['#ffb703', '#fb8500', '#9a4a00']} />
				<TextPops pops={pops()} />
				<Subtitles tl={tl} hidden={(t) => t * FPS >= ctaFrom} />
			</FontGate>

			<Audio src={staticFile('ep02/voice.wav')} volume={1} />
			<Music />
			{sfxList().map((s, i) => (
				<Sequence key={i} from={Math.max(0, s.at)} layout="none">
					<Audio src={staticFile(`sfx/${s.name}.wav`)} volume={s.vol ?? 0.7} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
