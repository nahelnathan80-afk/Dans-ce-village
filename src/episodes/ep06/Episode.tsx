import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig} from 'remotion';
import {FontGate} from '../../lib/FontGate';
import {NameTag} from '../../overlay/Labels';
import {RewindFx} from '../../overlay/Fx';
import {RoundWindow} from '../../overlay/RoundWindow';
import {At} from '../common';
import {ShotTrack} from '../../engine/ShotTrack';
import {WordSubs} from '../../engine/WordSubs';
import {MusicBed} from '../../engine/MusicBed';
import {QuestionCard} from '../../engine/QuestionCard';
import {counterSfx, StatPill} from '../../engine/StatPill';
import {setCine} from '../../three/look';
import {COUNTER, FPS, STROKES, tl, ws} from './data';
import {shotsInOrder} from './shots';

const W = (id: string, txt: string, off = 0, n = 1) => Math.round((ws(id, txt, n) + off) * FPS);
const S = (id: string, off = 0) => Math.round((tl.line(id).start + off) * FPS);
const E = (id: string, off = 0) => Math.round((tl.line(id).end + off) * FPS);

type Sfx = {at: number; name: string; vol?: number};
const sfxList = (): Sfx[] => {
	const L: Sfx[] = [];
	const add = (at: number, name: string, vol = 0.6) => L.push({at: Math.round(at), name, vol});
	add(W('plan02', "qu'une"), 'impact', 0.6);
	add(S('plan03', -0.05), 'rewind', 0.7);
	add(E('plan06c', 0.0), 'scratch', 0.9); // SCRATCH de vinyle (0,3 s)
	add(E('plan06c', 0.12), 'thud', 0.7); // l'affiche claque
	add(W('plan10', 'espionné'), 'croak', 0.7);
	add(S('plan11a', 0.6), 'croak', 0.35);
	add(W('plan12', 'moquée'), 'gasp', 0.4);
	add(S('plan13a', -0.1), 'thud', 0.45); // la porte
	for (let f = S('plan13a'); f < E('plan13d'); f += 14) add(f, 'heartbeat', 0.75);
	add(W('plan17a', 'hannetons'), 'gasp', 0.45);
	add(W('plan17a', 'omelette', 0.2), 'pop', 0.4); // carte-question
	add(E('plan17b', 0.05), 'whoosh', 0.4); // boucle
	return [...L, ...counterSfx(COUNTER, FPS, {up: 'poufbig', down: 'pfffuit'})];
};

/** première réplique de chaque personnage : petite bulle avec son nom (0,6 s) */
const FIRST: [string, string, string, number, number][] = [
	['plan06b', 'M. LE MAIRE', '#1f4fd8', 520, 560],
	['plan08a', 'MAMIE ROSE', '#22863a', 520, 560],
	['plan08b', 'LOU', '#e0308a', 520, 600],
	['plan08e', 'LÉON', '#d9a400', 520, 600],
];

export const Episode06: React.FC = () => {
	setCine(true);
	const {durationInFrames} = useVideoConfig();
	const shots = shotsInOrder();
	const songs = tl.lines.filter((l) => (l as {type?: string}).type === 'chanson').map((l) => [Math.round(l.start * FPS), Math.round(l.end * FPS)] as [number, number]);
	const scratch: [number, number] = [E('plan06c'), S('plan07')];
	const pause: [number, number] = [S('plan14'), S('plan15')];
	const card = W('plan17a', 'omelette', -0.1);
	const rainWin: [number, number][] = [[S('plan02'), E('plan02')], [S('plan08c'), E('plan08e')], [W('plan13d', 'tous'), E('plan13d')]];
	return (
		<AbsoluteFill style={{background: '#000'}}>
			<FontGate>
				<ShotTrack shots={shots} />
				<At from={S('plan11a')} to={S('plan11b')}>
					<RoundWindow />
				</At>
				{/* pastilles de nom (1re apparition) */}
				<At from={S('plan05', 0.05)} to={W('plan05', 'tout', -0.12)}>
					<NameTag name="LÉON" x={520} y={560} color="#d9a400" />
				</At>
				<At from={W('plan05', 'tout', -0.08)} to={W('plan05', 'sauf', -0.12)}>
					<NameTag name="LOU" x={520} y={620} color="#e0308a" />
				</At>
				<At from={W('plan05', 'sauf', 0.2)} to={E('plan05')}>
					<NameTag name="M. GRISOU" x={520} y={520} color="#6a2fb0" />
				</At>
				{FIRST.map(([id, name, col, x, y]) => (
					<At key={id} from={S(id)} to={S(id, 0.6)}>
						<NameTag name={name} x={x} y={y} color={col} />
					</At>
				))}
				<At from={S('plan03', -0.05)} to={S('plan03', 0.6)}>
					<RewindFx dur={19} />
				</At>
				<At from={card} to={durationInFrames}>
					<QuestionCard lines={['TOI, TU GOÛTERAIS', "L'OMELETTE AUX", 'HANNETONS ?']} red={2} hint="DIS-LE EN COMMENTAIRE" />
				</At>
				<StatPill label="CITROUILLES VIVANTES :" events={COUNTER} redBelow={10} visible={(t) => t * FPS < card}
					upColors={['#ffb12a', '#f27a0c', '#8a3a00']} downBadge="#8a8f98"
					beat={(t) => (songs.some(([a, b]) => t * FPS >= a && t * FPS < b) ? 1 + 0.07 * Math.max(0, Math.sin(t * Math.PI * 2 * 1.53)) : 1)} />
				<WordSubs tl={tl} strokes={STROKES} />
			</FontGate>

			<Audio src={staticFile('ep06/voice.wav')} volume={1} />
			<MusicBed
				tl={tl}
				frames={durationInFrames}
				silences={[...songs, pause, scratch]}
				parts={[
					{src: 'ep06/fond.mp3', from: 0, to: scratch[0], vol: 0.22},
					{src: 'ep06/fond_triste.mp3', from: scratch[1], to: pause[0], vol: 0.2, startAt: 30 * 6},
					{src: 'ep06/fond.mp3', from: pause[1], to: durationInFrames, vol: 0.24, startAt: 30 * 20},
				]}
			/>
			{rainWin.map(([a, b], i) => (
				<Sequence key={'r' + i} from={a} durationInFrames={Math.max(1, b - a)} layout="none">
					<Audio src={staticFile('sfx/pluie.wav')} volume={0.35} loop />
				</Sequence>
			))}
			{sfxList().map((s, i) => (
				<Sequence key={i} from={Math.max(0, s.at)} layout="none">
					<Audio src={staticFile(`sfx/${s.name}.wav`)} volume={s.vol ?? 0.6} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
