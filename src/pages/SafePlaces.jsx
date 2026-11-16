import { useEffect, useMemo, useState } from 'react';
import {
  MapPin, Navigation, Footprints, Car, Bus, Accessibility, PawPrint, Clock, ExternalLink, Route, AlertTriangle, Home, HeartPulse, CheckCircle2, Users, Store,
} from 'lucide-react';
import { useStore } from '../store/useStore.js';
import { useT } from '../i18n/index.js';
import { Card, PageHeader, Notice, OfflineBadge, CheckPill } from '../components/ui.jsx';
import MapView from '../components/MapView.jsx';
import { SP_TYPES } from '../components/safetyTypes.js';
import { planRoute, travelMinutes, googleMapsUrl, wazeUrl, fmtKm } from '../utils/geo.js';
import { clock, cx } from '../utils/format.js';

const FILTERS = {
  medical: { label: 'Medical emergency', test: (p) => p.services.includes('medical') },
  shelter: { label: 'Shelter', test: (p) => p.services.includes('shelter') },
  food: { label: 'Food or water', test: (p) => p.services.includes('food') },
  children: { label: 'Children', test: (p) => p.services.includes('children') },
  elderly: { label: 'Elderly', test: (p) => p.services.includes('elderly') },
  pets: { label: 'Pets', test: (p) => p.petFriendly },
  wheelchair: { label: 'Wheelchair access', test: (p) => p.wheelchair },
};

function useOrigin() {
  return useStore((s) => {
    if (s.role === 'business' || s.role === 'worker') { const b = s.businesses.find((x) => x.id === s.identity.businessId); return b && { kind: 'business', entity: b }; }
    const id = s.identity.householdId;
    const h = s.households.find((x) => x.id === id);
    return h && { kind: 'household', entity: h };
  });
}

export default function SafePlaces() {
  const t = useT();
  const origin = useOrigin();
  const points = useStore((s) => s.safetyPoints);
  const roads = useStore((s) => s.blockedRoads);
  const headTo = useStore((s) => s.headTo);
  const phase = useStore((s) => s.phase);
  const [mode, setMode] = useState('walk');
  const [filters, setFilters] = useState([]);
  const [selected, setSelected] = useState(null);
  const [top3, setTop3] = useState(false);
  const e = origin?.entity;

  const people = origin?.kind === 'household' ? e.members : origin?.kind === 'business' ? e.workers : [];
  const critical = people.some((m) => (m.needs || []).some((n) => ['oxygen', 'dialysis', 'bedridden'].includes(n)));
  const hasKids = people.some((m) => (m.needs || []).some((n) => ['child', 'infant'].includes(n)));
  const hasElderly = people.some((m) => (m.needs || []).includes('elderly'));
  const hasPets = origin?.kind === 'household' && e.pets.length > 0;
  const wheelchair = people.some((m) => (m.needs || []).some((n) => ['disabled', 'mobility', 'bedridden'].includes(n)));

  useEffect(() => {
    try { localStorage.setItem('ns-offline-safety-points', JSON.stringify({ at: Date.now(), points })); } catch { /* storage unavailable */ }
  }, [points]);

  const ranked = useMemo(() => {
    if (!e) return [];
    const from = [e.lat, e.lng];
    let list = points.filter((p) => filters.every((f) => FILTERS[f].test(p)));
    if (mode === 'none') list = list.filter((p) => p.pickup || p.type === 'evacuation');
    return list
      .map((p) => {
        const r = planRoute(from, [p.lat, p.lng], roads);
        const m = mode === 'vehicle' ? 'vehicle' : 'walk';
        let score = travelMinutes(r.distanceKm, m);
        const reasons = [];
        if (p.status === 'full') score += 1000;
        if (critical && p.type === 'hospital') { score -= 60; reasons.push('Hospital first: someone needs oxygen, dialysis or bed care'); }
        if (critical && p.type !== 'hospital' && p.type !== 'clinic') score += 15;
        if (wheelchair && !p.wheelchair) score += 25;
        if (hasPets && p.petFriendly && p.type === 'evacuation') { score -= 3; reasons.push('Pet-friendly'); }
        if (hasKids && p.services.includes('children')) reasons.push('Good for children');
        if (hasElderly && p.services.includes('elderly')) reasons.push('Support for elderly');
        if (['fire', 'police'].includes(p.type)) score += 20;
        if (!critical && !filters.includes('medical')) {
          if (['evacuation', 'assembly'].includes(p.type)) score -= 4; // shelters and high ground first
          if (['pharmacy', 'clinic'].includes(p.type)) score += 8;
          if (p.type === 'relief') score += 3;
        }
        return { p, route: r, minutes: travelMinutes(r.distanceKm, m), score, reasons };
      })
      .sort((a, b) => a.score - b.score);
  }, [e, points, roads, filters, mode, critical, wheelchair, hasPets, hasKids, hasElderly]);

  if (!e) return null;
  const shown = top3 ? ranked.slice(0, 3) : ranked;
  const sel = ranked.find((x) => x.p.id === selected) || (top3 ? ranked[0] : null);
  const activeRoads = roads.filter((r) => r.active);

  const markers = [
    { id: 'me', lat: e.lat, lng: e.lng, color: '#111111', icon: origin.kind === 'business' ? Store : Home, label: t('You are here'), size: 38, z: 500 },
    ...points.map((p) => {
      const T = SP_TYPES[p.type];
      return { id: p.id, lat: p.lat, lng: p.lng, color: p.status === 'full' ? '#6B7280' : T.color, icon: T.icon, shape: 'diamond', label: `${p.name} — ${t(T.label)}${p.status === 'full' ? ` (${t('Full')})` : ''}`, selected: sel?.p.id === p.id, onClick: () => setSelected(p.id) };
    }),
  ];
  const lines = [
    ...activeRoads.map((r) => ({ id: r.id, positions: r.path, color: '#D32F2F', weight: 8, dashed: true, label: `${t('Blocked')}: ${r.name} — ${r.reason}` })),
    ...(sel ? [{ id: 'route', positions: sel.route.path, color: '#1565C0', weight: 6, label: t('Suggested route') }] : []),
  ];
  const heading = e.headingTo;

  return (
    <div className="space-y-5">
      <PageHeader icon={MapPin} title={t('Nearest safe place')} subtitle={t('Routes avoid roads reported flooded or blocked.')} />
      <div className="flex flex-wrap gap-2 items-center"><OfflineBadge /><span className="text-sm muted">{t('Safety points are saved for offline use.')}</span></div>

      <button type="button" className="btn btn-primary btn-lg w-full text-xl" onClick={() => { setTop3(true); setSelected(null); }}>
        <Navigation className="h-7 w-7" aria-hidden />{t('Show my 3 nearest safe places')}
      </button>

      {critical && (
        <Notice tone="red" icon={HeartPulse} title={t('Hospitals are shown first for your household')}>
          {t('Someone at your address depends on oxygen, dialysis or bed care.')}
        </Notice>
      )}

      <Card className="space-y-4">
        <fieldset>
          <legend className="label">{t('How will you travel?')}</legend>
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {[['walk', Footprints, 'Walking'], ['vehicle', Car, 'Vehicle'], ['none', Bus, 'No transport']].map(([k, I, l]) => (
              <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => setMode(k)} className={cx('btn', mode === k ? 'btn-navy' : 'btn-ghost')}>
                <I className="h-5 w-5" aria-hidden />{t(l)}
              </button>
            ))}
          </div>
          {mode === 'none' && <p className="mt-2 text-sm">{t('Showing pickup points and relief centres you can walk to. Lorries collect people every 30 minutes (demo).')}</p>}
        </fieldset>
        <fieldset>
          <legend className="label">{t('I need')}</legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(FILTERS).map(([k, f]) => (
              <CheckPill key={k} checked={filters.includes(k)} onChange={(on) => setFilters(on ? [...filters, k] : filters.filter((x) => x !== k))}>{t(f.label)}</CheckPill>
            ))}
          </div>
        </fieldset>
      </Card>

      {activeRoads.length > 0 && (
        <Notice tone="orange" icon={AlertTriangle} title={t('{n} roads blocked', { n: activeRoads.length })}>
          <ul className="list-disc pl-5">{activeRoads.map((r) => <li key={r.id}><b>{r.name}</b> — {r.reason} <span className="muted">({r.reportedBy})</span></li>)}</ul>
        </Notice>
      )}

      <MapView height={380} markers={markers} lines={lines} showFlood={phase === 'active'} label={t('Safety points map')}
        fit={sel ? [[e.lat, e.lng], [sel.p.lat, sel.p.lng]] : undefined} />

      {heading && (
        <Notice tone="green" icon={CheckCircle2} title={t('Responders know you are heading to {place}', { place: points.find((p) => p.id === e.headingTo.spId)?.name })}>
          {t('Sent at {time}', { time: clock(e.headingTo.at) })}
        </Notice>
      )}

      <ol className="space-y-3">
        {shown.map(({ p, route, minutes, reasons }, i) => {
          const T = SP_TYPES[p.type];
          const isSel = sel?.p.id === p.id;
          return (
            <li key={p.id} className={cx('card p-4', isSel && 'border-4 border-help')}>
              <div className="flex items-start gap-3">
                <span className="rounded-xl p-2.5 text-white shrink-0" style={{ background: T.color }}><T.icon className="h-6 w-6" aria-hidden /></span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-lg">{top3 && <span className="muted">{i + 1}. </span>}{p.name}</p>
                  <p className="muted text-sm">{t(T.label)}</p>
                  <div className="flex flex-wrap gap-2 mt-2 text-sm font-semibold">
                    <span className={cx('chip text-xs', p.status === 'full' ? 'bg-pending text-white' : 'bg-safe text-white')}>{p.status === 'full' ? t('Full') : t('Open')}</span>
                    <span className="chip bg-canvas text-xs"><Route className="h-3.5 w-3.5" aria-hidden />{fmtKm(route.distanceKm)}</span>
                    <span className="chip bg-canvas text-xs"><Clock className="h-3.5 w-3.5" aria-hidden />{minutes} {t('min')} {mode === 'vehicle' ? t('by vehicle') : t('walking')}</span>
                    {p.capacity > 0 && <span className="chip bg-canvas text-xs"><Users className="h-3.5 w-3.5" aria-hidden />{p.occupancy}/{p.capacity}</span>}
                    {p.petFriendly && <span className="chip bg-canvas text-xs"><PawPrint className="h-3.5 w-3.5" aria-hidden />{t('Pet-friendly')}</span>}
                    {p.wheelchair && <span className="chip bg-canvas text-xs"><Accessibility className="h-3.5 w-3.5" aria-hidden />{t('Wheelchair access')}</span>}
                  </div>
                  {route.detours.length > 0 && (
                    <p className="mt-2 text-sm font-semibold flex items-start gap-1.5"><AlertTriangle className="h-4 w-4 mt-0.5 text-alert shrink-0" aria-hidden />
                      {t('Detour: avoiding {roads}', { roads: route.detours.map((d) => `${d.name} (${d.reason})`).join(', ') })}
                    </p>
                  )}
                  {reasons.length > 0 && <p className="mt-1 text-sm">{reasons.map((r) => t(r)).join(' · ')}</p>}
                  <p className="text-xs muted mt-1">{p.notes} · {t('Updated')} {p.updatedAt ? clock(p.updatedAt) : t('at start of event')}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                <button type="button" className={cx('btn btn-sm', isSel ? 'btn-blue' : 'btn-ghost')} onClick={() => setSelected(p.id)}><Route className="h-4 w-4" aria-hidden />{t('Show route')}</button>
                <a className="btn btn-ghost btn-sm" href={googleMapsUrl(p, mode)} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" aria-hidden />Google Maps</a>
                <a className="btn btn-ghost btn-sm" href={wazeUrl(p)} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" aria-hidden />Waze</a>
                {true && (
                  <button type="button" className="btn btn-green btn-sm" disabled={p.status === 'full'} onClick={() => { headTo(origin.kind, e.id, p.id); setSelected(p.id); }}>
                    <Navigation className="h-4 w-4" aria-hidden />{t("I'm heading here")}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {top3 && <button type="button" className="btn btn-ghost w-full" onClick={() => setTop3(false)}>{t('Show all safety points')}</button>}
    </div>
  );
}
