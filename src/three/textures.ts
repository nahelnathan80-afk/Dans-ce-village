import * as THREE from 'three';
import {FONT} from '../lib/fonts';

const cache = new Map<string, THREE.Texture>();
const memo = <T extends THREE.Texture>(key: string, make: () => T): T => {
	const hit = cache.get(key);
	if (hit) return hit as T;
	const t = make();
	cache.set(key, t);
	return t;
};

const canvas = (w: number, h: number) => {
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	return [c, c.getContext('2d')!] as const;
};

const finish = (c: HTMLCanvasElement, repeat?: [number, number]) => {
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	t.anisotropy = 4;
	if (repeat) {
		t.wrapS = t.wrapT = THREE.RepeatWrapping;
		t.repeat.set(repeat[0], repeat[1]);
	}
	return t;
};

/** Générateur pseudo-aléatoire déterministe (même image à chaque rendu). */
export const rng = (seed: number) => () => {
	seed = (seed * 16807) % 2147483647;
	return (seed - 1) / 2147483646;
};

export type TextTexOpts = {
	bg?: string;
	fg?: string;
	stroke?: string;
	w?: number;
	h?: number;
	size?: number;
	border?: string;
	radius?: number;
	lines?: string[];
};

/** Texte sur fond (enseignes, pancartes). */
export const textTexture = (text: string, o: TextTexOpts = {}) =>
	memo('txt' + text + JSON.stringify(o), () => {
		const W = o.w ?? 512;
		const H = o.h ?? 128;
		const [c, g] = canvas(W, H);
		if (o.bg) {
			g.fillStyle = o.bg;
			const r = o.radius ?? 0;
			g.beginPath();
			g.roundRect(0, 0, W, H, r);
			g.fill();
		}
		if (o.border) {
			g.strokeStyle = o.border;
			g.lineWidth = H * 0.08;
			g.strokeRect(H * 0.06, H * 0.06, W - H * 0.12, H - H * 0.12);
		}
		const lines = o.lines ?? [text];
		let size = o.size ?? H * 0.62;
		g.font = `${size}px ${FONT}`;
		const widest = Math.max(...lines.map((l) => g.measureText(l).width));
		if (widest > W * 0.88) size *= (W * 0.88) / widest;
		size = Math.min(size, (H * 0.8) / lines.length);
		g.font = `${size}px ${FONT}`;
		g.textAlign = 'center';
		g.textBaseline = 'middle';
		lines.forEach((l, i) => {
			const y = H / 2 + (i - (lines.length - 1) / 2) * size * 1.05 + size * 0.05;
			if (o.stroke) {
				g.strokeStyle = o.stroke;
				g.lineWidth = size * 0.16;
				g.lineJoin = 'round';
				g.strokeText(l, W / 2, y);
			}
			g.fillStyle = o.fg ?? '#222';
			g.fillText(l, W / 2, y);
		});
		return finish(c);
	});

export const cobbleTexture = (repeat: number) =>
	memo('cobble' + repeat, () => {
		const S = 512;
		const [c, g] = canvas(S, S);
		g.fillStyle = '#b7a58c';
		g.fillRect(0, 0, S, S);
		const r = rng(7);
		const n = 8;
		const cell = S / n;
		for (let y = 0; y < n; y++) {
			for (let x = 0; x < n; x++) {
				const off = y % 2 ? cell / 2 : 0;
				const l = 68 + r() * 14;
				g.fillStyle = `hsl(${32 + r() * 12}, ${18 + r() * 12}%, ${l}%)`;
				g.beginPath();
				g.roundRect(x * cell + off + 3, y * cell + 3, cell - 6, cell - 6, 12);
				g.fill();
				if (x === n - 1 && off) {
					g.beginPath();
					g.roundRect(off - cell + 3, y * cell + 3, cell - 6, cell - 6, 12);
					g.fill();
				}
			}
		}
		return finish(c, [repeat, repeat]);
	});

export const grassTexture = (repeat: number) =>
	memo('grass' + repeat, () => {
		const S = 256;
		const [c, g] = canvas(S, S);
		g.fillStyle = '#6fcf4a';
		g.fillRect(0, 0, S, S);
		const r = rng(3);
		for (let i = 0; i < 900; i++) {
			g.fillStyle = r() > 0.5 ? 'rgba(80,170,50,0.5)' : 'rgba(150,225,95,0.45)';
			g.fillRect(r() * S, r() * S, 2 + r() * 4, 2 + r() * 4);
		}
		return finish(c, [repeat, repeat]);
	});

export const stripesTexture = (a: string, b: string, n = 8) =>
	memo('stripes' + a + b + n, () => {
		const [c, g] = canvas(256, 64);
		for (let i = 0; i < n; i++) {
			g.fillStyle = i % 2 ? b : a;
			g.fillRect((i * 256) / n, 0, 256 / n + 1, 64);
		}
		return finish(c);
	});

export const woodTexture = (base: string, repeat: [number, number] = [1, 1]) =>
	memo('wood' + base + repeat, () => {
		const [c, g] = canvas(256, 256);
		g.fillStyle = base;
		g.fillRect(0, 0, 256, 256);
		g.strokeStyle = 'rgba(0,0,0,0.18)';
		g.lineWidth = 3;
		for (let y = 0; y <= 256; y += 32) {
			g.beginPath();
			g.moveTo(0, y);
			g.lineTo(256, y);
			g.stroke();
		}
		const r = rng(11);
		g.strokeStyle = 'rgba(0,0,0,0.07)';
		for (let i = 0; i < 40; i++) {
			const y = r() * 256;
			g.beginPath();
			g.moveTo(r() * 256, y);
			g.lineTo(r() * 256, y + 2);
			g.stroke();
		}
		return finish(c, repeat);
	});

export const flourTexture = (text: string) =>
	memo('flour' + text, () => {
		const W = 1024;
		const H = 1024;
		const [c, g] = canvas(W, H);
		g.clearRect(0, 0, W, H);
		g.font = `330px ${FONT}`;
		g.textAlign = 'center';
		g.textBaseline = 'middle';
		g.fillStyle = 'rgba(255,255,255,0.97)';
		g.shadowColor = 'rgba(255,255,255,0.9)';
		g.shadowBlur = 30;
		g.fillText(text, W / 2, H * 0.36);
		// flèche
		g.lineWidth = 60;
		g.lineCap = 'round';
		g.strokeStyle = 'rgba(255,255,255,0.97)';
		g.beginPath();
		g.moveTo(W * 0.22, H * 0.74);
		g.lineTo(W * 0.78, H * 0.74);
		g.moveTo(W * 0.62, H * 0.62);
		g.lineTo(W * 0.8, H * 0.74);
		g.lineTo(W * 0.62, H * 0.86);
		g.stroke();
		const r = rng(5);
		for (let i = 0; i < 400; i++) {
			g.fillStyle = `rgba(255,255,255,${r() * 0.5})`;
			g.beginPath();
			g.arc(r() * W, r() * H, r() * 6, 0, Math.PI * 2);
			g.fill();
		}
		return finish(c);
	});

/** Dégradé vertical pour le ciel (utilisé en arrière-plan de scène). */
export const skyTexture = (top: string, bottom: string) =>
	memo('sky' + top + bottom, () => {
		const [c, g] = canvas(4, 512);
		const gr = g.createLinearGradient(0, 0, 0, 512);
		gr.addColorStop(0, top);
		gr.addColorStop(0.65, bottom);
		gr.addColorStop(1, bottom);
		g.fillStyle = gr;
		g.fillRect(0, 0, 4, 512);
		return finish(c);
	});
