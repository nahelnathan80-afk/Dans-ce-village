import React from 'react';
import {Composition} from 'remotion';
import {TestScene} from './TestScene';
import {Episode} from './episodes/ep01/Episode';
import {ep01, FPS} from './episodes/ep01/data';
import {Episode02} from './episodes/ep02/Episode';
import {ep02} from './episodes/ep02/data';
import {Episode03} from './episodes/ep03/Episode';
import {ep03} from './episodes/ep03/data';

export const RemotionRoot: React.FC = () => (
	<>
		<Composition id="Ep01" component={Episode} width={1080} height={1920} fps={FPS} durationInFrames={ep01.tl.durationInFrames} />
		<Composition id="Ep02" component={Episode02} width={1080} height={1920} fps={FPS} durationInFrames={ep02.tl.durationInFrames} />
		<Composition id="Ep03" component={Episode03} width={1080} height={1920} fps={FPS} durationInFrames={ep03.tl.durationInFrames} />
		<Composition id="TestWide" component={TestScene} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={{view: 'wide' as const}} />
		<Composition id="TestClose" component={TestScene} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={{view: 'close' as const}} />
	</>
);
