import { useEffect, useState } from 'react';
import { Siren, X, CheckCircle2 } from 'lucide-react';
import { useStore, isOffline } from '../store/useStore.js';
import { useT } from '../i18n/index.js';
import { Modal } from './ui.jsx';

export default function SOSButton({ household }) {
  const t = useT();
  const sendSOS = useStore((s) => s.sendSOS);
  const cancelHelp = useStore((s) => s.cancelHelp);
  const startCall = useStore((s) => s.startCall);
  const offline = useStore(isOffline);
  const [stage, setStage] = useState('idle'); // idle | confirm | countdown
  const [count, setCount] = useState(5);
  const sent = household?.checkin?.sos;

  useEffect(() => {
    if (stage !== 'countdown') return undefined;
    if (count === 0) {
      sendSOS(household.id);
      setStage('idle');
      startCall(); // demo: show a pretend call to 999
      return undefined;
    }
    const id = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [stage, count, household, sendSOS, startCall]);

  if (!household) return null;
  return (
    <div className="flex flex-col items-center gap-3">
      {sent ? (
        <div className="text-center" role="status">
          <div className="mx-auto h-44 w-44 rounded-full bg-emergency text-white grid place-items-center shadow-xl ring-8 ring-emergency/25">
            <div><CheckCircle2 className="h-12 w-12 mx-auto" aria-hidden /><p className="font-extrabold text-xl mt-1">{t('SOS sent')}</p></div>
          </div>
          <p className="mt-3 font-semibold">{t('Responders can see your location. Stay where you are if it is safe.')}</p>
          <button type="button" className="btn btn-ghost mt-2" onClick={() => cancelHelp(household.id)}>{t('I no longer need help')}</button>
        </div>
      ) : (
        <button type="button" onClick={() => { setStage('confirm'); setCount(5); }}
          className="relative h-48 w-48 rounded-full bg-emergency text-white shadow-2xl font-extrabold text-2xl leading-tight focus-visible:ring-8 focus-visible:ring-caution active:scale-95 transition"
          aria-label={t('SOS — I need help now')}>
          <span className="absolute inset-0 rounded-full bg-emergency/40 animate-ring" aria-hidden />
          <span className="relative flex flex-col items-center gap-1">
            <Siren className="h-12 w-12" aria-hidden />
            SOS
            <span className="text-base font-bold">{t('I need help now')}</span>
          </span>
        </button>
      )}
      <Modal open={stage === 'confirm'} onClose={() => setStage('idle')} title={t('Send SOS to rescuers?')}
        footer={<>
          <button type="button" className="btn btn-ghost" onClick={() => setStage('idle')}>{t('Cancel')}</button>
          <button type="button" className="btn btn-red btn-lg" onClick={() => setStage('countdown')}><Siren className="h-5 w-5" aria-hidden />{t('Yes, send SOS')}</button>
        </>}>
        <p>{t('Your location and household details will be sent to verified responders as top priority.')}</p>
        <p className="mt-2 font-semibold">{t('Then we connect you to 999.')}</p>
        <p className="mt-2 text-sm muted">{t('In a life-threatening emergency, also call 999.')}</p>
        {offline && (
          <p className="mt-3 rounded-xl bg-caution/20 p-3 text-sm font-semibold">
            {t('No internet: your SOS is saved and sends as soon as you reconnect. Phone calls still work without internet — call 999 now if it is urgent.')}
          </p>
        )}
      </Modal>
      <Modal open={stage === 'countdown'} title={t('Sending SOS in {n} seconds', { n: count })}>
        <div className="text-center" aria-live="assertive">
          <div className="mx-auto h-32 w-32 rounded-full border-8 border-emergency grid place-items-center text-6xl font-extrabold tabular-nums">{count}</div>
          <button type="button" className="btn btn-ghost btn-lg w-full mt-6 border-emergency" onClick={() => setStage('idle')} autoFocus>
            <X className="h-6 w-6" aria-hidden />{t('Cancel — I pressed by mistake')}
          </button>
        </div>
      </Modal>
    </div>
  );
}
