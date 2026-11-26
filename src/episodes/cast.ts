import {CharacterLook} from '../three/Character';

/** Habitants récurrents de la série. Ajouter un personnage = ajouter une entrée. */
export const CAST = {
	leon: {
		skin: '#ffcc99', shirt: '#ff8a1f', pants: '#2f5dd0', hair: '#7a3e12', hairStyle: 'short',
		hat: 'toque', apron: '#fbf6ec', face: {freckles: true},
	},
	maire: {
		skin: '#f3c09a', shirt: '#24324f', pants: '#1c2436', hair: '#b9b9b9', hairStyle: 'bald',
		sash: true, face: {mustache: '#9a9a9a', browColor: '#8c8c8c'}, scale: 1.08,
	},
	boulangere: {
		skin: '#ffd2b3', shirt: '#ff5fa2', pants: '#8a2d5c', hair: '#d9481c', hairStyle: 'bun',
		apron: '#ffffff', face: {lashes: true},
	},
	kevin: {
		skin: '#e8b48c', shirt: '#2bd17e', pants: '#3a3a48', hair: '#2b1b10', hairStyle: 'spiky',
		hat: 'cap', hatColor: '#ff3b3b', hoodie: true, shoes: '#ffffff',
	},
	amoureux: {
		skin: '#f0bf96', shirt: '#7b4dff', pants: '#2b2d5c', hair: '#1f1f1f', hairStyle: 'short',
	},
	amoureuse: {
		skin: '#ffd9bf', shirt: '#ffd23f', pants: '#c2410c', hair: '#5b2a10', hairStyle: 'long',
		face: {lashes: true},
	},
	gisele: {
		skin: '#ffd9c4', shirt: '#e5989b', pants: '#6d597a', hair: '#e8e8e8', hairStyle: 'bun',
		face: {glasses: '#6b4f3a', wrinkles: true, lashes: true, browColor: '#bdbdbd'}, scale: 0.92,
	},
	jeanRevente: {
		skin: '#e9b48e', shirt: '#6a4c93', pants: '#3c2a5c', hair: '#1f1f1f', hairStyle: 'short', hat: 'cap', hatColor: '#111111',
		chain: true, shoes: '#ffffff', face: {sunglasses: true, mustache: '#1f1f1f'},
	},
	vendeuse: {
		skin: '#f3c7a5', shirt: '#2a9d8f', pants: '#264653', hair: '#3d2314', hairStyle: 'long', apron: '#ffd166', face: {lashes: true},
	},
	mairePyjama: {
		skin: '#f3c09a', shirt: '#a9d6ff', stripes: '#5a8fd6', pants: '#a9d6ff', hair: '#b9b9b9', hairStyle: 'bald', hat: 'beret', hatColor: '#5a8fd6',
		sash: true, face: {mustache: '#9a9a9a', browColor: '#8c8c8c'}, scale: 1.08, shoes: '#7a4b2a',
	},
} satisfies Record<string, CharacterLook>;

/** Les « cousins » de Jean-Revente : tous pareils, fausse moustache de travers. */
export const cousin = (i: number): CharacterLook => ({
	skin: ['#e9b48e', '#d9a07a', '#f0bf96', '#c98b62'][i % 4],
	shirt: '#6a4c93', pants: '#3c2a5c', hair: '#1f1f1f', hairStyle: 'short', hat: 'cap', hatColor: '#111111', shoes: '#ffffff',
	face: {mustache: '#1f1f1f', mustacheTilt: (((i * 37) % 11) - 5) * 0.09},
	scale: 0.95 + ((i * 13) % 9) / 100,
});

const SHIRTS = ['#e63946', '#2a9d8f', '#f4a261', '#8ecae6', '#9b5de5', '#00bbf9', '#f15bb5', '#43aa8b', '#ffbe0b'];
const SKINS = ['#ffd2b3', '#f0bf96', '#d9a07a', '#a8714e', '#ffe0c7', '#c98b62'];
const HAIRS = ['#2b1b10', '#7a3e12', '#e0b04a', '#1f1f1f', '#b9b9b9', '#a0391b'];
const STYLES: CharacterLook['hairStyle'][] = ['short', 'long', 'bun', 'spiky', 'bald'];

/** Villageois de figuration, générés de façon déterministe. */
export const villager = (i: number): CharacterLook => ({
	skin: SKINS[(i * 7) % SKINS.length],
	shirt: SHIRTS[(i * 5 + 2) % SHIRTS.length],
	pants: ['#2f3e5c', '#4a3b2a', '#30303a', '#1d4d3a'][i % 4],
	hair: HAIRS[(i * 3 + 1) % HAIRS.length],
	hairStyle: STYLES[(i * 11) % STYLES.length],
	hat: i % 5 === 0 ? 'beret' : 'none',
	hatColor: '#2b2b3a',
	scale: 0.92 + ((i * 37) % 17) / 100,
});
