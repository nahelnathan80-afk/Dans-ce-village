import React, {useMemo} from 'react';
import * as THREE from 'three';
import {Emotion, FaceStyle, getFaceTexture} from './faceTexture';
import {LOOK, blobTex, fabric, roundedBox, skin as skinMat} from './look';

/** Apparence d'un personnage blocky (tout est paramétrable → nouveaux habitants en 1 ligne). */
export type CharacterLook = {
	skin: string;
	shirt: string;
	pants: string;
	shoes?: string;
	hair: string;
	hairStyle?: 'short' | 'bun' | 'bald' | 'long' | 'spiky' | 'pigtails' | 'none';
	hat?: 'toque' | 'cap' | 'beret' | 'bowler' | 'beanie' | 'pumpkin' | 'none';
	headphones?: string; // casque audio vintage (couleur)
	overalls?: string; // salopette (couleur)
	cardigan?: string; // gilet ouvert (couleur)
	bowtie?: string; // nœud papillon (couleur)
	coat?: string; // manteau long (couleur)
	hatColor?: string;
	apron?: string;
	sash?: boolean; // écharpe tricolore du maire
	chain?: boolean; // grosse chaîne dorée
	stripes?: string; // rayures (pyjama)
	hoodie?: boolean;
	tie?: string; // cravate (couleur) sur chemise blanche, veste = shirt
	face?: Partial<FaceStyle>;
	scale?: number;
};

export type Pose = {
	/** rotations des bras [avant/arrière (x), écartement (z)] en radians */
	armL?: [number, number];
	armR?: [number, number];
	legL?: number;
	legR?: number;
	headTurn?: number;
	headTilt?: number;
	headNod?: number;
	lean?: number;
	twist?: number;
};

export type CharacterProps = {
	look: CharacterLook;
	emotion?: Emotion;
	mouthOpen?: number;
	eyes?: [number, number];
	blink?: boolean;
	pose?: Pose;
	/** phase de marche (radians) — si défini, anime jambes et bras */
	walk?: number;
	walkAmp?: number;
	/** squash & stretch vertical (1 = neutre) */
	squash?: number;
	bob?: number;
	/** assis (sur une chaise / un fauteuil) */
	sit?: boolean;
	position?: [number, number, number];
	rotation?: [number, number, number];
	children?: React.ReactNode; // accessoire tenu en main droite
	leftHand?: React.ReactNode;
};

const mat = (color: string) => new THREE.MeshStandardMaterial({color, roughness: 0.75, metalness: 0});
const matCache = new Map<string, THREE.MeshStandardMaterial>();
export const M = (color: string) => {
	let m = matCache.get(color);
	if (!m) {
		m = mat(color);
		matCache.set(color, m);
	}
	return m;
};

let SKIN = '';
const Box: React.FC<{
	size: [number, number, number];
	position?: [number, number, number];
	rotation?: [number, number, number];
	color: string;
}> = ({size, position, rotation, color}) =>
	LOOK.cine ? (
		<mesh position={position} rotation={rotation} castShadow receiveShadow material={color === SKIN ? skinMat(color) : fabric(color)} geometry={roundedBox(size[0], size[1], size[2])} />
	) : (
		<mesh position={position} rotation={rotation} castShadow receiveShadow material={M(color)}>
			<boxGeometry args={size} />
		</mesh>
	);

export const Character: React.FC<CharacterProps> = ({
	look,
	emotion = 'neutral',
	mouthOpen = 0,
	eyes = [0, 0],
	blink = false,
	pose = {},
	walk,
	walkAmp = 1,
	squash = 1,
	bob = 0,
	sit = false,
	position = [0, 0, 0],
	rotation = [0, 0, 0],
	children,
	leftHand,
}) => {
	SKIN = look.skin;
	const faceStyle: FaceStyle = {skin: look.skin, ...look.face};
	const faceTex = getFaceTexture(faceStyle, emotion, mouthOpen, eyes, blink);
	const headMats = useMemo(() => {
		const s = LOOK.cine ? skinMat(look.skin) : M(look.skin);
		return [s, s, s, s, null, s];
	}, [look.skin]);
	const faceMat = useMemo(() => new THREE.MeshStandardMaterial({roughness: LOOK.cine ? 0.5 : 0.8}), []);
	faceMat.map = faceTex;
	faceMat.needsUpdate = true;
	const mats = [...headMats.slice(0, 4), faceMat, headMats[5]] as THREE.Material[];

	let armL = pose.armL ?? [0, 0.08];
	let armR = pose.armR ?? [0, -0.08];
	let legL = pose.legL ?? 0;
	let legR = pose.legR ?? 0;
	let walkBob = 0;
	if (sit) {
		legL = pose.legL ?? -1.45;
		legR = pose.legR ?? -1.45;
	}
	if (walk !== undefined) {
		const s = Math.sin(walk) * 0.7 * walkAmp;
		legL += s;
		legR -= s;
		if (!pose.armL) armL = [-s * 0.9, 0.08];
		if (!pose.armR) armR = [s * 0.9, -0.08];
		walkBob = Math.abs(Math.cos(walk)) * 0.12 * walkAmp;
	}
	const sc = look.scale ?? 1;
	const sx = 1 / Math.sqrt(squash);
	const hatColor = look.hatColor ?? '#ffffff';

	return (
		<group position={position} rotation={rotation} scale={[sc * sx, sc * squash, sc * sx]}>
			{LOOK.cine && !sit && (
				<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0.02]} renderOrder={1}>
					<planeGeometry args={[1.9, 1.3]} />
					<meshBasicMaterial map={blobTex()} transparent depthWrite={false} opacity={0.8} />
				</mesh>
			)}
			<group position={[0, walkBob + bob + (sit ? -0.4 : 0), 0]} rotation={[pose.lean ?? 0, pose.twist ?? 0, 0]}>
				{/* Jambes (pivot à la hanche) */}
				{([[-0.24, legL], [0.24, legR]] as const).map(([x, r], i) => (
					<group key={i} position={[x, 0.9, 0]} rotation={[r, 0, 0]}>
						<Box size={[0.42, 0.75, 0.44]} position={[0, -0.37, 0]} color={look.pants} />
						<Box size={[0.44, 0.17, 0.52]} position={[0, -0.82, 0.04]} color={look.shoes ?? '#3b2a20'} />
					</group>
				))}
				{/* Corps */}
				<Box size={[0.98, 1.0, 0.56]} position={[0, 1.4, 0]} color={look.shirt} />
				{look.hoodie && <Box size={[0.9, 0.3, 0.3]} position={[0, 1.95, -0.25]} color={look.shirt} />}
				{look.tie && (
					<>
						<Box size={[0.34, 0.7, 0.03]} position={[0, 1.55, 0.28]} color="#ffffff" />
						<Box size={[0.13, 0.62, 0.04]} position={[0, 1.5, 0.3]} color={look.tie} />
						<Box size={[0.18, 0.12, 0.05]} position={[0, 1.83, 0.3]} color={look.tie} />
					</>
				)}
				{look.overalls && (
					<>
						<Box size={[0.86, 0.62, 0.6]} position={[0, 1.2, 0]} color={look.overalls} />
						{[-0.26, 0.26].map((x) => (
							<Box key={x} size={[0.14, 0.5, 0.6]} position={[x, 1.66, 0]} color={look.overalls!} />
						))}
						{[-0.26, 0.26].map((x) => (
							<Box key={'b' + x} size={[0.1, 0.1, 0.62]} position={[x, 1.55, 0]} color="#3a3a3a" />
						))}
					</>
				)}
				{look.cardigan &&
					[-1, 1].map((sd) => <Box key={sd} size={[0.36, 1.02, 0.6]} position={[sd * 0.32, 1.4, 0]} color={look.cardigan!} />)}
				{look.coat && (
					<>
						{[-1, 1].map((sd) => <Box key={sd} size={[0.4, 1.5, 0.62]} position={[sd * 0.3, 1.15, 0]} color={look.coat!} />)}
						<Box size={[1.0, 0.16, 0.62]} position={[0, 1.86, 0]} color={look.coat} />
					</>
				)}
				{look.bowtie && (
					<group position={[0, 1.82, 0.3]}>
						<mesh rotation={[0, 0, Math.PI / 2]} position={[-0.11, 0, 0]} material={M(look.bowtie)}>
							<coneGeometry args={[0.1, 0.18, 4]} />
						</mesh>
						<mesh rotation={[0, 0, -Math.PI / 2]} position={[0.11, 0, 0]} material={M(look.bowtie)}>
							<coneGeometry args={[0.1, 0.18, 4]} />
						</mesh>
						<Box size={[0.08, 0.08, 0.08]} color={look.bowtie} />
					</group>
				)}
				{look.apron && (
					<>
						<Box size={[0.8, 0.95, 0.04]} position={[0, 1.25, 0.3]} color={look.apron} />
						<Box size={[0.2, 0.1, 0.06]} position={[0, 1.55, 0.33]} color="#e8d9c0" />
					</>
				)}
				{look.chain && (
					<mesh position={[0, 1.62, 0.3]} rotation={[0.2, 0, 0]} material={M('#f5c518')}>
						<torusGeometry args={[0.3, 0.05, 8, 20, Math.PI]} />
					</mesh>
				)}
				{look.stripes &&
					[1.15, 1.45, 1.75].map((y) => <Box key={y} size={[1.0, 0.1, 0.58]} position={[0, y, 0]} color={look.stripes!} />)}
				{look.sash && (
					<group position={[0, 1.42, 0]} rotation={[0, 0, -0.75]}>
						<Box size={[0.2, 1.38, 0.6]} position={[-0.16, 0, 0]} color="#1f4fd8" />
						<Box size={[0.17, 1.38, 0.6]} position={[0.02, 0, 0]} color="#ffffff" />
						<Box size={[0.17, 1.38, 0.6]} position={[0.19, 0, 0]} color="#e6262f" />
					</group>
				)}
				{/* Bras (pivot à l'épaule) */}
				<group position={[-0.66, 1.82, 0]} rotation={[armL[0], 0, -armL[1]]}>
					<Box size={[0.34, 0.86, 0.38]} position={[0, -0.36, 0]} color={look.shirt} />
					<Box size={[0.3, 0.22, 0.32]} position={[0, -0.87, 0]} color={look.skin} />
					<group position={[0, -0.95, 0.05]}>{leftHand}</group>
				</group>
				<group position={[0.66, 1.82, 0]} rotation={[armR[0], 0, armR[1]]}>
					<Box size={[0.34, 0.86, 0.38]} position={[0, -0.36, 0]} color={look.shirt} />
					<Box size={[0.3, 0.22, 0.32]} position={[0, -0.87, 0]} color={look.skin} />
					<group position={[0, -0.95, 0.05]}>{children}</group>
				</group>
				{/* Tête */}
				<group
					position={[0, 1.92, 0]}
					rotation={[pose.headNod ?? 0, pose.headTurn ?? 0, pose.headTilt ?? 0]}
				>
					{LOOK.cine ? (
						<mesh position={[0, 0.5, 0]} material={mats} castShadow geometry={roundedBox(1, 1, 1)} />
					) : (
						<mesh position={[0, 0.5, 0]} material={mats} castShadow>
							<boxGeometry args={[1, 1, 1]} />
						</mesh>
					)}
					<Hair look={look} />
					{look.hat === 'toque' && (
						<group position={[0, 1.2, 0]}>
							<mesh castShadow material={M(hatColor)} position={[0, 0.02, 0]}>
								<cylinderGeometry args={[0.5, 0.5, 0.2, 16]} />
							</mesh>
							<mesh castShadow material={M(hatColor)} position={[0, 0.36, 0]}>
								<cylinderGeometry args={[0.6, 0.47, 0.5, 16]} />
							</mesh>
						</group>
					)}
					{look.hat === 'cap' && (
						<group position={[0, 1.04, 0]}>
							<Box size={[1.06, 0.2, 1.06]} color={hatColor} />
							<Box size={[0.8, 0.06, 0.45]} position={[0, -0.06, -0.72]} color={hatColor} />
						</group>
					)}
					{look.hat === 'bowler' && (
						<group position={[0, 1.12, 0]}>
							<mesh castShadow material={M(hatColor)} position={[0, 0.02, 0]}>
								<cylinderGeometry args={[0.78, 0.78, 0.06, 20]} />
							</mesh>
							<mesh castShadow material={M(hatColor)} position={[0, 0.28, 0]} scale={[1, 0.85, 1]}>
								<sphereGeometry args={[0.52, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
							</mesh>
							<mesh material={M('#7a1010')} position={[0, 0.1, 0]}>
								<cylinderGeometry args={[0.53, 0.53, 0.1, 20]} />
							</mesh>
						</group>
					)}
					{look.hat === 'beanie' && (
						<group position={[0, 1.0, 0]}>
							<Box size={[1.12, 0.42, 1.12]} position={[0, 0.12, 0]} color={hatColor} />
							<Box size={[1.16, 0.16, 1.16]} position={[0, -0.06, 0]} color={hatColor} />
							<mesh castShadow material={LOOK.cine ? fabric('#f5e6a8') : M('#f5e6a8')} position={[0, 0.46, 0]}>
								<sphereGeometry args={[0.16, 12, 10]} />
							</mesh>
						</group>
					)}
					{look.hat === 'pumpkin' && (
						<group position={[0, 1.02, 0]}>
							<mesh castShadow position={[0, 0.02, 0]}>
								<cylinderGeometry args={[0.8, 0.8, 0.06, 24]} />
								<meshStandardMaterial color="#1b1b1b" roughness={0.5} />
							</mesh>
							<mesh castShadow position={[0, 0.42, 0]} scale={[1, 0.8, 1]}>
								<sphereGeometry args={[0.52, 20, 14]} />
								<meshStandardMaterial color="#f07a12" roughness={0.45} />
							</mesh>
							<mesh castShadow position={[0.04, 0.88, 0]} rotation={[0, 0, -0.3]}>
								<cylinderGeometry args={[0.05, 0.08, 0.26, 8]} />
								<meshStandardMaterial color="#4a6b2a" />
							</mesh>
						</group>
					)}
					{look.headphones && (
						<group>
							<mesh castShadow position={[0, 1.12, 0]} rotation={[0, 0, 0]}>
								<torusGeometry args={[0.62, 0.06, 8, 24, Math.PI]} />
								<meshStandardMaterial color="#3a2a1a" roughness={0.4} metalness={0.3} />
							</mesh>
							{[-1, 1].map((sd) => (
								<group key={sd} position={[sd * 0.6, 0.52, 0]}>
									<mesh castShadow rotation={[0, 0, Math.PI / 2]}>
										<cylinderGeometry args={[0.26, 0.26, 0.18, 20]} />
										<meshStandardMaterial color={look.headphones} roughness={0.35} metalness={0.2} />
									</mesh>
									<mesh position={[sd * 0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
										<cylinderGeometry args={[0.18, 0.18, 0.04, 20]} />
										<meshStandardMaterial color="#c9a227" metalness={0.8} roughness={0.25} />
									</mesh>
								</group>
							))}
						</group>
					)}
					{look.hat === 'beret' && (
						<mesh castShadow material={M(hatColor)} position={[0.05, 1.06, 0]} scale={[1, 0.3, 1]}>
							<sphereGeometry args={[0.6, 16, 10]} />
						</mesh>
					)}
				</group>
			</group>
		</group>
	);
};

const Hair: React.FC<{look: CharacterLook}> = ({look}) => {
	const c = look.hair;
	switch (look.hairStyle ?? 'short') {
		case 'none':
			return null;
		case 'bald':
			return (
				<>
					<Box size={[1.06, 0.3, 0.7]} position={[0, 0.62, -0.2]} color={c} />
					<Box size={[1.06, 0.6, 0.12]} position={[0, 0.55, -0.5]} color={c} />
				</>
			);
		case 'bun':
			return (
				<>
					<Box size={[1.08, 0.24, 1.08]} position={[0, 1.04, 0]} color={c} />
					<Box size={[1.08, 0.75, 0.16]} position={[0, 0.62, -0.5]} color={c} />
					<Box size={[0.12, 0.55, 1.08]} position={[-0.5, 0.72, 0]} color={c} />
					<Box size={[0.12, 0.55, 1.08]} position={[0.5, 0.72, 0]} color={c} />
					<mesh castShadow material={M(c)} position={[0, 1.32, -0.15]}>
						<sphereGeometry args={[0.3, 14, 10]} />
					</mesh>
				</>
			);
		case 'long':
			return (
				<>
					<Box size={[1.08, 0.24, 1.08]} position={[0, 1.04, 0]} color={c} />
					<Box size={[1.1, 1.25, 0.18]} position={[0, 0.4, -0.5]} color={c} />
					<Box size={[0.14, 1.1, 1.0]} position={[-0.52, 0.45, -0.04]} color={c} />
					<Box size={[0.14, 1.1, 1.0]} position={[0.52, 0.45, -0.04]} color={c} />
					<Box size={[1.08, 0.18, 0.2]} position={[0, 0.9, 0.48]} color={c} />
				</>
			);
		case 'pigtails':
			return (
				<>
					<Box size={[1.08, 0.24, 1.08]} position={[0, 1.04, 0]} color={c} />
					<Box size={[1.08, 0.2, 0.22]} position={[0, 0.9, 0.46]} color={c} />
					<Box size={[1.08, 0.7, 0.14]} position={[0, 0.66, -0.5]} color={c} />
					{[-1, 1].map((sd) => (
						<group key={sd} position={[sd * 0.68, 0.8, -0.05]} rotation={[0, 0, sd * -0.5]}>
							<mesh castShadow material={M(c)} position={[sd * 0.12, -0.15, 0]} scale={[0.75, 1.2, 0.75]}>
								<sphereGeometry args={[0.28, 12, 10]} />
							</mesh>
							<Box size={[0.14, 0.14, 0.14]} position={[0, 0.08, 0]} color="#ff4d8d" />
						</group>
					))}
				</>
			);
		case 'spiky':
			return (
				<>
					<Box size={[1.08, 0.24, 1.08]} position={[0, 1.04, 0]} color={c} />
					{[-0.3, 0, 0.3].map((x, i) => (
						<Box key={i} size={[0.26, 0.3, 0.26]} position={[x, 1.25, 0.25 - i * 0.12]} rotation={[0.3, 0, (x * 0.8)]} color={c} />
					))}
					<Box size={[1.08, 0.6, 0.14]} position={[0, 0.72, -0.5]} color={c} />
				</>
			);
		default:
			return (
				<>
					<Box size={[1.08, 0.24, 1.08]} position={[0, 1.04, 0]} color={c} />
					<Box size={[1.08, 0.18, 0.22]} position={[0, 0.9, 0.46]} color={c} />
					<Box size={[1.08, 0.6, 0.14]} position={[0, 0.72, -0.5]} color={c} />
					<Box size={[0.12, 0.4, 1.08]} position={[-0.5, 0.8, 0]} color={c} />
					<Box size={[0.12, 0.4, 1.08]} position={[0.5, 0.8, 0]} color={c} />
				</>
			);
	}
};
