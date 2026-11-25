import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {Character} from './three/Character';
import {Stage} from './three/Stage';
import {PLACES, Village} from './three/Village';
import {CAST, villager} from './episodes/cast';
import {FontGate} from './lib/FontGate';
import {BalanceCounter} from './overlay/BalanceCounter';
import {Subtitles} from './overlay/Subtitles';
import {ep01} from './episodes/ep01/data';

/** Image de test : le village + Léon + habillage (validation du style). */
export const TestScene: React.FC<{view: 'wide' | 'close'}> = ({view}) => {
	const cam =
		view === 'wide'
			? {pos: [2, 7, 24] as [number, number, number], target: [0, 4, -4] as [number, number, number], fov: 50}
			: {pos: [-2.5, 2.7, 9.6] as [number, number, number], target: [-3.4, 2.15, 4] as [number, number, number], fov: 38};
	// on affiche l'habillage tel qu'il sera à un instant précis de l'épisode
	const at = view === 'wide' ? ep01.tl.fw('hook-1', 3) : ep01.tl.fw('hook-courez', 0) + 4;
	return (
		<AbsoluteFill style={{background: '#87ceeb'}}>
			<FontGate>
				<Stage camera={cam}>
					<Village />
					<Character look={CAST.leon} position={[-3.4, 0, 4]} rotation={[0, 0.25, 0]} emotion={view === 'close' ? 'panic' : 'happy'} mouthOpen={view === 'close' ? 1 : 0} pose={{armR: [-0.4, -0.6]}} />
					<Character look={CAST.maire} position={PLACES.estrade.toArray().map((v, i) => (i === 1 ? 0.6 : v)) as [number, number, number]} rotation={[0, -1.2, 0]} emotion="surprised" pose={{armL: [0, 2.2], armR: [0, 2.2]}} />
					<Character look={CAST.boulangere} position={[-5.8, 0, 0.5]} rotation={[0, 1.2, 0]} emotion="smug" />
					<Character look={CAST.kevin} position={[2.5, 0, 3]} rotation={[0, -0.4, 0]} emotion="panic" walk={1} />
					{[0, 1, 2, 3, 4].map((i) => (
						<Character key={i} look={villager(i)} position={[-1 + i * 1.6, 0, -6 + (i % 2)]} rotation={[0, 0.3 - i * 0.2, 0]} emotion="neutral" />
					))}
				</Stage>
				<Sequence from={-at}>
					<BalanceCounter tl={ep01.tl} />
					<Subtitles tl={ep01.tl} />
				</Sequence>
			</FontGate>
		</AbsoluteFill>
	);
};
