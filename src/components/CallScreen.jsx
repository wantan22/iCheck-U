import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, MicOff, Mic, Volume2, Grid3x3, MapPin, ShieldAlert } from 'lucide-react';
import { useStore } from '../store/useStore.js';
import { useT } from '../i18n/index.js';
import { cx } from '../utils/format.js';

// Malaysian ring-back tone: 425 Hz, 0.4 s on, 0.2 s off, 0.4 s on, 2 s off.
function ringback() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return () => {};
  const c = new AC();
  const g = c.createGain();
  g.gain.value = 0;
  const o = c.createOscillator();
  o.frequency.value = 425;
  o.connect(g).connect(c.destination);
  const t0 = c.currentTime + 0.05;
  for (let i = 0; i < 4; i += 1) {
    const t = t0 + i * 3;
    g.gain.setValueAtTime(0.12, t); g.gain.setValueAtTime(0, t + 0.4);
    g.gain.setValueAtTime(0.12, t + 0.6); g.gain.setValueAtTime(0, t + 1.0);
  }
  o.start(t0);
  o.stop(t0 + 12);
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    try { o.stop(); } catch { /* already stopped */ }
    c.close().catch(() => {});
  };
}

const SCRIPT = [
  [4, 'operator', '999, what is your emergency?'],
  [8, 'system', 'Your location and household details were sent to the operator.'],
  [11, 'operator', 'We can see your location in Taman Seri Harmoni. Help is being sent. Stay on the line.'],
  [17, 'operator', 'Move to the highest floor if water is rising. Do not walk through flood water.'],
];

/** Pretend phone call to 999 (demo only, no real call is placed). */
export default function CallScreen() {
  const t = useT();
  const call = useStore((s) => s.call);
  const endCall = useStore((s) => s.endCall);
  const hh = useStore((s) => s.households.find((h) => h.id === s.identity.householdId));
  const [now, setNow] = useState(Date.now());
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [keypad, setKeypad] = useState(false);
  const stopRing = useRef(() => {});

  useEffect(() => {
    if (!call) return undefined;
    stopRing.current = ringback();
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => { clearInterval(id); stopRing.current(); };
  }, [call]);
  if (!call) return null;

  const secs = Math.floor((now - call.startedAt) / 1000);
  const connected = secs >= 3;
  if (connected) stopRing.current();
  const talk = secs - 3;
  const timer = `${String(Math.floor(Math.max(0, talk) / 60)).padStart(2, '0')}:${String(Math.max(0, talk) % 60).padStart(2, '0')}`;
  const lines = SCRIPT.filter(([at]) => secs >= at);

  return (
    <div className="fixed inset-0 z-[1600] flex flex-col text-white bg-gradient-to-b from-[#2a0505] via-[#120202] to-black" role="dialog" aria-modal="true" aria-label={t('Calling 999')}>
      <p className="bg-brand text-neutral-900 text-center text-sm font-bold py-1.5 px-3">{t('DEMO — this is not a real call. In a real emergency, dial 999 from your phone.')}</p>
      <div className="flex-1 overflow-y-auto px-6 pt-10 pb-6 max-w-md w-full mx-auto flex flex-col items-center text-center [&>*]:shrink-0">
        <span className="relative grid place-items-center h-28 w-28 rounded-full bg-emergency shadow-[0_0_60px_rgba(229,57,53,0.55)]">
          {!connected && <span className="absolute inset-0 rounded-full bg-emergency/50 animate-ring" aria-hidden />}
          <ShieldAlert className="h-14 w-14" aria-hidden />
        </span>
        <p className="mt-6 text-5xl font-extrabold tracking-wider select-all">999</p>
        <p className="mt-1 text-lg text-white/80">{t('Malaysia Emergency Response Services')}</p>
        <p className="mt-3 text-xl font-semibold tabular-nums" aria-live="polite">{connected ? timer : t('Calling…')}</p>

        <div className="mt-6 w-full space-y-2 text-left" aria-live="polite">
          {hh && (
            <p className="flex items-center gap-2 text-sm text-white/80"><MapPin className="h-4 w-4 shrink-0" aria-hidden />{hh.shortAddress} · {hh.members.length} {t('people')}</p>
          )}
          {lines.map(([at, who, text]) => (
            <p key={at} className={cx('rounded-2xl px-4 py-2.5', who === 'operator' ? 'bg-white/10' : 'bg-safe/30 text-sm')}>
              {who === 'operator' && <span className="block text-xs font-bold text-brand">{t('Operator (simulated)')}</span>}
              {t(text)}
            </p>
          ))}
        </div>

        {keypad && (
          <div className="mt-4 grid grid-cols-3 gap-2 w-60" aria-label={t('Keypad')}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((k) => (
              <span key={k} className="h-14 rounded-full bg-white/10 grid place-items-center text-2xl font-semibold">{k}</span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-8 grid grid-cols-3 gap-6 w-full max-w-xs">
          {[
            [muted ? MicOff : Mic, 'Mute', muted, () => setMuted(!muted)],
            [Grid3x3, 'Keypad', keypad, () => setKeypad(!keypad)],
            [Volume2, 'Speaker', speaker, () => setSpeaker(!speaker)],
          ].map(([I, label, on, fn]) => (
            <button key={label} type="button" onClick={fn} aria-pressed={on} className="flex flex-col items-center gap-1.5 text-sm">
              <span className={cx('h-16 w-16 rounded-full grid place-items-center', on ? 'bg-white text-neutral-900' : 'bg-white/15')}><I className="h-7 w-7" aria-hidden /></span>
              {t(label)}
            </button>
          ))}
        </div>
        <button type="button" onClick={endCall} className="mt-8 h-[72px] w-[72px] rounded-full bg-emergency grid place-items-center shadow-xl hover:brightness-110" aria-label={t('End call')}>
          <PhoneOff className="h-8 w-8" aria-hidden />
        </button>
        <p className="mt-2 text-sm text-white/70">{t('End call')}</p>
      </div>
    </div>
  );
}

export function Call999Button({ className }) {
  const t = useT();
  const startCall = useStore((s) => s.startCall);
  return (
    <button type="button" onClick={startCall} className={cx('btn btn-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 w-full', className)}>
      <Phone className="h-6 w-6" aria-hidden />{t('Call 999')}
    </button>
  );
}
