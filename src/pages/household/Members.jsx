import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, Pencil, Trash2, HeartPulse, PawPrint, Phone, Lock, BadgeCheck, MapPin } from 'lucide-react';
import { useStore } from '../../store/useStore.js';
import { useMyHousehold } from '../../store/hooks.js';
import { useT } from '../../i18n/index.js';
import { Card, CardTitle, PageHeader, NeedTags, Modal, Toggle, StatusChip } from '../../components/ui.jsx';
import MemberForm, { EMPTY_MEMBER } from '../../components/MemberForm.jsx';
import { ageLabel, initials } from '../../utils/format.js';

export default function Members() {
  const t = useT();
  const h = useMyHousehold();
  const st = useStore();
  const [edit, setEdit] = useState(null); // { id?, value }
  const [confirmDel, setConfirmDel] = useState(null);
  const [pets, setPets] = useState(null);
  if (!h) return null;

  const save = () => {
    const v = { ...edit.value, age: Number(edit.value.age) };
    if (!v.name.trim()) return;
    if (edit.id) st.updateMember(h.id, edit.id, v);
    else {
      st.addMember(h.id, v);
      st.toast(t('Member added'), 'success', t('Remember to add their documents and medicines to your checklist.'));
    }
    setEdit(null);
  };

  return (
    <div className="space-y-5">
      <PageHeader icon={Users} title={t('Household members')} subtitle={`${h.name} · ${h.members.length} ${t('people')}`}
        actions={<button type="button" className="btn btn-primary" onClick={() => setEdit({ value: { ...EMPTY_MEMBER, medical: { ...EMPTY_MEMBER.medical } } })}><Plus className="h-5 w-5" aria-hidden />{t('Add member')}</button>} />

      <ul className="space-y-3">
        {h.members.map((m) => (
          <li key={m.id} className="card p-4">
            <div className="flex items-start gap-4">
              {m.photo ? <img src={m.photo} alt="" className="h-14 w-14 rounded-full object-cover" /> : <span className="h-14 w-14 rounded-full bg-navy text-white dark:bg-white dark:text-neutral-900 grid place-items-center font-extrabold text-lg shrink-0" aria-hidden>{initials(m.name)}</span>}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg">{m.name}</p>
                <p className="muted">{ageLabel(m.age)} {m.age >= 1 ? t('years') : ''} · {t(m.relationship)}{m.phone ? ` · ${m.phone}` : ''}</p>
                <NeedTags needs={m.needs} className="mt-2" />
              </div>
              <StatusChip status={m.status} size="sm" />
            </div>
            <details className="mt-3 rounded-xl bg-canvas p-3">
              <summary className="cursor-pointer font-semibold flex items-center gap-2 min-h-[40px]"><HeartPulse className="h-5 w-5 text-emergency" aria-hidden />{t('Medical emergency card')}<span className="ml-auto chip bg-surface text-xs"><Lock className="h-3.5 w-3.5" aria-hidden />{t('Private')}</span></summary>
              <dl className="grid grid-cols-2 gap-2 mt-2 text-sm">
                <div><dt className="muted">{t('Blood type')}</dt><dd className="font-semibold">{m.medical.bloodType || '—'}</dd></div>
                <div><dt className="muted">{t('Allergies')}</dt><dd className="font-semibold">{m.medical.allergies || '—'}</dd></div>
                <div><dt className="muted">{t('Medications')}</dt><dd className="font-semibold">{m.medical.medications || '—'}</dd></div>
                <div><dt className="muted">{t('Conditions')}</dt><dd className="font-semibold">{m.medical.conditions || '—'}</dd></div>
              </dl>
            </details>
            <div className="flex gap-2 mt-3">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEdit({ id: m.id, value: { ...m, age: String(m.age), medical: { ...m.medical } } })}><Pencil className="h-4 w-4" aria-hidden />{t('Edit')}</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(m)}><Trash2 className="h-4 w-4" aria-hidden />{t('Remove')}</button>
            </div>
          </li>
        ))}
      </ul>

      <Card>
        <CardTitle icon={PawPrint} action={<button type="button" className="btn btn-ghost btn-sm" onClick={() => setPets(h.pets.join(', '))}><Pencil className="h-4 w-4" aria-hidden />{t('Edit')}</button>}>{t('Pets')}</CardTitle>
        {pets != null ? (
          <div className="flex gap-2">
            <input className="input" aria-label={t('Pets')} value={pets} onChange={(e) => setPets(e.target.value)} />
            <button type="button" className="btn btn-green" onClick={() => { st.updateHousehold(h.id, { pets: pets.split(',').map((x) => x.trim()).filter(Boolean) }); setPets(null); }}>{t('Save')}</button>
          </div>
        ) : <p>{h.pets.length ? h.pets.join(', ') : t('No pets')}</p>}
      </Card>

      <Card>
        <CardTitle icon={Phone}>{t('Emergency contacts')}</CardTitle>
        <ul className="space-y-2">
          {h.contacts.map((c, i) => <li key={i} className="flex justify-between gap-2"><span className="font-semibold">{c.name}</span><a className="underline" href={`tel:${c.phone}`}>{c.phone}</a></li>)}
          <li className="flex justify-between gap-2 border-t border-line pt-2"><span><span className="font-semibold">{h.outOfArea.name}</span> <span className="muted text-sm">· {t('Out-of-area contact')}</span></span><a className="underline" href={`tel:${h.outOfArea.phone}`}>{h.outOfArea.phone}</a></li>
        </ul>
      </Card>

      <Card>
        <CardTitle icon={MapPin}>{t('Address')}</CardTitle>
        <p>{h.address}</p>
        <p className="muted text-sm">{t('Zone')} {h.zone} · {h.lat}, {h.lng}</p>
      </Card>

      <p className="text-sm muted">{t('You can edit or delete your data at any time.')} <Link className="underline font-semibold" to="/privacy">{t('Privacy and data')}</Link></p>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? t('Edit member') : t('Add member')} size="lg"
        footer={<><button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>{t('Cancel')}</button><button type="button" className="btn btn-green" onClick={save}>{t('Save')}</button></>}>
        {edit && <MemberForm value={edit.value} onChange={(v) => setEdit({ ...edit, value: v })} idPrefix="edit" />}
      </Modal>
      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title={t('Remove {name}?', { name: confirmDel?.name })}
        footer={<><button type="button" className="btn btn-ghost" onClick={() => setConfirmDel(null)}>{t('Cancel')}</button><button type="button" className="btn btn-red" onClick={() => { st.removeMember(h.id, confirmDel.id); setConfirmDel(null); }}>{t('Remove')}</button></>}>
        <p>{t('Their details and medical card will be deleted from iCheck-U.')}</p>
      </Modal>
    </div>
  );
}
