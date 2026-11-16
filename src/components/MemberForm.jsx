import { useState } from 'react';
import { Camera, HeartPulse, Lock } from 'lucide-react';
import { useT } from '../i18n/index.js';
import { Field, CheckPill, NEED_LABELS } from './ui.jsx';

export const EMPTY_MEMBER = {
  name: '', age: '', relationship: '', phone: '', needs: [], photo: '', clothing: '',
  medical: { bloodType: '', allergies: '', medications: '', conditions: '' },
};
const NEEDS = ['child', 'infant', 'elderly', 'disabled', 'bedridden', 'pregnant', 'oxygen', 'dialysis', 'mobility', 'medical'];
const BLOOD = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function MemberForm({ value, onChange, idPrefix = 'm', showMedical = true }) {
  const t = useT();
  const [med, setMed] = useState(false);
  const v = value;
  const set = (k, x) => onChange({ ...v, [k]: x });
  const setMedical = (k, x) => onChange({ ...v, medical: { ...v.medical, [k]: x } });
  const toggleNeed = (n, on) => set('needs', on ? [...new Set([...v.needs, n])] : v.needs.filter((x) => x !== n));
  const onPhoto = (e) => {
    const f = e.target.files?.[0];
    if (f) set('photo', URL.createObjectURL(f));
  };
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('Full name')} id={`${idPrefix}-name`}>
          <input id={`${idPrefix}-name`} className="input" value={v.name} onChange={(e) => set('name', e.target.value)} required autoComplete="off" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('Age')} id={`${idPrefix}-age`}>
            <input id={`${idPrefix}-age`} className="input" type="number" min="0" max="120" step="0.1" inputMode="decimal" value={v.age} onChange={(e) => set('age', e.target.value)} required />
          </Field>
          <Field label={t('Relationship')} id={`${idPrefix}-rel`}>
            <input id={`${idPrefix}-rel`} className="input" value={v.relationship} onChange={(e) => set('relationship', e.target.value)} placeholder={t('e.g. Son')} />
          </Field>
        </div>
        <Field label={`${t('Phone')} (${t('optional')})`} id={`${idPrefix}-phone`}>
          <input id={`${idPrefix}-phone`} className="input" type="tel" inputMode="tel" value={v.phone} onChange={(e) => set('phone', e.target.value)} placeholder="01X-XXX XXXX" />
        </Field>
        <Field label={`${t('Photo')} (${t('optional')})`} id={`${idPrefix}-photo`} hint={t('Helps neighbours recognise them if they go missing.')}>
          <div className="flex items-center gap-3">
            {v.photo ? <img src={v.photo} alt="" className="h-12 w-12 rounded-full object-cover" /> : <span className="h-12 w-12 rounded-full bg-canvas grid place-items-center"><Camera className="h-5 w-5 muted" aria-hidden /></span>}
            <input id={`${idPrefix}-photo`} type="file" accept="image/*" onChange={onPhoto} className="text-sm file:btn file:btn-sm file:btn-ghost file:mr-3" />
          </div>
        </Field>
      </div>
      <fieldset>
        <legend className="label">{t('Special needs')}</legend>
        <div className="flex flex-wrap gap-2">
          {NEEDS.map((n) => (
            <CheckPill key={n} checked={v.needs.includes(n)} onChange={(on) => toggleNeed(n, on)}>{t(NEED_LABELS[n])}</CheckPill>
          ))}
        </div>
      </fieldset>
      <Field label={`${t('What they usually wear / description')} (${t('optional')})`} id={`${idPrefix}-cloth`}>
        <input id={`${idPrefix}-cloth`} className="input" value={v.clothing} onChange={(e) => set('clothing', e.target.value)} placeholder={t('e.g. Red T-shirt, blue shorts')} />
      </Field>
      {showMedical && (
        <div className="rounded-2xl border-2 border-line p-4">
          <button type="button" className="w-full flex items-center justify-between font-bold min-h-touch" onClick={() => setMed(!med)} aria-expanded={med}>
            <span className="flex items-center gap-2"><HeartPulse className="h-5 w-5 text-emergency" aria-hidden />{t('Medical emergency card')}</span>
            <span className="chip bg-canvas text-xs"><Lock className="h-3.5 w-3.5" aria-hidden />{t('Private by default')}</span>
          </button>
          {med && (
            <div className="grid gap-3 sm:grid-cols-2 mt-3">
              <Field label={t('Blood type')} id={`${idPrefix}-blood`}>
                <select id={`${idPrefix}-blood`} className="input" value={v.medical.bloodType} onChange={(e) => setMedical('bloodType', e.target.value)}>
                  {BLOOD.map((b) => <option key={b} value={b}>{b || t('Not sure')}</option>)}
                </select>
              </Field>
              <Field label={t('Allergies')} id={`${idPrefix}-allergy`}>
                <input id={`${idPrefix}-allergy`} className="input" value={v.medical.allergies} onChange={(e) => setMedical('allergies', e.target.value)} />
              </Field>
              <Field label={t('Medications')} id={`${idPrefix}-meds`}>
                <input id={`${idPrefix}-meds`} className="input" value={v.medical.medications} onChange={(e) => setMedical('medications', e.target.value)} />
              </Field>
              <Field label={t('Conditions')} id={`${idPrefix}-cond`}>
                <input id={`${idPrefix}-cond`} className="input" value={v.medical.conditions} onChange={(e) => setMedical('conditions', e.target.value)} />
              </Field>
              <p className="sm:col-span-2 text-sm muted">{t('Only verified rescue organizations can see this card, and only while an emergency is active.')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
