// Phone-style emergency alerts: a system notification (shows on the home / lock screen),
// an alarm sound made with Web Audio (no audio files needed, works offline) and vibration.
import { translate } from '../i18n/translate.js';
import { IS_NATIVE } from './env.js';
import { nativeEnableAlerts, nativeNotify, nativeVibrate } from './native.js';

let ctx = null;
let stopCurrent = null;

function audio() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** Browsers only allow sound after the user has tapped something. Call this from any tap. */
export function unlockAudio() {
  const c = audio();
  if (!c) return;
  // a silent blip "unlocks" audio on iOS/Safari
  const o = c.createOscillator();
  const g = c.createGain();
  g.gain.value = 0.0001;
  o.connect(g).connect(c.destination);
  o.start();
  o.stop(c.currentTime + 0.02);
}

function tone(c, freq, start, dur, type = 'square', vol = 0.18) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.02);
  g.gain.setValueAtTime(vol, start + dur - 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(c.destination);
  o.start(start);
  o.stop(start + dur + 0.02);
  return o;
}

/** Ambulance-style siren: a slow rising/falling "wail", then a fast "yelp", like an emergency vehicle. */
function ambulance(c, t0, seconds) {
  const master = c.createGain();
  master.gain.setValueAtTime(0.0001, t0);
  master.gain.exponentialRampToValueAtTime(0.22, t0 + 0.08);
  master.gain.setValueAtTime(0.22, t0 + seconds - 0.15);
  master.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
  // a gentle low-pass makes the raw waveform sound like a horn speaker instead of a buzzer
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2600;
  filter.Q.value = 0.7;
  filter.connect(master).connect(c.destination);
  const oscs = [['sawtooth', 0], ['square', 6]].map(([type, detune]) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.detune.value = detune;
    g.gain.value = type === 'square' ? 0.35 : 0.65;
    o.connect(g).connect(filter);
    return o;
  });
  const LOW = 650; const HIGH = 1500;
  const wailEnd = t0 + seconds * 0.55;
  oscs.forEach((o) => {
    const f = o.frequency;
    f.setValueAtTime(LOW, t0);
    let t = t0;
    while (t < wailEnd) { f.linearRampToValueAtTime(HIGH, t + 1.4); f.linearRampToValueAtTime(LOW, t + 2.6); t += 2.6; } // wail
    while (t < t0 + seconds) { f.linearRampToValueAtTime(HIGH, t + 0.17); f.linearRampToValueAtTime(LOW, t + 0.34); t += 0.34; } // yelp
    o.start(t0);
    o.stop(t0 + seconds + 0.05);
  });
  return oscs;
}

/** kind: 'siren' (ambulance-style emergency), 'missing' (person missing), 'chime' (short heads-up). */
export function playAlarm(kind = 'siren', seconds = 8) {
  stopAlarm();
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + 0.05;
  const nodes = [];
  if (kind === 'chime') {
    nodes.push(tone(c, 880, t0, 0.18, 'sine', 0.25), tone(c, 1320, t0 + 0.22, 0.3, 'sine', 0.25));
  } else if (kind === 'missing') {
    for (let i = 0; i < Math.floor(seconds / 1.2); i += 1) {
      const t = t0 + i * 1.2;
      nodes.push(tone(c, 1046, t, 0.16), tone(c, 1046, t + 0.22, 0.16), tone(c, 784, t + 0.44, 0.4));
    }
  } else {
    nodes.push(...ambulance(c, t0, seconds));
  }
  stopCurrent = () => nodes.forEach((o) => { try { o.stop(); } catch { /* already stopped */ } });
}

export function stopAlarm() {
  if (stopCurrent) stopCurrent();
  stopCurrent = null;
  try { navigator.vibrate?.(0); } catch { /* not supported */ }
}

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;
export const notificationPermission = () => (notificationsSupported() ? Notification.permission : 'unsupported');

/** Ask the phone for permission to show alerts. Must be called from a tap. */
export async function enableAlerts() {
  unlockAudio();
  if (IS_NATIVE) return nativeEnableAlerts();
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try { return await Notification.requestPermission(); } catch { return 'denied'; }
}

async function systemNotification(title, body, url, critical) {
  if (IS_NATIVE) return nativeNotify(title, body, url);
  if (notificationPermission() !== 'granted') return;
  const options = {
    body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'icheck-u-alert',
    renotify: true,
    requireInteraction: critical,
    vibrate: [600, 200, 600, 200, 900],
    data: { url: url || '/' },
  };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg) await reg.showNotification(title, options);
    else new Notification(title, options); // eslint-disable-line no-new
  } catch { /* some browsers block notifications from pages; the in-app alert still shows */ }
}

/** Called by the store for important push messages aimed at the current user. */
export function alertEffects(item, settings = {}) {
  const lang = settings.lang || 'en';
  const title = `iCheck-U · ${translate(lang, item.title)}`;
  const body = translate(lang, item.body || '');
  const big = item.kind === 'big'; // the first emergency check-in: full screen + siren
  const critical = item.level === 'critical';
  if (settings.alertSound !== false) {
    if (big) playAlarm('siren', 10);
    else if (item.level === 'missing') playAlarm('missing', 2.4);
    else playAlarm('chime');
  }
  if (IS_NATIVE) nativeVibrate(big);
  else try { navigator.vibrate?.(big ? [600, 200, 600, 200, 900] : [200]); } catch { /* not supported */ }
  try { navigator.setAppBadge?.(1); } catch { /* not supported */ }
  systemNotification(title, body, item.action, critical && big);
}

export function clearBadge() {
  try { navigator.clearAppBadge?.(); } catch { /* not supported */ }
}
