import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';

export type ShotCtx = {f: number; g: number; t: number; d: number; p: number};

/** Rend un plan avec son contexte temporel (frame locale, globale, secondes, durée). */
export const ShotRunner: React.FC<{from: number; d: number; render: (c: ShotCtx) => React.ReactNode}> = ({from, d, render}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const g = from + f;
	return <>{render({f, g, t: g / fps, d, p: f / d})}</>;
};

/** Bloc d'habillage visible sur une plage de frames. */
export const At: React.FC<{from: number; to: number; children: React.ReactNode}> = ({from, to, children}) => (
	<Sequence from={Math.round(from)} durationInFrames={Math.max(1, Math.round(to - from))} layout="none">
		<AbsoluteFill>{children}</AbsoluteFill>
	</Sequence>
);

/** Interpolation linéaire par morceaux (compteurs qui défilent). keys = [[t, valeur], …] triés. */
export const piecewise = (keys: [number, number][]) => (t: number) => {
	if (t <= keys[0][0]) return keys[0][1];
	for (let i = 1; i < keys.length; i++) {
		const [t1, v1] = keys[i];
		const [t0, v0] = keys[i - 1];
		if (t <= t1) return t1 === t0 ? v1 : v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
	}
	return keys[keys.length - 1][1];
};
