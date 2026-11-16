import { useEffect, useState } from 'react';
import { BellRing, Volume2, CheckCircle2, BellOff } from 'lucide-react';
import { useStore } from '../store/useStore.js';
import { useT } from '../i18n/index.js';
import { enableAlerts, notificationPermission, playAlarm, stopAlarm, unlockAudio } from '../utils/alerts.js';
import { IS_NATIVE } from '../utils/env.js';
import { nativePermission } from '../utils/native.js';

/** Lets people switch on phone alerts (home/lock-screen notification + alarm sound) with one tap. */
export default function AlertSetup({ compact = false }) {
  const t = useT();
  const [perm, setPerm] = useState(IS_NATIVE ? 'default' : notificationPermission());
  useEffect(() => { if (IS_NATIVE) nativePermission().then((p) => p && setPerm(p)); }, []);
  const sound = useStore((s) => s.settings.alertSound);
  const setSetting = useStore((s) => s.setSetting);

  const turnOn = async () => {
    const p = await enableAlerts();
    setPerm(p);
    setSetting('alertSound', true);
    playAlarm('chime');
  };
  const test = () => { unlockAudio(); playAlarm('siren', 3); setTimeout(stopAlarm, 3000); };

  if (compact && perm === 'granted' && sound) return null;

  return (
    <section className="card p-5 border-2 border-brand" aria-labelledby="alert-setup">
      <div className="flex items-start gap-3">
        <span className="rounded-2xl bg-brand text-neutral-900 p-3 shrink-0"><BellRing className="h-7 w-7" aria-hidden /></span>
        <div className="flex-1">
          <h2 id="alert-setup" className="text-xl font-extrabold">{t('Emergency alerts on this phone')}</h2>
          <p className="muted mt-1">{t('Get a loud alarm and a message on your home screen when there is an emergency, even when the app is closed.')}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {perm === 'granted' && sound ? (
          <p className="font-bold flex items-center gap-2 text-safe dark:text-green-400"><CheckCircle2 className="h-6 w-6" aria-hidden />{t('Alerts are on')}</p>
        ) : (
          <button type="button" className="btn btn-primary btn-lg w-full text-xl" onClick={turnOn}><BellRing className="h-6 w-6" aria-hidden />{t('Turn on alerts')}</button>
        )}
        {perm === 'denied' && <p className="text-sm font-semibold flex items-start gap-2"><BellOff className="h-5 w-5 shrink-0" aria-hidden />{t('Notifications are blocked. Allow them in your browser or phone settings. The alarm still sounds while the app is open.')}</p>}
        {perm === 'unsupported' && <p className="text-sm">{t('This browser cannot show home-screen alerts. The alarm still sounds while the app is open.')}</p>}
        {!compact && (
          <>
            <button type="button" className="btn btn-ghost" onClick={test}><Volume2 className="h-5 w-5" aria-hidden />{t('Test the alarm sound')}</button>
            <label className="flex items-center justify-between gap-3 min-h-touch font-semibold">
              {t('Alarm sound')}
              <input type="checkbox" className="h-7 w-7 accent-[#D32F2F]" checked={sound} onChange={(e) => setSetting('alertSound', e.target.checked)} />
            </label>
          </>
        )}
      </div>
    </section>
  );
}
