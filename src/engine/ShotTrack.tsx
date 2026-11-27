import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {BuiltShot, ShotCtx, variantStyle} from './shots';

const Runner: React.FC<{s: BuiltShot; base: number; d: number}> = ({s, base, d}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	// pour un sous-plan recoupé, le temps local continue (le mouvement ne repart pas de zéro)
	const lf = f + (s.from - base);
	const g = s.from + f;
	const c: ShotCtx = {f: lf, g, t: g / fps, d, p: lf / d};
	return <AbsoluteFill style={variantStyle(s.variant)}>{s.render(c)}</AbsoluteFill>;
};

/** Tous les cadrages, en coupes franches. */
export const ShotTrack: React.FC<{shots: BuiltShot[]}> = ({shots}) => {
	// début et durée du cadrage d'origine (avant recoupe) pour chaque sous-plan
	const origin = new Map<string, {from: number; to: number}>();
	for (const s of shots) {
		const k = s.id.split('~')[0];
		const o = origin.get(k);
		origin.set(k, {from: o ? Math.min(o.from, s.from) : s.from, to: o ? Math.max(o.to, s.to) : s.to});
	}
	return (
		<>
			{shots.map((s) => {
				const o = origin.get(s.id.split('~')[0])!;
				return (
					<Sequence key={s.id} from={s.from} durationInFrames={s.to - s.from} name={s.id}>
						<Runner s={s} base={o.from} d={o.to - o.from} />
					</Sequence>
				);
			})}
		</>
	);
};
