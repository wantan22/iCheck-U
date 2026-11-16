import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Siren, UserSearch, CheckCircle2, AlertTriangle, VolumeX, ChevronRight } from 'lucide-react';
import { useStore } from '../store/useStore.js';
import { useT } from '../i18n/index.js';
import { stopAlarm, clearBadge } from '../utils/alerts.js';
import { Phone } from 'lucide-react';

/** Full-screen emergency alert, like a phone's emergency broadcast. Answers can be given right here. */
export default function BigAlert() {
  const t = useT();
  const nav = useNavigate();
  const alert = useStore((s) => s.bigAlert);
  const role = useStore((s) => s.role);
  const dismiss = useStore((s) => s.dismissBigAlert);
  const startCall = useStore((s) => s.startCall);
  const respond = useStore((s) => s.respondHousehold);
  const respondBiz = useStore((s) => s.respondBusiness);
  const hh = useStore((s) => s.households.find((h) => h.id === s.identity.householdId));
  const biz = useStore((s) => s.businesses.find((b) => b.id === s.identity.businessId));
  const ref = useRef(null);

  useEffect(() => { if (alert) ref.current?.focus(); }, [alert]);
  if (!alert) return null;

  const close = () => { stopAlarm(); clearBadge(); dismiss(); };
  const go = (path) => { close(); nav(path); };
  const missing = alert.level === 'missing';
  const askHousehold = role === 'household' && hh?.checkin.status === 'pending' && alert.action === '/home/checkin';
  const askWorker = role === 'worker' && alert.action === '/worker';
  const workerCheckIn = (st) => { useStore.getState().workerCheckIn(st); close(); };
  const askBusiness = role === 'business' && biz?.checkin.status === 'pending' && alert.action === '/biz/checkin';
  const Icon = missing ? UserSearch : Siren;

  return (
    <div className={`fixed inset-0 z-[1500] flex flex-col text-white ${missing ? 'bg-missing' : 'bg-emergency'}`} role="alertdialog" aria-modal="true" aria-labelledby="big-alert-title" aria-describedby="big-alert-body">
      <div className="flex-1 overflow-y-auto px-5 py-8 max-w-xl w-full mx-auto flex flex-col [&>*]:shrink-0">
        <div className="flex items-center gap-3">
          <span className="relative grid place-items-center h-16 w-16 rounded-full bg-white/15 shrink-0">
            <span className="absolute inset-0 rounded-full bg-white/25 animate-ring" aria-hidden />
            <Icon className="h-9 w-9" aria-hidden />
          </span>
          <p className="font-extrabold tracking-widest uppercase text-lg">{missing ? t('Missing person alert') : t('Emergency alert')}</p>
        </div>
        <h2 id="big-alert-title" ref={ref} tabIndex={-1} className="mt-6 text-3xl sm:text-4xl font-extrabold leading-tight focus:outline-none">{t(alert.title)}</h2>
        {alert.body && <p id="big-alert-body" className="mt-3 text-xl leading-snug text-white/95">{t(alert.body)}</p>}

        <div className="mt-auto pt-8 grid gap-3">
          {askHousehold && (
            <>
              <button type="button" className="btn btn-lg bg-white text-safe text-xl" onClick={() => { respond(hh.id, 'safe'); close(); }}>
                <CheckCircle2 className="h-7 w-7" aria-hidden />{t('Everyone is safe')}
              </button>
              <button type="button" className="btn btn-lg bg-white text-missing text-xl" onClick={() => go('/home/checkin?mode=missing')}>
                <UserSearch className="h-7 w-7" aria-hidden />{t('Someone is missing')}
              </button>
              <button type="button" className="btn btn-lg bg-neutral-900 text-white text-xl" onClick={() => go('/home/checkin?mode=help')}>
                <AlertTriangle className="h-7 w-7" aria-hidden />{t('We need help')}
              </button>
            </>
          )}
          {askBusiness && (
            <>
              <button type="button" className="btn btn-lg bg-white text-safe text-xl" onClick={() => { respondBiz(biz.id, 'all_safe'); close(); }}>
                <CheckCircle2 className="h-7 w-7" aria-hidden />{t('All staff safe')}
              </button>
              <button type="button" className="btn btn-lg bg-neutral-900 text-white text-xl" onClick={() => go('/biz/checkin')}>
                <AlertTriangle className="h-7 w-7" aria-hidden />{t('Someone missing or needs help')}
              </button>
            </>
          )}
          {askWorker && (
            <>
              <button type="button" className="btn btn-lg bg-white text-safe text-xl" onClick={() => workerCheckIn('safe')}>
                <CheckCircle2 className="h-7 w-7" aria-hidden />{t("Yes, I'm safe")}
              </button>
              <button type="button" className="btn btn-lg bg-neutral-900 text-white text-xl" onClick={() => workerCheckIn('needs_help')}>
                <AlertTriangle className="h-7 w-7" aria-hidden />{t('I need help')}
              </button>
            </>
          )}
          {!askHousehold && !askBusiness && !askWorker && (
            <button type="button" className="btn btn-lg bg-white text-emergency text-xl" onClick={() => go(alert.action || (role === 'business' ? '/biz' : '/home'))}>
              {t('Open')}<ChevronRight className="h-6 w-6" aria-hidden />
            </button>
          )}
          <button type="button" className="btn btn-lg bg-neutral-900 text-white text-xl" onClick={() => { stopAlarm(); clearBadge(); startCall(); }}>
            <Phone className="h-7 w-7" aria-hidden />{t('Call 999')}
          </button>
          <button type="button" className="btn border-2 border-white/70 text-white" onClick={close}>
            <VolumeX className="h-5 w-5" aria-hidden />{t('Stop alarm and close')}
          </button>
        </div>
      </div>
    </div>
  );
}
