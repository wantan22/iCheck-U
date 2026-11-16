import { Building2, Construction } from 'lucide-react';
import { useStore } from '../../store/useStore.js';
import { useT } from '../../i18n/index.js';
import { Card, CardTitle, PageHeader, Toggle } from '../../components/ui.jsx';
import { SP_TYPES } from '../../components/safetyTypes.js';
import { clock } from '../../utils/format.js';
import { OrgGate } from './shared.jsx';

function Inner() {
  const t = useT();
  const points = useStore((s) => s.safetyPoints);
  const roads = useStore((s) => s.blockedRoads);
  const upd = useStore((s) => s.updateSafetyPoint);
  const setRoad = useStore((s) => s.setRoad);
  return (
    <div className="space-y-5">
      <PageHeader icon={Building2} title={t('Safety point editor')} subtitle={t('Keep status, capacity and access up to date. Residents see changes immediately.')} />
      <div className="grid gap-3 xl:grid-cols-2">
        {points.map((p) => {
          const T = SP_TYPES[p.type];
          return (
            <Card key={p.id} className="!p-4">
              <div className="flex items-start gap-3">
                <span className="rounded-xl p-2 text-white" style={{ background: T.color }}><T.icon className="h-5 w-5" aria-hidden /></span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold">{p.name}</p>
                  <p className="text-sm muted">{t(T.label)} · {t('Last updated')}: {p.updatedAt ? `${clock(p.updatedAt)} (${p.updatedBy})` : t('at start of event')}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <label className="text-sm font-semibold" htmlFor={`st-${p.id}`}>{t('Status')}
                  <select id={`st-${p.id}`} className="input mt-1" value={p.status} onChange={(e) => upd(p.id, { status: e.target.value })}>
                    <option value="open">{t('Open')}</option><option value="full">{t('Full')}</option><option value="closed">{t('Closed')}</option>
                  </select>
                </label>
                <label className="text-sm font-semibold" htmlFor={`oc-${p.id}`}>{t('People now')}
                  <input id={`oc-${p.id}`} type="number" min="0" className="input mt-1" value={p.occupancy} onChange={(e) => upd(p.id, { occupancy: Number(e.target.value) })} />
                </label>
                <label className="text-sm font-semibold" htmlFor={`cap-${p.id}`}>{t('Capacity')}
                  <input id={`cap-${p.id}`} type="number" min="0" className="input mt-1" value={p.capacity} onChange={(e) => upd(p.id, { capacity: Number(e.target.value) })} />
                </label>
              </div>
              <div className="grid sm:grid-cols-2 gap-x-4 mt-2">
                <Toggle id={`pet-${p.id}`} checked={p.petFriendly} onChange={(v) => upd(p.id, { petFriendly: v })} label={t('Pet-friendly')} />
                <Toggle id={`wc-${p.id}`} checked={p.wheelchair} onChange={(v) => upd(p.id, { wheelchair: v })} label={t('Wheelchair access')} />
              </div>
              <label className="text-sm font-semibold block mt-2" htmlFor={`nt-${p.id}`}>{t('Notes for residents')}
                <input id={`nt-${p.id}`} className="input mt-1" value={p.notes} onChange={(e) => upd(p.id, { notes: e.target.value })} />
              </label>
            </Card>
          );
        })}
      </div>
      <Card>
        <CardTitle icon={Construction}>{t('Blocked roads (used for hazard-aware routing)')}</CardTitle>
        <ul className="divide-y divide-line">
          {roads.map((r) => (
            <li key={r.id}><Toggle id={`rd-${r.id}`} checked={r.active} onChange={(v) => setRoad(r.id, v)} label={r.name} description={`${r.reason} · ${r.reportedBy}`} /></li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export default function SafetyEditor() {
  return <OrgGate><Inner /></OrgGate>;
}
