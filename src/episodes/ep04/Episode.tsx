import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig} from 'remotion';
import {FontGate} from '../../lib/FontGate';
import {CountdownPill} from '../../overlay/Countdown';
import {NameTag} from '../../overlay/Labels';
import {At} from '../common';
import {ShotTrack} from '../../engine/ShotTrack';
import {WordSubs} from '../../engine/WordSubs';
import {MusicBed} from '../../engine/MusicBed';
import {QuestionCard} from '../../engine/QuestionCard';
import {clockAt, ctaAt, ep04, FPS, isRed} from './data';
import {shotsInOrder} from './shots';

const tl = ep04.tl;
const F = (id: string, off = 0, edge: 'start' | 'end' = 'start') => tl.f(id, off, edge);
const Wt = (id: string, txt: string, off = 0) => {
	const ws = tl.line(id).words;
	const i = Math.max(0, ws.findIndex((w) => w.text.toLowerCase().includes(txt.toLowerCase())));
	return Math.round((ws[i].start + off) * FPS);
};

type Sfx = {at: number; name: string; vol?: number};
const sfxList = (): Sfx[] => {
	const L: Sfx[] = [];
	const add = (at: number, name: string, vol = 0.6) => L.push({at: Math.round(at), name, vol});
	add(0, 'impact', 0.45);
	add(F('plan02', -0.15), 'whoosh', 0.35);
	add(Wt('plan03', 'disparu'), 'piano-cue', 0.45);
	add(Wt('plan03', 'accusé'), 'gasp', 0.35);
	add(F('plan04', -0.1), 'whoosh', 0.4);
	add(Wt('plan04', 'cris'), 'gasp', 0.45);
	add(Wt('plan04', 'mur', -0.1), 'rumble', 0.55);
	add(Wt('plan04', 'voleur'), 'thud', 0.6);
	add(F('plan06', 0.1), 'whoosh', 0.35);
	add(Wt('plan06', 'par-dessus'), 'whoosh', 0.3);
	for (let k = 0; k < 3; k++) add(Wt('plan07', 'maire') + k * 7, 'thud', 0.45);
	add(Wt('plan07', 'rapprochait'), 'whoosh', 0.3);
	for (let k = 0; k < 3; k++) add(Wt('plan07', 'mienne') + k * 7, 'thud', 0.6);
	add(Wt('plan08', 'cours'), 'impact', 0.4);
	// compteur : chaque saut est entendu
	add(Wt('plan09', 'Dix'), 'tick', 0.8);
	add(Wt('plan09', 'Cinq'), 'tick', 0.8);
	add(F('plan09', -0.15), 'rumble', 0.55);
	let f = F('plan09', -0.15);
	while (f < F('plan11', -0.3)) {
		add(f, 'heartbeat', 0.75);
		f += Math.max(12, 20 - (f - F('plan09')) / 12);
	}
	add(F('plan11', 0), 'impact', 0.7); // révélation après la pause
	add(Wt('plan12', 'fille'), 'click', 0.8); // la lampe du maire s'allume
	add(F('plan12', 0, 'end'), 'impact', 0.6); // 00:00:00
	add(Math.round(ctaAt() * FPS), 'pop', 0.5);
	return L;
};

export const Episode04: React.FC = () => {
	const {durationInFrames} = useVideoConfig();
	const shots = shotsInOrder();
	const cta = Math.round(ctaAt() * FPS);
	// pause dramatique : entre la fin de plan10 et le début de plan11 (musique coupée)
	const pause: [number, number] = [F('plan10', 0.05, 'end'), F('plan11', 0)];
	const tension = F('plan07', -0.3);
	return (
		<AbsoluteFill style={{background: '#000'}}>
			<FontGate>
				<ShotTrack shots={shots} />
				<At from={F('plan01', 0.3)} to={Wt('plan01', 'personne', -0.15)}>
					<NameTag name="LÉO" x={470} y={760} color="#2f5dd0" />
				</At>
				<At from={Wt('plan05', 'riait', -0.3)} to={Wt('plan05', 'jamais', -0.3)}>
					<NameTag name="YUKI" x={540} y={430} color="#ff5a7a" />
				</At>
				<At from={Wt('plan04', 'maire', -0.15)} to={Wt('plan04', 'voleur', -0.1)}>
					<NameTag name="M. LE MAIRE" x={470} y={430} color="#1b1b2f" />
				</At>
				<At from={Wt('plan08', 'Mamie', -0.15)} to={Wt('plan08', 'dit', -0.2)}>
					<NameTag name="MAMIE ODETTE" x={480} y={440} color="#7b4dff" />
				</At>
				<At from={cta} to={durationInFrames}>
					<QuestionCard lines={['TOI, TU LUI', 'PARDONNES ?']} hint="DIS-LE EN COMMENTAIRE" />
				</At>
				<CountdownPill label="MUR FERMÉ DANS" valueAt={clockAt} red={isRed} />
				<WordSubs tl={tl} />
			</FontGate>

			<Audio src={staticFile('ep04/voice.wav')} volume={1} />
			<MusicBed
				tl={tl}
				frames={durationInFrames}
				silences={[pause]}
				parts={[
					{src: 'music/piano-doux.wav', from: 0, to: tension, vol: 0.2},
					{src: 'music/tension.wav', from: tension, to: pause[0], vol: 0.24, startAt: 30 * 30},
					{src: 'music/piano-doux.wav', from: pause[1], to: durationInFrames, vol: 0.22, startAt: 30 * 12},
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
