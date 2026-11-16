import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, UserPlus, LogIn, Home, HardHat, Store, LifeBuoy } from 'lucide-react';
import { useStore } from '../store/useStore.js';
import { useT } from '../i18n/index.js';
import { ROLE_HOME } from '../components/nav.js';
import Logo from '../components/Logo.jsx';

const FOR = [
  [Home, 'Families'],
  [HardHat, 'Shop workers'],
  [Store, 'Shop owners'],
  [LifeBuoy, 'Rescuers'],
];

/** First screen: sign up or log in. Everyone identifies themselves before using the app. */
export default function Welcome() {
  const t = useT();
  const nav = useNavigate();
  const role = useStore((s) => s.role);

  return (
    <div className="space-y-7 max-w-xl mx-auto">
      <section className="text-center pt-6">
        <Logo className="h-24 w-24 mx-auto drop-shadow-md" />
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight">iCheck-U</h1>
        <p className="mt-2 inline-block rounded-full bg-brand px-4 py-1 text-lg font-extrabold text-neutral-900">{t('No one left unchecked')}</p>
        <p className="mt-4 text-lg muted">{t('When disaster strikes, we check on everyone — your family, your neighbours and the people who need help most.')}</p>
      </section>

      {role ? (
        <button type="button" onClick={() => nav(ROLE_HOME[role])} className="btn btn-primary btn-lg w-full text-xl">
          {t('Continue')} <ChevronRight className="h-6 w-6" aria-hidden />
        </button>
      ) : (
        <div className="grid gap-3">
          <Link to="/signup" className="btn btn-primary btn-lg w-full text-xl"><UserPlus className="h-6 w-6" aria-hidden />{t('Sign up')}</Link>
          <Link to="/login" className="btn btn-ghost btn-lg w-full text-xl"><LogIn className="h-6 w-6" aria-hidden />{t('I already have an account')}</Link>
        </div>
      )}

      <section aria-label={t('Who iCheck-U is for')} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {FOR.map(([Icon, label]) => (
          <div key={label} className="card p-4 flex flex-col items-center gap-2 text-center">
            <span className="rounded-2xl bg-brand text-neutral-900 p-2.5"><Icon className="h-6 w-6" aria-hidden /></span>
            <span className="font-bold">{t(label)}</span>
          </div>
        ))}
      </section>

      <div className="grid gap-2 text-sm">
        <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-safe" aria-hidden /><b>{t('Green')}</b> — {t('all is OK')}</p>
        <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-caution" aria-hidden /><b>{t('Yellow')}</b> — {t('pay attention')}</p>
        <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emergency" aria-hidden /><b>{t('Red')}</b> — {t('emergency')}</p>
      </div>
      <p className="text-center text-sm muted pb-4">{t('Demo with sample data. In a real emergency, call 999.')}</p>
    </div>
  );
}
