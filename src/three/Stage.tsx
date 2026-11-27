import React, {useLayoutEffect} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {skyTexture} from './textures';

export type Vec3 = [number, number, number];

export type CameraShot = {
	pos: Vec3;
	target: Vec3;
	fov?: number;
	roll?: number;
	/** intensité de tremblement (0 = aucun) */
	shake?: number;
	/** mouvement permanent de la caméra (zoom lent + orbite), 1 = défaut, 0 = aucun. Jamais d'image figée. */
	drift?: number;
};

const CameraRig: React.FC<CameraShot> = ({pos: pos0, target, fov = 40, roll = 0, shake = 0, drift = 1}) => {
	const {camera} = useThree();
	const frame = useCurrentFrame();
	useLayoutEffect(() => {
		const cam = camera as THREE.PerspectiveCamera;
		// moteur v2 : la caméra bouge toujours (rapprochement lent + petite orbite autour de la cible)
		const tt = (frame / 30) * drift;
		const sgn = Math.sin(pos0[0] * 7.3 + pos0[2] * 3.1 + target[1]) >= 0 ? 1 : -1;
		const dx = pos0[0] - target[0];
		const dz = pos0[2] - target[2];
		const ang = 0.05 * tt * sgn;
		const k = 1 - 0.04 * tt;
		const pos: Vec3 = [
			target[0] + (dx * Math.cos(ang) - dz * Math.sin(ang)) * k,
			target[1] + (pos0[1] - target[1]) * k,
			target[2] + (dx * Math.sin(ang) + dz * Math.cos(ang)) * k,
		];
		const sx = shake ? (Math.sin(frame * 2.1) + Math.sin(frame * 3.7)) * 0.5 * shake : 0;
		const sy = shake ? (Math.cos(frame * 2.7) + Math.sin(frame * 1.3)) * 0.5 * shake : 0;
		cam.position.set(pos[0] + sx, pos[1] + sy, pos[2]);
		cam.up.set(Math.sin(roll), Math.cos(roll), 0);
		cam.lookAt(target[0] + sx * 0.5, target[1] + sy * 0.5, target[2]);
		cam.fov = fov;
		cam.near = 0.1;
		cam.far = 600;
		cam.updateProjectionMatrix();
	});
	return null;
};

export type Ambiance = 'day' | 'night' | 'interior' | 'sunset' | 'morning' | 'golden' | 'nightblue' | 'valley' | 'interiorNight';

const AMB: Record<Ambiance, {top: string; bottom: string; fog: string; hemi: [string, string, number]; sun: [string, number]; amb: number}> = {
	day: {top: '#2f8cff', bottom: '#bfe6ff', fog: '#cfe9ff', hemi: ['#e4f2ff', '#b7c9a0', 1.15], sun: ['#fff1d6', 2.4], amb: 0.35},
	sunset: {top: '#5b6cff', bottom: '#ffc58a', fog: '#ffd9b0', hemi: ['#ffe3c2', '#7a9c5f', 1.0], sun: ['#ffc27a', 2.2], amb: 0.35},
	night: {top: '#1a1446', bottom: '#6a3fa0', fog: '#3a2a6a', hemi: ['#8b7bff', '#1d2450', 0.7], sun: ['#a9b8ff', 0.8], amb: 0.25},
	interior: {top: '#f3c98b', bottom: '#f3c98b', fog: '#f3c98b', hemi: ['#ffe9c7', '#8a5a3a', 1.1], sun: ['#ffd6a0', 1.6], amb: 0.45},
	morning: {top: '#4aa8ff', bottom: '#fff1cf', fog: '#ffeccc', hemi: ['#fff4dc', '#9fca86', 1.15], sun: ['#fff0c8', 2.5], amb: 0.38},
	golden: {top: '#6f8dff', bottom: '#ffcf7a', fog: '#ffd9a0', hemi: ['#ffe4b8', '#a08a5a', 1.05], sun: ['#ffb85c', 2.4], amb: 0.35},
	nightblue: {top: '#060c2c', bottom: '#223a80', fog: '#182a5c', hemi: ['#8198ff', '#1a2250', 0.9], sun: ['#a6b8ff', 1.0], amb: 0.32},
	valley: {top: '#59b7ff', bottom: '#ffe9b8', fog: '#fff0d0', hemi: ['#fff6e0', '#9fdc7a', 1.25], sun: ['#fff0c0', 2.8], amb: 0.45},
	interiorNight: {top: '#2b2440', bottom: '#2b2440', fog: '#2b2440', hemi: ['#b8a6ff', '#3a2a40', 0.55], sun: ['#9fb0ff', 0.5], amb: 0.3},
};

const Environment: React.FC<{ambiance: Ambiance; fogNear: number; fogFar: number}> = ({ambiance, fogNear, fogFar}) => {
	const {scene} = useThree();
	const a = AMB[ambiance];
	useLayoutEffect(() => {
		scene.background = skyTexture(a.top, a.bottom);
		scene.fog = new THREE.Fog(a.fog, fogNear, fogFar);
	}, [scene, a, fogNear, fogFar]);
	return (
		<>
			<hemisphereLight args={[a.hemi[0], a.hemi[1], a.hemi[2]]} />
			<ambientLight intensity={a.amb} />
			<directionalLight
				position={[18, 30, 14]}
				intensity={a.sun[1]}
				color={a.sun[0]}
				castShadow
				shadow-mapSize-width={2048}
				shadow-mapSize-height={2048}
				shadow-camera-left={-32}
				shadow-camera-right={32}
				shadow-camera-top={32}
				shadow-camera-bottom={-32}
				shadow-camera-far={90}
				shadow-bias={-0.0004}
				shadow-normalBias={0.03}
			/>
		</>
	);
};

/** Une scène 3D plein écran : ciel, lumière, brouillard, caméra. */
export const Stage: React.FC<{
	camera: CameraShot;
	ambiance?: Ambiance;
	fogNear?: number;
	fogFar?: number;
	children: React.ReactNode;
}> = ({camera, ambiance = 'day', fogNear = 45, fogFar = 260, children}) => {
	const {width, height} = useVideoConfig();
	return (
		<ThreeCanvas
			width={width}
			height={height}
			shadows={{type: THREE.PCFSoftShadowMap}}
			gl={{antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.08}}
			dpr={1}
			camera={{fov: camera.fov ?? 40, position: camera.pos}}
		>
			<Environment ambiance={ambiance} fogNear={fogNear} fogFar={fogFar} />
			<CameraRig {...camera} />
			{children}
		</ThreeCanvas>
	);
};

/** Interpolation de caméra entre deux cadrages (travellings). */
export const lerpShot = (a: CameraShot, b: CameraShot, t: number): CameraShot => {
	const l = (x: number, y: number) => x + (y - x) * t;
	const lv = (x: Vec3, y: Vec3): Vec3 => [l(x[0], y[0]), l(x[1], y[1]), l(x[2], y[2])];
	return {
		pos: lv(a.pos, b.pos),
		target: lv(a.target, b.target),
		fov: l(a.fov ?? 40, b.fov ?? 40),
		roll: l(a.roll ?? 0, b.roll ?? 0),
		shake: l(a.shake ?? 0, b.shake ?? 0),
	};
};
