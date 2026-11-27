import React, {useMemo} from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../lib/fonts';
import {Timeline, Word} from '../lib/timeline';

type Chunk = {words: (Word & {paid: boolean; who: string})[]; start: number; end: number};

/** Découpe chaque réplique en groupes de 1 à `max` mots (coupure sur la ponctuation). */
const buildChunks = (tl: Timeline, max: number): Chunk[] => {
	const chunks: Chunk[] = [];
	for (const l of tl.lines) {
		let cur: Chunk['words'] = [];
		const flush = () => {
			if (cur.length) chunks.push({words: cur, start: cur[0].start, end: cur[cur.length - 1].end});
			cur = [];
		};
		for (const w of l.words) {
			cur.push({...w, paid: !!l.paid, who: l.who});
			// les échos s'affichent un par un
			if (cur.length >= max || /[.,!?…:]$/.test(w.text) || l.who === 'echo') flush();
		}
		flush();
	}
	// chaque groupe reste affiché jusqu'au suivant (max +0,6 s)
	for (let i = 0; i < chunks.length; i++) {
		const next = chunks[i + 1];
		chunks[i].end = next ? Math.min(next.start, chunks[i].end + 0.6) : chunks[i].end + 0.6;
	}
	return chunks;
};

export const Subtitles: React.FC<{tl: Timeline; maxWords?: number; top?: number; hidden?: (t: number) => boolean}> = ({
	tl,
	maxWords = 3,
	top = 1130,
	hidden,
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const chunks = useMemo(() => buildChunks(tl, maxWords), [tl, maxWords]);
	if (hidden?.(t)) return null;
	const chunk = chunks.find((c) => t >= c.start - 0.04 && t < c.end);
	if (!chunk) return null;
	const inF = Math.round((t - chunk.start) * fps);
	const appear = spring({frame: inF + 1, fps, config: {damping: 11, stiffness: 300, mass: 0.5}});

	return (
		<div
			style={{
				position: 'absolute',
				top,
				left: 70,
				width: 1080 - 70 - 150,
				display: 'flex',
				flexWrap: 'wrap',
				justifyContent: 'center',
				alignItems: 'center',
				columnGap: 40,
				rowGap: 0,
				transform: `scale(${0.7 + 0.3 * appear})`,
			}}
		>
			{chunk.words.map((w, i) => {
				const active = t >= w.start - 0.03 && (i === chunk.words.length - 1 || t < chunk.words[i + 1].start - 0.03);
				const said = t >= w.start - 0.03;
				const wf = Math.round((t - w.start) * fps);
				const pop = active ? spring({frame: wf + 1, fps, config: {damping: 9, stiffness: 380, mass: 0.4}}) : 1;
				const inWorld = w.paid || (w.who !== 'vo' && w.who !== 'echo'); // mot prononcé dans le village
				const echo = w.who === 'echo';
				const emph = w.text.includes('*'); // mot mis en valeur dans le script (*mot*)
				const size = inWorld || emph ? 128 : 104;
				return (
					<span
						key={i}
						style={{
							fontFamily: FONT,
							fontSize: size,
							lineHeight: 1.12,
							color: inWorld || emph ? '#ffe14d' : '#ffffff',
							opacity: said ? (echo ? 0.85 : 1) : 0.55,
							WebkitTextStroke: '15px #000',
							paintOrder: 'stroke fill',
							textShadow: '0 8px 0 rgba(0,0,0,0.85)',
							transform: `scale(${active ? 1.16 - 0.16 * (1 - pop) + 0.12 * (1 - pop) : 1}) rotate(${active ? -2 : 0}deg)`,
							display: 'inline-block',
							margin: active ? '0 16px' : 0,
							fontStyle: echo ? 'italic' : 'normal',
							textTransform: 'uppercase',
						}}
					>
						{w.text.replace(/\*/g, '')}
					</span>
				);
			})}
		</div>
	);
};
