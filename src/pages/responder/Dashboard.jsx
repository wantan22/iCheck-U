import { useMemo, useState } from 'react';
import {
  LayoutDashboard, Home, CheckCircle2, AlertTriangle, UserSearch, BellOff, Clock, Store, ChevronDown, Truck, ShieldCheck, Filter, Plus, Minus, LifeBuoy, Info,
} from 'lucide-react';
import { useStore } from '../../store/useStore.js';
import { useMyOrg } from '../../store/hooks.js';
import { useT } from '../../i18n/index.js';
import { PageHeader, Stat, StatusChip, STATUS, Progress } from '../../components/ui.jsx';
import MapView from '../../components/MapView.jsx';
import { SP_TYPES } from '../../components/safetyTypes.js';
import { RULES } from '../../utils/priority.js';
import { cx } from '../../utils/format.js';
import DetailPanel from './DetailPanel.jsx';
import { useRankedEntities, OrgGate, NoEventNotice } from './shared.jsx';

const NEED_FILTERS = {
  any: 'Any', child: 'Children', infant: 'Infants', elderly: 'Elderly', bedridden: 'Bedridden', disabled: 'Disabled', lifeSupport: 'Oxygen or dialysis', pregnant: 'Pregnant',
};
const hasNeed = (x, need) => {
  const people = x.kind === 'business' ? x.e.workers : x.e.members;
  if (need === 'any') return true;
  if (need === 'lifeSupport') return people.some((m) => m.needs.includes('oxygen') || m.needs.includes('dialysis'));
  return people.some((m) => m.needs.includes(need));
};

function Inner() {
  const t = useT();
  const org = useMyOrg();
  const event = useStore((s) => s.event);
  const phase = useStore((s) => s.phase);
  const points = useStore((s) => s.safetyPoints);
  const roads = useStore((s) => s.blockedRoads);
  const adjust = useStore((s) => s.adjustPriority);
  const ranked = useRankedEntities();
  const [sel, setSel] = useState(null);
  const [zone, setZone] = useState('all');
  const [status, setStatus] = useState('all');
  const [need, setNeed] = useState('any');
  const [type, setType] = useState('all');
  const [rules, setRules] = useState(false);
  const active = phase === 'active' && event;

  const filtered = useMemo(() => ranked.filter((x) => (zone === 'all' || x.e.zone === zone) && (status === 'all' || x.status === status) && (type === 'all' || x.kind === type) && hasNeed(x, need)), [ranked, zone, status, type, need]);
  const hh = ranked.filter((x) => x.kind === 'household');
  const cnt = (s) => hh.filter((x) => x.status === s).length;
  const bizReporting = ranked.filter((x) => x.kind === 'business' && x.e.checkin.respondedAt).length;
  const priority = ranked.filter((x) => x.score >= 60 || x.e.rescue);
  const reached = priority.filter((x) => ['reached', 'rescued'].includes(x.e.rescue?.status)).length;

  const markers = [
    ...points.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, color: SP_TYPES[p.type].color, icon: SP_TYPES[p.type].icon, shape: 'diamond', size: 26, label: `${p.name} (${p.status})` })),
    ...(org?.teams || []).map((tm) => ({ id: tm.id, lat: tm.assignment ? undefined : tm.lat, lng: tm.lng, color: '#0B1F3A', icon: LifeBuoy, shape: 'square', size: 30, label: `${tm.name}${tm.available ? '' : ' (unavailable)'}` })),
    ...(active ? filtered.map((x, i) => {
      const S = STATUS[x.status] || STATUS.pending;
      return {
        id: x.e.id, lat: x.e.lat, lng: x.e.lng, color: S.hex, icon: x.kind === 'business' ? Store : S.icon, shape: x.kind === 'business' ? 'square' : 'circle',
        size: x.score >= 100 ? 40 : 32, pulse: x.status === 'missing' || (x.status === 'needs_help' && !x.e.rescue), selected: sel?.id === x.e.id, z: 1000 - i,
        badge: x.kind === 'business' ? x.e.workers.filter((w) => w.onSite).length : x.e.rescue ? '✓' : undefined,
        label: `#${i + 1} ${x.e.shortAddress} — ${t(S.label)}`, onClick: () => setSel({ coll: x.coll, id: x.e.id }),
      };
    }) : []),
  ];
  const lines = roads.filter((r) => r.active).map((r) => ({ id: r.id, positions: r.path, color: '#D32F2F', dashed: true, weight: 7, label: `${r.name} — ${r.reason}` }));

  return (
    <div className="space-y-4">
      <PageHeader icon={LayoutDashboard} title={t('Responder dashboard')} subtitle={`${org.name}${active ? ` · ${t('Zones')} ${event.zones.join(', ')}` : ''}`} />
      {!active && <NoEventNotice />}

      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
        <Stat label={t('Households')} value={active ? hh.length : '—'} icon={Home} />
        <Stat label={t('Safe')} value={active ? cnt('safe') + cnt('rescued') : '—'} icon={CheckCircle2} tone="safe" />
        <Stat label={t('Needs help')} value={active ? cnt('needs_help') : '—'} icon={AlertTriangle} tone="red" />
        <Stat label={t('Missing')} value={active ? cnt('missing') : '—'} icon={UserSearch} tone="purple" />
        <Stat label={t('No response')} value={active ? cnt('no_response') : '—'} icon={BellOff} tone="orange" />
        <Stat label={t('Pending')} value={active ? cnt('pending') : '—'} icon={Clock} tone="grey" />
        <Stat label={t('Businesses reporting')} value={active ? `${bizReporting}/${ranked.length - hh.length}` : '—'} icon={Store} tone="blue" />
      </div>

      {active && <div className="card p-4"><Progress value={reached} max={priority.length || 0} label={t('Priority households reached')} /></div>}

      <div className="card p-3 flex flex-wrap items-end gap-3">
        <span className="flex items-center gap-1 font-bold"><Filter className="h-4 w-4" aria-hidden />{t('Filters')}</span>
        {[
          ['f-zone', 'Zone', zone, setZone, [['all', 'All zones'], ...['A', 'B', 'C', 'D'].map((z) => [z, `${t('Zone')} ${z}`])]],
          ['f-status', 'Status', status, setStatus, [['all', 'All statuses'], ...['needs_help', 'missing', 'no_response', 'pending', 'safe', 'rescued'].map((s) => [s, STATUS[s].label])]],
          ['f-need', 'Special needs', need, setNeed, Object.entries(NEED_FILTERS)],
          ['f-type', 'Type', type, setType, [['all', 'Households and businesses'], ['household', 'Households'], ['business', 'Businesses']]],
        ].map(([id, l, v, setV, opts]) => (
          <label key={id} htmlFor={id} className="text-sm font-semibold">
            <span className="block mb-1">{t(l)}</span>
            <select id={id} className="input !min-h-[44px] !py-1" value={v} onChange={(e) => setV(e.target.value)}>
              {opts.map(([k, lab]) => <option key={k} value={k}>{t(lab)}</option>)}
            </select>
          </label>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <div className="space-y-3">
          <MapView height={560} markers={markers} lines={lines} showFlood={!!active} label={t('Live responder map')} />
          <div className="flex flex-wrap gap-2 text-xs" aria-label={t('Map legend')}>
            {['needs_help', 'missing', 'no_response', 'pending', 'safe'].map((s) => <StatusChip key={s} status={s} size="sm" />)}
            <span className="chip bg-canvas text-xs"><Store className="h-3.5 w-3.5" aria-hidden />{t('Business (square, headcount badge)')}</span>
            <span className="chip bg-canvas text-xs"><LifeBuoy className="h-3.5 w-3.5" aria-hidden />{t('Your teams')}</span>
            <span className="chip bg-canvas text-xs">◆ {t('Safety points')}</span>
            <span className="chip bg-canvas text-xs"><span className="inline-block w-5 border-t-4 border-dashed border-emergency" aria-hidden />{t('Blocked road')}</span>
          </div>
        </div>

        <section className="card p-4 flex flex-col min-h-0" aria-labelledby="reach-first">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h2 id="reach-first" className="h2 flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-emergency" aria-hidden />{t('Reach first')}</h2>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRules(!rules)} aria-expanded={rules}><Info className="h-4 w-4" aria-hidden />{t('Scoring rules')}<ChevronDown className={cx('h-4 w-4 transition-transform', rules && 'rotate-180')} aria-hidden /></button>
          </div>
          {rules && (
            <div className="rounded-xl bg-canvas p-3 mb-3 text-sm">
              <p className="mb-2 muted">{t('Transparent score: points are added for each reason. Highest score is reached first.')}</p>
              <table className="w-full"><tbody>
                {RULES.map((r) => <tr key={r.id} className="border-b border-line last:border-0"><td className="py-1">{t(r.label)}</td><td className="py-1 text-right font-bold tabular-nums">{r.id === 'manual' ? '±' : '+'}{r.points}</td></tr>)}
              </tbody></table>
            </div>
          )}
          {!active ? <p className="muted p-4">{t('No ranked list while there is no active event.')}</p> : (
            <ol className="space-y-2 overflow-y-auto max-h-[640px] pr-1">
              {filtered.map((x, i) => (
                <li key={x.e.id} className={cx('rounded-2xl border-2 p-3 transition', sel?.id === x.e.id ? 'border-help bg-help/5' : 'border-line hover:border-help/60')}>
                  <div className="flex items-start gap-3">
                    <span className={cx('h-9 w-9 rounded-full grid place-items-center font-extrabold shrink-0 tabular-nums', x.score >= 100 ? 'bg-emergency text-white' : x.score >= 60 ? 'bg-alert text-neutral-900' : 'bg-canvas')}>{i + 1}</span>
                    <button type="button" className="flex-1 min-w-0 text-left" onClick={() => setSel({ coll: x.coll, id: x.e.id })}>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-bold">{x.e.shortAddress}</span>
                        <StatusChip status={x.status} size="sm" />
                        {x.kind === 'business' && <span className="chip bg-canvas text-xs"><Store className="h-3 w-3" aria-hidden />{t('Business')}</span>}
                        {x.e.rescue && <span className="chip bg-help text-white text-xs"><Truck className="h-3 w-3" aria-hidden />{x.e.rescue.teamName.split(' ').slice(0, 2).join(' ')}</span>}
                      </span>
                      <span className="block text-sm muted">{x.e.name}</span>
                      <span className="block text-sm font-semibold mt-0.5">{x.reasons.map((r) => t(r)).join(', ')}</span>
                    </button>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs muted">{t('Score')}</span>
                      <span className="font-extrabold tabular-nums">{x.score}</span>
                      <div className="flex gap-1">
                        <button type="button" className="h-8 w-8 rounded-lg border border-line grid place-items-center hover:bg-canvas" onClick={() => adjust(x.coll, x.e.id, 1)} aria-label={t('Raise priority of {addr}', { addr: x.e.shortAddress })}><Plus className="h-4 w-4" aria-hidden /></button>
                        <button type="button" className="h-8 w-8 rounded-lg border border-line grid place-items-center hover:bg-canvas" onClick={() => adjust(x.coll, x.e.id, -1)} aria-label={t('Lower priority of {addr}', { addr: x.e.shortAddress })}><Minus className="h-4 w-4" aria-hidden /></button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              {filtered.length === 0 && <li className="muted p-4">{t('Nothing matches these filters.')}</li>}
            </ol>
          )}
        </section>
      </div>
      {sel && active && <DetailPanel coll={sel.coll} id={sel.id} onClose={() => setSel(null)} />}
    </div>
  );
}

export default function Dashboard() {
  return <OrgGate><Inner /></OrgGate>;
}
