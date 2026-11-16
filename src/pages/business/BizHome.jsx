import { Link, useNavigate } from 'react-router-dom';
import { Store, HardHat, ClipboardCheck, ListChecks, TriangleAlert, MapPin, Flame, Bell, CheckCircle2, UserSearch, AlertTriangle, DoorClosed, Truck, RotateCcw, Backpack } from 'lucide-react';
import { useStore, BIZ_LABEL } from '../../store/useStore.js';
import { useMyBusiness, useInEvent } from '../../store/hooks.js';
import { useT } from '../../i18n/index.js';
import { Card, CardTitle, StatusChip, Stat, EmptyState } from '../../components/ui.jsx';
import RescueProgress from '../../components/RescueProgress.jsx';
import { displayStatus } from '../../utils/priority.js';
import { elapsed } from '../../utils/format.js';

export const RISK_LABEL = { gas: 'Gas', chemicals: 'Chemicals', fuel: 'Fuel', largeStock: 'Large stock', singleExit: 'Single exit' };

export default function BizHome() {
  const t = useT();
  const nav = useNavigate();
  const b = useMyBusiness();
  const inEvent = useInEvent(b);
  const respond = useStore((s) => s.respondBusiness);
  const now = useStore((s) => s.now);
  const phase = useStore((s) => s.phase);
  if (!b) return <EmptyState title="No business found" />;
  const onSite = b.workers.filter((w) => w.onSite);
  const pending = inEvent && b.checkin.status === 'pending';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="muted font-semibold">{b.lot} · {t('Zone')} {b.zone}</p>
          <h1 className="h1 flex items-center gap-2"><Store className="h-8 w-8" aria-hidden />{b.name}</h1>
        </div>
        <StatusChip status={displayStatus(b)} size="lg" label={b.checkin.status === 'closed' ? 'Closed, nobody inside' : undefined} />
      </div>

      {pending && (
        <>
          <section className="card p-5 border-4 border-emergency" role="alert">
            <div className="flex gap-3">
              <Bell className="h-8 w-8 text-emergency shrink-0" aria-hidden />
              <div>
                <h2 className="text-2xl font-extrabold">{t('Is everyone at your premises safe?')}</h2>
                <p className="muted text-sm mt-1">{t('Asked {time} ago', { time: elapsed(now - b.checkin.notifiedAt) })} · {onSite.length} {t('workers on site')}</p>
              </div>
            </div>
          </section>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" className="btn btn-green btn-lg" onClick={() => respond(b.id, 'all_safe')}><CheckCircle2 className="h-6 w-6" aria-hidden />{t('All staff safe')}</button>
            <button type="button" className="btn btn-purple btn-lg" onClick={() => nav('/biz/checkin?mode=missing')}><UserSearch className="h-6 w-6" aria-hidden />{t('Someone missing')}</button>
            <button type="button" className="btn btn-red btn-lg" onClick={() => nav('/biz/checkin?mode=help')}><AlertTriangle className="h-6 w-6" aria-hidden />{t('Need help')}</button>
            <button type="button" className="btn btn-navy btn-lg" onClick={() => respond(b.id, 'closed')}><DoorClosed className="h-6 w-6" aria-hidden />{t('Closed, nobody inside')}</button>
          </div>
        </>
      )}
      {inEvent && !pending && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-bold text-lg">{t('You reported')}: {t(BIZ_LABEL[b.checkin.status] || 'Pending')}</p>
          <Link className="btn btn-navy" to="/biz/checkin">{t('Update check-in')}</Link>
        </Card>
      )}
      {b.rescue && <Card className="border-l-8 border-l-safe"><CardTitle icon={Truck}>{t('Help is on the way')}</CardTitle><RescueProgress rescue={b.rescue} /></Card>}
      {phase === 'recovery' && (
        <Link to="/biz/recovery" className="card p-5 flex items-center gap-4 border-l-8 border-l-help"><RotateCcw className="h-8 w-8 text-help" aria-hidden /><span className="font-bold text-lg">{t('Recovery mode')} — {t('Mark items found, damaged or lost')}</span></Link>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Stat label={t('Workers')} value={b.workers.length} icon={HardHat} />
        <Stat label={t('On site now')} value={onSite.length} icon={MapPin} tone="blue" />
        <Stat label={t('Safe')} value={b.workers.filter((w) => w.status === 'safe').length} icon={CheckCircle2} tone="safe" />
      </div>

      {b.risks.length > 0 && (
        <Card>
          <CardTitle icon={Flame}>{t('Site risks')}</CardTitle>
          <div className="flex flex-wrap gap-2">{b.risks.map((r) => <span key={r} className="chip bg-caution text-neutral-900">{t(RISK_LABEL[r])}</span>)}</div>
          {b.risks.includes('gas') && <p className="mt-3 text-sm">{t('If safe, shut the gas main before you leave.')}</p>}
        </Card>
      )}

      <nav aria-label={t('Quick actions')} className="grid gap-3">
        {[
          ['/biz/workers', HardHat, 'Workers', 'Who is working today'],
          ['/biz/grab', Backpack, 'My grab list', 'What to take, and where it is'],
          ['/safe-places', MapPin, 'Nearest safe place', 'Hospitals, relief centres and safe roads'],
          ['/biz/hazard', TriangleAlert, 'Report danger', 'Flooded road, fallen tree, gas smell'],
        ].map(([to, I, l, sub]) => (
          <Link key={to} to={to} className="card p-5 flex items-center gap-4 min-h-[88px] hover:border-brand">
            <span className="rounded-2xl bg-brand text-neutral-900 p-3"><I className="h-7 w-7" aria-hidden /></span>
            <span className="flex-1"><span className="block text-xl font-bold">{t(l)}</span><span className="block muted">{t(sub)}</span></span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
