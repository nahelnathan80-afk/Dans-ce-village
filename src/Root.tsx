import React from 'react';
import {Composition} from 'remotion';
import {TestScene} from './TestScene';
import {Poster} from './posters/Posters';
import {Episode} from './episodes/ep01/Episode';
import {ep01, FPS} from './episodes/ep01/data';
import {Episode02} from './episodes/ep02/Episode';
import {ep02} from './episodes/ep02/data';
import {Episode03} from './episodes/ep03/Episode';
import {ep03} from './episodes/ep03/data';
import {Episode04} from './episodes/ep04/Episode';
import {ep04} from './episodes/ep04/data';
import {Episode05} from './episodes/ep05/Episode';
import {ep05} from './episodes/ep05/data';
import {LookTest} from './episodes/ep06/LookTest';

export const RemotionRoot: React.FC = () => (
	<>
		{[1, 2, 3, 4, 5, 6].map((n) => (
			<Composition key={n} id={`Photo${n}`} component={Poster} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={{n}} />
		))}
		<Composition id="Ep01" component={Episode} width={1080} height={1920} fps={FPS} durationInFrames={ep01.tl.durationInFrames} />
		<Composition id="Ep02" component={Episode02} width={1080} height={1920} fps={FPS} durationInFrames={ep02.tl.durationInFrames} />
		<Composition id="Ep03" component={Episode03} width={1080} height={1920} fps={FPS} durationInFrames={ep03.tl.durationInFrames} />
		<Composition id="Ep04" component={Episode04} width={1080} height={1920} fps={FPS} durationInFrames={ep04.tl.durationInFrames} />
		<Composition id="Ep05" component={Episode05} width={1080} height={1920} fps={FPS} durationInFrames={ep05.tl.durationInFrames} />
		{(['place', 'grisou', 'pluie', 'chorale'] as const).flatMap((sc) => [false, true].map((cine) => (
			<Composition key={sc + cine} id={`Look-${sc}-${cine ? 'apres' : 'avant'}`} component={LookTest} width={1080} height={1920} fps={30} durationInFrames={30} defaultProps={{scene: sc, cine}} />
		)))}
		<Composition id="TestWide" component={TestScene} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={{view: 'wide' as const}} />
		<Composition id="TestClose" component={TestScene} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={{view: 'close' as const}} />
	</>
);
