import { useState } from 'react';
import { TriangleAlert, Send, Waves, TreePine, Building, Flame, Zap, Construction } from 'lucide-react';
import { useStore } from '../../store/useStore.js';
import { useMyBusiness } from '../../store/hooks.js';
import { useT } from '../../i18n/index.js';
import { Card, PageHeader, Field, Notice } from '../../components/ui.jsx';
import MapView from '../../components/MapView.jsx';
import { clock, cx } from '../../utils/format.js';

const TYPES = {
  flood: { label: 'Road flooded', icon: Waves },
  blocked: { label: 'Road blocked', icon: Construction },
  tree: { label: 'Fallen tree', icon: TreePine },
  building: { label: 'Building damage', icon: Building },
  gas: { label: 'Gas leak / fire risk', icon: Flame },
  power: { label: 'Fallen power line', icon: Zap },
};

export default function Hazard() {
  const t = useT();
  const b = useMyBusiness();
  const roads = useStore((s) => s.blockedRoads);
  const hazards = useStore((s) => s.hazards);
  const report = useStore((s) => s.reportHazard);
  const [type, setType] = useState('tree');
  const [roadId, setRoadId] = useState('r3');
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  if (!b) return null;
  const isRoad = ['flood', 'blocked', 'tree', 'power'].includes(type);
  const submit = () => {
    const road = roads.find((r) => r.id === roadId);
    report({ type, typeLabel: TYPES[type].label, roadId: isRoad && roadId !== 'other' ? roadId : null, location: isRoad && road ? road.name : place || b.shortAddress, note, by: b.name, byKind: 'business', lat: b.lat, lng: b.lng });
    setSent(true);
    setNote('');
  };
  return (
    <div className="space-y-5">
      <PageHeader icon={TriangleAlert} title={t('Report a hazard')} subtitle={t('Your report updates safe routes for everyone in the neighbourhood.')} />
      <Card className="space-y-4">
        <fieldset>
          <legend className="label">{t('What did you see?')}</legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(TYPES).map(([k, x]) => (
              <button key={k} type="button" aria-pressed={type === k} onClick={() => setType(k)} className={cx('btn', type === k ? 'btn-orange' : 'btn-ghost')}><x.icon className="h-5 w-5" aria-hidden />{t(x.label)}</button>
            ))}
          </div>
        </fieldset>
        {isRoad ? (
          <Field label={t('Which road?')} id="hz-road">
            <select id="hz-road" className="input" value={roadId} onChange={(e) => setRoadId(e.target.value)}>
              {roads.map((r) => <option key={r.id} value={r.id}>{r.name}{r.active ? ` (${t('already blocked')})` : ''}</option>)}
              <option value="other">{t('Other — describe below')}</option>
            </select>
          </Field>
        ) : null}
        {(!isRoad || roadId === 'other') && (
          <Field label={t('Where?')} id="hz-place"><input id="hz-place" className="input" value={place} onChange={(e) => setPlace(e.target.value)} placeholder={t('e.g. Behind Lot G-27, back lane')} /></Field>
        )}
        <Field label={`${t('Details')} (${t('optional')})`} id="hz-note"><textarea id="hz-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <button type="button" className="btn btn-orange btn-lg w-full" onClick={submit}><Send className="h-5 w-5" aria-hidden />{t('Send hazard report')}</button>
        {sent && <Notice tone="green" icon={TriangleAlert}>{t('Thank you. Responders were told and routes now avoid this hazard.')}</Notice>}
      </Card>
      <MapView height={300} lines={roads.filter((r) => r.active).map((r) => ({ id: r.id, positions: r.path, color: '#D32F2F', dashed: true, weight: 8, label: `${r.name} — ${r.reason}` }))}
        markers={[{ id: 'biz', lat: b.lat, lng: b.lng, color: '#F57C00', icon: TriangleAlert, label: b.name, shape: 'square' }]} label={t('Hazard map')} />
      {hazards.length > 0 && (
        <Card>
          <h2 className="h2 mb-2">{t('Recent reports')}</h2>
          <ul className="space-y-2 text-sm">{hazards.map((h) => <li key={h.id}><span className="muted tabular-nums">{clock(h.at)}</span> — <b>{t(h.typeLabel)}</b>: {h.location} <span className="muted">({h.by})</span>{h.note && ` — ${h.note}`}</li>)}</ul>
        </Card>
      )}
    </div>
  );
}
