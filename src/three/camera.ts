import {CameraShot, Vec3} from './Stage';

/**
 * Cadrage « gros plan » : place le visage d'un personnage au tiers haut de l'écran
 * (les sous-titres occupent le centre-bas). `rotY` = orientation du personnage,
 * `side` = décalage angulaire de la caméra autour de lui.
 */
export const closeUp = (
	who: Vec3,
	rotY: number,
	dist: number,
	o: {side?: number; fov?: number; h?: number; scale?: number; shake?: number; headY?: number} = {},
): CameraShot => {
	const fov = o.fov ?? 38;
	const headY = who[1] + (o.headY ?? 2.42) * (o.scale ?? 1);
	const a = rotY + (o.side ?? 0);
	const off = 0.27 * dist * Math.tan(((fov / 2) * Math.PI) / 180);
	return {
		pos: [who[0] + Math.sin(a) * dist, headY + (o.h ?? 0.15), who[2] + Math.cos(a) * dist],
		target: [who[0], headY - off, who[2]],
		fov,
		shake: o.shake,
	};
};
