/**
 * Rendu « film d'animation » (moteur v3, ép. 06+) : activé par l'épisode avec setCine(true).
 * Les anciens épisodes gardent le rendu d'origine (cine = false).
 */
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {rng} from './textures';

export const LOOK = {cine: false};
export const setCine = (v: boolean) => {
	LOOK.cine = v;
};

const tex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat?: [number, number], srgb = false) => {
	const c = (tex as unknown as {c?: Map<string, THREE.Texture>}).c ?? new Map<string, THREE.Texture>();
	(tex as unknown as {c?: Map<string, THREE.Texture>}).c = c;
	const hit = c.get(key);
	if (hit) return hit;
	const cv = document.createElement('canvas');
	cv.width = w;
	cv.height = h;
	draw(cv.getContext('2d')!, w, h);
	const t = new THREE.CanvasTexture(cv);
	if (srgb) t.colorSpace = THREE.SRGBColorSpace;
	t.anisotropy = 4;
	if (repeat) {
		t.wrapS = t.wrapT = THREE.RepeatWrapping;
		t.repeat.set(repeat[0], repeat[1]);
	}
	c.set(key, t);
	return t;
};

/** Relief de tricot / tissu (bump), gris neutre. */
export const knitBump = () =>
	tex('knit', 128, 128, (g, w, h) => {
		g.fillStyle = '#808080';
		g.fillRect(0, 0, w, h);
		for (let y = 0; y < h; y += 8)
			for (let x = 0; x < w; x += 8) {
				const gr = g.createRadialGradient(x + 4, y + 4, 0, x + 4, y + 4, 5);
				gr.addColorStop(0, '#b0b0b0');
				gr.addColorStop(1, '#585858');
				g.fillStyle = gr;
				g.beginPath();
				g.ellipse(x + 4, y + 4, 3, 4.2, (x / 8) % 2 ? 0.5 : -0.5, 0, Math.PI * 2);
				g.fill();
			}
	}, [3, 3]);

/** Grain fin (rugosité / taches) pour peau, bois, pierre… */
export const noiseTex = (seed = 1, contrast = 40, repeat: [number, number] = [2, 2]) =>
	tex(`noise${seed}-${contrast}-${repeat}`, 256, 256, (g, w, h) => {
		const R = rng(seed + 11);
		const img = g.createImageData(w, h);
		for (let i = 0; i < w * h; i++) {
			const v = 128 + (R() - 0.5) * contrast * 2;
			img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
			img.data[i * 4 + 3] = 255;
		}
		g.putImageData(img, 0, 0);
	}, repeat);

/** Ombre de contact douce (dégradé radial). */
export const blobTex = () =>
	tex('blob', 128, 128, (g, w) => {
		const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
		gr.addColorStop(0, 'rgba(0,0,0,0.75)');
		gr.addColorStop(0.55, 'rgba(0,0,0,0.35)');
		gr.addColorStop(1, 'rgba(0,0,0,0)');
		g.fillStyle = gr;
		g.fillRect(0, 0, w, w);
	}, undefined, true);

/** Rayon de lumière (faisceau volumétrique) : dégradé vertical doux. */
export const beamTex = () =>
	tex('beam', 64, 256, (g, w, h) => {
		const gr = g.createLinearGradient(0, 0, 0, h);
		gr.addColorStop(0, 'rgba(255,230,170,0.0)');
		gr.addColorStop(0.15, 'rgba(255,230,170,0.55)');
		gr.addColorStop(1, 'rgba(255,230,170,0.0)');
		g.fillStyle = gr;
		g.fillRect(0, 0, w, h);
		const gx = g.createLinearGradient(0, 0, w, 0);
		gx.addColorStop(0, 'rgba(0,0,0,1)');
		gx.addColorStop(0.5, 'rgba(0,0,0,0)');
		gx.addColorStop(1, 'rgba(0,0,0,1)');
		g.globalCompositeOperation = 'destination-out';
		g.fillStyle = gx;
		g.fillRect(0, 0, w, h);
	}, undefined, true);

const fabCache = new Map<string, THREE.MeshStandardMaterial>();
/** Tissu (vêtements) : couleur + relief tricot + rugosité forte. */
export const fabric = (color: string) => {
	let m = fabCache.get(color);
	if (!m) {
		m = new THREE.MeshStandardMaterial({color, roughness: 0.92, bumpMap: knitBump(), bumpScale: 1.2});
		fabCache.set(color, m);
	}
	return m;
};
const skinCache = new Map<string, THREE.MeshStandardMaterial>();
/** Peau : légère brillance, grain fin. */
export const skin = (color: string) => {
	let m = skinCache.get(color);
	if (!m) {
		m = new THREE.MeshStandardMaterial({color, roughness: 0.55, bumpMap: noiseTex(3, 18, [1, 1]), bumpScale: 0.3, emissive: new THREE.Color(color).multiplyScalar(0.06)});
		skinCache.set(color, m);
	}
	return m;
};

const rbCache = new Map<string, THREE.BufferGeometry>();
/** Boîte aux bords arrondis (biseau) — personnages cubiques « film d'animation ». */
export const roundedBox = (w: number, h: number, d: number) => {
	const k = `${w.toFixed(3)}_${h.toFixed(3)}_${d.toFixed(3)}`;
	let g = rbCache.get(k);
	if (!g) {
		g = new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.16);
		rbCache.set(k, g);
	}
	return g;
};
