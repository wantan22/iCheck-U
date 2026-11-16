import { Link } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, MapPin, Store, ChevronRight, Sun, ShieldCheck, Home as HomeIcon } from 'lucide-react';
import { useStore } from '../../store/useStore.js';
import { useInEvent } from '../../store/hooks.js';
import { useT } from '../../i18n/index.js';
import { StatusChip, EmptyState, Toggle, Card } from '../../components/ui.jsx';
import AlertSetup from '../../components/AlertSetup.jsx';
import { Call999Button } from '../../components/CallScreen.jsx';
import { firstName } from '../household/Home.jsx';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning, {name}' : h < 19 ? 'Good afternoon, {name}' : 'Good evening, {name}';
};

/** Home screen for a shop worker: one question about themselves, nothing else to manage. */
export default function WorkerHome() {
  const t = useT();
  const b = useStore((s) => s.businesses.find((x) => x.id === s.identity.businessId));
  const w = useStore((s) => s.businesses.find((x) => x.id === s.identity.businessId)?.workers.find((x) => x.id === s.identity.workerId));
  const checkIn = useStore((s) => s.workerCheckIn);
  const setWorker = useStore((s) => s.setWorker);
  const inEvent = useInEvent(b);
  if (!b || !w) return <EmptyState title="No worker profile found">{t('Please sign up first.')}</EmptyState>;
  const pending = inEvent && w.onSite && w.status === 'pending';

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-extrabold">{t(greeting(), { name: firstName(w.name) })}</h1>
        <p className="muted text-lg flex items-center gap-2"><Store className="h-5 w-5" aria-hidden />{b.name} · {w.role}</p>
      </header>

      {pending ? (
        <section className="card p-6 border-4 border-emergency" aria-labelledby="w-ask">
          <h2 id="w-ask" className="text-2xl font-extrabold">{t('Are you safe?')}</h2>
          <p className="text-lg mt-1">{t('Your employer and rescuers will see your answer.')}</p>
          <div className="grid gap-3 mt-5">
            <button type="button" className="btn btn-green btn-lg text-xl" onClick={() => checkIn('safe')}><CheckCircle2 className="h-7 w-7" aria-hidden />{t("Yes, I'm safe")}</button>
            <button type="button" className="btn btn-red btn-lg text-xl" onClick={() => checkIn('needs_help')}><AlertTriangle className="h-7 w-7" aria-hidden />{t('I need help')}</button>
            <button type="button" className="btn btn-ghost btn-lg" onClick={() => checkIn('off_site')}><HomeIcon className="h-6 w-6" aria-hidden />{t("I'm not at work today")}</button>
          </div>
        </section>
      ) : inEvent ? (
        <Card className="flex items-center justify-between gap-3">
          <p className="text-xl font-bold">
            {w.status === 'needs_help' ? t('Help is on its way. Stay where you are if it is safe.') : t('Thank you. Your employer knows you are safe.')}
          </p>
          <StatusChip status={w.status === 'pending' ? 'safe' : w.status} />
        </Card>
      ) : (
        <section className="card p-5 flex items-center gap-4">
          <Sun className="h-10 w-10 text-safe shrink-0" aria-hidden />
          <div>
            <p className="text-xl font-bold">{t('All is calm today.')}</p>
            <p className="muted">{t('We will alert you if anything happens near your workplace.')}</p>
          </div>
        </section>
      )}

      {inEvent && w.status !== 'pending' && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => checkIn('safe')}><CheckCircle2 className="h-5 w-5 text-safe" aria-hidden />{t("I'm safe")}</button>
          <button type="button" className="btn btn-ghost" onClick={() => checkIn('needs_help')}><AlertTriangle className="h-5 w-5 text-emergency" aria-hidden />{t('I need help')}</button>
        </div>
      )}

      <Card>
        <Toggle id="w-onsite" checked={w.onSite} onChange={(v) => setWorker(b.id, w.id, { onSite: v })}
          label={<span className="text-lg">{t("I'm at work now")}</span>} description={t('Turn this on when you arrive and off when you leave, so rescuers know who is inside.')} />
      </Card>

      <Call999Button />
      <AlertSetup compact />

      <Link to="/safe-places" className="card p-5 flex items-center gap-4 min-h-[88px] hover:border-brand">
        <span className="rounded-2xl bg-brand text-neutral-900 p-3"><MapPin className="h-7 w-7" aria-hidden /></span>
        <span className="flex-1"><span className="block text-xl font-bold">{t('Nearest safe place')}</span><span className="block muted">{t('Hospitals, relief centres and safe roads')}</span></span>
        <ChevronRight className="h-6 w-6" aria-hidden />
      </Link>
      <p className="text-sm muted flex items-start gap-2"><ShieldCheck className="h-5 w-5 shrink-0" aria-hidden />{t('Worker data is used only for safety and rescue, never for enforcement.')}</p>
    </div>
  );
}
