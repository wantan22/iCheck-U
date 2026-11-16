import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Siren, Square, Gauge, RefreshCcw, Users, X, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { useStore, totalEscalationMs } from '../store/useStore.js';
import { useT } from '../i18n/index.js';
import { ROLE_HOME, ROLE_LABEL } from './nav.js';
import { cx, elapsed } from '../utils/format.js';

import { IS_EMBED } from '../utils/env.js';

export default function DemoControls() {
  if (IS_EMBED) return null; // the phone-frame page has its own demo panel
  return <DemoPanel />;
}

function DemoPanel() {
  const t = useT();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const s = useStore();
  const T = totalEscalationMs(s);
  const age = s.event && s.phase === 'active' ? s.now - s.event.startedAt : null;

  const simulate = () => {
    s.activateEvent({ type: 'flood', zones: ['A', 'B', 'C'], severity: 'high' });
    s.toast(t('Flood simulated in Zones A, B and C'), 'critical', t('All households and businesses in those zones were notified.'));
  };
  const switchRole = (r) => {
    s.setRole(r);
    nav(ROLE_HOME[r]);
    setOpen(false);
  };

  return (
    <div className={cx("fixed z-[700] left-3 lg:bottom-4 no-print", s.role ? "bottom-[84px]" : "bottom-3")}>
      {open ? (
        <div role="dialog" aria-label={t('Demo controls')} className="card w-[min(92vw,360px)] p-4 shadow-2xl border-2 border-caution animate-slidein">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold flex items-center gap-2"><FlaskConical className="h-5 w-5" aria-hidden />{t('Demo controls')}</h2>
            <button type="button" className="p-2 rounded-lg hover:bg-canvas" onClick={() => setOpen(false)} aria-label={t('Close')}><X className="h-5 w-5" aria-hidden /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-red col-span-2" onClick={() => { simulate(); setOpen(false); }} disabled={s.phase === 'active'}>
              <Siren className="h-5 w-5" aria-hidden />{t('Simulate Disaster (flood)')}
            </button>
            <button type="button" className="btn btn-orange btn-sm" onClick={() => { s.issueWarning('flood', ['A', 'B', 'C']); setOpen(false); }} disabled={s.phase === 'active'}>
              <AlertTriangle className="h-4 w-4" aria-hidden />{t('Flood warning')}
            </button>
            <button type="button" className="btn btn-navy btn-sm" onClick={() => { s.endEvent(); setOpen(false); }} disabled={s.phase !== 'active'}>
              <Square className="h-4 w-4" aria-hidden />{t('End Event')}
            </button>
            <button type="button" className={cx('btn btn-sm col-span-2', s.settings.demoSpeed ? 'btn-green' : 'btn-ghost')} onClick={() => { setOpen(false); s.setSetting('demoSpeed', !s.settings.demoSpeed); }} aria-pressed={s.settings.demoSpeed}>
              <Gauge className="h-4 w-4" aria-hidden />
              {s.settings.demoSpeed ? t('Timers sped up: escalation in 60 s') : t('Real timers: escalation in {m} min', { m: s.settings.escalationMinutes })}
            </button>
            <button type="button" className={cx('btn btn-sm col-span-2', s.forceOffline ? 'bg-[#1f2937] text-white' : 'btn-ghost')} onClick={() => { setOpen(false); s.setForceOffline(!s.forceOffline); }} aria-pressed={s.forceOffline}>
              {s.forceOffline ? <WifiOff className="h-4 w-4" aria-hidden /> : <Wifi className="h-4 w-4" aria-hidden />}
              {s.forceOffline ? t('No Wi-Fi (simulated) — tap to reconnect') : t('Simulate no Wi-Fi')}
            </button>
            {confirmReset ? (
              <div className="col-span-2 flex gap-2">
                <button type="button" className="btn btn-red btn-sm flex-1" onClick={() => { s.resetData(); setConfirmReset(false); setOpen(false); s.toast(t('Demo data reset'), 'success'); }}>{t('Yes, reset')}</button>
                <button type="button" className="btn btn-ghost btn-sm flex-1" onClick={() => setConfirmReset(false)}>{t('Cancel')}</button>
              </div>
            ) : (
              <button type="button" className="btn btn-ghost btn-sm col-span-2" onClick={() => setConfirmReset(true)}>
                <RefreshCcw className="h-4 w-4" aria-hidden />{t('Reset data')}
              </button>
            )}
          </div>
          {age != null && (
            <div className="mt-3 rounded-xl bg-canvas p-3 text-sm">
              <p className="font-bold">{t('Event clock')}: <span className="tabular-nums">{elapsed(age)}</span></p>
              <p className="muted">{t('Re-notify at {a}, neighbours at {b}, responders at {c}', { a: elapsed(T / 3), b: elapsed((2 * T) / 3), c: elapsed(T) })}</p>
            </div>
          )}
          <p className="mt-4 mb-2 font-bold text-sm flex items-center gap-2"><Users className="h-4 w-4" aria-hidden />{t('Switch role')}</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(ROLE_HOME).map((r) => (
              <button key={r} type="button" onClick={() => switchRole(r)} className={cx('btn btn-sm text-sm', s.role === r ? 'btn-navy' : 'btn-ghost')} aria-pressed={s.role === r}>
                {t(ROLE_LABEL[r])}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="btn btn-sm bg-caution text-neutral-900 shadow-lg border-2 border-black/10 font-extrabold opacity-90 hover:opacity-100" aria-expanded={open}>
          <FlaskConical className="h-5 w-5" aria-hidden />{t('Demo')}
          {s.phase === 'active' && <span className="h-2.5 w-2.5 rounded-full bg-emergency animate-slowpulse" aria-hidden />}
        </button>
      )}
    </div>
  );
}
