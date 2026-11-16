import { Capacitor } from '@capacitor/core';

export const IS_ARTIFACT = import.meta.env.VITE_ARTIFACT === '1';
/** True inside the installed Android/iOS app (Capacitor), false in a browser. */
export const IS_NATIVE = Capacitor.isNativePlatform();
/** True when the app runs inside the phone-frame demo page (app.html?frame=1). */
export const IS_EMBED = IS_ARTIFACT && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('frame');
