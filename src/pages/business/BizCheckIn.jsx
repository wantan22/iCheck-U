import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardCheck, CheckCircle2, UserSearch, AlertTriangle, DoorClosed, TriangleAlert, Smartphone } from 'lucide-react';
import { useStore } from '../../store/useStore.js';
import { useMyBusiness, useInEvent } from '../../store/hooks.js';
import { useT } from '../../i18n/index.js';
import { Card, PageHeader, StatusChip, Field, EmptyState, CheckPill, NeedTags } from '../../components/ui.jsx';
import { displayStatus } from '../../utils/priority.js';
import { cx } from '../../utils/format.js';

export default function BizCheckIn() {
  const t = useT();
  const [params] = useSearchParams();
  const b = useMyBusiness();
  const inEvent = useInEvent(b);
  const st = useStore();
  const [mode, setMode] = useState(params.get('mode'));
  const [ids, setIds] = useState([]);
  const [details, setDetails] = useState({});
  const [note, setNote] = useState('');
  const [done, setDone] = useState('');
  if (!b) return null;
  if (!inEvent) return <div><PageHeader icon={ClipboardCheck} title={t('Business check-in')} /><Card><EmptyState icon={CheckCircle2} title="No active emergency in your zone" /></Card></div>;

  const send = (status) => {
    if (status === 'missing') {
      if (!ids.length) return;
      st.respondBusiness(b.id, 'missing', { note, missingWorkerIds: ids, details });
    } else st.respondBusiness(b.id, status, { note });
    setDone(status);
    setMode(null);
  };

  return (
    <div className="space-y-5">
      <PageHeader icon={ClipboardCheck} title={t('Business check-in')} subtitle={b.name} />
      <Card className="border-l-8 border-l-emergency space-y-3">
        <h2 className="text-2xl font-extrabold">{t('Is everyone at your premises safe?')}</h2>
        <div className="flex items-center gap-2"><span className="muted text-sm">{t('Status')}:</span><StatusChip status={displayStatus(b)} /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" className="btn btn-green btn-lg" onClick={() => send('all_safe')}><CheckCircle2 className="h-6 w-6" aria-hidden />{t('All staff safe')}</button>
          <button type="button" className="btn btn-purple btn-lg" onClick={() => setMode('missing')} aria-expanded={mode === 'missing'}><UserSearch className="h-6 w-6" aria-hidden />{t('Someone missing')}</button>
          <button type="button" className="btn btn-red btn-lg" onClick={() => setMode('help')} aria-expanded={mode === 'help'}><AlertTriangle className="h-6 w-6" aria-hidden />{t('Need help')}</button>
          <button type="button" className="btn btn-navy btn-lg" onClick={() => send('closed')}><DoorClosed className="h-6 w-6" aria-hidden />{t('Closed, nobody inside')}</button>
        </div>
        {done && <p role="status" className="font-bold">{t('Thank you. Responders have your update.')}</p>}
      </Card>

      {mode === 'missing' && (
        <Card className="border-4 border-missing space-y-4">
          <h2 className="h2">{t('Which worker is unaccounted for?')}</h2>
          <div className="flex flex-wrap gap-2">
            {b.workers.map((w) => <CheckPill key={w.id} checked={ids.includes(w.id)} onChange={(on) => setIds(on ? [...ids, w.id] : ids.filter((x) => x !== w.id))}>{w.name}</CheckPill>)}
          </div>
          {ids.map((id) => {
            const w = b.workers.find((x) => x.id === id);
            const d = details[id] || { lastSeen: '', clothing: '' };
            return (
              <div key={id} className="rounded-2xl bg-canvas p-4 grid gap-3 sm:grid-cols-2">
                <p className="font-bold sm:col-span-2">{w.name} · {w.role}</p>
                <Field label={t('Last known location')} id={`wl-${id}`}><input id={`wl-${id}`} className="input" value={d.lastSeen} onChange={(e) => setDetails({ ...details, [id]: { ...d, lastSeen: e.target.value } })} /></Field>
                <Field label={t('Clothing description')} id={`wc-${id}`}><input id={`wc-${id}`} className="input" value={d.clothing} onChange={(e) => setDetails({ ...details, [id]: { ...d, clothing: e.target.value } })} /></Field>
              </div>
            );
          })}
          <Field label={`${t('Note')} (${t('optional')})`} id="bm-note"><textarea id="bm-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <button type="button" className="btn btn-purple btn-lg w-full" disabled={!ids.length} onClick={() => send('missing')}>{t('Send unaccounted-for alert')}</button>
        </Card>
      )}
      {mode === 'help' && (
        <Card className="border-4 border-emergency space-y-3">
          <Field label={t('What help do you need?')} id="bh-note"><textarea id="bh-note" className="input min-h-[96px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('e.g. Gas smell, 3 staff trapped upstairs')} /></Field>
          <button type="button" className="btn btn-red btn-lg w-full" onClick={() => send('needs_help')}>{t('Send help request')}</button>
        </Card>
      )}

      <Card>
        <h2 className="h2 mb-1">{t('Workers confirm their own status')}</h2>
        <p className="text-sm muted mb-3">{t('Each worker gets a link by SMS. Tap below to simulate their reply.')}</p>
        <ul className="space-y-3">
          {b.workers.map((w) => (
            <li key={w.id} className="rounded-2xl border-2 border-line p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold">{w.name} <span className="muted font-semibold">· {w.role} · {w.shift}</span></p>
                  <p className="text-sm muted">{w.onSite ? t('On site now') : t('Not on site')}</p>
                  <NeedTags needs={w.needs} className="mt-1" />
                </div>
                <StatusChip status={w.status} />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[['safe', 'Safe', 'btn-green'], ['needs_help', 'Needs help', 'btn-red'], ['missing', 'Missing', 'btn-purple']].map(([k, l, c]) => (
                  <button key={k} type="button" aria-pressed={w.status === k} className={cx('btn btn-sm', w.status === k ? c : 'btn-ghost')}
                    onClick={() => {
                      if (k === 'missing') { setMode('missing'); setIds([...new Set([...ids, w.id])]); return; }
                      st.setWorker(b.id, w.id, { status: k });
                      st.notify({ channel: 'sms', aud: [`biz:${b.id}`], to: b.name, title: `${w.name} replied: ${l}`, body: 'Worker self check-in (simulated SMS link).', toast: false });
                    }}>
                    <Smartphone className="h-4 w-4" aria-hidden />{t(l)}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Link to="/biz/hazard" className="btn btn-orange btn-lg w-full"><TriangleAlert className="h-6 w-6" aria-hidden />{t('Report a road or building hazard')}</Link>
    </div>
  );
}
