import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2, UserSearch, AlertTriangle, Backpack, MapPin, MessageSquare, MessageCircle, ClipboardCheck, Camera, Users,
} from 'lucide-react';
import { useStore } from '../../store/useStore.js';
import { useMyHousehold, useInEvent } from '../../store/hooks.js';
import { useT } from '../../i18n/index.js';
import { Card, PageHeader, StatusChip, Field, Toggle, Notice, EmptyState, NeedTags, CheckPill } from '../../components/ui.jsx';
import { displayStatus } from '../../utils/priority.js';
import { ageLabel, cx } from '../../utils/format.js';

const MEMBER_OPTIONS = [
  { id: 'safe', label: 'Safe', cls: 'btn-green' },
  { id: 'with_me', label: 'With me', cls: 'btn-green' },
  { id: 'missing', label: 'Missing', cls: 'btn-purple' },
  { id: 'needs_help', label: 'Needs help', cls: 'btn-red' },
];

export default function CheckIn() {
  const t = useT();
  const [params] = useSearchParams();
  const h = useMyHousehold();
  const inEvent = useInEvent(h);
  const st = useStore();
  const [mode, setMode] = useState(params.get('mode') || null);
  const [note, setNote] = useState('');
  const [loc, setLoc] = useState(true);
  const [missingIds, setMissingIds] = useState([]);
  const [details, setDetails] = useState({});
  const [done, setDone] = useState(false);
  if (!h) return null;

  if (!inEvent) {
    return (
      <div>
        <PageHeader icon={ClipboardCheck} title={t('Safety check-in')} />
        <Card><EmptyState icon={CheckCircle2} title="No active emergency in your zone">{t('When an emergency starts, you will be asked here if everyone is safe. Use the Demo button to simulate a flood.')}</EmptyState></Card>
      </div>
    );
  }
  const status = displayStatus(h);
  const children = h.members.filter((m) => m.age < 13);

  const submitMissing = () => {
    if (!missingIds.length) return;
    st.respondHousehold(h.id, 'missing', { note, location: loc, memberIds: missingIds, details });
    setDone('missing');
    setMode(null);
  };
  const submitHelp = () => {
    st.respondHousehold(h.id, 'help', { note, location: loc });
    setDone('help');
    setMode(null);
  };
  const smsReply = (code) => {
    st.notify({ channel: 'sms', aud: [`hh:${h.id}`], to: 'iCheck-U 32728', title: `You replied "${code}"`, body: code === '1' ? 'SAFE received. Thank you.' : 'HELP received. Responders are notified.', toast: false });
    st.respondHousehold(h.id, code === '1' ? 'safe' : 'help', { via: 'sms', note: code === '2' ? 'Replied HELP by SMS' : '' });
    setDone(code === '1' ? 'safe' : 'help');
  };

  return (
    <div className="space-y-5">
      <PageHeader icon={ClipboardCheck} title={t('Safety check-in')} subtitle={`${h.name} · ${h.shortAddress}`}
        actions={<Link to="/home/grab" className="btn btn-red"><Backpack className="h-5 w-5" aria-hidden />{t('Open grab list')}</Link>} />

      <Card className="border-l-8 border-l-emergency">
        <h2 className="text-2xl font-extrabold">{t('Are you and your family safe?')}</h2>
        {children.length > 0 && <p className="font-semibold mt-1">{t('Are the kids with you?')} ({children.map((c) => c.name.split(' ')[0]).join(', ')})</p>}
        <div className="mt-2 flex items-center gap-2"><span className="muted text-sm">{t('Household status')}:</span><StatusChip status={status} /></div>
        <div className="grid gap-3 mt-4">
          <button type="button" className="btn btn-green btn-lg text-xl" onClick={() => { st.respondHousehold(h.id, 'safe', { note, location: loc }); setDone('safe'); setMode(null); }}>
            <CheckCircle2 className="h-7 w-7" aria-hidden />{t('Everyone is safe')}
          </button>
          <button type="button" className={cx('btn btn-purple btn-lg text-xl', mode === 'missing' && 'ring-4 ring-missing/40')} onClick={() => setMode('missing')} aria-expanded={mode === 'missing'}>
            <UserSearch className="h-7 w-7" aria-hidden />{t('Someone is missing')}
          </button>
          <button type="button" className={cx('btn btn-red btn-lg text-xl', mode === 'help' && 'ring-4 ring-emergency/40')} onClick={() => setMode('help')} aria-expanded={mode === 'help'}>
            <AlertTriangle className="h-7 w-7" aria-hidden />{t('We need help')}
          </button>
        </div>
        {done && (
          <p role="status" className="mt-4 font-bold text-lg">
            {done === 'safe' && t('Thank you. Responders and neighbours can see you are safe.')}
            {done === 'help' && t('Help request sent. Responders can see your household now.')}
            {done === 'missing' && t('Unaccounted-for alert sent to nearby neighbours and responders.')}
          </p>
        )}
      </Card>

      {mode === 'missing' && (
        <Card className="border-4 border-missing space-y-4">
          <h2 className="h2 flex items-center gap-2"><UserSearch className="h-6 w-6" aria-hidden />{t('Who is missing?')}</h2>
          <div className="flex flex-wrap gap-2">
            {h.members.map((m) => (
              <CheckPill key={m.id} checked={missingIds.includes(m.id)} onChange={(on) => setMissingIds(on ? [...missingIds, m.id] : missingIds.filter((x) => x !== m.id))}>
                {m.name.split(' ')[0]} ({ageLabel(m.age)})
              </CheckPill>
            ))}
          </div>
          {missingIds.map((id) => {
            const m = h.members.find((x) => x.id === id);
            const d = details[id] || { lastSeen: '', clothing: m.clothing, photo: m.photo };
            const upd = (patch) => setDetails({ ...details, [id]: { ...d, ...patch } });
            return (
              <div key={id} className="rounded-2xl bg-canvas p-4 space-y-3">
                <p className="font-bold">{m.name}, {ageLabel(m.age)}</p>
                <Field label={t('Last known location')} id={`ls-${id}`}>
                  <input id={`ls-${id}`} className="input" value={d.lastSeen} onChange={(e) => upd({ lastSeen: e.target.value })} placeholder={t('e.g. Playground at Jalan Harmoni 2, 20 minutes ago')} />
                </Field>
                <Field label={t('Clothing description')} id={`cl-${id}`}>
                  <input id={`cl-${id}`} className="input" value={d.clothing} onChange={(e) => upd({ clothing: e.target.value })} />
                </Field>
                <Field label={`${t('Photo')} (${t('optional')})`} id={`ph-${id}`}>
                  <div className="flex items-center gap-3">
                    {d.photo ? <img src={d.photo} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <Camera className="h-6 w-6 muted" aria-hidden />}
                    <input id={`ph-${id}`} type="file" accept="image/*" className="text-sm" onChange={(e) => e.target.files?.[0] && upd({ photo: URL.createObjectURL(e.target.files[0]) })} />
                  </div>
                </Field>
              </div>
            );
          })}
          <Field label={`${t('Note')} (${t('optional')})`} id="miss-note"><textarea id="miss-note" className="input min-h-[80px]" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <Toggle id="miss-loc" checked={loc} onChange={setLoc} label={t('Share my location')} description={t('Helps neighbours and responders search nearby.')} />
          <button type="button" className="btn btn-purple btn-lg w-full" disabled={!missingIds.length} onClick={submitMissing}>
            <UserSearch className="h-6 w-6" aria-hidden />{t('Send unaccounted-for alert')}
          </button>
        </Card>
      )}

      {mode === 'help' && (
        <Card className="border-4 border-emergency space-y-4">
          <h2 className="h2">{t('What help do you need?')}</h2>
          <Field label={t('Short note for rescuers')} id="help-note">
            <textarea id="help-note" className="input min-h-[96px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('e.g. Water rising, grandmother cannot walk')} />
          </Field>
          <Toggle id="help-loc" checked={loc} onChange={setLoc} label={t('Share my location')} />
          <button type="button" className="btn btn-red btn-lg w-full" onClick={submitHelp}><AlertTriangle className="h-6 w-6" aria-hidden />{t('Send help request')}</button>
        </Card>
      )}

      <Card>
        <h2 className="h2 flex items-center gap-2 mb-1"><Users className="h-6 w-6" aria-hidden />{t('Each member')}</h2>
        <p className="muted text-sm mb-4">{t('Everyone in the household can see these statuses.')}</p>
        <ul className="space-y-4">
          {h.members.map((m) => (
            <li key={m.id} className="rounded-2xl border-2 border-line p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold">{m.name} <span className="muted font-semibold">· {ageLabel(m.age)} · {t(m.relationship)}</span></p>
                  <NeedTags needs={m.needs} className="mt-1" />
                </div>
                <StatusChip status={m.status} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3" role="group" aria-label={t('Status for {name}', { name: m.name })}>
                {MEMBER_OPTIONS.map((o) => (
                  <button key={o.id} type="button" aria-pressed={m.status === o.id}
                    className={cx('btn btn-sm', m.status === o.id ? o.cls : 'btn-ghost')}
                    onClick={() => {
                      if (o.id === 'missing') { setMode('missing'); setMissingIds([...new Set([...missingIds, m.id])]); return; }
                      st.setMemberStatus(h.id, m.id, o.id);
                    }}>
                    {t(o.label)}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="h2 mb-2">{t('No internet? Reply by SMS or WhatsApp')}</h2>
        <p className="muted text-sm mb-3">{t('If the app cannot load, we also send an SMS and WhatsApp message. Reply 1 for SAFE or 2 for HELP. (Simulated)')}</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => smsReply('1')}><MessageSquare className="h-5 w-5" aria-hidden />{t('SMS reply "1" (Safe)')}</button>
          <button type="button" className="btn btn-ghost" onClick={() => smsReply('2')}><MessageCircle className="h-5 w-5" aria-hidden />{t('WhatsApp reply "HELP"')}</button>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-3">
        <Link to="/safe-places" className="btn btn-navy btn-lg"><MapPin className="h-6 w-6" aria-hidden />{t('Nearest safe place')}</Link>
        <Link to="/home/grab" className="btn btn-red btn-lg"><Backpack className="h-6 w-6" aria-hidden />{t('Open grab list')}</Link>
      </div>
      {h.checkin.location && <Notice tone="blue" icon={MapPin}>{t('Your location is shared with responders for this emergency only.')}</Notice>}
    </div>
  );
}
