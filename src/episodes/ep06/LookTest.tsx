/** 4 images de test du rendu (avant / après) : place le matin, gros plan Grisou, nuit sous la pluie, chorale finale. */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage} from '../../three/Stage';
import {Character, CharacterLook} from '../../three/Character';
import {setCine} from '../../three/look';
import {FallingLeaves, Frog, GRISOU_HOUSE, Grass, HOUSES, Puddle, PumpkinVillage, Rain, Villager, WoodSign} from '../../three/Pumpkins';
import script from './script.json';

const C = script.cast as unknown as Record<string, CharacterLook>;

export const LookTest: React.FC<{scene: 'place' | 'grisou' | 'pluie' | 'chorale'; cine: boolean}> = ({scene, cine}) => {
	setCine(cine);
	const f = useCurrentFrame() + 40;
	const g = HOUSES[GRISOU_HOUSE].p;
	if (scene === 'place')
		return (
			<AbsoluteFill>
				<Stage camera={{pos: [6, 6.5, 30], target: [0, 2.4, 10], fov: 46}} ambiance="autumnMorning">
					<PumpkinVillage f={f}>
						<WoodSign lines={['VILLAGE CITROUILLE', '— ICI, ON CHANTE —']} position={[-1.5, 0, 21]} rotY={0.15} />
						{cine && <FallingLeaves center={[0, 0, 18]} f={f} />}
						{cine && <Grass center={[0, 0, 20]} f={f} />}
						<Frog position={[2, 0, 20]} f={f} />
						<Character look={C.leon} position={[1.5, 0, 19.5]} rotation={[0, 0.3, 0]} emotion="happy" />
						<Character look={C.lou} position={[2.6, 0, 19.8]} rotation={[0, 0, 0]} emotion="happy" />
					</PumpkinVillage>
				</Stage>
			</AbsoluteFill>
		);
	if (scene === 'grisou')
		return (
			<AbsoluteFill>
				<Stage camera={{pos: [g[0] * 0.75 + 1.2, 2.6, g[2] * 0.75 + 6.8], target: [g[0] * 0.75, 2.1, g[2] * 0.75], fov: 32, dof: 1}} ambiance="autumnMorning">
					<PumpkinVillage f={f}>
						<Character look={C.grisou} position={[g[0] * 0.75, 0, g[2] * 0.75]} rotation={[0, 0.2, 0]} emotion="angry" pose={{armL: [-1.2, 0.9], armR: [-1.2, -0.9]}} />
					</PumpkinVillage>
				</Stage>
			</AbsoluteFill>
		);
	if (scene === 'pluie')
		return (
			<AbsoluteFill>
				<Stage camera={{pos: [3, 3.2, 24], target: [0, 2.2, 13], fov: 46}} ambiance="rainNight">
					<PumpkinVillage f={f} health={(i) => (i === GRISOU_HOUSE ? 1 : 0)} lit={1} wet kiosk>
						{cine && <Rain center={[0, 0, 18]} f={f} />}
						<Puddle position={[0.6, 0, 19]} r={1.4} f={f} rain />
						<Puddle position={[-2.4, 0, 16]} r={1.0} f={f} rain />
						<Character look={C.leon} position={[0.8, 0, 18.4]} rotation={[0, 0.25, 0]} emotion="sad" />
					</PumpkinVillage>
				</Stage>
			</AbsoluteFill>
		);
	return (
		<AbsoluteFill>
			<Stage camera={{pos: [9, 5, 17], target: [0, 2.2, 3], fov: 46}} ambiance="brightMorning">
				<PumpkinVillage f={f} glow={(i) => (i % 3 === 0 ? 0.6 : 0)} lit={0.6}>
					{Array.from({length: 18}).map((_, i) => {
						const a = (i / 18) * Math.PI * 1.4 - 0.2;
						const r = 5 + (i % 3) * 1.4;
						return <Villager key={i} i={i} position={[Math.sin(a) * r, 0, Math.cos(a) * r]} rotY={Math.atan2(-Math.sin(a), -Math.cos(a))} f={f} sing={1} />;
					})}
					<Character look={C.grisou} position={[0, 0.72, 0]} rotation={[0, 0.5, 0]} emotion="moved" mouthOpen={0.7} pose={{armL: [-2.6, 0.4], armR: [-2.6, -0.4]}} />
					{cine && <FallingLeaves center={[2, 0, 6]} f={f} n={30} />}
				</PumpkinVillage>
			</Stage>
		</AbsoluteFill>
	);
};
