import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, Clock, Trash2, FileX, HeartPulse, HardHat, ScrollText, Flag, Download } from 'lucide-react';
import { useStore } from '../store/useStore.js';
import { useMyHousehold, useMyBusiness } from '../store/hooks.js';
import { useT } from '../i18n/index.js';
import { Card, CardTitle, PageHeader, Modal, Field, Notice } from '../components/ui.jsx';
import { clock } from '../utils/format.js';
import { IS_ARTIFACT } from '../utils/env.js';

export default function Privacy() {
  const t = useT();
  const nav = useNavigate();
  const role = useStore((s) => s.role);
  const st = useStore();
  const h = useMyHousehold();
  const b = useMyBusiness();
  const [del, setDel] = useState(false);
  const [report, setReport] = useState(null);
  const myRecord = role === 'household' ? h : role === 'business' ? b : null;
  const myLog = myRecord ? st.accessLog.filter((a) => a.recordId === myRecord.id) : [];
  const responders = st.orgs.filter((o) => o.status === 'approved');

  const sections = [
    [Eye, 'Who can see your data', ['You and your household or business can always see and edit your data.', 'Neighbours only see your name, address and status when they are asked to check on you, or an unaccounted-for alert.', 'Verified rescue organizations see household details only during an active emergency, and only for your zone.']],
    [HeartPulse, 'Medical cards', ['Private by default.', 'Shown only to verified rescue organizations, only while an emergency is active.', 'You can turn sharing off at any time.']],
    [FileX, 'What we never store', ['Your actual documents — the checklist stores only where things are kept.', 'PINs, passwords or safe combinations.', 'Worker passport numbers, permit numbers or nationality.']],
    [HardHat, 'Workers', ['Worker data is used only for safety and rescue, never for enforcement.', 'Responders see headcount and special needs only, never work status.']],
    [Clock, 'Access ends automatically', ['When an emergency ends, responder access to household details ends.', 'Every time a responder opens your record, it is written in the access log.']],
  ];

  return (
    <div className="space-y-5">
      <PageHeader icon={Shield} title={t('Privacy and data')} subtitle={t('In simple words: what we keep, who sees it, and how to remove it.')} />
      <Notice tone="green" icon={Shield}>{t('iCheck-U follows the principles of Malaysia\'s Personal Data Protection Act 2010 (PDPA): you give consent, we use data only for safety, we keep the minimum, and you can access, correct or delete it.')}</Notice>
      {sections.map(([Icon, title, items]) => (
        <Card key={title}>
          <CardTitle icon={Icon}>{t(title)}</CardTitle>
          <ul className="list-disc pl-6 space-y-1">{items.map((x) => <li key={x}>{t(x)}</li>)}</ul>
        </Card>
      ))}

      {myRecord && (
        <>
          <Card>
            <CardTitle icon={ScrollText}>{t('Who opened my record')}</CardTitle>
            {myLog.length === 0 ? <p className="muted">{t('Nobody has opened your record.')}</p> : (
              <ul className="space-y-1 text-sm">{myLog.map((a) => <li key={a.id}><span className="tabular-nums muted">{clock(a.at)}</span> — <b>{a.who}</b>: {t(a.action)}</li>)}</ul>
            )}
          </Card>
          {role === 'household' && (
            <Card className="space-y-3">
              <CardTitle icon={Clock}>{t('My data settings')}</CardTitle>
              <Field label={t('Automatically delete my data after')} id="expiry">
                <select id="expiry" className="input" value={h.privacy?.expiry || 'never'} onChange={(e) => st.updateHousehold(h.id, { privacy: { ...h.privacy, expiry: e.target.value } })}>
                  <option value="never">{t('Never (until I delete it)')}</option>
                  <option value="6m">{t('6 months without login')}</option>
                  <option value="1y">{t('1 year without login')}</option>
                  <option value="2y">{t('2 years without login')}</option>
                </select>
              </Field>
              <label className="flex items-center gap-3 min-h-touch font-semibold">
                <input type="checkbox" className="h-6 w-6" checked={h.privacy?.shareMedical !== false} onChange={(e) => st.updateHousehold(h.id, { privacy: { ...h.privacy, shareMedical: e.target.checked } })} />
                {t('Share medical cards with verified responders during emergencies')}
              </label>
            </Card>
          )}
          <Card className="space-y-3">
            <CardTitle icon={Flag}>{t('Report a responder')}</CardTitle>
            <p className="muted text-sm">{t('If a responder behaved badly or misused your information, tell the admin. They can suspend the account.')}</p>
            <button type="button" className="btn btn-ghost" onClick={() => setReport({ against: responders[0]?.name || '', reason: '' })}><Flag className="h-5 w-5" aria-hidden />{t('Report a responder')}</button>
          </Card>
          <Card className="space-y-3 border-2 border-emergency/40">
            <CardTitle icon={Trash2}>{t('Delete my data')}</CardTitle>
            <div className="flex flex-wrap gap-2">
              {!IS_ARTIFACT && <button type="button" className="btn btn-ghost" onClick={() => {
                const blob = new Blob([JSON.stringify(myRecord, null, 2)], { type: 'application/json' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'icheck-u-my-data.json'; a.click();
              }}><Download className="h-5 w-5" aria-hidden />{t("Download my data")}</button>}
              <button type="button" className="btn btn-red" onClick={() => setDel(true)}><Trash2 className="h-5 w-5" aria-hidden />{t('Delete everything')}</button>
            </div>
          </Card>
        </>
      )}

      <Modal open={del} onClose={() => setDel(false)} title={t('Delete all your data?')}
        footer={<><button type="button" className="btn btn-ghost" onClick={() => setDel(false)}>{t('Cancel')}</button>
          <button type="button" className="btn btn-red" onClick={() => { if (role === 'household') st.deleteHousehold(h.id); else st.deleteBusiness(b.id); setDel(false); nav('/'); st.toast(t('Your data was deleted'), 'success'); }}>{t('Yes, delete')}</button></>}>
        <p>{t('This removes your profile, members or workers, medical cards and checklist. It cannot be undone.')}</p>
      </Modal>
      <Modal open={!!report} onClose={() => setReport(null)} title={t('Report a responder')}
        footer={<><button type="button" className="btn btn-ghost" onClick={() => setReport(null)}>{t('Cancel')}</button>
          <button type="button" className="btn btn-red" disabled={!report?.reason} onClick={() => { st.fileReport(report); setReport(null); st.toast(t('Report sent to admin'), 'success'); }}>{t('Send report')}</button></>}>
        {report && (
          <div className="space-y-3">
            <Field label={t('Organization or person')} id="rep-who">
              <select id="rep-who" className="input" value={report.against} onChange={(e) => setReport({ ...report, against: e.target.value })}>
                {st.orgs.map((o) => <option key={o.id}>{o.name}</option>)}
              </select>
            </Field>
            <Field label={t('What happened?')} id="rep-why"><textarea id="rep-why" className="input min-h-[100px]" value={report.reason} onChange={(e) => setReport({ ...report, reason: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
