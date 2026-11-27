import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// Rendu 3D sans GPU : ANGLE + SwiftShader dans Chromium headless.
Config.setChromiumOpenGlRenderer('angle');
Config.setConcurrency(2);
Config.setBrowserExecutable(process.env.REMOTION_BROWSER ?? '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell');
