import React from 'react';
import {Composition} from 'remotion';
import {TestScene} from './TestScene';

export const RemotionRoot: React.FC = () => (
	<>
		<Composition id="TestWide" component={TestScene} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={{view: 'wide' as const}} />
		<Composition id="TestClose" component={TestScene} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={{view: 'close' as const}} />
	</>
);
