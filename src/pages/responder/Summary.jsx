import { BarChart3, Printer, Timer, ShieldCheck, Home, UserSearch, HandHeart, Store, Truck, Users } from 'lucide-react';
import { useStore, RESCUE_LABEL } from '../../store/useStore.js';
import { useT } from '../../i18n/index.js';
import { Card, CardTitle, PageHeader, Stat, EmptyState, StatusChip } from '../../components/ui.jsx';
import { displayStatus } from '../../utils/priority.js';
import { clock, elapsed } from '../../utils/format.js';
import { IS_ARTIFACT } from '../../utils/env.js';

export default function Summary() {
  const t = useT();
  const event = useStore((s) => s.event);
  const households = useStore((s) => s.households);
  const businesses = useStore((s) => s.businesses);
  const alerts = useStore((s) => s.missingAlerts);
  const now = useStore((s) => s.now);
  if (!event) return <div><PageHeader icon={BarChart3} title={t('Post-event summary')} /><Card><EmptyState icon={BarChart3} title="No event yet">{t('Run "Simulate Disaster" from the Demo panel, then end the event to see the summary.')}</EmptyState></Card></div>;

  const H = households.filter((h) => event.zones.includes(h.zone));
  const B = businesses.filter((b) => event.zones.includes(b.zone));
  const all = [...H.map((e) => ({ e, kind: 'household' })), ...B.map((e) => ({ e, kind: 'business' }))];
  const rescues = all.filter((x) => x.e.rescue);
  const reached = rescues.filter((x) => x.e.rescue.reachedAt);
  const times = reached.map((x) => x.e.rescue.reachedAt - (x.e.flaggedAt || x.e.rescue.claimedAt)).filter((x) => x >= 0).sort((a, b) => a - b);
  const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : null;
  const median = times.length ? times[Math.floor(times.length / 2)] : null;
  const responded = H.filter((h) => h.checkin.respondedAt).length;
  const viaNeighbour = all.filter((x) => x.e.checkin.via === 'neighbour').length;
  const nbChecks = all.reduce((n, x) => n + x.e.neighbourChecks.filter((c) => c.result !== 'requested').length, 0);
  const byTeam = rescues.reduce((m, x) => ({ ...m, [x.e.rescue.teamName]: (m[x.e.rescue.teamName] || 0) + 1 }), {});
  const helpers = [...new Set(alerts.flatMap((a) => a.responses.map((r) => r.by)))];
  const end = event.endedAt || now;

  return (
    <div className="space-y-5">
      <PageHeader icon={BarChart3} title={t('Post-event summary')} subtitle={`${t(event.type)} · ${t('Zones')} ${event.zones.join(', ')} · ${clock(event.startedAt)} – ${event.endedAt ? clock(event.endedAt) : t('ongoing')} (${elapsed(end - event.startedAt)})`}
        actions={!IS_ARTIFACT && <button type="button" className="btn btn-ghost" onClick={() => window.print()}><Printer className="h-5 w-5" aria-hidden />{t('Print')}</button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={t('Households affected')} value={H.length} icon={Home} />
        <Stat label={t('Responded to check-in')} value={`${responded}/${H.length}`} icon={ShieldCheck} tone="safe" />
        <Stat label={t('Households reached by teams')} value={reached.filter((x) => x.kind === 'household').length} icon={Truck} tone="blue" />
        <Stat label={t('Rescued')} value={rescues.filter((x) => x.e.rescue.status === 'rescued').length} icon={ShieldCheck} tone="safe" />
        <Stat label={t('Average response time')} value={avg != null ? elapsed(avg) : '—'} icon={Timer} sub={t('from flagged to reached')} />
        <Stat label={t('Median response time')} value={median != null ? elapsed(median) : '—'} icon={Timer} />
        <Stat label={t('Missing alerts resolved')} value={`${alerts.filter((a) => a.status === 'found').length}/${alerts.length}`} icon={UserSearch} tone="purple" />
        <Stat label={t('Businesses reporting')} value={`${B.filter((b) => b.checkin.respondedAt).length}/${B.length}`} icon={Store} tone="orange" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle icon={Users}>{t('Who helped')}</CardTitle>
          <ul className="space-y-1">
            {Object.entries(byTeam).map(([k, v]) => <li key={k} className="flex justify-between"><span>{k}</span><b>{v} {t('reached')}</b></li>)}
            <li className="flex justify-between"><span>{t('Neighbour checks completed')}</span><b>{nbChecks}</b></li>
            <li className="flex justify-between"><span>{t('Households confirmed safe by a neighbour')}</span><b>{viaNeighbour}</b></li>
            <li className="flex justify-between"><span>{t('Neighbours who joined a search')}</span><b>{helpers.length}</b></li>
          </ul>
        </Card>
        <Card>
          <CardTitle icon={HandHeart}>{t('Status at end')}</CardTitle>
          <ul className="grid grid-cols-2 gap-2">
            {['safe', 'rescued', 'needs_help', 'missing', 'no_response', 'pending'].map((s) => (
              <li key={s} className="flex items-center justify-between rounded-xl bg-canvas p-2"><StatusChip status={s} size="sm" /><b className="tabular-nums">{all.filter((x) => displayStatus(x.e) === s).length}</b></li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardTitle icon={Truck}>{t('Rescues')}</CardTitle>
        {rescues.length === 0 ? <p className="muted">{t('No households were claimed by a team.')}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left border-b-2 border-line">
                <th className="py-2 pr-3">{t('Address')}</th><th className="py-2 pr-3">{t('Team')}</th><th className="py-2 pr-3">{t('Status')}</th><th className="py-2 pr-3">{t('Claimed')}</th><th className="py-2 pr-3">{t('Reached')}</th><th className="py-2">{t('Response time')}</th>
              </tr></thead>
              <tbody>
                {rescues.map(({ e }) => (
                  <tr key={e.id} className="border-b border-line">
                    <td className="py-2 pr-3 font-semibold">{e.shortAddress}<span className="block font-normal muted">{e.name}</span></td>
                    <td className="py-2 pr-3">{e.rescue.teamName}</td>
                    <td className="py-2 pr-3">{t(RESCUE_LABEL[e.rescue.status])}</td>
                    <td className="py-2 pr-3 tabular-nums">{clock(e.rescue.claimedAt)}</td>
                    <td className="py-2 pr-3 tabular-nums">{e.rescue.reachedAt ? clock(e.rescue.reachedAt) : '—'}</td>
                    <td className="py-2 tabular-nums">{e.rescue.reachedAt ? elapsed(e.rescue.reachedAt - (e.flaggedAt || e.rescue.claimedAt)) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
