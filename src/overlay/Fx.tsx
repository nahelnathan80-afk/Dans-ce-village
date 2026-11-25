import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../lib/fonts';

const SAFE_W = 1080 - 150; // largeur utile (colonne de droite TikTok exclue)

const txt = (size: number, color = '#fff', stroke = 14): React.CSSProperties => ({
	fontFamily: FONT,
	fontSize: size,
	color,
	WebkitTextStroke: `${stroke}px #000`,
	paintOrder: 'stroke fill',
	textShadow: '0 8px 0 rgba(0,0,0,0.8)',
	lineHeight: 1.05,
	textAlign: 'center',
});

/** Bandeau texte (accroche) qui pop. Frames relatives à la Sequence. */
export const Banner: React.FC<{lines: string[]; top?: number; bg?: string; color?: string; size?: number; dur?: number}> = ({
	lines, top = 380, bg = '#ffe14d', color = '#1b1b1b', size = 78, dur = 999,
}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const s = spring({frame: f, fps, config: {damping: 10, stiffness: 260}});
	const out = interpolate(f, [dur - 6, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return (
		<div style={{position: 'absolute', top, left: 40, width: SAFE_W - 10, display: 'flex', justifyContent: 'center'}}>
			<div
				style={{
					transform: `scale(${s * out}) rotate(${-2 + (1 - s) * 6}deg)`,
					background: bg,
					borderRadius: 26,
					border: '7px solid #1b1b1b',
					boxShadow: '0 12px 0 #1b1b1b',
					padding: '18px 30px 14px',
					...txt(size, color, 0),
					textShadow: 'none',
				}}
			>
				{lines.map((l, i) => (
					<div key={i}>{l}</div>
				))}
			</div>
		</div>
	);
};

/** Gros tampon qui s'écrase à l'écran. */
export const Stamp: React.FC<{text: string; top?: number; color?: string; rotate?: number; size?: number}> = ({
	text, top = 520, color = '#ff2b2b', rotate = -8, size = 120,
}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const s = spring({frame: f, fps, config: {damping: 12, stiffness: 400, mass: 0.8}});
	const scale = interpolate(s, [0, 1], [3, 1]);
	return (
		<div style={{position: 'absolute', top, left: 40, width: SAFE_W - 10, display: 'flex', justifyContent: 'center', opacity: Math.min(1, f / 3)}}>
			<div style={{transform: `scale(${scale}) rotate(${rotate}deg)`, border: `12px solid ${color}`, borderRadius: 22, padding: '6px 28px', background: 'rgba(255,255,255,0.92)', ...txt(size, color, 0), textShadow: 'none'}}>
				{text}
			</div>
		</div>
	);
};

/** Étiquettes-prix « pensées » barrées en rouge. */
export const PriceTag: React.FC<{phrase: string; price: string; top: number; strikeAt: number; tilt?: number}> = ({phrase, price, top, strikeAt, tilt = -3}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const s = spring({frame: f, fps, config: {damping: 10, stiffness: 250}});
	const strike = interpolate(f, [strikeAt, strikeAt + 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return (
		<div style={{position: 'absolute', top, left: 40, width: SAFE_W - 10, display: 'flex', justifyContent: 'center'}}>
			<div style={{position: 'relative', transform: `scale(${s}) rotate(${tilt}deg)`, display: 'flex', alignItems: 'center', gap: 18, background: 'rgba(255,255,255,0.93)', borderRadius: 999, padding: '14px 30px', border: '6px solid #1b1b1b', opacity: 1 - strike * 0.25}}>
				<span style={{...txt(50, '#1b1b1b', 0), textShadow: 'none'}}>{phrase}</span>
				<span style={{...txt(58, '#ffffff', 0), textShadow: 'none', background: '#ff2b2b', borderRadius: 16, padding: '2px 16px'}}>{price}</span>
				<div style={{position: 'absolute', left: -10, top: '50%', height: 14, width: `${strike * 104}%`, background: '#ff2b2b', borderRadius: 8, transform: 'rotate(-4deg)', boxShadow: '0 3px 0 #7a0000'}} />
			</div>
		</div>
	);
};

/** Ampoule « idée » dessinée en SVG. */
export const Bulb: React.FC<{x?: number; y?: number}> = ({x = 470, y = 300}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const s = spring({frame: f, fps, config: {damping: 7, stiffness: 300}});
	const glow = 0.6 + 0.4 * Math.sin(f / 3);
	return (
		<div style={{position: 'absolute', left: x - 110, top: y - 110, width: 220, height: 260, transform: `scale(${s})`}}>
			<svg viewBox="0 0 220 260" width={220} height={260}>
				{Array.from({length: 8}).map((_, i) => {
					const a = (i / 8) * Math.PI * 2;
					return <line key={i} x1={110 + Math.cos(a) * 95} y1={100 + Math.sin(a) * 95} x2={110 + Math.cos(a) * 118} y2={100 + Math.sin(a) * 118} stroke="#ffe14d" strokeWidth={12} strokeLinecap="round" opacity={glow} />;
				})}
				<circle cx={110} cy={100} r={70} fill="#ffe14d" stroke="#1b1b1b" strokeWidth={9} />
				<circle cx={85} cy={78} r={18} fill="#fff9c4" />
				<rect x={80} y={165} width={60} height={46} rx={8} fill="#9aa3ad" stroke="#1b1b1b" strokeWidth={8} />
				<line x1={82} y1={182} x2={138} y2={182} stroke="#1b1b1b" strokeWidth={6} />
				<line x1={82} y1={197} x2={138} y2={197} stroke="#1b1b1b" strokeWidth={6} />
			</svg>
		</div>
	);
};

/** Bulle de pensée. */
export const ThoughtBubble: React.FC<{lines: string[]; x?: number; y?: number}> = ({lines, x = 465, y = 470}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const dots = [0, 1, 2].map((i) => spring({frame: f - i * 3, fps, config: {damping: 10, stiffness: 300}}));
	const main = spring({frame: f - 8, fps, config: {damping: 9, stiffness: 260}});
	const bob = Math.sin(f / 8) * 6;
	return (
		<>
			{[[x + 120, y + 330, 26], [x + 80, y + 270, 38], [x + 30, y + 200, 52]].map(([cx, cy, r], i) => (
				<div key={i} style={{position: 'absolute', left: cx - r, top: cy - r + bob, width: r * 2, height: r * 2, borderRadius: '50%', background: '#fff', border: '7px solid #1b1b1b', transform: `scale(${dots[i]})`}} />
			))}
			<div style={{position: 'absolute', left: x - 330, top: y - 110 + bob, width: 660, display: 'flex', justifyContent: 'center', transform: `scale(${main})`}}>
				<div style={{background: '#fff', border: '8px solid #1b1b1b', borderRadius: 120, padding: '30px 50px', ...txt(74, '#1b1b1b', 0), textShadow: 'none'}}>
					{lines.map((l, i) => (
						<div key={i} style={{color: i === lines.length - 1 ? '#18a558' : '#1b1b1b'}}>{l}</div>
					))}
				</div>
			</div>
		</>
	);
};

/** Effet rembobinage VHS (à superposer sur l'image). */
export const RewindFx: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const k = interpolate(f, [0, 4, dur - 5, dur], [0, 1, 1, 0], {extrapolateRight: 'clamp'});
	return (
		<AbsoluteFill style={{opacity: k, pointerEvents: 'none'}}>
			<AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 3px, transparent 3px, transparent 7px)'}} />
			<AbsoluteFill style={{background: `linear-gradient(180deg, transparent ${(f * 9) % 100}%, rgba(255,255,255,0.35) ${(f * 9) % 100 + 2}%, transparent ${(f * 9) % 100 + 5}%)`}} />
			<AbsoluteFill style={{backdropFilter: 'saturate(0.3) contrast(1.2)'}} />
			<div style={{position: 'absolute', top: 360, left: 90, ...txt(110, '#fff', 10), opacity: f % 10 < 6 ? 1 : 0.3}}>◀◀ REMBOBINAGE</div>
		</AbsoluteFill>
	);
};

/** Flash blanc (impact). */
export const Flash: React.FC<{len?: number; color?: string}> = ({len = 10, color = '#ffffff'}) => {
	const f = useCurrentFrame();
	const o = interpolate(f, [0, len], [1, 0], {extrapolateRight: 'clamp'});
	return <AbsoluteFill style={{background: color, opacity: o}} />;
};

/** Vignette rouge d'alerte qui pulse. */
export const AlarmVignette: React.FC<{strength?: number}> = ({strength = 1}) => {
	const f = useCurrentFrame();
	const o = (0.45 + 0.35 * Math.sin(f / 2.5)) * strength;
	return <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 45%, rgba(255,0,0,0.75) 100%)', opacity: o}} />;
};

/** Points et traits de morse qui voyagent entre deux points de l'écran. */
export const MorseFx: React.FC<{from: [number, number]; to: [number, number]; code: string; speed?: number}> = ({from, to, code, speed = 1}) => {
	const f = useCurrentFrame();
	return (
		<>
			{code.split('').map((c, i) => {
				const t = ((f * 0.022 * speed - i * 0.12) % 1 + 1) % 1;
				const x = from[0] + (to[0] - from[0]) * t;
				const y = from[1] + (to[1] - from[1]) * t - Math.sin(t * Math.PI) * 120;
				if (c === ' ') return null;
				return (
					<div key={i} style={{position: 'absolute', left: x, top: y, width: c === '-' ? 70 : 30, height: 30, borderRadius: 15, background: '#fff36b', boxShadow: '0 0 25px #ffe14d, 0 0 0 5px #1b1b1b', transform: 'translate(-50%,-50%)'}} />
				);
			})}
		</>
	);
};

/** Grande lettre lumineuse (le fameux « J »). */
export const BigLetter: React.FC<{letter: string; sub?: string; top?: number}> = ({letter, sub, top = 380}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const s = spring({frame: f, fps, config: {damping: 6, stiffness: 220}});
	return (
		<div style={{position: 'absolute', top, left: 40, width: SAFE_W - 10, textAlign: 'center', transform: `scale(${s})`}}>
			<div style={{...txt(300, '#fff36b', 18), textShadow: '0 0 60px #ffe14d, 0 12px 0 #000'}}>{letter}</div>
			{sub && <div style={{...txt(64, '#fff', 10)}}>{sub}</div>}
		</div>
	);
};

/** Appel à commenter final. */
export const CallToAction: React.FC<{question: string[]; hint: string}> = ({question, hint}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const s = spring({frame: f, fps, config: {damping: 10, stiffness: 200}});
	const s2 = spring({frame: f - 45, fps, config: {damping: 9, stiffness: 260}});
	const bounce = Math.abs(Math.sin(f / 5)) * 30;
	return (
		<>
			<div style={{position: 'absolute', top: 470, left: 40, width: SAFE_W - 10, display: 'flex', justifyContent: 'center'}}>
				<div style={{transform: `scale(${s}) rotate(-2deg)`, background: '#fff', border: '9px solid #1b1b1b', borderRadius: 40, padding: '30px 40px', boxShadow: '0 16px 0 #1b1b1b'}}>
					{question.map((q, i) => (
						<div key={i} style={{...txt(i === 1 ? 104 : 80, i === 1 ? '#ff2b2b' : '#1b1b1b', 0), textShadow: 'none'}}>{q}</div>
					))}
				</div>
			</div>
			<div style={{position: 'absolute', top: 1060, left: 40, width: SAFE_W - 10, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${Math.max(0, s2)})`}}>
				<div style={{...txt(76, '#ffe14d', 14)}}>{hint}</div>
				<svg width={160} height={200} viewBox="0 0 160 200" style={{marginTop: 20 + bounce}}>
					<path d="M55 10 H105 V110 H145 L80 190 L15 110 H55 Z" fill="#ffe14d" stroke="#1b1b1b" strokeWidth={12} strokeLinejoin="round" />
				</svg>
			</div>
		</>
	);
};
