import { useState } from 'react';
import { UserSearch, Eye, Search, CheckCircle2, MapPin, Shirt, Clock, Users } from 'lucide-react';
import { useStore } from '../../store/useStore.js';
import { useMyHousehold } from '../../store/hooks.js';
import { useT } from '../../i18n/index.js';
import { Card, PageHeader, EmptyState, Field } from '../../components/ui.jsx';
import MapView from '../../components/MapView.jsx';
import { clock, elapsed, initials, cx } from '../../utils/format.js';

const RESP = {
  seen: { label: "I've seen them", icon: Eye },
  searching: { label: "I'm searching", icon: Search },
  found: { label: 'Found', icon: CheckCircle2 },
};

export function AlertCard({ a, me, own, onRespond, onFound, showMap = true }) {
  const t = useT();
  const now = useStore((s) => s.now);
  const [note, setNote] = useState('');
  const active = a.status === 'active';
  const child = a.age != null && a.age < 13;
  return (
    <article className={cx('card overflow-hidden', active ? 'border-4 border-missing' : 'opacity-90')} aria-labelledby={`al-${a.id}`}>
      <div className={cx('px-5 py-3 flex flex-wrap items-center justify-between gap-2', active ? 'bg-missing text-white' : 'bg-safe text-white')}>
        <p className="font-extrabold flex items-center gap-2 uppercase tracking-wide">
          {active ? <UserSearch className="h-5 w-5 animate-slowpulse" aria-hidden /> : <CheckCircle2 className="h-5 w-5" aria-hidden />}
          {active ? (child ? t('Unaccounted-for child') : t('Unaccounted-for person')) : t('Found — alert closed')}
        </p>
        <span className="text-sm font-semibold tabular-nums">{active ? t('{time} ago', { time: elapsed(now - a.createdAt) }) : clock(a.foundAt)}</span>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex gap-4">
          {a.photo ? <img src={a.photo} alt={a.name} className="h-24 w-24 rounded-2xl object-cover" /> : (
            <div className="h-24 w-24 rounded-2xl bg-missing/15 text-missing dark:text-purple-200 grid place-items-center text-3xl font-extrabold shrink-0" aria-hidden>{initials(a.name)}</div>
          )}
          <div className="min-w-0">
            <h2 id={`al-${a.id}`} className="text-2xl font-extrabold">{a.name}{a.age != null && <span>, {Math.floor(a.age)}</span>}</h2>
            <p className="muted font-semibold">{a.entityName} · {a.address}</p>
            <p className="mt-2 flex items-start gap-2"><MapPin className="h-5 w-5 shrink-0 mt-0.5" aria-hidden /><span><b>{t('Last seen')}:</b> {a.lastSeen}</span></p>
            <p className="mt-1 flex items-start gap-2"><Shirt className="h-5 w-5 shrink-0 mt-0.5" aria-hidden /><span><b>{t('Wearing')}:</b> {a.clothing}</span></p>
          </div>
        </div>
        {showMap && <MapView height={180} zoom={17} center={[a.lat, a.lng]} markers={[{ id: a.id, lat: a.lat, lng: a.lng, color: '#6A1B9A', icon: UserSearch, label: `${a.name} — ${t('Last seen')}`, pulse: active }]} label={t('Last known location map')} />}
        {a.responses.length > 0 && (
          <div>
            <p className="font-bold mb-2 flex items-center gap-2"><Users className="h-5 w-5" aria-hidden />{t('Neighbour responses')} ({a.responses.length})</p>
            <ol className="space-y-2">
              {a.responses.map((r) => {
                const R = RESP[r.type];
                return (
                  <li key={r.id} className="rounded-xl bg-canvas p-3 flex gap-3">
                    <R.icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
                    <div className="text-sm">
                      <p><b>{r.by}</b>: {t(R.label)} <span className="muted tabular-nums">· {clock(r.at)}</span></p>
                      {r.note && <p className="muted">{r.note}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
        {active && own && (
          <button type="button" className="btn btn-green btn-lg w-full" onClick={() => onFound(a)}><CheckCircle2 className="h-6 w-6" aria-hidden />{t('{name} is found — close alert', { name: a.name.split(' ')[0] })}</button>
        )}
        {active && !own && me && (
          <div className="space-y-3">
            <Field label={`${t('Note')} (${t('optional')})`} id={`note-${a.id}`}>
              <input id={`note-${a.id}`} className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('e.g. Saw a boy in a red shirt near the surau')} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button type="button" className="btn btn-blue btn-lg" onClick={() => { onRespond(a, 'seen', note); setNote(''); }}><Eye className="h-5 w-5" aria-hidden />{t("I've seen them")}</button>
              <button type="button" className="btn btn-navy btn-lg" onClick={() => { onRespond(a, 'searching', note); setNote(''); }}><Search className="h-5 w-5" aria-hidden />{t("I'm searching")}</button>
              <button type="button" className="btn btn-green btn-lg" onClick={() => { onRespond(a, 'found', note); setNote(''); }}><CheckCircle2 className="h-5 w-5" aria-hidden />{t('Found')}</button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export default function Alerts() {
  const t = useT();
  const h = useMyHousehold();
  const alerts = useStore((s) => s.missingAlerts);
  const respondAlert = useStore((s) => s.respondAlert);
  const resolveAlert = useStore((s) => s.resolveAlert);
  const active = alerts.filter((a) => a.status === 'active');
  const closed = alerts.filter((a) => a.status !== 'active');
  const sorted = [...active].sort((a, b) => (a.entityId === h?.id ? -1 : 0) - (b.entityId === h?.id ? -1 : 0));
  return (
    <div className="space-y-5">
      <PageHeader icon={UserSearch} title={t('Unaccounted-for alerts')} subtitle={t('Missing people in your neighbourhood. Help only if it is safe for you.')} />
      {sorted.length === 0 && <Card><EmptyState icon={UserSearch} title="No active alerts">{t('If someone in your home goes missing, use "Someone is missing" on the check-in screen.')}</EmptyState></Card>}
      {sorted.map((a) => (
        <AlertCard key={a.id} a={a} me={h} own={a.kind === 'household' && a.entityId === h?.id}
          onRespond={(al, type, note) => respondAlert(al.id, h.id, type, note)}
          onFound={(al) => resolveAlert(al.id, h.name, '')} />
      ))}
      {closed.length > 0 && (
        <section className="space-y-3">
          <h2 className="h2 flex items-center gap-2"><Clock className="h-5 w-5" aria-hidden />{t('Closed alerts')}</h2>
          {closed.map((a) => <AlertCard key={a.id} a={a} me={h} own={false} showMap={false} />)}
        </section>
      )}
    </div>
  );
}
