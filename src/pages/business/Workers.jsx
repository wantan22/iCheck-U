import { useState } from 'react';
import { HardHat, Plus, Pencil, Trash2, ShieldCheck, HeartPulse, Bike } from 'lucide-react';
import { useStore } from '../../store/useStore.js';
import { useMyBusiness } from '../../store/hooks.js';
import { useT } from '../../i18n/index.js';
import { PageHeader, Notice, Modal, Field, Toggle, NeedTags, CheckPill, StatusChip, NEED_LABELS, EmptyState } from '../../components/ui.jsx';

const EMPTY = { name: '', role: '', shift: 'Day', phone: '', emergencyContact: '', commute: '', onSite: true, needs: [], medicalConsent: false, medical: { bloodType: '', allergies: '', medications: '', conditions: '' } };

export default function Workers() {
  const t = useT();
  const b = useMyBusiness();
  const st = useStore();
  const [edit, setEdit] = useState(null);
  if (!b) return null;
  const save = () => {
    const v = edit.value;
    if (!v.name.trim()) return;
    const data = { ...v, medical: v.medicalConsent ? v.medical : null };
    if (edit.id) st.setWorker(b.id, edit.id, data); else st.addWorker(b.id, data);
    setEdit(null);
  };
  const f = (k) => ({ value: edit?.value[k] ?? '', onChange: (e) => setEdit({ ...edit, value: { ...edit.value, [k]: e.target.value } }) });
  return (
    <div className="space-y-5">
      <PageHeader icon={HardHat} title={t('Worker register')} subtitle={`${b.name} · ${b.workers.length} ${t('workers')}`}
        actions={<button type="button" className="btn btn-primary" onClick={() => setEdit({ value: { ...EMPTY, medical: { ...EMPTY.medical } } })}><Plus className="h-5 w-5" aria-hidden />{t('Add worker')}</button>} />
      <Notice tone="green" icon={ShieldCheck} title={t('Worker data is used only for safety and rescue, never for enforcement.')}>
        {t('We never ask for passport numbers, permit numbers or nationality. Responders see headcount and special needs only, never work status.')}
      </Notice>
      {b.workers.length === 0 && <EmptyState icon={HardHat} title="No workers yet">{t('Add everyone who works here, including part-timers.')}</EmptyState>}
      <ul className="space-y-3">
        {b.workers.map((w) => (
          <li key={w.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold text-lg">{w.name}</p>
                <p className="muted">{w.role} · {t('Shift')}: {w.shift} · {w.phone}</p>
                <p className="text-sm muted flex items-center gap-1"><Bike className="h-4 w-4" aria-hidden />{w.commute || '—'} · {t('Emergency contact')}: {w.emergencyContact || '—'}</p>
                <NeedTags needs={w.needs} className="mt-1" />
                {w.medicalConsent && <p className="text-sm mt-1 flex items-center gap-1"><HeartPulse className="h-4 w-4 text-emergency" aria-hidden />{t('Medical card on file (consented)')}</p>}
              </div>
              <StatusChip status={w.status} size="sm" />
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <Toggle id={`on-${w.id}`} checked={w.onSite} onChange={(v) => st.setWorker(b.id, w.id, { onSite: v })} label={t('On site now')} />
              <div className="flex-1" />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEdit({ id: w.id, value: { ...EMPTY, ...w, medical: w.medical || { ...EMPTY.medical } } })}><Pencil className="h-4 w-4" aria-hidden />{t('Edit')}</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => st.removeWorker(b.id, w.id)}><Trash2 className="h-4 w-4" aria-hidden />{t('Remove')}</button>
            </div>
          </li>
        ))}
      </ul>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? t('Edit worker') : t('Add worker')} size="lg"
        footer={<><button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>{t('Cancel')}</button><button type="button" className="btn btn-green" onClick={save}>{t('Save')}</button></>}>
        {edit && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('Name or nickname')} id="w-name"><input id="w-name" className="input" {...f('name')} /></Field>
              <Field label={t('Role')} id="w-role"><input id="w-role" className="input" {...f('role')} /></Field>
              <Field label={t('Shift')} id="w-shift"><input id="w-shift" className="input" {...f('shift')} /></Field>
              <Field label={t('Phone')} id="w-phone"><input id="w-phone" type="tel" className="input" {...f('phone')} /></Field>
              <Field label={t('Emergency contact')} id="w-ec"><input id="w-ec" className="input" {...f('emergencyContact')} /></Field>
              <Field label={t('Commute and transport')} id="w-com"><input id="w-com" className="input" {...f('commute')} placeholder={t('e.g. Motorcycle from Klang')} /></Field>
            </div>
            <fieldset>
              <legend className="label">{t('Special needs')}</legend>
              <div className="flex flex-wrap gap-2">
                {['pregnant', 'elderly', 'disabled', 'mobility', 'medical'].map((n) => (
                  <CheckPill key={n} checked={edit.value.needs.includes(n)} onChange={(on) => setEdit({ ...edit, value: { ...edit.value, needs: on ? [...edit.value.needs, n] : edit.value.needs.filter((x) => x !== n) } })}>{t(NEED_LABELS[n])}</CheckPill>
                ))}
              </div>
            </fieldset>
            <Toggle id="w-consent" checked={edit.value.medicalConsent} onChange={(v) => setEdit({ ...edit, value: { ...edit.value, medicalConsent: v } })} label={t('Worker agreed to store a medical card')} description={t('Optional. Only with the worker\'s own consent.')} />
            {edit.value.medicalConsent && (
              <div className="grid gap-3 sm:grid-cols-2">
                {['bloodType', 'allergies', 'medications', 'conditions'].map((k) => (
                  <Field key={k} label={t({ bloodType: 'Blood type', allergies: 'Allergies', medications: 'Medications', conditions: 'Conditions' }[k])} id={`wm-${k}`}>
                    <input id={`wm-${k}`} className="input" value={edit.value.medical[k]} onChange={(e) => setEdit({ ...edit, value: { ...edit.value, medical: { ...edit.value.medical, [k]: e.target.value } } })} />
                  </Field>
                ))}
              </div>
            )}
            <Toggle id="w-onsite" checked={edit.value.onSite} onChange={(v) => setEdit({ ...edit, value: { ...edit.value, onSite: v } })} label={t('On site now')} />
          </div>
        )}
      </Modal>
    </div>
  );
}
