import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Siren, Square, AlertTriangle, Gauge, RotateCcw, BarChart3, Waves, Mountain, Activity, Flame, CheckCircle2, UserCheck } from 'lucide-react';
import { useStore, totalEscalationMs } from '../../store/useStore.js';
import { useT } from '../../i18n/index.js';
import { Card, CardTitle, PageHeader, Stat, Toggle, CheckPill, Notice } from '../../components/ui.jsx';
import { ModePill } from '../../components/Layout.jsx';
import { displayStatus } from '../../utils/priority.js';
import { clock, elapsed, cx } from '../../utils/format.js';

const TYPES = { flood: Waves, landslide: Mountain, earthquake: Activity, fire: Flame };

export default function EventControl() {
  const t = useT();
  const st = useStore();
  const [type, setType] = useState('flood');
  const [zones, setZones] = useState(['A', 'B', 'C']);
  const [severity, setSeverity] = useState('high');
  const active = st.phase === 'active';
  const affected = st.households.filter((h) => st.event && st.event.zones.includes(h.zone));
  const c = (s) => affected.filter((h) => displayStatus(h) === s).length;
  const pendingApprovals = st.orgs.filter((o) => o.status === 'pending').length;

  return (
    <div className="space-y-5">
      <PageHeader icon={Siren} title={t('Event control')} subtitle="Taman Seri Harmoni, Shah Alam" actions={<ModePill />} />

      {pendingApprovals > 0 && (
        <Notice tone="amber" icon={UserCheck}>{t('{n} rescue organizations waiting for approval.', { n: pendingApprovals })} <Link to="/admin/approvals" className="underline font-bold">{t('Open approval queue')}</Link></Notice>
      )}

      <button type="button" disabled={active} onClick={() => { st.activateEvent({ type: 'flood', zones: ['A', 'B', 'C'], severity: 'high' }); st.toast(t('Flood simulated in Zones A, B and C'), 'critical'); }}
        className="btn btn-red w-full min-h-[96px] text-2xl rounded-card shadow-lg">
        <Siren className="h-9 w-9" aria-hidden />{t('Simulate Disaster')}
        <span className="text-base font-semibold opacity-90">({t('flood, Zones A–C')})</span>
      </button>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <CardTitle icon={Siren}>{t('Create and activate an event')}</CardTitle>
          <fieldset>
            <legend className="label">{t('Type')}</legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(TYPES).map(([k, I]) => (
                <button key={k} type="button" aria-pressed={type === k} className={cx('btn', type === k ? 'btn-navy' : 'btn-ghost')} onClick={() => setType(k)}><I className="h-5 w-5" aria-hidden />{t(k)}</button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="label">{t('Affected zones')}</legend>
            <div className="flex flex-wrap gap-2">
              {['A', 'B', 'C', 'D'].map((z) => <CheckPill key={z} checked={zones.includes(z)} onChange={(on) => setZones(on ? [...zones, z].sort() : zones.filter((x) => x !== z))}>{t('Zone')} {z}</CheckPill>)}
            </div>
          </fieldset>
          <fieldset>
            <legend className="label">{t('Severity')}</legend>
            <div className="grid grid-cols-3 gap-2">
              {['moderate', 'high', 'critical'].map((s) => <button key={s} type="button" aria-pressed={severity === s} className={cx('btn', severity === s ? (s === 'critical' ? 'btn-red' : 'btn-orange') : 'btn-ghost')} onClick={() => setSeverity(s)}>{t(s)}</button>)}
            </div>
          </fieldset>
          <div className="grid sm:grid-cols-2 gap-2">
            <button type="button" className="btn btn-red btn-lg" disabled={active || !zones.length} onClick={() => st.activateEvent({ type, zones, severity })}><Siren className="h-5 w-5" aria-hidden />{t('Activate event')}</button>
            <button type="button" className="btn btn-orange btn-lg" disabled={active || !zones.length} onClick={() => st.issueWarning(type, zones)}><AlertTriangle className="h-5 w-5" aria-hidden />{t('Issue warning only')}</button>
          </div>
          {st.phase === 'alert' && <button type="button" className="btn btn-ghost w-full" onClick={st.clearWarning}>{t('Clear warning')}</button>}
        </Card>

        <Card className="space-y-4">
          <CardTitle icon={Gauge}>{t('Current event')}</CardTitle>
          {st.event ? (
            <>
              <p className="font-bold text-lg">{t(st.event.type)} · {t('Zones')} {st.event.zones.join(', ')} · {t(st.event.severity)}</p>
              <p className="muted">{t('Started')} {clock(st.event.startedAt)} · {st.event.endedAt ? `${t('Ended')} ${clock(st.event.endedAt)}` : `${t('Elapsed')} ${elapsed(st.now - st.event.startedAt)}`}</p>
              <div className="grid grid-cols-3 gap-2">
                <Stat label={t('Safe')} value={c('safe') + c('rescued')} tone="safe" />
                <Stat label={t('Needs help')} value={c('needs_help') + c('missing')} tone="red" />
                <Stat label={t('No reply')} value={c('pending') + c('no_response')} tone="orange" />
              </div>
            </>
          ) : <p className="muted">{t('No event yet.')}</p>}
          <button type="button" className="btn btn-navy btn-lg w-full" disabled={!active} onClick={st.endEvent}><Square className="h-5 w-5" aria-hidden />{t('End event and start recovery mode')}</button>
          {st.phase === 'recovery' && (
            <div className="space-y-2">
              <Notice tone="blue" icon={RotateCcw}>{t('Recovery mode is on. Residents can tick off their checklists and see replacement guides. Responder access to household details has ended.')}</Notice>
              <button type="button" className="btn btn-ghost w-full" onClick={st.closeRecovery}><CheckCircle2 className="h-5 w-5" aria-hidden />{t('Close recovery and return to normal')}</button>
            </div>
          )}
          <Link to="/responder/summary" className="btn btn-ghost w-full"><BarChart3 className="h-5 w-5" aria-hidden />{t('Post-event summary')}</Link>
        </Card>
      </div>

      <Card>
        <CardTitle icon={Gauge}>{t('Escalation timers')}</CardTitle>
        <Toggle id="adm-speed" checked={st.settings.demoSpeed} onChange={(v) => st.setSetting('demoSpeed', v)} label={t('Demo speed (escalation in about 60 seconds)')} description={t('Current total: {time}', { time: elapsed(totalEscalationMs(st)) })} />
        <label htmlFor="adm-min" className="label mt-3">{t('Real escalation time (minutes)')}</label>
        <input id="adm-min" type="number" min="1" className="input max-w-[160px]" value={st.settings.escalationMinutes} onChange={(e) => st.setSetting('escalationMinutes', Math.max(1, Number(e.target.value) || 30))} />
      </Card>
    </div>
  );
}
