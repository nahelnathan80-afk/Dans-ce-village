import * as THREE from 'three';

/** Émotions disponibles pour les visages. */
export type Emotion =
	| 'neutral'
	| 'happy'
	| 'surprised'
	| 'panic'
	| 'smug'
	| 'sad'
	| 'angry'
	| 'tired'
	| 'wink'
	| 'moved'
	| 'determined';

export type FaceStyle = {
	skin: string;
	freckles?: boolean;
	mustache?: string; // couleur
	mustacheTilt?: number; // radians (fausse moustache de travers)
	glasses?: string; // lunettes rondes (couleur de monture)
	sunglasses?: boolean;
	wrinkles?: boolean;
	lashes?: boolean;
	blush?: boolean;
	browColor?: string;
};

type Params = {
	eyeH: number; // hauteur des yeux (1 = normal)
	pupil: number; // taille pupille
	lid: number; // 0 = ouvert, 1 = fermé (paupière supérieure)
	browY: number; // décalage vertical sourcils (+ = haut)
	browTilt: number; // + = intérieur relevé (inquiet), − = froncé
	mouth: 'smile' | 'grin' | 'o' | 'frown' | 'flat' | 'wavy' | 'smirk';
	winkLeft?: boolean;
	tears?: boolean;
};

const EMO: Record<Emotion, Params> = {
	neutral: {eyeH: 1, pupil: 1, lid: 0, browY: 0, browTilt: 0, mouth: 'smile'},
	happy: {eyeH: 1, pupil: 1, lid: 0, browY: 6, browTilt: 0, mouth: 'grin'},
	surprised: {eyeH: 1.3, pupil: 0.8, lid: 0, browY: 16, browTilt: 0.1, mouth: 'o'},
	panic: {eyeH: 1.35, pupil: 0.55, lid: 0, browY: 14, browTilt: 0.5, mouth: 'wavy'},
	smug: {eyeH: 0.9, pupil: 1, lid: 0.45, browY: 2, browTilt: -0.2, mouth: 'smirk'},
	sad: {eyeH: 1, pupil: 1.1, lid: 0.2, browY: 4, browTilt: 0.6, mouth: 'frown'},
	angry: {eyeH: 0.9, pupil: 0.9, lid: 0.25, browY: -6, browTilt: -0.6, mouth: 'frown'},
	tired: {eyeH: 0.9, pupil: 1, lid: 0.6, browY: -2, browTilt: 0.2, mouth: 'flat'},
	wink: {eyeH: 1, pupil: 1, lid: 0, browY: 6, browTilt: 0, mouth: 'grin', winkLeft: true},
	moved: {eyeH: 1.05, pupil: 1.25, lid: 0.15, browY: 6, browTilt: 0.55, mouth: 'smile', tears: true},
	determined: {eyeH: 0.95, pupil: 1, lid: 0.2, browY: -3, browTilt: -0.35, mouth: 'flat'},
};

const cache = new Map<string, THREE.CanvasTexture>();

/**
 * Dessine (et met en cache) la texture du visage.
 * `mouthOpen` est quantifié pour limiter le nombre de textures.
 */
export const getFaceTexture = (
	style: FaceStyle,
	emotion: Emotion,
	mouthOpen: number,
	look: [number, number] = [0, 0],
	blink = false,
): THREE.CanvasTexture => {
	const mo = Math.round(Math.min(1, Math.max(0, mouthOpen)) * 4) / 4;
	const lx = Math.round(look[0] * 4) / 4;
	const ly = Math.round(look[1] * 4) / 4;
	const key = JSON.stringify([style, emotion, mo, lx, ly, blink]);
	const hit = cache.get(key);
	if (hit) return hit;

	const S = 256; // coordonnées de dessin ; la texture réelle fait 512 px (net en gros plan)
	const c = document.createElement('canvas');
	c.width = S * 2;
	c.height = S * 2;
	const g = c.getContext('2d')!;
	g.scale(2, 2);
	const p = EMO[emotion];

	g.fillStyle = style.skin;
	g.fillRect(0, 0, S, S);

	// Joues
	if (style.blush !== false) {
		g.fillStyle = 'rgba(255,90,110,0.35)';
		for (const x of [58, 198]) {
			g.beginPath();
			g.ellipse(x, 168, 26, 15, 0, 0, Math.PI * 2);
			g.fill();
		}
	}
	if (style.freckles) {
		g.fillStyle = 'rgba(150,80,40,0.55)';
		for (const [x, y] of [
			[48, 150], [62, 160], [74, 148], [182, 148], [194, 160], [208, 150],
		]) {
			g.beginPath();
			g.arc(x, y, 3.2, 0, Math.PI * 2);
			g.fill();
		}
	}

	// Yeux
	const eyeY = 112;
	const eyeW = 25;
	const eyeHgt = 31 * p.eyeH;
	for (const [i, ex] of [[0, 84], [1, 172]] as const) {
		const closed = blink || (p.winkLeft && i === 0);
		if (closed) {
			g.strokeStyle = '#1b1b1b';
			g.lineWidth = 8;
			g.lineCap = 'round';
			g.beginPath();
			g.arc(ex, eyeY + 4, eyeW * 0.9, Math.PI * 1.1, Math.PI * 1.9);
			g.stroke();
			continue;
		}
		g.fillStyle = '#ffffff';
		g.strokeStyle = '#1b1b1b';
		g.lineWidth = 6;
		g.beginPath();
		g.ellipse(ex, eyeY, eyeW, eyeHgt, 0, 0, Math.PI * 2);
		g.fill();
		g.stroke();
		// pupille
		const pr = 14 * p.pupil;
		g.fillStyle = '#1b1b1b';
		g.beginPath();
		g.ellipse(ex + lx * 9, eyeY + 4 + ly * 9, pr, pr * 1.15, 0, 0, Math.PI * 2);
		g.fill();
		g.fillStyle = '#ffffff';
		g.beginPath();
		g.arc(ex + lx * 9 - pr * 0.35, eyeY + ly * 9 - pr * 0.25, pr * 0.32, 0, Math.PI * 2);
		g.fill();
		// paupière
		if (p.lid > 0) {
			g.save();
			g.beginPath();
			g.ellipse(ex, eyeY, eyeW + 3, eyeHgt + 3, 0, 0, Math.PI * 2);
			g.clip();
			g.fillStyle = style.skin;
			g.fillRect(ex - 40, eyeY - eyeHgt - 4, 80, (eyeHgt * 2 + 6) * p.lid);
			g.strokeStyle = '#1b1b1b';
			g.lineWidth = 6;
			g.beginPath();
			g.moveTo(ex - 40, eyeY - eyeHgt - 1 + (eyeHgt * 2 + 6) * p.lid);
			g.lineTo(ex + 40, eyeY - eyeHgt - 1 + (eyeHgt * 2 + 6) * p.lid);
			g.stroke();
			g.restore();
		}
		if (style.lashes) {
			g.strokeStyle = '#1b1b1b';
			g.lineWidth = 5;
			const side = i === 0 ? -1 : 1;
			g.beginPath();
			g.moveTo(ex + side * eyeW * 0.8, eyeY - eyeHgt * 0.7);
			g.lineTo(ex + side * (eyeW + 10), eyeY - eyeHgt - 4);
			g.stroke();
		}
	}
	if (p.tears) {
		g.fillStyle = 'rgba(90,180,255,0.9)';
		for (const ex of [84, 172]) {
			g.beginPath();
			g.ellipse(ex + 14, eyeY + eyeHgt + 8, 6, 9, 0, 0, Math.PI * 2);
			g.fill();
		}
	}

	// Sourcils
	g.strokeStyle = style.browColor ?? '#3a2412';
	g.lineWidth = 11;
	g.lineCap = 'round';
	const by = eyeY - eyeHgt - 16 - p.browY;
	for (const [side, ex] of [[-1, 84], [1, 172]] as const) {
		const inner = ex - side * 22;
		const outer = ex + side * 22;
		const tilt = p.browTilt * 14;
		g.beginPath();
		const raiseSmug = emotion === 'smug' && side === 1 ? 8 : 0;
		g.moveTo(inner, by - tilt - raiseSmug);
		g.lineTo(outer, by + tilt * 0.6 - raiseSmug);
		g.stroke();
	}

	// Moustache
	if (style.mustache) {
		g.save();
		g.translate(128, 178);
		g.rotate(style.mustacheTilt ?? 0);
		g.fillStyle = style.mustache;
		g.beginPath();
		g.ellipse(-24, 0, 30, 13, -0.25, 0, Math.PI * 2);
		g.ellipse(24, 0, 30, 13, 0.25, 0, Math.PI * 2);
		g.fill();
		g.restore();
	}
	if (style.wrinkles) {
		g.strokeStyle = 'rgba(120,70,50,0.45)';
		g.lineWidth = 4;
		for (const x of [40, 216]) {
			g.beginPath();
			g.arc(x, 112, 14, -0.6, 0.6);
			g.stroke();
		}
		g.beginPath();
		g.moveTo(96, 52);
		g.lineTo(160, 52);
		g.stroke();
	}
	if (style.glasses) {
		g.strokeStyle = style.glasses;
		g.lineWidth = 8;
		for (const ex of [84, 172]) {
			g.beginPath();
			g.arc(ex, 112, 40, 0, Math.PI * 2);
			g.stroke();
		}
		g.beginPath();
		g.moveTo(124, 108);
		g.lineTo(132, 108);
		g.stroke();
	}
	if (style.sunglasses) {
		g.fillStyle = '#111';
		g.beginPath();
		g.roundRect(42, 84, 82, 56, 18);
		g.roundRect(132, 84, 82, 56, 18);
		g.fill();
		g.fillRect(118, 96, 20, 10);
		g.fillStyle = 'rgba(255,255,255,0.35)';
		g.fillRect(56, 94, 22, 8);
		g.fillRect(146, 94, 22, 8);
	}

	// Bouche
	const mx = 128;
	const my = style.mustache ? 204 : 190;
	g.strokeStyle = '#1b1b1b';
	g.fillStyle = '#5a1020';
	g.lineWidth = 7;
	g.lineJoin = 'round';
	const open = mo;
	const drawOpen = (w: number, h: number) => {
		g.beginPath();
		g.ellipse(mx, my, w, Math.max(4, h), 0, 0, Math.PI * 2);
		g.fill();
		g.stroke();
		if (h > 12) {
			// langue
			g.save();
			g.clip();
			g.fillStyle = '#ff6b81';
			g.beginPath();
			g.ellipse(mx, my + h * 0.75, w * 0.6, h * 0.5, 0, 0, Math.PI * 2);
			g.fill();
			g.restore();
			// dents
			g.fillStyle = '#ffffff';
			g.fillRect(mx - w * 0.55, my - h + 3, w * 1.1, Math.min(9, h * 0.3));
		}
	};
	if (open > 0.01) {
		const base = p.mouth === 'o' ? 22 : p.mouth === 'wavy' ? 34 : 32;
		drawOpen(base + open * 6, 6 + open * 26);
	} else {
		switch (p.mouth) {
			case 'smile':
				g.beginPath();
				g.arc(mx, my - 22, 30, Math.PI * 0.2, Math.PI * 0.8);
				g.stroke();
				break;
			case 'grin':
				g.beginPath();
				g.moveTo(mx - 36, my - 8);
				g.quadraticCurveTo(mx, my + 34, mx + 36, my - 8);
				g.closePath();
				g.fill();
				g.stroke();
				g.fillStyle = '#ffffff';
				g.fillRect(mx - 26, my - 6, 52, 8);
				break;
			case 'o':
				drawOpen(16, 18);
				break;
			case 'frown':
				g.beginPath();
				g.arc(mx, my + 22, 26, Math.PI * 1.2, Math.PI * 1.8);
				g.stroke();
				break;
			case 'flat':
				g.beginPath();
				g.moveTo(mx - 22, my);
				g.lineTo(mx + 22, my);
				g.stroke();
				break;
			case 'wavy':
				g.beginPath();
				g.moveTo(mx - 34, my);
				for (let i = 0; i <= 6; i++) {
					g.lineTo(mx - 34 + (i * 68) / 6, my + (i % 2 ? -8 : 8));
				}
				g.stroke();
				break;
			case 'smirk':
				g.beginPath();
				g.moveTo(mx - 26, my + 4);
				g.quadraticCurveTo(mx + 10, my + 10, mx + 30, my - 10);
				g.stroke();
				break;
		}
	}

	const tex = new THREE.CanvasTexture(c);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.anisotropy = 4;
	cache.set(key, tex);
	return tex;
};
