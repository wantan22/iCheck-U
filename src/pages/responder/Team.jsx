import { useState } from 'react';
import { Truck, Ship, Ambulance, Stethoscope, Car, Droplets, Axe, Tent, Plus, LogIn, LogOut, ClipboardList, Users, HandHeart, MapPin } from 'lucide-react';
import { useStore } from '../../store/useStore.js';
import { useMyOrg } from '../../store/hooks.js';
import { useT } from '../../i18n/index.js';
import { Card, CardTitle, PageHeader, Toggle, Field, Stat, StatusChip } from '../../components/ui.jsx';
import { clock, cx } from '../../utils/format.js';
import { OrgGate } from './shared.jsx';

const BASES = {
  'Balai Bomba (north)': [3.0372, 101.5388],
  'Hospital Daerah (east)': [3.0362, 101.5440],
  'Sekolah Kebangsaan (west)': [3.0345, 101.5300],
  'Dewan Komuniti (centre)': [3.0338, 101.5365],
};

function Inner() {
  const t = useT();
  const org = useMyOrg();
  const st = useStore();
  const [member, setMember] = useState({});
  const [task, setTask] = useState({ teamId: org.teams[0]?.id || '', member: '', text: '' });
  const [newTeam, setNewTeam] = useState('');
  const approved = st.orgs.filter((o) => o.status === 'approved');
  const sum = (k) => approved.reduce((n, o) => n + (o.capabilities?.[k] || 0), 0);
  const teamAvail = approved.flatMap((o) => o.teams).filter((x) => x.available && !x.assignment).length;

  return (
    <div className="space-y-5">
      <PageHeader icon={Truck} title={t('Teams and resources')} subtitle={org.name} />
      <section aria-labelledby="res-board">
        <h2 id="res-board" className="h2 mb-3">{t('Resource board (all verified organizations)')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
          <Stat label={t('Boats')} value={sum('boats')} icon={Ship} tone="blue" />
          <Stat label={t('Medics')} value={sum('medics')} icon={Stethoscope} tone="red" />
          <Stat label={t('Ambulances')} value={sum('ambulances')} icon={Ambulance} tone="red" />
          <Stat label={t('4x4 vehicles')} value={sum('vehicles4x4')} icon={Car} />
          <Stat label={t('Pumps')} value={sum('pumps')} icon={Droplets} tone="blue" />
          <Stat label={t('Chainsaws')} value={sum('chainsaws')} icon={Axe} />
          <Stat label={t('Teams free now')} value={teamAvail} icon={Users} tone="safe" />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {org.teams.map((tm) => {
          const target = tm.assignment && st[tm.assignment.coll].find((x) => x.id === tm.assignment.id);
          return (
            <Card key={tm.id}>
              <CardTitle icon={Truck} action={<span className={cx('chip text-xs', tm.assignment ? 'bg-help text-white' : tm.available ? 'bg-safe text-white' : 'bg-pending text-white')}>{tm.assignment ? t('On a task') : tm.available ? t('Available') : t('Unavailable')}</span>}>{tm.name}</CardTitle>
              <p className="text-sm muted">{t('Capabilities')}: {tm.capability.join(', ')} · {t('Capacity')}: {tm.capacity} {t('people')}</p>
              {target && <p className="mt-2 font-semibold">{t('Assigned to')}: {target.shortAddress} ({target.name}) — {target.rescue?.status}</p>}
              <div className="mt-3 divide-y divide-line">
                <Toggle id={`av-${tm.id}`} checked={tm.available} onChange={(v) => st.updateTeam(org.id, tm.id, { available: v })} label={t('Available to respond')} />
                <div className="py-2">
                  <Field label={t('Location / staging base')} id={`loc-${tm.id}`}>
                    <select id={`loc-${tm.id}`} className="input" value={Object.entries(BASES).find(([, p]) => p[0] === tm.lat && p[1] === tm.lng)?.[0] || ''} onChange={(e) => { const p = BASES[e.target.value]; if (p) st.updateTeam(org.id, tm.id, { lat: p[0], lng: p[1] }); }}>
                      <option value="">{t('Custom')} ({tm.lat}, {tm.lng})</option>
                      {Object.keys(BASES).map((b) => <option key={b}>{b}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="py-3 flex flex-wrap items-center gap-2">
                  <span className="font-semibold flex-1">{t('Responder safety check')}: {tm.checkedIn ? t('On duty since {time}', { time: clock(tm.checkedInAt) }) : tm.checkedInAt ? t('Checked out at {time}', { time: clock(tm.checkedInAt) }) : t('Not checked in')}</span>
                  {tm.checkedIn
                    ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => st.teamCheck(org.id, tm.id, false)}><LogOut className="h-4 w-4" aria-hidden />{t('Check out safely')}</button>
                    : <button type="button" className="btn btn-green btn-sm" onClick={() => st.teamCheck(org.id, tm.id, true)}><LogIn className="h-4 w-4" aria-hidden />{t('Check in for duty')}</button>}
                </div>
                <div className="py-3">
                  <p className="font-semibold mb-2">{t('Members')}</p>
                  <div className="flex flex-wrap gap-2">{tm.members.map((m) => <span key={m} className="chip bg-canvas">{m}</span>)}</div>
                  <div className="flex gap-2 mt-2">
                    <input className="input" aria-label={t('New member name')} placeholder={t('New member name')} value={member[tm.id] || ''} onChange={(e) => setMember({ ...member, [tm.id]: e.target.value })} />
                    <button type="button" className="btn btn-navy" disabled={!member[tm.id]} onClick={() => { st.updateTeam(org.id, tm.id, { members: [...tm.members, member[tm.id]] }); setMember({ ...member, [tm.id]: '' }); }}><Plus className="h-4 w-4" aria-hidden />{t('Add')}</button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <Card>
        <CardTitle icon={Plus}>{t('Add a team')}</CardTitle>
        <div className="flex gap-2">
          <input className="input" aria-label={t('Team name')} placeholder={t('Team name')} value={newTeam} onChange={(e) => setNewTeam(e.target.value)} />
          <button type="button" className="btn btn-navy" disabled={!newTeam} onClick={() => { st.addTeam(org.id, { name: newTeam, capability: ['vehicle'] }); setNewTeam(''); }}>{t('Add team')}</button>
        </div>
      </Card>

      <Card>
        <CardTitle icon={ClipboardList}>{t('Tasks for your members')}</CardTitle>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto] items-end">
          <Field label={t('Team')} id="ot-team"><select id="ot-team" className="input" value={task.teamId} onChange={(e) => setTask({ ...task, teamId: e.target.value, member: '' })}>{org.teams.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
          <Field label={t('Member')} id="ot-mem"><select id="ot-mem" className="input" value={task.member} onChange={(e) => setTask({ ...task, member: e.target.value })}><option value="">{t('Whole team')}</option>{org.teams.find((x) => x.id === task.teamId)?.members.map((m) => <option key={m}>{m}</option>)}</select></Field>
          <Field label={t('Task')} id="ot-text"><input id="ot-text" className="input" value={task.text} onChange={(e) => setTask({ ...task, text: e.target.value })} placeholder={t('e.g. Refuel boat 2 at Balai Bomba')} /></Field>
          <button type="button" className="btn btn-red" disabled={!task.text} onClick={() => { st.addOrgTask({ orgId: org.id, ...task }); setTask({ ...task, text: '' }); }}>{t('Assign')}</button>
        </div>
        <ul className="mt-4 space-y-2">
          {st.orgTasks.filter((x) => x.orgId === org.id).map((x) => (
            <li key={x.id} className="rounded-xl bg-canvas p-3 flex flex-wrap items-center gap-2">
              <span className="flex-1 min-w-0"><b>{x.text}</b> <span className="muted text-sm">· {org.teams.find((tm) => tm.id === x.teamId)?.name}{x.member ? ` · ${x.member}` : ''} · {clock(x.at)}</span></span>
              {['todo', 'doing', 'done'].map((s) => (
                <button key={s} type="button" aria-pressed={x.status === s} className={cx('btn btn-sm', x.status === s ? (s === 'done' ? 'btn-green' : 'btn-navy') : 'btn-ghost')} onClick={() => st.setOrgTask(x.id, s)}>{t({ todo: 'To do', doing: 'In progress', done: 'Done' }[s])}</button>
              ))}
            </li>
          ))}
        </ul>
      </Card>

    </div>
  );
}

export default function Team() {
  return <OrgGate><Inner /></OrgGate>;
}
