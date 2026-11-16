// Native (Android/iOS) features, used only inside the installed app (Capacitor).
// In a browser every function here quietly does nothing.
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { IS_NATIVE } from './env.js';

export const EMERGENCY_CHANNEL = 'emergency';
let notifId = 1000;

/** Ask for notification permission and create a high-priority "Emergency alerts" channel (Android). */
export async function nativeEnableAlerts() {
  if (!IS_NATIVE) return null;
  try {
    const p = await LocalNotifications.requestPermissions();
    await LocalNotifications.createChannel({
      id: EMERGENCY_CHANNEL,
      name: 'Emergency alerts',
      description: 'Flood and disaster check-ins, missing person alerts',
      importance: 5, // max: shows on screen, makes sound even in most "do not disturb" setups that allow alarms
      visibility: 1, // public: readable on the lock screen
      vibration: true,
      lights: true,
      lightColor: '#D32F2F',
    });
    return p.display === 'granted' ? 'granted' : p.display === 'denied' ? 'denied' : 'default';
  } catch {
    return 'denied';
  }
}

export async function nativePermission() {
  if (!IS_NATIVE) return null;
  try {
    const p = await LocalNotifications.checkPermissions();
    return p.display === 'granted' ? 'granted' : p.display === 'denied' ? 'denied' : 'default';
  } catch {
    return 'default';
  }
}

/** Show a real phone notification (notification shade + lock screen). */
export async function nativeNotify(title, body, url) {
  if (!IS_NATIVE) return;
  try {
    notifId += 1;
    await LocalNotifications.schedule({
      notifications: [{ id: notifId, title, body, largeBody: body, channelId: EMERGENCY_CHANNEL, extra: { url: url || '/' }, autoCancel: true }],
    });
  } catch { /* permission not granted: the in-app alert still shows */ }
}

export function nativeVibrate(strong = true) {
  if (!IS_NATIVE) return;
  Haptics.vibrate({ duration: strong ? 1500 : 300 }).catch(() => {});
}

/** Status bar colour, Android back button and notification taps. Returns a cleanup function. */
export function initNative({ navigate, theme }) {
  if (!IS_NATIVE) return () => {};
  SplashScreen.hide().catch(() => {});
  const subs = [];
  CapApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else CapApp.minimizeApp().catch(() => CapApp.exitApp());
  }).then((s) => subs.push(s));
  LocalNotifications.addListener('localNotificationActionPerformed', (e) => {
    const url = e.notification?.extra?.url;
    if (url) navigate(url);
  }).then((s) => subs.push(s));
  setStatusBar(theme);
  return () => subs.forEach((s) => s.remove());
}

export function setStatusBar(theme) {
  if (!IS_NATIVE) return;
  StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#0A0A0A' : '#B71C1C' }).catch(() => {});
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {}); // light icons on the red/black bar
}
