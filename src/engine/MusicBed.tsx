/**
 * Musique sous TOUTE la vidéo, sans silence total, avec ducking automatique sous la voix.
 * Elle ne se coupe que pendant la pause dramatique, puis repart immédiatement.
 */
import React, {useMemo} from 'react';
import {Audio, Sequence, staticFile} from 'remotion';
import {Timeline} from '../lib/timeline';

export type MusicPart = {src: string; from: number; to: number; vol?: number; startAt?: number};

/** Enveloppe de ducking (par frame) : 1 hors voix, `duck` pendant la voix, attaque/relâche douces. */
export const duckCurve = (tl: Timeline, frames: number, duck = 0.42): number[] => {
	const fps = tl.fps;
	const active = new Array(frames).fill(0);
	for (const w of tl.allWords()) {
		for (let f = Math.floor((w.start - 0.05) * fps); f <= Math.ceil((w.end + 0.1) * fps); f++) if (f >= 0 && f < frames) active[f] = 1;
	}
	const out: number[] = [];
	let v = 1;
	for (let f = 0; f < frames; f++) {
		const target = active[f] ? duck : 1;
		v += (target - v) * (target < v ? 0.5 : 0.12);
		out.push(v);
	}
	return out;
};

export const MusicBed: React.FC<{tl: Timeline; frames: number; parts: MusicPart[]; silences?: [number, number][]}> = ({tl, frames, parts, silences = []}) => {
	const duck = useMemo(() => duckCurve(tl, frames), [tl, frames]);
	return (
		<>
			{parts.map((p, i) => (
				<Sequence key={i} from={p.from} durationInFrames={Math.max(1, p.to - p.from)} layout="none">
					<Audio
						src={staticFile(p.src)}
						loop
						startFrom={p.startAt ?? 0}
						volume={(fr) => {
							const g = p.from + fr;
							if (silences.some(([a, b]) => g >= a && g < b)) return 0;
							const fadeIn = Math.min(1, (fr + 1) / 4);
							return (p.vol ?? 0.2) * (duck[g] ?? 1) * fadeIn;
						}}
					/>
				</Sequence>
			))}
		</>
	);
};
