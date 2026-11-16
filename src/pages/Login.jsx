import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, KeyRound, Info, ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react';
import { useStore } from '../store/useStore.js';
import { useT } from '../i18n/index.js';
import { Card, Field, Notice, PageHeader } from '../components/ui.jsx';
import { ROLE_HOME, ROLE_LABEL } from '../components/nav.js';

// Demo accounts (all use code 123456)
const DEMO = [
  ['household', '012-338 4471', 'Keluarga Faizal'],
  ['worker', '016-882 1043', 'Ah Fook, Restoran Selera Harmoni'],
  ['business', '012-990 4412', 'Restoran Selera Harmoni'],
  ['rescue', '012-300 9911', 'Skuad Bantuan Bencana Harmoni'],
  ['admin', '03-5510 0999', 'Admin'],
];

export default function Login() {
  const t = useT();
  const nav = useNavigate();
  const findAccount = useStore((s) => s.findAccount);
  const setRole = useStore((s) => s.setRole);
  const notify = useStore((s) => s.notify);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone');
  const [error, setError] = useState('');
  const [account, setAccount] = useState(null);

  const next = () => {
    setError('');
    if (step === 'phone') {
      const acc = findAccount(phone);
      if (!acc) return setError(t('No account uses this number yet. Please sign up first.'));
      setAccount(acc);
      notify({ channel: 'sms', aud: ['all'], to: phone, title: 'iCheck-U code', body: 'Your iCheck-U demo code is 123456. Do not share it.', headsUp: false });
      return setStep('code');
    }
    if (otp !== '123456') return setError(t('That code is not right. For the demo, use 123456.'));
    setRole(account.role, account.patch);
    nav(ROLE_HOME[account.role]);
    return null;
  };

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <PageHeader icon={LogIn} title={t('Log in')} subtitle={t('Use the phone number you signed up with.')} />
      <Card className="space-y-5">
        {step === 'phone' ? (
          <Field label={t('Phone number')} id="li-phone">
            <input id="li-phone" className="input text-xl" type="tel" inputMode="tel" autoComplete="tel" placeholder="012-345 6789" value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && next()} />
          </Field>
        ) : (
          <>
            <h2 className="h2 flex items-center gap-2"><KeyRound className="h-6 w-6" aria-hidden />{t('Enter the 6-digit code')}</h2>
            <p className="muted">{t('Welcome back, {name}.', { name: account?.name || t(ROLE_LABEL[account?.role]) })}</p>
            <Notice tone="amber" icon={Info}>{t('Demo: the code is always 123456 (see Messages).')}</Notice>
            <Field label={t('Code')} id="li-otp">
              <input id="li-otp" className="input text-2xl tracking-[0.5em] text-center" inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && next()} />
            </Field>
          </>
        )}
        {error && <p role="alert" className="font-bold text-emergency dark:text-red-300 flex items-center gap-2"><AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />{error}</p>}
        <div className="flex gap-3">
          {step === 'code' && <button type="button" className="btn btn-ghost" onClick={() => { setStep('phone'); setOtp(''); }}><ChevronLeft className="h-5 w-5" aria-hidden />{t('Back')}</button>}
          <button type="button" className="btn btn-primary btn-lg flex-1" onClick={next}>{step === 'phone' ? t('Send code') : t('Log in')}<ChevronRight className="h-5 w-5" aria-hidden /></button>
        </div>
        <p className="text-sm">{t('New to iCheck-U?')} <Link to="/signup" className="underline font-bold">{t('Sign up')}</Link></p>
      </Card>

      <section className="rounded-card border-2 border-dashed border-brand p-4">
        <p className="font-bold">{t('Demo accounts')}</p>
        <p className="text-sm muted mb-3">{t('Tap one to fill in its number. The code is 123456.')}</p>
        <ul className="grid gap-2">
          {DEMO.map(([role, num, name]) => (
            <li key={role}>
              <button type="button" className="btn btn-ghost w-full justify-between text-left" onClick={() => { setPhone(num); setStep('phone'); setOtp(''); setError(''); }}>
                <span><span className="font-bold">{t(ROLE_LABEL[role])}</span> <span className="muted font-normal">· {name}</span></span>
                <span className="tabular-nums">{num}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
