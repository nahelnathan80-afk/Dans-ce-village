import React, {useLayoutEffect} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {skyTexture} from './textures';
import {useFrame} from '@react-three/fiber';
import {BlendFunction, BloomEffect, BrightnessContrastEffect, DepthOfFieldEffect, EffectComposer, EffectPass, HueSaturationEffect, NoiseEffect, RenderPass, SMAAEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect} from 'postprocessing';
// @ts-expect-error pas de types fournis
import {N8AOPostPass} from 'n8ao';
import {LOOK, beamTex} from './look';

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
	/** profondeur de champ (rendu cinéma) : flou d'arrière-plan, 0 = aucun, 1 = gros plan */
	dof?: number;
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

export type Ambiance = 'day' | 'night' | 'interior' | 'sunset' | 'morning' | 'golden' | 'nightblue' | 'valley' | 'interiorNight' | 'autumnMorning' | 'autumnGrey' | 'rainNight' | 'brightMorning' | 'interiorWarm';

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
	// ép. 06 — automne
	autumnMorning: {top: '#5d93d6', bottom: '#ffd29a', fog: '#f3c890', hemi: ['#ffe2b8', '#8a5a2a', 0.9], sun: ['#ffb75e', 3.4], amb: 0.18},
	autumnGrey: {top: '#7c8794', bottom: '#c9c3b6', fog: '#b9b4aa', hemi: ['#d9dde3', '#5d5a4c', 1.0], sun: ['#e6e8ee', 1.1], amb: 0.3},
	rainNight: {top: '#050b1f', bottom: '#1b2c5a', fog: '#15223f', hemi: ['#6f86d8', '#141a30', 0.7], sun: ['#8fa6ff', 0.7], amb: 0.2},
	brightMorning: {top: '#4f9cf0', bottom: '#fff0cf', fog: '#ffe6bf', hemi: ['#fff1d8', '#9a7a3a', 1.0], sun: ['#ffd08a', 3.2], amb: 0.25},
	interiorWarm: {top: '#3a2614', bottom: '#3a2614', fog: '#3a2614', hemi: ['#ffd9a0', '#5a3a20', 0.6], sun: ['#ffc070', 0.6], amb: 0.25},
};
/** soleil bas d'automne pour le rendu cinéma */
const SUN: Partial<Record<Ambiance, Vec3>> = {autumnMorning: [26, 10, 14], brightMorning: [22, 14, 16], autumnGrey: [10, 30, 10], rainNight: [-12, 25, 8]};

const Environment: React.FC<{ambiance: Ambiance; fogNear: number; fogFar: number}> = ({ambiance, fogNear, fogFar}) => {
	const {scene} = useThree();
	const a = AMB[ambiance];
	useLayoutEffect(() => {
		scene.background = skyTexture(a.top, a.bottom);
		// cinéma : brume légère au loin (exponentielle), sinon brouillard linéaire d'origine
		if (LOOK.cine) {
			// éclairage d'ambiance par l'environnement (lumière qui rebondit : ciel au-dessus, sol chaud en dessous)
			const cv = document.createElement('canvas');
			cv.width = 256;
			cv.height = 128;
			const g = cv.getContext('2d')!;
			const gr = g.createLinearGradient(0, 0, 0, 128);
			gr.addColorStop(0, a.top);
			gr.addColorStop(0.48, a.bottom);
			gr.addColorStop(0.52, a.hemi[1]);
			gr.addColorStop(1, a.hemi[1]);
			g.fillStyle = gr;
			g.fillRect(0, 0, 256, 128);
			const env = new THREE.CanvasTexture(cv);
			env.mapping = THREE.EquirectangularReflectionMapping;
			env.colorSpace = THREE.SRGBColorSpace;
			scene.environment = env;
			scene.environmentIntensity = 0.55;
		}
		scene.fog = LOOK.cine ? new THREE.FogExp2(a.fog, ambiance === 'rainNight' ? 0.016 : ambiance.startsWith('interior') ? 0.006 : 0.0065) : new THREE.Fog(a.fog, fogNear, fogFar);
	}, [scene, a, fogNear, fogFar, ambiance]);
	const sunPos: Vec3 = (LOOK.cine && SUN[ambiance]) || [18, 30, 14];
	return (
		<>
			<hemisphereLight args={[a.hemi[0], a.hemi[1], a.hemi[2]]} />
			<ambientLight intensity={a.amb} />
			<directionalLight
				position={sunPos}
				intensity={a.sun[1]}
				color={a.sun[0]}
				castShadow
				shadow-mapSize-width={LOOK.cine ? 3072 : 2048}
				shadow-mapSize-height={LOOK.cine ? 3072 : 2048}
				shadow-radius={LOOK.cine ? 6 : 1}
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

/** Rayons de soleil visibles (lumière volumétrique simulée) autour de la cible, dans l'axe du soleil. */
const SunBeams: React.FC<{target: Vec3; cam: Vec3; sun: Vec3; strength?: number}> = ({target, cam, sun, strength = 1}) => {
	const frame = useCurrentFrame();
	const axis = new THREE.Vector3(...sun).normalize();
	const toCam = new THREE.Vector3(cam[0] - target[0], cam[1] - target[1], cam[2] - target[2]);
	const n = toCam.sub(axis.clone().multiplyScalar(toCam.dot(axis))).normalize();
	const x = new THREE.Vector3().crossVectors(axis, n).normalize();
	const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, axis, n));
	const beams = [[-3.2, 0.9, 0.0], [-1.2, 1.6, 1.3], [0.9, 1.1, 2.1], [2.8, 2.0, 0.6], [4.6, 1.3, 3.0]];
	return (
		<group position={target}>
			{beams.map(([off, w, ph], i) => (
				<mesh key={i} quaternion={q} position={x.clone().multiplyScalar(off).add(axis.clone().multiplyScalar(4)).toArray() as Vec3}>
					<planeGeometry args={[w, 22]} />
					<meshBasicMaterial map={beamTex()} transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false}
						opacity={strength * (0.13 + 0.05 * Math.sin(frame / 25 + ph))} side={THREE.DoubleSide} />
				</mesh>
			))}
		</group>
	);
};

/**
 * Post-traitement « film d'animation » : occlusion ambiante, profondeur de champ, bloom, étalonnage chaud,
 * tone mapping ACES, vignette, grain, anti-crénelage SMAA.
 * Créé de façon SYNCHRONE (sinon la 1re image d'un plan serait noire au rendu Remotion).
 */
const CinePost: React.FC<{dofDist?: number; ambiance: Ambiance}> = ({dofDist, ambiance}) => {
	const {gl, scene, camera, size} = useThree();
	const night = ambiance === 'rainNight' || ambiance === 'nightblue';
	const composer = React.useMemo(() => {
		const c = new EffectComposer(gl, {multisampling: 0, frameBufferType: THREE.HalfFloatType});
		c.addPass(new RenderPass(scene, camera));
		const ao = new N8AOPostPass(scene, camera, size.width, size.height);
		ao.configuration.aoRadius = 1.4;
		ao.configuration.distanceFalloff = 1.0;
		ao.configuration.intensity = 2.4;
		ao.configuration.halfRes = true;
		ao.setQualityMode('Performance');
		c.addPass(ao);
		const effects = [];
		if (dofDist) {
			const dof = new DepthOfFieldEffect(camera, {worldFocusDistance: dofDist, worldFocusRange: Math.max(0.7, dofDist * 0.35), bokehScale: 3.2});
			effects.push(dof);
		}
		effects.push(new BloomEffect({mipmapBlur: true, luminanceThreshold: night ? 0.55 : 0.82, luminanceSmoothing: 0.2, intensity: night ? 0.9 : 0.45}));
		c.addPass(new EffectPass(camera, ...effects));
		const grain = new NoiseEffect({blendFunction: BlendFunction.OVERLAY, premultiply: false});
		grain.blendMode.opacity.value = 0.06;
		c.addPass(new EffectPass(camera,
			new HueSaturationEffect({saturation: night ? 0.0 : 0.12}),
			new BrightnessContrastEffect({contrast: 0.06}),
			new ToneMappingEffect({mode: ToneMappingMode.ACES_FILMIC}),
			new VignetteEffect({offset: 0.32, darkness: 0.42}),
			grain,
			new SMAAEffect(),
		));
		c.setSize(size.width, size.height);
		return c;
	}, [gl, scene, camera, size.width, size.height, dofDist, night]);
	React.useEffect(() => () => composer.dispose(), [composer]);
	useFrame((_, delta) => {
		composer.render(delta);
	}, 1);
	return null;
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
	const cine = LOOK.cine;
	const dofDist = cine && camera.dof ? Math.hypot(camera.pos[0] - camera.target[0], camera.pos[1] - camera.target[1], camera.pos[2] - camera.target[2]) : 0;
	const sun = SUN[ambiance];
	return (
		<ThreeCanvas
			width={width}
			height={height}
			shadows={{type: THREE.PCFSoftShadowMap}}
			gl={{antialias: !cine, preserveDrawingBuffer: true, toneMapping: cine ? THREE.NoToneMapping : THREE.NeutralToneMapping, toneMappingExposure: cine ? 1.0 : 1.08}}
			dpr={1}
			camera={{fov: camera.fov ?? 40, position: camera.pos}}
		>
			<Environment ambiance={ambiance} fogNear={fogNear} fogFar={fogFar} />
			<CameraRig {...camera} />
			{children}
			{cine && sun && (ambiance === 'autumnMorning' || ambiance === 'brightMorning') && <SunBeams target={camera.target} cam={camera.pos} sun={sun} />}
			{cine && <CinePost dofDist={dofDist} ambiance={ambiance} />}
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
