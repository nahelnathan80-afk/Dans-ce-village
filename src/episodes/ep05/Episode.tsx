import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig} from 'remotion';
import {FontGate} from '../../lib/FontGate';
import {NameTag, SpeechBubble} from '../../overlay/Labels';
import {RewindFx} from '../../overlay/Fx';
import {At} from '../common';
import {ShotTrack} from '../../engine/ShotTrack';
import {WordSubs} from '../../engine/WordSubs';
import {MusicBed} from '../../engine/MusicBed';
import {QuestionCard} from '../../engine/QuestionCard';
import {counterSfx, StatPill} from '../../engine/StatPill';
import {COUNTER, FPS, tl, ws} from './data';
import {shotsInOrder} from './shots';

const W = (id: string, txt: string, off = 0, n = 1) => Math.round((ws(id, txt, n) + off) * FPS);
const S = (id: string, off = 0) => Math.round((tl.line(id).start + off) * FPS);
const E = (id: string, off = 0) => Math.round((tl.line(id).end + off) * FPS);

type Sfx = {at: number; name: string; vol?: number};
const sfxList = (): Sfx[] => {
	const L: Sfx[] = [];
	const add = (at: number, name: string, vol = 0.6) => L.push({at: Math.round(at), name, vol});
	add(0, 'impact', 0.4);
	add(W('plan01', 'mensonge'), 'pop', 0.4); // bulle du passant
	add(W('plan01', 'rapetisser'), 'whoosh', 0.5);
	add(W('plan02', 'vingt'), 'impact', 0.7);
	add(W('plan02', 'vingt', 0.3), 'heartbeat', 0.6);
	add(S('plan03', -0.05), 'rewind', 0.7);
	add(W('plan04', 'maire'), 'pop', 0.5);
	add(W('plan05', 'regrandir'), 'ding', 0.6);
	add(W('plan05', 'double'), 'impact', 0.45);
	add(W('plan06', 'noah', -0.1), 'pop', 0.35);
	add(W('plan06', 'mesurait', -0.05), 'pop', 0.35);
	add(S('plan07', 0.3), 'pop', 0.45); // bulle « grosse journée »
	add(S('plan09', -0.05), 'whoosh', 0.35);
	add(W('plan10', 'toute', -0.05), 'whoosh', 0.45);
	add(W('plan11', 'lettre'), 'gasp', 0.45);
	add(W('plan11', 'travail'), 'piano-cue', 0.5);
	add(S('plan12', 0.3), 'pop', 0.45); // bulle « journée géniale »
	let f = W('plan12', 'rapetissait');
	while (f < E('plan12', -0.1)) {
		add(f, 'heartbeat', 0.8);
		f += 15;
	}
	add(W('plan14', 'posé'), 'thud', 0.6);
	add(S('plan15', 0.3), 'pop', 0.4); // bulle « j'ai perdu mon travail »
	add(W('plan16', 'pouf'), 'boom', 0.8);
	add(W('plan17', 'vérité', 0.15), 'pop', 0.5); // « Bof. »
	add(W('plan17', 'lasagnes'), 'gasp', 0.5);
	add(W('plan17', 'même'), 'pop', 0.45); // carte-question
	add(E('plan17', 0.05), 'whoosh', 0.4); // boucle
	return [...L, ...counterSfx(COUNTER, FPS)];
};

export const Episode05: React.FC = () => {
	const {durationInFrames} = useVideoConfig();
	const shots = shotsInOrder();
	const pause: [number, number] = [E('plan12', 0.03), S('plan14')];
	const card = W('plan17', 'même', -0.1);
	return (
		<AbsoluteFill style={{background: '#000'}}>
			<FontGate>
				<ShotTrack shots={shots} />
				{/* bulles */}
				<At from={W('plan01', 'chaque', -0.1)} to={W('plan01', 'rapetisser', -0.15)}>
					<SpeechBubble text="J'AI PAS MANGÉ LE GÂTEAU !" x={520} y={600} size={56} tail="right" />
				</At>
				<At from={S('plan07', 0.25)} to={W('plan07', 'moins', -0.12)}>
					<SpeechBubble text="GROSSE JOURNÉE AU BUREAU !" x={470} y={600} size={58} />
				</At>
				<At from={S('plan12', 0.25)} to={W('plan12', 'rapetissait', -0.15)}>
					<SpeechBubble text="JOURNÉE GÉNIALE !" x={470} y={620} size={62} />
				</At>
				<At from={S('plan15', 0.25)} to={W('plan15', 'vérité', -0.15)}>
					<SpeechBubble text="J'AI PERDU MON TRAVAIL." x={470} y={470} size={58} />
				</At>
				<At from={W('plan17', 'vérité', 0.1)} to={W('plan17', 'même', -0.1)}>
					<SpeechBubble text="BOF." x={640} y={560} size={84} tail="left" />
				</At>
				{/* pastilles de nom (1re apparition) */}
				<At from={W('plan04', 'maire', -0.1)} to={S('plan05', -0.1)}>
					<NameTag name="M. LE MAIRE" x={420} y={640} color="#1b1b2f" />
				</At>
				<At from={S('plan06', 0.05)} to={W('plan06', 'mesurait', -0.12)}>
					<NameTag name="NOAH" x={430} y={560} color="#ff7a1a" />
				</At>
				<At from={W('plan06', 'mesurait', -0.1)} to={W('plan06', 'mètre', -0.15)}>
					<NameTag name="PAPA (MARC)" x={470} y={480} color="#5b6270" />
					<NameTag name="LOU" x={210} y={700} color="#ff8fb1" delay={4} />
					<NameTag name="MAMAN (SOPHIE)" x={690} y={640} color="#e35d6a" delay={8} />
				</At>
				{/* rembobinage */}
				<At from={S('plan03', -0.05)} to={S('plan03', 0.55)}>
					<RewindFx dur={18} />
				</At>
				<At from={card} to={durationInFrames}>
					<QuestionCard lines={['TOI, TU MENS', 'POUR PROTÉGER', "QUELQU'UN ?"]} red={1} hint="DIS-LE EN COMMENTAIRE" />
				</At>
				<StatPill label="TAILLE DE PAPA :" unit="cm" events={COUNTER} redBelow={50} visible={(t) => t * FPS < card} />
				<WordSubs tl={tl} />
			</FontGate>

			<Audio src={staticFile('ep05/voice.wav')} volume={1} />
			<MusicBed
				tl={tl}
				frames={durationInFrames}
				silences={[pause]}
				parts={[
					{src: 'music/tension.wav', from: 0, to: S('plan12'), vol: 0.17},
					{src: 'music/piano-doux.wav', from: S('plan12'), to: pause[0], vol: 0.22},
					{src: 'music/piano-doux.wav', from: pause[1], to: W('plan16', 'pouf'), vol: 0.22, startAt: 30 * 8},
					{src: 'music/village-loop.wav', from: W('plan16', 'pouf'), to: durationInFrames, vol: 0.24},
				]}
			/>
			{sfxList().map((s, i) => (
				<Sequence key={i} from={Math.max(0, s.at)} layout="none">
					<Audio src={staticFile(`sfx/${s.name}.wav`)} volume={s.vol ?? 0.6} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
