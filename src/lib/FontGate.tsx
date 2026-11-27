import React, {useEffect, useState} from 'react';
import {loadFonts} from './fonts';

/** N'affiche les enfants qu'une fois la police chargée (les textures 3D en dépendent). */
export const FontGate: React.FC<{children: React.ReactNode}> = ({children}) => {
	const [ok, setOk] = useState(false);
	useEffect(() => {
		loadFonts().then(() => setOk(true));
	}, []);
	return ok ? <>{children}</> : null;
};
