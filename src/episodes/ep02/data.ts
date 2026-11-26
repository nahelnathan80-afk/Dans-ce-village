import script from './script.json';
import timeline from './timeline.json';
import {Timeline, TimelineData} from '../../lib/timeline';

export const FPS = 30;

export const ep02 = {
	script,
	tl: new Timeline(timeline as TimelineData, {fps: FPS, payer: script.payer, startBalance: script.startBalance}),
};
