import {Easing, interpolate, spring} from 'remotion';

/** 0→1 entre deux frames (avec easing doux), bornée. */
export const ramp = (f: number, a: number, b: number, ease: (t: number) => number = Easing.inOut(Easing.cubic)) =>
	interpolate(f, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});

/** Rebond (0→1 avec dépassement) à partir de la frame `at`. */
export const pop = (f: number, at: number, fps = 30, stiffness = 300, damping = 10) =>
	f < at ? 0 : spring({frame: f - at, fps, config: {stiffness, damping, mass: 0.5}});

/** Petit « zoom punch » : 0 au repos, pic à `at`, retombe. */
export const punch = (f: number, at: number, len = 8) => {
	if (f < at || f > at + len * 3) return 0;
	const t = (f - at) / len;
	return Math.exp(-t * 1.6) * Math.sin(Math.min(t, 1) * Math.PI * 0.5 + 0.0001) * (t < 1 ? 1 : 1);
};

/** Clignement d'yeux pseudo-aléatoire. */
export const blinkAt = (f: number, seed = 0) => (f + seed * 37) % 97 < 3;

/** Squash & stretch d'impact : 1 au repos. */
export const squashAt = (f: number, at: number, amount = 0.25) => {
	if (f < at || f > at + 18) return 1;
	const t = (f - at) / 18;
	return 1 - amount * Math.exp(-t * 4) * Math.cos(t * Math.PI * 3);
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const wave = (f: number, speed = 1, amp = 1, phase = 0) => Math.sin(f * 0.2 * speed + phase) * amp;
