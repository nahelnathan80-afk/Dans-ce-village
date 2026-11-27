/** Cadrage automatique (format vertical) + travellings — partagé par les épisodes. */
import {CameraShot, lerpShot, Vec3} from '../three/Stage';
import {ramp} from '../lib/anim';
import {ShotCtx} from './shots';

export const move = (a: CameraShot, b: CameraShot, c: ShotCtx) => lerpShot(a, b, ramp(c.f, 0, c.d, (x) => x));

export type FitOpts = {w?: number; yaw?: number; pitch?: number; fov?: number; up?: number; dof?: number};
/**
 * Le sujet (centre `c`, hauteur `h`, largeur `w`) occupe ~50 % de la hauteur, au-dessus du centre
 * (les sous-titres sont au milieu). yaw = côté d'où on le regarde (= sa rotation pour voir son visage).
 */
export const fit = (c: Vec3, h: number, o: FitOpts = {}): CameraShot => {
	const fov = o.fov ?? 44;
	const vspan = Math.max(h / 0.5, (o.w ?? 0) / 0.5625 / 0.9);
	const dist = vspan / (2 * Math.tan(((fov / 2) * Math.PI) / 180));
	const yaw = o.yaw ?? 0;
	const pitch = o.pitch ?? 0.12;
	const t: Vec3 = [c[0], c[1] - (o.up ?? 0.12) * vspan, c[2]];
	return {pos: [t[0] + Math.sin(yaw) * Math.cos(pitch) * dist, t[1] + Math.sin(pitch) * dist, t[2] + Math.cos(yaw) * Math.cos(pitch) * dist], target: t, fov, dof: o.dof};
};
/** Travelling du cadrage `fit(at,h)` vers un peu plus serré / tourné. */
export const glide = (c: ShotCtx, at: Vec3, h: number, o: FitOpts = {}, k = 0.88, dyaw = 0.12) =>
	move(fit(at, h, o), fit(at, h * k, {...o, yaw: (o.yaw ?? 0) + dyaw}), c);
/** Orbite autour d'un point (angle a0 → a1 sur la durée du plan). */
export const orbit = (c: ShotCtx, at: Vec3, h: number, a0: number, a1: number, o: FitOpts = {}) =>
	fit(at, h, {...o, yaw: a0 + (a1 - a0) * ramp(c.f, 0, c.d, (x) => x)});
