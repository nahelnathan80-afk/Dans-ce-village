import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FontGate} from '../../lib/FontGate';
import {BalanceCounter} from '../../overlay/BalanceCounter';
import {Subtitles} from '../../overlay/Subtitles';
import {CostPops, PopAnchor} from '../../overlay/CostPops';
import {AlarmVignette, Banner, BigLetter, Bulb, CallToAction, Flash, MorseFx, PriceTag, RewindFx, Stamp, ThoughtBubble} from '../../overlay/Fx';
import {ep01} from './data';
import {ShotCtx, shotsInOrder} from './shots';

const tl = ep01.tl;
const F = (id: string, off = 0, edge: 'start' | 'end' = 'start') => tl.f(id, off, edge);
const W = (id: string, i: number, edge: 'start' | 'end' = 'start') => tl.fw(id, i, edge);

/** Rend un plan avec son contexte temporel. */
const ShotRunner: React.FC<{from: number; d: number; render: (c: ShotCtx) => React.ReactNode}> = ({from, d, render}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const g = from + f;
	return <>{render({f, g, t: g / fps, d, p: f / d})}</>;
};

// ——— Où apparaissent les « −1 € » ———
const anchor: PopAnchor = (e) => {
	if (e.payer === 'kevin') {
		if (e.who === 'echo') return ([[300, 560], [530, 470], [740, 560]] as [number, number][])[(e.echo ?? 1) - 1];
		return [470, 640];
	}
	if (e.payer === 'maire') return [560, 560];
	if (e.who === 'echo') return ([[330, 420], [540, 470], [740, 420]] as [number, number][])[(e.echo ?? 1) - 1];
	return [700, 400];
};

// ——— Bruitages calés à la frame ———
type Sfx = {at: number; name: string; vol?: number};
const sfxList = (): Sfx[] => {
	const L: Sfx[] = [];
	for (const c of tl.costs) L.push({at: Math.round(c.t * 30) + 2, name: 'cash', vol: 0.55});
	const add = (at: number, name: string, vol = 0.7) => L.push({at: Math.round(at), name, vol});
	add(F('hook-1', -0.1), 'whoosh', 0.5);
	add(F('hook-1', 0.1), 'pop', 0.6);
	add(F('hook-2', -0.15), 'rewind', 0.55);
	add(F('rewind', -0.05), 'whoosh', 0.4);
	add(F('maire-3', -0.05) + 22, 'thud', 0.7);
	add(F('maire-3', -0.05) + 22, 'splash', 0.4);
	for (const id of ['boul-2', 'boul-3', 'boul-4']) add(F(id, -0.12), 'pop', 0.8);
	add(F('amour-1', -0.1), 'whoosh', 0.4);
	add(W('amour-3', 4) - 2, 'ding', 0.7);
	add(F('kevin-1', -0.1), 'whoosh', 0.4);
	add(F('pense-2', -0.1), 'pop', 0.6);
	add(F('four-1', -0.1), 'whoosh', 0.4);
	add(F('four-2', -0.1), 'rumble', 0.6);
	add(F('four-3', -0.1), 'rumble', 0.7);
	add(F('four-4'), 'alarm', 0.35);
	add(F('four-5', -0.1), 'whoosh', 0.4);
	add(F('four-7'), 'thud', 0.8);
	add(F('choix-1'), 'pop', 0.5);
	add(W('choix-1', 5), 'click', 0.8);
	add(F('choix-2'), 'pop', 0.5);
	add(W('choix-2', 6, 'end'), 'click', 0.8);
	add(F('idee-1', 0.15), 'ding', 0.8);
	add(F('idee-2', -0.1), 'whoosh', 0.5);
	add(F('idee-3', 0.2), 'bell', 0.8);
	add(F('idee-3', 1.0), 'bell', 0.75);
	add(F('idee-3', 1.8), 'bell', 0.7);
	add(F('chute-1', -0.15), 'whoosh', 0.5);
	add(W('chute-2', 2, 'end') + 4, 'boom', 1.0);
	for (let i = 0; i < 9; i++) add(F('chute-3', -0.1) + 6 + i * 7, 'pop', 0.35);
	add(F('cta-1', -0.2), 'whoosh', 0.5);
	add(F('cta-1', 0), 'pop', 0.6);
	return L;
};

const boomAt = () => W('chute-2', 2, 'end') + 4;

const Music: React.FC = () => {
	const {durationInFrames} = useVideoConfig();
	const boom = boomAt();
	return (
		<Audio
			src={staticFile('music/village-loop.wav')}
			volume={(f) => {
				let v = 0.15;
				if (f > boom - 14 && f < boom + 20) v = 0; // silence avant/pendant l'explosion
				if (f >= F('cta-1', -0.2)) v = 0.24;
				return v * interpolate(f, [0, 8, durationInFrames - 30, durationInFrames], [0, 1, 1, 0], {extrapolateRight: 'clamp'});
			}}
		/>
	);
};

/** Bloc d'habillage : apparition sur une plage de frames. */
const At: React.FC<{from: number; to: number; children: React.ReactNode}> = ({from, to, children}) => (
	<Sequence from={Math.round(from)} durationInFrames={Math.max(1, Math.round(to - from))} layout="none">
		<AbsoluteFill>{children}</AbsoluteFill>
	</Sequence>
);

export const Episode: React.FC = () => {
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

				{/* ——— Effets et textes ——— */}
				<At from={F('hook-1', -0.05)} to={F('hook-2', -0.15)}>
					<Banner lines={['DANS CE VILLAGE,', 'PARLER COÛTE', '1 € PAR MOT']} top={360} dur={F('hook-2', -0.15) - F('hook-1', -0.05)} />
				</At>
				<At from={F('hook-2', -0.15)} to={F('hook-2', -0.15) + 22}>
					<RewindFx dur={22} />
				</At>
				<At from={F('amour-1', 0.2)} to={F('amour-2', -0.1)}>
					<MorseFx from={[230, 900]} to={[850, 900]} code=".--- . - .- .. -- ." />
				</At>
				<At from={W('amour-2', 2)} to={F('amour-3', -0.1)}>
					<Banner lines={['JOUR 1 095']} top={400} size={62} bg="#ffffff" />
				</At>
				<At from={W('amour-3', 4) - 2} to={F('kevin-1', -0.1)}>
					<BigLetter letter="J" sub="·  —  —  —" top={330} />
				</At>
				<At from={F('pense-2', -0.1)} to={F('four-1', -0.1)}>
					<ThoughtBubble lines={['PENSER =', 'GRATUIT !']} x={470} y={470} />
				</At>
				<At from={F('four-4')} to={F('four-5', -0.1)}>
					<AlarmVignette />
				</At>
				<At from={F('four-7')} to={F('euh', -0.1)}>
					<Stamp text="15 MOTS MAX !" top={430} />
				</At>
				<At from={F('choix-1')} to={F('choix-3', -0.1)}>
					<PriceTag phrase="« Mesdames et messieurs »" price="3 €" top={400} strikeAt={W('choix-1', 5) - F('choix-1')} />
				</At>
				<At from={F('choix-2')} to={F('choix-3', -0.1)}>
					<PriceTag phrase="« Attention, le four va exploser »" price="5 €" top={560} tilt={2} strikeAt={W('choix-2', 6, 'end') - F('choix-2')} />
				</At>
				<At from={F('idee-1', 0.1)} to={F('idee-2', -0.1)}>
					<Bulb x={480} y={420} />
				</At>
				<At from={W('idee-2', 4)} to={F('idee-3', -0.1)}>
					<Banner lines={['GRATUIT !']} top={380} bg="#2ecc71" color="#ffffff" size={90} />
				</At>
				<At from={W('idee-3', 4)} to={F('courez', -0.15)}>
					<Banner lines={['GRATUIT !']} top={380} bg="#2ecc71" color="#ffffff" size={90} />
				</At>
				<At from={boomAt()} to={boomAt() + 14}>
					<Flash len={14} />
				</At>
				<At from={ctaFrom} to={durationInFrames}>
					<CallToAction question={['ET TOI, TU DIRAIS', 'QUOI', 'AVEC 15 MOTS ?']} hint="DIS-LE EN COMMENTAIRE" />
				</At>

				{/* ——— Habillage permanent ——— */}
				<BalanceCounter tl={tl} />
				<CostPops tl={tl} anchor={anchor} />
				<Subtitles tl={tl} hidden={(t) => t * 30 >= ctaFrom} />
			</FontGate>

			{/* ——— Son ——— */}
			<Audio src={staticFile('ep01/voice.wav')} volume={1} />
			<Music />
			{sfxList().map((s, i) => (
				<Sequence key={i} from={Math.max(0, s.at)} layout="none">
					<Audio src={staticFile(`sfx/${s.name}.wav`)} volume={s.vol ?? 0.7} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
