import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useVideoConfig} from 'remotion';
import {FontGate} from '../../lib/FontGate';
import {Subtitles} from '../../overlay/Subtitles';
import {CallToAction} from '../../overlay/Fx';
import {CountdownPill} from '../../overlay/Countdown';
import {NameTag} from '../../overlay/Labels';
import {At, ShotRunner} from '../common';
import {blackAt, clockAt, ctaAt, ep04, FPS, isRed} from './data';
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
	add(F('plan04', 0.05, 'end'), 'gasp', 0.35);
	add(F('plan04', 1.6, 'end'), 'gasp', 0.35);
	add(F('plan06', 0.1), 'whoosh', 0.35);
	add(F('plan06', 1.6, 'end'), 'whoosh', 0.35);
	// le maire frappe aux portes
	for (const base of [F('plan07', 0.2), F('plan07', 1.8)]) for (let k = 0; k < 3; k++) add(base + k * 7, 'thud', 0.45);
	for (let k = 0; k < 3; k++) add(F('plan07', 0.75, 'end') + k * 7, 'thud', 0.6);
	add(Wt('plan08', 'cours'), 'impact', 0.4);
	// course : battements de cœur de plus en plus rapides, porte qui se referme
	add(F('plan09', -0.15), 'rumble', 0.55);
	let f = F('plan09', -0.15);
	while (f < F('plan11', -0.1)) {
		add(f, 'heartbeat', 0.75);
		f += Math.max(13, 22 - (f - F('plan09')) / 12);
	}
	add(F('plan12', 0.15, 'end') + 10, 'click', 0.8); // la lampe s'allume
	add(F('plan12', -0.1), 'impact', 0.9); // note grave
	add(Math.round(blackAt() * FPS), 'impact', 0.6);
	add(Math.round(ctaAt() * FPS), 'pop', 0.5);
	return L;
};

const Music: React.FC = () => {
	const {durationInFrames} = useVideoConfig();
	const tensionFrom = F('plan07', -0.3);
	const cut = F('plan11', -0.15); // silence total à la révélation
	return (
		<>
			{/* douce et mélancolique au début */}
			<Sequence durationInFrames={tensionFrom + 30} layout="none">
				<Audio src={staticFile('music/piano-doux.wav')} volume={(fr) => interpolate(fr, [0, 15, tensionFrom - 10, tensionFrom + 30], [0, 0.16, 0.16, 0], {extrapolateRight: 'clamp'})} />
			</Sequence>
			{/* tension croissante à partir du plan 7, coupée net au plan 11 */}
			<Sequence from={tensionFrom} durationInFrames={cut - tensionFrom} layout="none">
				<Audio src={staticFile('music/tension.wav')} startFrom={30 * 30} volume={(fr) => interpolate(fr, [0, 20, cut - tensionFrom - 2, cut - tensionFrom], [0, 0.18, 0.24, 0], {extrapolateRight: 'clamp'})} />
			</Sequence>
			{/* fin : piano très doux sous la question */}
			<Sequence from={Math.round(ctaAt() * FPS)} layout="none">
				<Audio src={staticFile('music/piano-doux.wav')} volume={(fr) => interpolate(fr, [0, 20, durationInFrames - Math.round(ctaAt() * FPS) - 20, durationInFrames - Math.round(ctaAt() * FPS)], [0, 0.12, 0.12, 0], {extrapolateRight: 'clamp'})} />
			</Sequence>
		</>
	);
};

export const Episode04: React.FC = () => {
	const {durationInFrames} = useVideoConfig();
	const shots = shotsInOrder();
	const cta = Math.round(ctaAt() * FPS);
	const black = Math.round(blackAt() * FPS);
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
				{/* pastilles de nom */}
				<At from={F('plan01', 0.3)} to={Wt('plan01', 'personne', -0.15)}>
					<NameTag name="LÉO" x={470} y={760} color="#2f5dd0" />
				</At>
				<At from={Wt('plan05', 'riait', -0.3)} to={Wt('plan05', 'jamais', -0.3)}>
					<NameTag name="YUKI" x={540} y={430} color="#ff5a7a" />
				</At>
				<At from={Wt('plan04', 'maire', -0.15)} to={F('plan04', 0.05, 'end')}>
					<NameTag name="M. LE MAIRE" x={470} y={430} color="#1b1b2f" />
				</At>
				<At from={Wt('plan08', 'Mamie', -0.15)} to={Wt('plan08', 'cours', -0.2)}>
					<NameTag name="MAMIE ODETTE" x={480} y={440} color="#7b4dff" />
				</At>
				{/* écran noir */}
				<At from={black} to={cta}>
					<AbsoluteFill style={{background: '#000'}} />
				</At>
				<At from={cta} to={durationInFrames}>
					<CallToAction question={['TOI, TU LUI', 'PARDONNES ?']} hint="DIS-LE EN COMMENTAIRE" />
				</At>
				<CountdownPill label="MUR FERMÉ DANS" valueAt={clockAt} red={isRed} />
				<Subtitles tl={tl} hidden={(t) => t * FPS >= cta || (t * FPS >= black && t * FPS < cta)} />
			</FontGate>

			<Audio src={staticFile('ep04/voice.wav')} volume={1} />
			<Music />
			{sfxList().map((s, i) => (
				<Sequence key={i} from={Math.max(0, s.at)} layout="none">
					<Audio src={staticFile(`sfx/${s.name}.wav`)} volume={s.vol ?? 0.6} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
