import { useEffect, useState } from 'react';
import {
  X, Phone, HeartPulse, Lock, Users, NotebookPen, Truck, Plus, Minus, UserSearch, MapPin, Navigation, HandHeart, Store, Home, CheckCircle2,
} from 'lucide-react';
import { useStore, RESCUE_LABEL } from '../../store/useStore.js';
import { useMyOrg, useResponderAccess } from '../../store/hooks.js';
import { useT } from '../../i18n/index.js';
import { StatusChip, NeedTags, Field } from '../../components/ui.jsx';
import EscalationTimeline from '../../components/EscalationTimeline.jsx';
import RescueProgress from '../../components/RescueProgress.jsx';
import { scoreEntity, suggestTeams } from '../../utils/priority.js';
import { ageLabel, clock, cx, fmtKmSafe } from '../../utils/format.js';

const FLOW = ['dispatched', 'on_the_way', 'reached', 'rescued', 'further_help'];

export default function DetailPanel({ coll, id, onClose }) {
  const t = useT();
  const st = useStore();
  const org = useMyOrg();
  const access = useResponderAccess();
  const e = st[coll].find((x) => x.id === id);
  const [note, setNote] = useState('');
  const kind = coll === 'businesses' ? 'business' : 'household';

  useEffect(() => {
    if (e) st.logAccess(kind, e.id, `${e.name}, ${e.shortAddress}`, 'Opened record on responder dashboard');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useEffect(() => {
    const k = (ev) => ev.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  if (!e) return null;

  const sc = scoreEntity(e, kind);
  const allTeams = st.orgs.filter((o) => o.id === org?.id).flatMap((o) => o.teams);
  const busy = new Set(allTeams.filter((x) => x.assignment).map((x) => x.id));
  const sugg = suggestTeams(e, kind, allTeams, st.event, busy);
  const alerts = st.missingAlerts.filter((a) => a.entityId === e.id && a.status === 'active');
  const people = kind === 'business' ? e.workers : e.members;
  const shareMedical = kind === 'household' ? e.privacy?.shareMedical !== false : true;
  const canMedical = access.medical && shareMedical;
  const heading = e.headingTo && st.safetyPoints.find((p) => p.id === e.headingTo.spId);

  return (
    <aside role="dialog" aria-modal="false" aria-label={t('Record detail')} className="fixed z-[600] right-0 top-16 bottom-0 w-full sm:w-[520px] bg-canvas border-l border-line shadow-2xl overflow-y-auto animate-slidein">
      <div className="sticky top-0 z-10 bg-navy text-white p-4 flex items-start gap-3">
        {kind === 'business' ? <Store className="h-7 w-7 shrink-0" aria-hidden /> : <Home className="h-7 w-7 shrink-0" aria-hidden />}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-extrabold">{e.name}</h2>
          <p className="text-white/80 text-sm">{e.address}</p>
        </div>
        <button type="button" onClick={onClose} className="btn btn-sm !min-h-[44px] text-white hover:bg-white/10" aria-label={t('Close')}><X className="h-6 w-6" aria-hidden /></button>
      </div>
      <div className="p-4 space-y-4">
        <div className="card p-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip status={sc.status} size="lg" />
            <span className="chip bg-canvas">{t('Score')} {sc.score}</span>
            <span className="chip bg-canvas">{t('Zone')} {e.zone}</span>
            {e.rescue && <span className="chip bg-help text-white"><Truck className="h-4 w-4" aria-hidden />{e.rescue.teamName}</span>}
          </div>
          <p className="font-semibold">{sc.reasons.map((r) => t(r)).join(', ')}</p>
          <div className="flex items-center gap-2">
            <span className="text-sm muted">{t('Adjust priority')}:</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => st.adjustPriority(coll, e.id, -1)} aria-label={t('Lower priority')}><Minus className="h-4 w-4" aria-hidden /></button>
            <span className="font-bold tabular-nums w-10 text-center">{(e.priorityAdjust || 0) * 25 > 0 ? '+' : ''}{(e.priorityAdjust || 0) * 25}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => st.adjustPriority(coll, e.id, 1)} aria-label={t('Raise priority')}><Plus className="h-4 w-4" aria-hidden /></button>
          </div>
          <a href={`tel:${e.phone || e.ownerPhone}`} className="btn btn-ghost btn-sm"><Phone className="h-4 w-4" aria-hidden />{e.phone || e.ownerPhone}</a>
          {e.checkin.note && <p className="rounded-xl bg-caution/20 p-3"><b>{t('Note from household')}:</b> {e.checkin.note}</p>}
          {e.checkin.location && <p className="text-sm flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden />{t('Live location shared')} ({e.lat}, {e.lng})</p>}
          {heading && <p className="text-sm flex items-center gap-1 font-semibold"><Navigation className="h-4 w-4" aria-hidden />{t('Heading to {place}', { place: heading.name })} · {clock(e.headingTo.at)}</p>}
        </div>

        {alerts.map((a) => (
          <div key={a.id} className="card p-4 border-4 border-missing">
            <p className="font-extrabold flex items-center gap-2"><UserSearch className="h-5 w-5" aria-hidden />{t('Missing')}: {a.name}{a.age != null && `, ${Math.floor(a.age)}`}</p>
            <p className="text-sm">{t('Last seen')}: {a.lastSeen}</p>
            <p className="text-sm">{t('Wearing')}: {a.clothing}</p>
            <p className="text-sm muted">{a.responses.length} {t('neighbour responses')}{a.responses[0] ? ` — ${a.responses[a.responses.length - 1].by}: ${a.responses[a.responses.length - 1].type}` : ''}</p>
            <button type="button" className="btn btn-green btn-sm mt-2" onClick={() => st.resolveAlert(a.id, org?.name || 'Responder')}><CheckCircle2 className="h-4 w-4" aria-hidden />{t('Mark found')}</button>
          </div>
        ))}

        <section className="card p-4">
          <h3 className="font-bold mb-2 flex items-center gap-2"><Truck className="h-5 w-5" aria-hidden />{t('Rescue workflow')}</h3>
          {e.rescue ? (
            <div className="space-y-3">
              <RescueProgress rescue={e.rescue} compact />
              <div className="grid grid-cols-2 gap-2">
                {FLOW.map((s) => (
                  <button key={s} type="button" aria-pressed={e.rescue.status === s} className={cx('btn btn-sm', e.rescue.status === s ? (s === 'further_help' ? 'btn-orange' : s === 'rescued' ? 'btn-green' : 'btn-blue') : 'btn-ghost')}
                    onClick={() => st.updateRescue(coll, e.id, s)}>{t(RESCUE_LABEL[s])}</button>
                ))}
              </div>
              <ul className="text-xs muted space-y-0.5">{e.rescue.history.map((h, i) => <li key={i} className="tabular-nums">{clock(h.at)} — {t(RESCUE_LABEL[h.status])}</li>)}</ul>
              {e.rescue.status !== 'rescued' && <button type="button" className="btn btn-ghost btn-sm" onClick={() => st.releaseClaim(coll, e.id)}>{t('Release claim')}</button>}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm muted">{t('Suggested teams (priority, distance, capability)')}</p>
              {sugg.map(({ team, km, why, busy: isBusy }, i) => (
                <div key={team.id} className={cx('rounded-xl p-3 flex items-center gap-3', i === 0 && !isBusy ? 'bg-help/10 border-2 border-help' : 'bg-canvas')}>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold">{team.name}{i === 0 && !isBusy && <span className="chip bg-help text-white text-xs ml-2">{t('Best match')}</span>}</p>
                    <p className="text-xs muted">{fmtKmSafe(km)} · {why.map((w) => t(w)).join(', ') || t('general support')}{isBusy ? ` · ${t('Busy')}` : ''}</p>
                  </div>
                  <button type="button" className="btn btn-primary btn-sm" disabled={isBusy} onClick={() => st.claim(coll, e.id, org.id, team.id)}>{t('Claim')}</button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card p-4">
          <h3 className="font-bold mb-2 flex items-center gap-2"><Users className="h-5 w-5" aria-hidden />{kind === 'business' ? t('Workers (headcount and special needs only)') : t('Members')}</h3>
          {kind === 'business' && <p className="text-sm mb-2">{t('On site')}: <b>{e.workers.filter((w) => w.onSite).length}</b> / {e.workers.length}</p>}
          <ul className="space-y-2">
            {people.map((m) => (
              <li key={m.id} className="rounded-xl bg-canvas p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{m.name}{kind === 'household' ? ` · ${ageLabel(m.age)}` : ` · ${m.onSite ? t('on site') : t('off site')}`}</p>
                  <StatusChip status={m.status} size="sm" />
                </div>
                <NeedTags needs={m.needs} className="mt-1" />
                {m.phone && <p className="text-xs muted mt-1">{m.phone}</p>}
                {kind === 'household' && (canMedical ? (
                  <p className="text-xs mt-1"><HeartPulse className="inline h-3.5 w-3.5 text-emergency" aria-hidden /> {m.medical.bloodType} · {t('Allergies')}: {m.medical.allergies} · {t('Meds')}: {m.medical.medications} · {m.medical.conditions}</p>
                ) : null)}
                {kind === 'business' && m.medicalConsent && m.medical && canMedical && (
                  <p className="text-xs mt-1"><HeartPulse className="inline h-3.5 w-3.5 text-emergency" aria-hidden /> {m.medical.bloodType} · {m.medical.conditions}</p>
                )}
              </li>
            ))}
          </ul>
          {!canMedical && <p className="text-sm mt-2 flex items-center gap-1 muted"><Lock className="h-4 w-4" aria-hidden />{shareMedical ? t('Medical cards are visible to verified organizations during active events only.') : t('This household chose not to share medical cards.')}</p>}
          {kind === 'household' && e.pets.length > 0 && <p className="text-sm mt-2">{t('Pets')}: {e.pets.join(', ')}</p>}
          {kind === 'business' && e.risks.length > 0 && <p className="text-sm mt-2">{t('Site risks')}: {e.risks.join(', ')}</p>}
        </section>

        <section className="card p-4">
          <h3 className="font-bold mb-3">{t('Escalation timeline and neighbour checks')}</h3>
          <EscalationTimeline entity={e} compact />
        </section>

        <section className="card p-4">
          <h3 className="font-bold mb-2 flex items-center gap-2"><NotebookPen className="h-5 w-5" aria-hidden />{t('Notes')}</h3>
          <ul className="space-y-1 text-sm mb-2">{e.notes.map((n) => <li key={n.id}><span className="muted tabular-nums">{clock(n.at)}</span> <b>{n.by}</b>: {n.text}</li>)}</ul>
          <div className="flex gap-2">
            <input className="input" aria-label={t('Add a note')} value={note} onChange={(x) => setNote(x.target.value)} placeholder={t('Add a note for other responders')} />
            <button type="button" className="btn btn-navy" disabled={!note.trim()} onClick={() => { st.addNote(coll, e.id, note.trim()); setNote(''); }}>{t('Add')}</button>
          </div>
        </section>
        <p className="text-xs muted flex items-center gap-1"><Lock className="h-3.5 w-3.5" aria-hidden />{t('Opening this record was recorded in the access log.')}</p>
      </div>
    </aside>
  );
}
