import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useVideoConfig} from 'remotion';
import {FontGate} from '../../lib/FontGate';
import {Subtitles} from '../../overlay/Subtitles';
import {CallToAction, Flash, RewindFx} from '../../overlay/Fx';
import {CountdownPill} from '../../overlay/Countdown';
import {NameTag, SpeechBubble} from '../../overlay/Labels';
import {At, ShotRunner} from '../common';
import {clockAt, ep03, FPS} from './data';
import {shotsInOrder} from './shots';

const tl = ep03.tl;
const F = (id: string, off = 0, edge: 'start' | 'end' = 'start') => tl.f(id, off, edge);
const Wt = (id: string, txt: string, off = 0) => {
	const ws = tl.line(id).words;
	const i = Math.max(0, ws.findIndex((w) => w.text.toLowerCase().includes(txt.toLowerCase())));
	return Math.round((ws[i].start + off) * FPS);
};

const MUSIC_CUT = () => F('plan16', -1.0);

type Sfx = {at: number; name: string; vol?: number};
const sfxList = (): Sfx[] => {
	const L: Sfx[] = [];
	const add = (at: number, name: string, vol = 0.7) => L.push({at: Math.round(at), name, vol});
	add(0, 'impact', 0.6);
	add(Wt('plan01', 'maison'), 'whoosh', 0.4);
	// flash-forward : grondement + cœur
	add(F('plan02', -0.1), 'rumble', 0.6);
	for (let i = 0; i < 4; i++) add(F('plan02', -0.1) + i * 18, 'heartbeat', 0.7);
	add(F('plan03', -0.15), 'rewind', 0.6);
	add(F('plan03', 0.4), 'whoosh', 0.4);
	add(Wt('plan04', 'souffle'), 'gasp', 0.4);
	add(F('plan04', 0.2), 'pop', 0.5); // pastille du maire
	add(F('plan05', -0.1), 'whoosh', 0.5);
	add(Wt('plan06', 'revenu', 0.1), 'impact', 0.55);
	add(F('plan07', 0.2), 'piano-cue', 0.6); // indice 1
	for (const w of ['Noé', 'Lila', 'Odette', 'Pistache']) add(Wt('plan08', w), 'pop', 0.6);
	add(Wt('plan09', 'douze'), 'impact', 1.0);
	add(F('plan10', -0.1), 'whoosh', 0.5);
	for (let i = 0; i < 8; i++) add(F('plan10') + i * 8, 'pop', 0.3);
	// tic-tac des horloges, coupé net sur « arrêtées »
	for (let f = F('plan11', -0.1); f < Wt('plan12', 'arrêtées'); f += 15) add(f, 'tick', 0.7);
	add(Wt('plan12', 'arrêtées'), 'click', 0.9);
	add(Wt('plan12', 'minuit'), 'piano-cue', 0.5); // indices 2 et 3
	// battement de cœur sous 5 minutes, de plus en plus rapide
	let f = F('plan13', -0.1);
	while (f < MUSIC_CUT() + 20) {
		add(f, 'heartbeat', 0.8);
		f += Math.max(14, 26 - (f - F('plan13')) / 25);
	}
	add(F('plan14', 0.0, 'end'), 'thud', 0.8); // porte qui claque
	add(F('plan16'), 'bell', 0.9);
	add(F('plan16', 0.2, 'end'), 'rumble', 0.9);
	add(F('plan16', 0.3, 'end'), 'impact', 0.9);
	add(F('plan17', -0.15), 'whoosh', 0.5);
	add(F('plan19', -0.2), 'whoosh', 0.5);
	add(F('plan19', 0), 'pop', 0.6);
	return L;
};

const Music: React.FC = () => {
	const {durationInFrames} = useVideoConfig();
	const cut = MUSIC_CUT();
	const dips: [number, number][] = [
		[Wt('plan06', 'revenu', -0.05), Wt('plan06', 'revenu', 0.5)],
		[Wt('plan09', 'douze', -0.6), Wt('plan09', 'douze', 0.5)],
		[Wt('plan12', 'arrêtées'), Wt('plan12', 'arrêtées', 0.8)],
	];
	const pianoFrom = F('plan17', -0.2);
	return (
		<>
			<Sequence durationInFrames={cut} layout="none">
				<Audio
					src={staticFile('music/tension.wav')}
					volume={(fr) => {
						if (dips.some(([a, b]) => fr >= a && fr < b)) return 0;
						return interpolate(fr, [0, 6, cut - 2, cut], [0, 0.22, 0.32, 0], {extrapolateRight: 'clamp'});
					}}
				/>
			</Sequence>
			<Sequence from={pianoFrom} layout="none">
				<Audio src={staticFile('music/piano-doux.wav')} volume={(fr) => interpolate(fr, [0, 20, durationInFrames - pianoFrom - 30, durationInFrames - pianoFrom], [0, 0.35, 0.35, 0], {extrapolateRight: 'clamp'})} />
			</Sequence>
		</>
	);
};

export const Episode03: React.FC = () => {
	const {durationInFrames} = useVideoConfig();
	const shots = shotsInOrder();
	const ctaFrom = F('plan19', -0.2);
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

				<At from={F('plan03', -0.15)} to={F('plan03', -0.15) + 22}>
					<RewindFx dur={22} />
				</At>
				{/* pastilles de nom (1re apparition) */}
				<At from={F('plan04', 0.1)} to={Wt('plan04', 'Toute', -0.1)}>
					<NameTag name="M. LE MAIRE" x={470} y={440} color="#1b1b2f" />
				</At>
				<At from={Wt('plan08', 'Noé')} to={Wt('plan08', 'Avec', -0.1)}>
					<NameTag name="NOÉ" x={500} y={430} />
				</At>
				<At from={Wt('plan08', 'Avec', -0.1)} to={F('plan09', -0.1)}>
					<NameTag name="NOÉ" x={486} y={650} />
					<NameTag name="LILA" x={675} y={760} color="#f5b700" delay={Wt('plan08', 'Lila') - Wt('plan08', 'Avec', -0.1)} />
					<NameTag name="MAMIE ODETTE" x={300} y={540} color="#7b4dff" delay={Wt('plan08', 'Odette') - Wt('plan08', 'Avec', -0.1)} />
					<NameTag name="PISTACHE" x={820} y={900} color="#f28c28" delay={Wt('plan08', 'Pistache') - Wt('plan08', 'Avec', -0.1)} />
				</At>
				<At from={F('plan18', 0.1)} to={Wt('plan18', 'chaises', -0.25)}>
					<NameTag name="PAPI MARCEL" x={700} y={560} color="#3d6fa8" />
				</At>
				{/* bulles */}
				<At from={Wt('plan06', 'jamais', -0.1)} to={Wt('plan06', 'revenu', -0.15)}>
					<SpeechBubble text="…" x={560} y={500} size={90} />
				</At>
				<At from={Wt('plan11', 'fauteuil', -0.3)} to={F('plan12', 0.4)}>
					<SpeechBubble text="Moi, je reste avec mes horloges." x={500} y={520} />
				</At>
				<At from={tl.f('plan15', 0.05, 'end')} to={F('plan16', -0.2)}>
					<SpeechBubble text="Tu viens, mon grand ?" x={500} y={520} tail="right" />
				</At>
				<At from={F('plan16', 0.3, 'end')} to={F('plan16', 0.3, 'end') + 16}>
					<Flash len={16} />
				</At>
				<At from={ctaFrom} to={durationInFrames}>
					<CallToAction question={['TOI, TU SERAIS', 'RESTÉ', 'DANS LA MAISON ?']} hint="DIS-LE EN COMMENTAIRE" />
				</At>

				<CountdownPill label="MINUIT DANS" valueAt={clockAt} redBelow={300} />
				<Subtitles tl={tl} hidden={(t) => t * FPS >= ctaFrom} />
			</FontGate>

			<Audio src={staticFile('ep03/voice.wav')} volume={1} />
			<Music />
			{sfxList().map((s, i) => (
				<Sequence key={i} from={Math.max(0, s.at)} layout="none">
					<Audio src={staticFile(`sfx/${s.name}.wav`)} volume={s.vol ?? 0.7} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
