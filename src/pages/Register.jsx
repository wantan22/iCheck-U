import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Phone, KeyRound, ShieldCheck, Zap, Plus, Trash2, MapPin, ChevronLeft, ChevronRight, CheckCircle2, Home, Store, LifeBuoy, FileUp, Info,
  HardHat, Award, FileCheck2, AlertTriangle, UserPlus,
} from 'lucide-react';
import { useStore } from '../store/useStore.js';
import { useT } from '../i18n/index.js';
import { Card, Field, CheckPill, Notice, PageHeader, NEED_LABELS } from '../components/ui.jsx';
import MemberForm, { EMPTY_MEMBER } from '../components/MemberForm.jsx';
import MapView from '../components/MapView.jsx';
import { ROLE_HOME } from '../components/nav.js';
import { cx } from '../utils/format.js';

export const WHO = [
  { id: 'household', icon: Home, title: 'My home and family', desc: 'Let your family and neighbours know you are safe.' },
  { id: 'worker', icon: HardHat, title: 'I work at a shop or business', desc: 'Check in for yourself when there is an emergency at work.' },
  { id: 'business', icon: Store, title: 'I own or manage a shop', desc: 'Make sure every worker is accounted for.' },
  { id: 'rescue', icon: LifeBuoy, title: "I'm a rescuer or rescue team", desc: 'See who needs help first. Certificates required.' },
];
const STREETS = { 'Jalan Harmoni 1': 'A', 'Jalan Harmoni 2': 'A', 'Jalan Harmoni 3': 'B', 'Jalan Aman 3': 'B', 'Lorong Aman 1': 'C', 'Jalan Bukit Harmoni': 'D', 'Jalan Niaga Harmoni': 'B' };
const BIZ_TYPES = ['shop', 'restaurant', 'clinic', 'workshop', 'factory', 'hawker', 'pharmacy'];
const BIZ_TYPE_LABEL = { shop: 'Shop', restaurant: 'Restaurant', clinic: 'Clinic', workshop: 'Workshop', factory: 'Factory', hawker: 'Hawker stall', pharmacy: 'Pharmacy' };
const RISKS = { gas: 'Gas', chemicals: 'Chemicals', fuel: 'Fuel', largeStock: 'Large stock', singleExit: 'Single exit' };
const ORG_TYPES = { civil_defence: 'Civil defence', fire_rescue: 'Fire and rescue', medical: 'Medical team', ngo: 'NGO', community: 'Community group', other: 'Other' };
const CAPS = { boats: 'Boats', vehicles4x4: '4x4 vehicles', ambulances: 'Ambulances', medics: 'Medical staff', pumps: 'Pumps', chainsaws: 'Chainsaws', shelterCapacity: 'Shelter / food capacity (people)' };
export const CERT_TYPES = {
  orgReg: 'Organization registration (ROS / SSM)',
  firstAid: 'First aid and CPR',
  waterRescue: 'Water / flood rescue',
  boat: 'Boat handling licence',
  medical: 'Medical practising certificate',
  fireRescue: 'Fire and rescue training',
  other: 'Other certificate',
};
const EMPTY_CERT = { type: 'firstAid', holder: '', number: '', issuer: '', expiry: '', file: '', preview: '', verified: false };
export const certState = (c, now = Date.now()) => {
  if (!c.expiry) return 'valid';
  const days = (new Date(c.expiry).getTime() - now) / 86400000;
  return days < 0 ? 'expired' : days < 60 ? 'soon' : 'valid';
};

function blank(role) {
  if (role === 'household') return { name: '', street: 'Jalan Harmoni 2', no: '', pin: null, members: [{ ...EMPTY_MEMBER }], pets: '', contacts: [{ name: '', phone: '' }], outOfArea: { name: '', phone: '' } };
  if (role === 'business') return { name: '', type: 'shop', ssm: '', street: 'Jalan Niaga Harmoni', no: '', lot: '', pin: null, owner: '', ownerPhone: '', afterHours: '', hours: '', staffPerShift: '', risks: [], specialNeeds: '' };
  if (role === 'rescue') return { name: '', type: 'ngo', regNo: '', coverage: [], contactPerson: '', phone: '', email: '', capabilities: Object.fromEntries(Object.keys(CAPS).map((k) => [k, 0])), teamSize: '', teamsCount: '', hours: '', documents: [], teamMembers: '', certificates: [] };
  if (role === 'worker') return { businessId: '', name: '', role: '', shift: 'Day', emergencyContact: '', commute: '', needs: [] };
  return {};
}

export default function Register() {
  const t = useT();
  const nav = useNavigate();
  const st = useStore();
  const [params] = useSearchParams();
  const [role, setRoleChoice] = useState(params.get('as') || '');
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [form, setForm] = useState(() => blank(params.get('as') || ''));
  const [quick, setQuick] = useState(false);
  const [consent, setConsent] = useState({ main: false, medical: true, workers: false });
  const [error, setError] = useState('');

  const steps = ['phone', 'code', 'who', 'profile', ...(role === 'rescue' ? ['certs'] : []), 'consent', 'done'];
  const STEP_LABEL = { phone: 'Phone', code: 'Code', who: 'Who are you?', profile: 'Details', certs: 'Certificates', consent: 'Consent', done: 'Done' };
  const idx = steps.indexOf(step);
  const go = (s) => { setError(''); setStep(s); window.scrollTo?.(0, 0); };
  const choose = (r) => { setRoleChoice(r); if (!quick) setForm(blank(r)); go('profile'); };

  const quickDemo = () => {
    const r = role || 'household';
    setRoleChoice(r);
    setPhone({ household: '012-338 4471', business: '012-990 4412', worker: '017-640 2219', rescue: '012-555 0199' }[r]);
    setOtp('123456');
    setQuick(true);
    if (r === 'household') {
      const h = st.households.find((x) => x.id === 'h01');
      setForm({ name: h.name, street: h.street, no: '8', pin: [h.lat, h.lng], members: h.members.map((m) => ({ ...m, age: String(m.age), medical: { ...m.medical } })), pets: h.pets.join(', '), contacts: h.contacts.map((c) => ({ ...c })), outOfArea: { ...h.outOfArea } });
    } else if (r === 'business') {
      const b = st.businesses.find((x) => x.id === 'b01');
      setForm({ name: b.name, type: b.type, ssm: b.ssm, street: 'Jalan Niaga Harmoni', no: '21', lot: b.lot, pin: [b.lat, b.lng], owner: b.owner, ownerPhone: b.ownerPhone, afterHours: b.afterHours, hours: b.hours, staffPerShift: String(b.staffPerShift), risks: [...b.risks], specialNeeds: b.specialNeeds });
    } else if (r === 'worker') {
      setForm({ businessId: 'b01', name: 'Mei Ling (Mei)', role: 'Kitchen helper', shift: 'Morning', emergencyContact: 'Brother — 017-640 2220', commute: 'Bus from Klang', needs: [] });
    } else {
      setForm({
        name: 'Pasukan Sukarela Bantuan Seri Harmoni', type: 'community', regNo: 'PPM-021-10-01022024', coverage: ['A', 'B'], contactPerson: 'Encik Azhar Malik', phone: '012-555 0199', email: 'azhar@pasukan.example.my',
        capabilities: { boats: 1, vehicles4x4: 2, ambulances: 0, medics: 1, pumps: 1, chainsaws: 1, shelterCapacity: 40 }, teamSize: '8', teamsCount: '2', hours: '6 pm – 12 am, 24h during floods', documents: [], teamMembers: 'Azhar, Kok Leong, Priya, Faiz',
        certificates: [
          { type: 'orgReg', holder: 'Pasukan Sukarela Bantuan Seri Harmoni', number: 'PPM-021-10-01022024', issuer: 'Registrar of Societies (ROS)', expiry: '', file: 'ROS certificate.pdf', preview: '', verified: false },
          { type: 'waterRescue', holder: 'Azhar Malik', number: 'SWR-2026-1187', issuer: 'Rescue training provider (demo)', expiry: '2028-02-28', file: 'Flood rescue - Azhar.pdf', preview: '', verified: false },
          { type: 'firstAid', holder: 'Priya', number: 'FA-77310', issuer: 'First aid trainer (demo)', expiry: '2027-05-31', file: 'CPR - Priya.jpg', preview: '', verified: false },
        ],
      });
    }
    setConsent({ main: false, medical: true, workers: true });
    go('profile');
  };

  const next = () => {
    setError('');
    if (step === 'phone') {
      if (phone.replace(/\D/g, '').length < 9) return setError(t('Please enter a valid Malaysian phone number.'));
      if (!quick && st.findAccount(phone)) return setError(t('This number already has an account. Please log in instead.'));
      st.notify({ channel: 'sms', aud: ['all'], to: phone, title: 'iCheck-U code', body: 'Your iCheck-U demo code is 123456. Do not share it.', headsUp: false });
      return go('code');
    }
    if (step === 'code') {
      if (otp !== '123456') return setError(t('That code is not right. For the demo, use 123456.'));
      return go('who');
    }
    if (step === 'who') return role ? go('profile') : setError(t('Please choose who you are.'));
    if (step === 'profile') {
      if (role === 'worker') {
        if (!form.businessId) return setError(t('Please choose the shop where you work.'));
        if (!form.name.trim()) return setError(t('Please fill in the name.'));
      } else if (!form.name?.trim()) return setError(t('Please fill in the name.'));
      if (role === 'household' && form.members.some((m) => !m.name.trim() || m.age === '')) return setError(t('Each member needs a name and age.'));
      return go(role === 'rescue' ? 'certs' : 'consent');
    }
    if (step === 'certs') {
      if (!form.certificates.length) return setError(t('Rescuers must add at least one certificate.'));
      if (form.certificates.some((c) => !c.holder.trim() || !c.number.trim() || !c.file)) return setError(t('Each certificate needs a holder name, a certificate number and a photo or file.'));
      return go('consent');
    }
    if (step === 'consent') {
      if (!consent.main) return setError(t('Please tick the consent box to continue.'));
      save();
      return go('done');
    }
    return null;
  };

  const back = () => go(steps[Math.max(0, idx - 1)]);

  const save = () => {
    if (role === 'household') {
      const zone = STREETS[form.street] || 'A';
      const members = form.members.map((m, i) => ({ ...m, id: m.id || `new-m${i}-${Date.now()}`, age: Number(m.age), status: m.status || 'pending' }));
      const data = {
        name: form.name, street: form.street, zone, shortAddress: `${form.no || '1'} ${form.street}`,
        address: `${form.no || '1'}, ${form.street}, Taman Seri Harmoni, 40460 Shah Alam, Selangor`,
        lat: form.pin?.[0] || 3.0268, lng: form.pin?.[1] || 101.5366, phone, members,
        pets: form.pets ? form.pets.split(',').map((x) => x.trim()).filter(Boolean) : [], contacts: form.contacts.filter((c) => c.name), outOfArea: form.outOfArea,
        privacy: { expiry: 'never', shareMedical: consent.medical },
      };
      if (quick) { st.updateHousehold('h01', data); st.setRole('household', { householdId: 'h01' }); return; }
      const id = st.addHousehold(data);
      st.setRole('household', { householdId: id });
      return;
    }
    if (role === 'business') {
      const data = {
        name: form.name, type: form.type, ssm: form.ssm, lot: form.lot, zone: STREETS[form.street] || 'B',
        address: `${form.no || '1'}, ${form.street}, Taman Seri Harmoni, 40460 Shah Alam`, shortAddress: `${form.no || '1'} ${form.street}`,
        lat: form.pin?.[0] || 3.0286, lng: form.pin?.[1] || 101.5400, owner: form.owner, ownerPhone: form.ownerPhone || phone, afterHours: form.afterHours,
        hours: form.hours, staffPerShift: Number(form.staffPerShift) || 0, risks: form.risks, specialNeeds: form.specialNeeds,
      };
      if (quick) { st.updateBusiness('b01', data); st.setRole('business', { businessId: 'b01' }); return; }
      const id = st.addBusiness(data);
      st.setRole('business', { businessId: id });
      return;
    }
    if (role === 'worker') {
      st.registerWorker(form.businessId, { name: form.name, role: form.role || 'Staff', shift: form.shift, phone, emergencyContact: form.emergencyContact, commute: form.commute, needs: form.needs });
      st.setRole('worker');
      return;
    }
    if (role === 'rescue') {
      const members = form.teamMembers.split(',').map((x) => x.trim()).filter(Boolean);
      const certificates = form.certificates.map(({ preview, ...c }) => c);
      const id = st.addOrg({ ...form, certificates, documents: certificates.map((c) => c.file), phone: form.phone || phone, teamSize: Number(form.teamSize) || members.length, teamsCount: Number(form.teamsCount) || 1, teams: [{ id: `t-${Date.now()}`, name: `${form.name.split(' ')[0]} Team 1`, capability: form.capabilities.boats ? ['boat', 'rescue'] : ['vehicle', 'lifting'], members, lat: 3.0352, lng: 101.5375, available: true, checkedIn: false, capacity: 6 }] });
      st.setRole('rescue', { orgId: id });
      st.notify({ channel: 'push', aud: ['admin'], to: 'Admin', level: 'warning', title: 'New rescuer waiting for certificate check', body: `${form.name} · ${certificates.length} certificates` });
    }
  };

  const WhoIcon = WHO.find((w) => w.id === role)?.icon || UserPlus;
  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader icon={WhoIcon} title={t('Sign up')} actions={['phone', 'code', 'who'].includes(step) && (
        <button type="button" className="btn btn-ghost font-bold" onClick={quickDemo}><Zap className="h-5 w-5" aria-hidden />{t('Quick demo (pre-filled)')}</button>
      )} />
      <ol className="flex gap-1 mb-6" aria-label={t('Progress')}>
        {steps.map((s, i) => (
          <li key={s} className="flex-1 min-w-0">
            <div className={cx('h-2 rounded-full', i <= idx ? 'bg-brand' : 'bg-line')} />
            <span className={cx('text-[0.7rem] font-semibold mt-1 block truncate', i === idx ? 'text-ink' : 'muted')} aria-current={i === idx ? 'step' : undefined}>{t(STEP_LABEL[s])}</span>
          </li>
        ))}
      </ol>

      <Card className="space-y-5">
        {step === 'phone' && (
          <>
            <h2 className="h2 flex items-center gap-2"><Phone className="h-6 w-6" aria-hidden />{t('Your phone number')}</h2>
            <p className="muted">{t('We use your phone number to reach you during an emergency, by app, SMS or WhatsApp.')}</p>
            <Field label={t('Phone number')} id="reg-phone">
              <input id="reg-phone" className="input text-xl" type="tel" inputMode="tel" autoComplete="tel" placeholder="012-345 6789" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <p className="text-sm">{t('Already have an account?')} <Link to="/login" className="underline font-bold">{t('Log in')}</Link></p>
          </>
        )}
        {step === 'code' && (
          <>
            <h2 className="h2 flex items-center gap-2"><KeyRound className="h-6 w-6" aria-hidden />{t('Enter the 6-digit code')}</h2>
            <p className="muted">{t('We sent a code to {phone}.', { phone })}</p>
            <Notice tone="amber" icon={Info}>{t('Demo: the code is always 123456 (see Messages).')}</Notice>
            <Field label={t('Code')} id="reg-otp">
              <input id="reg-otp" className="input text-2xl tracking-[0.5em] text-center" inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
            </Field>
          </>
        )}
        {step === 'who' && (
          <div className="space-y-3">
            <h2 className="h2">{t('Who are you?')}</h2>
            <p className="muted">{t('This decides what you see in the app. You can sign up again later for another role.')}</p>
            <ul className="grid gap-3" role="radiogroup" aria-label={t('Who are you?')}>
              {WHO.map((w) => (
                <li key={w.id}>
                  <button type="button" role="radio" aria-checked={role === w.id} onClick={() => choose(w.id)}
                    className={cx('w-full card p-4 flex items-center gap-4 text-left border-2 min-h-[88px]', role === w.id ? 'border-brand bg-brand/10' : 'hover:border-brand')}>
                    <span className="bg-brand text-neutral-900 rounded-2xl p-3 shrink-0"><w.icon className="h-7 w-7" aria-hidden /></span>
                    <span className="flex-1"><span className="block text-lg font-extrabold">{t(w.title)}</span><span className="block muted">{t(w.desc)}</span></span>
                    <ChevronRight className="h-6 w-6" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {step === 'profile' && role === 'household' && <HouseholdForm form={form} setForm={setForm} />}
        {step === 'profile' && role === 'business' && <BusinessForm form={form} setForm={setForm} />}
        {step === 'profile' && role === 'worker' && <WorkerForm form={form} setForm={setForm} businesses={st.businesses} />}
        {step === 'profile' && role === 'rescue' && <OrgForm form={form} setForm={setForm} />}
        {step === 'certs' && <CertificatesForm form={form} setForm={setForm} />}
        {step === 'consent' && <Consent role={role} consent={consent} setConsent={setConsent} />}
        {step === 'done' && (
          <div className="text-center space-y-4 py-4">
            <CheckCircle2 className="h-16 w-16 text-safe mx-auto" aria-hidden />
            <h2 className="h1">{t('You are registered')}</h2>
            {role === 'rescue' && <p className="muted">{t('We are checking your certificates. You will get full access once an admin approves them.')}</p>}
            {role === 'business' && <p className="muted">{t('Next, add your workers so everyone can be accounted for.')}</p>}
            {role === 'worker' && <p className="muted">{t('Your employer can now see that you work there. In an emergency, you will be asked if you are safe.')}</p>}
            {role === 'household' && <p className="muted">{t('Next, record where your important items are kept.')}</p>}
            <button type="button" className="btn btn-primary btn-lg w-full" onClick={() => nav(role === 'business' ? '/biz/workers' : ROLE_HOME[role])}>
              {t('Continue')} <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
        )}
        {error && <p role="alert" className="font-bold text-emergency dark:text-red-300 flex items-center gap-2"><AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />{error}</p>}
        {step !== 'done' && step !== 'who' && (
          <div className="flex gap-3 pt-2">
            {idx > 0 && <button type="button" className="btn btn-ghost" onClick={back}><ChevronLeft className="h-5 w-5" aria-hidden />{t('Back')}</button>}
            <button type="button" className="btn btn-primary btn-lg flex-1" onClick={next}>
              {step === 'phone' ? t('Send code') : step === 'code' ? t('Verify') : step === 'consent' ? t('Agree and finish') : t('Next')}
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
        )}
        {step === 'who' && <button type="button" className="btn btn-ghost" onClick={back}><ChevronLeft className="h-5 w-5" aria-hidden />{t('Back')}</button>}
      </Card>
    </div>
  );
}

function WorkerForm({ form, setForm, businesses }) {
  const t = useT();
  const f = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) });
  return (
    <div className="space-y-5">
      <Notice tone="green" icon={ShieldCheck}>{t('Worker data is used only for safety and rescue, never for enforcement. We never ask for passport, permit or nationality.')}</Notice>
      <Field label={t('Where do you work?')} id="wk-biz">
        <select id="wk-biz" className="input" {...f('businessId')}>
          <option value="">{t('Choose your shop')}</option>
          {businesses.map((b) => <option key={b.id} value={b.id}>{b.name} — {b.shortAddress}</option>)}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('Name or nickname')} id="wk-name"><input id="wk-name" className="input" {...f('name')} /></Field>
        <Field label={t('Your job')} id="wk-role"><input id="wk-role" className="input" {...f('role')} placeholder={t('e.g. Cook, cashier')} /></Field>
        <Field label={t('Shift')} id="wk-shift">
          <select id="wk-shift" className="input" {...f('shift')}>
            {['Morning', 'Day', 'Evening', 'Night', 'All day'].map((s) => <option key={s} value={s}>{t(s)}</option>)}
          </select>
        </Field>
        <Field label={t('Emergency contact')} id="wk-ec"><input id="wk-ec" className="input" {...f('emergencyContact')} placeholder={t('Name and phone')} /></Field>
        <Field label={t('How do you get to work?')} id="wk-com" className="sm:col-span-2"><input id="wk-com" className="input" {...f('commute')} placeholder={t('e.g. Motorcycle from Klang')} /></Field>
      </div>
      <fieldset>
        <legend className="label">{`${t('Special needs')} (${t('optional')})`}</legend>
        <div className="flex flex-wrap gap-2">
          {['pregnant', 'elderly', 'disabled', 'mobility', 'medical'].map((n) => (
            <CheckPill key={n} checked={form.needs.includes(n)} onChange={(on) => setForm({ ...form, needs: on ? [...form.needs, n] : form.needs.filter((x) => x !== n) })}>{t(NEED_LABELS[n])}</CheckPill>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function CertificatesForm({ form, setForm }) {
  const t = useT();
  const [draft, setDraft] = useState({ ...EMPTY_CERT });
  const [open, setOpen] = useState(form.certificates.length === 0);
  const add = () => {
    if (!draft.holder.trim() || !draft.number.trim() || !draft.file) return;
    setForm({ ...form, certificates: [...form.certificates, draft] });
    setDraft({ ...EMPTY_CERT });
    setOpen(false);
  };
  const d = (k) => ({ value: draft[k], onChange: (e) => setDraft({ ...draft, [k]: e.target.value }) });
  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDraft({ ...draft, file: file.name, preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '' });
  };
  return (
    <div className="space-y-4">
      <h2 className="h2 flex items-center gap-2"><Award className="h-6 w-6" aria-hidden />{t('Your certificates')}</h2>
      <p className="muted">{t('Rescuers must show proof of training before they can see household details. Add your organization registration and each team member\'s certificates.')}</p>
      <Notice tone="amber" icon={Info}>{t('Demo: files stay on this device. Only the file name is recorded.')}</Notice>

      {form.certificates.length > 0 && (
        <ul className="space-y-2">
          {form.certificates.map((c, i) => {
            const state = certState(c);
            return (
              <li key={i} className="rounded-2xl border-2 border-line p-3 flex items-start gap-3">
                {c.preview ? <img src={c.preview} alt="" className="h-14 w-14 rounded-lg object-cover" /> : <span className="h-14 w-14 rounded-lg bg-brand/20 grid place-items-center shrink-0"><FileCheck2 className="h-7 w-7" aria-hidden /></span>}
                <div className="flex-1 min-w-0">
                  <p className="font-bold">{t(CERT_TYPES[c.type])}</p>
                  <p className="text-sm">{c.holder} · {c.number}</p>
                  <p className="text-sm muted">{c.issuer || '—'} · {c.expiry ? `${t('Expires')} ${c.expiry}` : t('No expiry')} · {c.file}</p>
                  {state !== 'valid' && <p className={cx('text-sm font-bold', state === 'expired' ? 'text-emergency' : 'text-alert')}>{state === 'expired' ? t('Expired — please renew') : t('Expires soon')}</p>}
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm({ ...form, certificates: form.certificates.filter((_, j) => j !== i) })} aria-label={t('Remove')}><Trash2 className="h-4 w-4" aria-hidden /></button>
              </li>
            );
          })}
        </ul>
      )}

      {open ? (
        <div className="rounded-2xl bg-canvas p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('Certificate type')} id="ct-type" className="sm:col-span-2">
              <select id="ct-type" className="input" {...d('type')}>{Object.entries(CERT_TYPES).map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}</select>
            </Field>
            <Field label={t('Name on certificate')} id="ct-holder"><input id="ct-holder" className="input" {...d('holder')} /></Field>
            <Field label={t('Certificate number')} id="ct-no"><input id="ct-no" className="input" {...d('number')} /></Field>
            <Field label={t('Issued by')} id="ct-issuer"><input id="ct-issuer" className="input" {...d('issuer')} /></Field>
            <Field label={`${t('Expiry date')} (${t('optional')})`} id="ct-exp"><input id="ct-exp" type="date" className="input" {...d('expiry')} /></Field>
          </div>
          <Field label={t('Photo or scan of the certificate')} id="ct-file">
            <label htmlFor="ct-file" className="btn btn-ghost w-full cursor-pointer"><FileUp className="h-5 w-5" aria-hidden />{draft.file ? draft.file : t('Choose a photo or file')}</label>
            <input id="ct-file" type="file" accept="image/*,application/pdf" className="sr-only" onChange={onFile} />
          </Field>
          {draft.preview && <img src={draft.preview} alt={t('Certificate preview')} className="max-h-40 rounded-xl" />}
          <button type="button" className="btn btn-primary w-full" disabled={!draft.holder.trim() || !draft.number.trim() || !draft.file} onClick={add}><Plus className="h-5 w-5" aria-hidden />{t('Add this certificate')}</button>
        </div>
      ) : (
        <button type="button" className="btn btn-ghost w-full" onClick={() => setOpen(true)}><Plus className="h-5 w-5" aria-hidden />{t('Add another certificate')}</button>
      )}
    </div>
  );
}

function PinPicker({ pin, onPick }) {
  const t = useT();
  const markers = useMemo(() => (pin ? [{ id: 'pin', lat: pin[0], lng: pin[1], color: '#D32F2F', icon: MapPin, label: t('Your location') }] : []), [pin, t]);
  return (
    <div>
      <p className="label flex items-center gap-2"><MapPin className="h-4 w-4" aria-hidden />{t('Map pin — tap the map to set your exact location')}</p>
      <MapView height={240} markers={markers} onMapClick={onPick} label={t('Location picker map')} />
      <p className="text-sm muted mt-1">{pin ? `${pin[0].toFixed(5)}, ${pin[1].toFixed(5)}` : t('No pin yet')}</p>
    </div>
  );
}

function AddressFields({ form, setForm, streets }) {
  const t = useT();
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label={t('House / lot no.')} id="addr-no"><input id="addr-no" className="input" value={form.no} onChange={(e) => setForm({ ...form, no: e.target.value })} /></Field>
      <Field label={t('Street')} id="addr-street" className="sm:col-span-2">
        <select id="addr-street" className="input" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })}>
          {streets.map((s) => <option key={s} value={s}>{s} — {t('Zone')} {STREETS[s]}</option>)}
        </select>
      </Field>
      <p className="sm:col-span-3 text-sm muted -mt-2">Taman Seri Harmoni, 40460 Shah Alam, Selangor</p>
    </div>
  );
}

function HouseholdForm({ form, setForm }) {
  const t = useT();
  const setMember = (i, m) => setForm({ ...form, members: form.members.map((x, j) => (j === i ? m : x)) });
  return (
    <div className="space-y-6">
      <Field label={t('Household name')} id="hh-name" hint={t('e.g. Keluarga Ahmad')}>
        <input id="hh-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>
      <AddressFields form={form} setForm={setForm} streets={Object.keys(STREETS).filter((s) => s !== 'Jalan Niaga Harmoni')} />
      <PinPicker pin={form.pin} onPick={(p) => setForm({ ...form, pin: p })} />
      <div>
        <h3 className="h2 mb-2">{t('Everyone who lives here')}</h3>
        <p className="muted text-sm mb-3">{t('Add every member, including babies and elderly parents.')}</p>
        <div className="space-y-4">
          {form.members.map((m, i) => (
            <div key={i} className="rounded-2xl border-2 border-line p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold">{t('Member')} {i + 1}{m.name ? ` — ${m.name}` : ''}</p>
                {form.members.length > 1 && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm({ ...form, members: form.members.filter((_, j) => j !== i) })}>
                    <Trash2 className="h-4 w-4" aria-hidden />{t('Remove')}
                  </button>
                )}
              </div>
              <MemberForm value={m} onChange={(v) => setMember(i, v)} idPrefix={`reg-m${i}`} />
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-ghost w-full mt-3" onClick={() => setForm({ ...form, members: [...form.members, { ...EMPTY_MEMBER, medical: { ...EMPTY_MEMBER.medical } }] })}>
          <Plus className="h-5 w-5" aria-hidden />{t('Add member')}
        </button>
      </div>
      <Field label={`${t('Pets')} (${t('optional')})`} id="hh-pets" hint={t('Separate with commas, e.g. Oyen (cat)')}>
        <input id="hh-pets" className="input" value={form.pets} onChange={(e) => setForm({ ...form, pets: e.target.value })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('Emergency contact name')} id="hh-ec-name"><input id="hh-ec-name" className="input" value={form.contacts[0]?.name || ''} onChange={(e) => setForm({ ...form, contacts: [{ ...form.contacts[0], name: e.target.value }] })} /></Field>
        <Field label={t('Emergency contact phone')} id="hh-ec-phone"><input id="hh-ec-phone" type="tel" className="input" value={form.contacts[0]?.phone || ''} onChange={(e) => setForm({ ...form, contacts: [{ ...form.contacts[0], phone: e.target.value }] })} /></Field>
        <Field label={t('Out-of-area contact name')} id="hh-oa-name" hint={t('Someone outside the disaster area, e.g. a relative in another state.')}><input id="hh-oa-name" className="input" value={form.outOfArea.name} onChange={(e) => setForm({ ...form, outOfArea: { ...form.outOfArea, name: e.target.value } })} /></Field>
        <Field label={t('Out-of-area contact phone')} id="hh-oa-phone"><input id="hh-oa-phone" type="tel" className="input" value={form.outOfArea.phone} onChange={(e) => setForm({ ...form, outOfArea: { ...form.outOfArea, phone: e.target.value } })} /></Field>
      </div>
    </div>
  );
}

function BusinessForm({ form, setForm }) {
  const t = useT();
  const f = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) });
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('Business name')} id="b-name"><input id="b-name" className="input" {...f('name')} /></Field>
        <Field label={t('Type')} id="b-type">
          <select id="b-type" className="input" {...f('type')}>{BIZ_TYPES.map((x) => <option key={x} value={x}>{t(BIZ_TYPE_LABEL[x])}</option>)}</select>
        </Field>
        <Field label={t('SSM or licence number')} id="b-ssm"><input id="b-ssm" className="input" {...f('ssm')} /></Field>
        <Field label={t('Lot or floor number')} id="b-lot"><input id="b-lot" className="input" {...f('lot')} /></Field>
      </div>
      <AddressFields form={form} setForm={setForm} streets={Object.keys(STREETS)} />
      <PinPicker pin={form.pin} onPick={(p) => setForm({ ...form, pin: p })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('Owner or manager')} id="b-owner"><input id="b-owner" className="input" {...f('owner')} /></Field>
        <Field label={t('Owner phone')} id="b-ophone"><input id="b-ophone" type="tel" className="input" {...f('ownerPhone')} /></Field>
        <Field label={t('After-hours emergency contact')} id="b-ah"><input id="b-ah" className="input" {...f('afterHours')} /></Field>
        <Field label={t('Operating hours')} id="b-hours"><input id="b-hours" className="input" {...f('hours')} placeholder="9:00 am – 9:00 pm" /></Field>
        <Field label={t('Typical staff per shift')} id="b-staff"><input id="b-staff" type="number" min="0" className="input" {...f('staffPerShift')} /></Field>
      </div>
      <fieldset>
        <legend className="label">{t('Site risks')}</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(RISKS).map(([k, l]) => (
            <CheckPill key={k} checked={form.risks.includes(k)} onChange={(on) => setForm({ ...form, risks: on ? [...form.risks, k] : form.risks.filter((x) => x !== k) })}>{t(l)}</CheckPill>
          ))}
        </div>
      </fieldset>
      <Field label={t('Special needs on site (staff or regular customers)')} id="b-sn"><textarea id="b-sn" className="input min-h-[96px]" {...f('specialNeeds')} /></Field>
    </div>
  );
}

function OrgForm({ form, setForm }) {
  const t = useT();
  const f = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) });
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('Organization name')} id="o-name" className="sm:col-span-2"><input id="o-name" className="input" {...f('name')} /></Field>
        <Field label={t('Type')} id="o-type"><select id="o-type" className="input" {...f('type')}>{Object.entries(ORG_TYPES).map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}</select></Field>
        <Field label={t('Registration number')} id="o-reg"><input id="o-reg" className="input" {...f('regNo')} /></Field>
        <Field label={t('Contact person')} id="o-cp"><input id="o-cp" className="input" {...f('contactPerson')} /></Field>
        <Field label={t('Phone')} id="o-ph"><input id="o-ph" type="tel" className="input" {...f('phone')} /></Field>
        <Field label={t('Email')} id="o-em"><input id="o-em" type="email" className="input" {...f('email')} /></Field>
        <Field label={t('Operating hours')} id="o-hr"><input id="o-hr" className="input" {...f('hours')} /></Field>
        <Field label={t('Team size (people)')} id="o-ts"><input id="o-ts" type="number" min="0" className="input" {...f('teamSize')} /></Field>
        <Field label={t('Number of teams')} id="o-tc"><input id="o-tc" type="number" min="0" className="input" {...f('teamsCount')} /></Field>
      </div>
      <fieldset>
        <legend className="label">{t('Coverage areas')}</legend>
        <div className="flex flex-wrap gap-2">
          {['A', 'B', 'C', 'D'].map((z) => (
            <CheckPill key={z} checked={form.coverage.includes(z)} onChange={(on) => setForm({ ...form, coverage: on ? [...form.coverage, z] : form.coverage.filter((x) => x !== z) })}>{t('Zone')} {z}</CheckPill>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">{t('Capabilities and resources')}</legend>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
          {Object.entries(CAPS).map(([k, l]) => (
            <Field key={k} label={t(l)} id={`cap-${k}`}>
              <input id={`cap-${k}`} type="number" min="0" className="input" value={form.capabilities[k]} onChange={(e) => setForm({ ...form, capabilities: { ...form.capabilities, [k]: Number(e.target.value) } })} />
            </Field>
          ))}
        </div>
      </fieldset>
      <Field label={t('Team members (comma separated)')} id="o-tm"><input id="o-tm" className="input" {...f('teamMembers')} /></Field>
      <Field label={t('Verification documents')} id="o-doc" hint={t('Demo only: file names are recorded, files are not uploaded.')}>
        <label htmlFor="o-doc" className="btn btn-ghost w-full cursor-pointer"><FileUp className="h-5 w-5" aria-hidden />{t('Choose files')}</label>
        <input id="o-doc" type="file" multiple className="sr-only" onChange={(e) => setForm({ ...form, documents: [...form.documents, ...[...e.target.files].map((x) => x.name)] })} />
        {form.documents.length > 0 && <ul className="mt-2 text-sm list-disc pl-6">{form.documents.map((d) => <li key={d}>{d}</li>)}</ul>}
      </Field>
    </div>
  );
}

function Consent({ role, consent, setConsent }) {
  const t = useT();
  const stored = {
    household: ['Address and map pin', 'Members: names, ages, special needs, optional phone and photo', 'Medical emergency card (optional)', 'Emergency contacts', 'Your item locations (never the documents themselves)'],
    business: ['Business details and location', 'Worker names or nicknames, role, shift and phone', 'Optional worker medical card (with the worker\'s consent)', 'Item locations'],
    rescue: ['Organization details and documents', 'Certificates (name, number, issuer, expiry, file name)', 'Team members and resources', 'Your actions during events (for the access log)'],
    worker: ['Your name or nickname, job, shift and phone', 'Emergency contact and how you get to work', 'Whether you are at work right now'],
  }[role];
  return (
    <div className="space-y-4">
      <h2 className="h2 flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-safe" aria-hidden />{t('Your data and your consent')}</h2>
      <div className="grid gap-3">
        <div className="rounded-2xl bg-canvas p-4">
          <p className="font-bold">{t('What we store')}</p>
          <ul className="list-disc pl-5 mt-1 space-y-0.5">{stored.map((s) => <li key={s}>{t(s)}</li>)}</ul>
        </div>
        <div className="rounded-2xl bg-canvas p-4">
          <p className="font-bold">{t('Who can see it, and when')}</p>
          <ul className="list-disc pl-5 mt-1 space-y-0.5">
            <li>{t('Your household or business: always.')}</li>
            <li>{t('Neighbours: only your name, address and status when they are asked to check on you, or an unaccounted-for alert.')}</li>
            <li>{t('Verified rescue organizations: details only during an active emergency in your zone.')}</li>
            <li>{t('Medical cards: verified organizations only, only during an active emergency.')}</li>
            <li>{t('Access ends automatically when the emergency ends. Every view is logged.')}</li>
          </ul>
        </div>
        {(role === 'business' || role === 'worker') && <Notice tone="blue" icon={Info}>{t('Worker data is used only for safety and rescue, never for enforcement. We never ask for passport, permit or nationality.')}</Notice>}
        <p className="text-sm muted">{t('Aligned with Malaysia\'s Personal Data Protection Act (PDPA) principles: consent, purpose limitation, data minimisation and your right to access, correct and delete. You can edit or delete your data at any time.')}</p>
      </div>
      <div className="space-y-2">
        <CheckPill checked={consent.main} onChange={(v) => setConsent({ ...consent, main: v })}>{t('I understand and agree')}</CheckPill>
        {role === 'household' && <div><CheckPill checked={consent.medical} onChange={(v) => setConsent({ ...consent, medical: v })}>{t('Share medical cards with verified responders during emergencies')}</CheckPill></div>}
        {role === 'business' && <div><CheckPill checked={consent.workers} onChange={(v) => setConsent({ ...consent, workers: v })}>{t('My workers know their details are stored for safety')}</CheckPill></div>}
      </div>
      <Link to="/privacy" className="underline font-semibold text-help dark:text-blue-300">{t('Read the full Privacy and data page')}</Link>
    </div>
  );
}
