import {continueRender, delayRender, staticFile} from 'remotion';

export const FONT = 'LilitaOne';

let loaded: Promise<void> | null = null;

/** Charge la police une seule fois (sous-titres + textures de panneaux 3D). */
export const loadFonts = (): Promise<void> => {
	if (loaded) return loaded;
	const handle = delayRender('Chargement police');
	const faces = [
		new FontFace(FONT, `url(${staticFile('fonts/LilitaOne-latin.woff2')}) format('woff2')`, {
			unicodeRange: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
		}),
		new FontFace(FONT, `url(${staticFile('fonts/LilitaOne-latin-ext.woff2')}) format('woff2')`),
	];
	loaded = Promise.all(faces.map((f) => f.load()))
		.then((fs) => {
			fs.forEach((f) => document.fonts.add(f));
		})
		.finally(() => continueRender(handle));
	return loaded;
};
