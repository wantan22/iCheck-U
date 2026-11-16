import { Link } from 'react-router-dom';
import { Settings as Gear, Languages, Moon, Type, WifiOff, CheckCircle2, Shield, ChevronRight } from 'lucide-react';
import { useStore } from '../store/useStore.js';
import { useT, LANGUAGES } from '../i18n/index.js';
import { Card, PageHeader, Toggle, OfflineBadge } from '../components/ui.jsx';
import AlertSetup from '../components/AlertSetup.jsx';
import { cx, clock } from '../utils/format.js';
import { IS_NATIVE } from '../utils/env.js';

export default function Settings() {
  const t = useT();
  const s = useStore((x) => x.settings);
  const set = useStore((x) => x.setSetting);
  const offlineReady = useStore((x) => x.offlineReady);
  const outbox = useStore((x) => x.outbox);
  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader icon={Gear} title={t('Settings')} />
      <Card>
        <p className="text-xl font-bold flex items-center gap-2 mb-3"><Languages className="h-6 w-6" aria-hidden />{t('Language')}</p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('Language')}>
          {LANGUAGES.map((l) => (
            <button key={l.id} type="button" role="radio" aria-checked={s.lang === l.id} className={cx('btn btn-lg text-lg', s.lang === l.id ? 'btn-primary' : 'btn-ghost')} onClick={() => set('lang', l.id)}>{l.label}</button>
          ))}
        </div>
      </Card>
      <Card className="divide-y divide-line">
        <Toggle id="set-large" checked={s.largeText} onChange={(v) => set('largeText', v)}
          label={<span className="flex items-center gap-2 text-lg"><Type className="h-6 w-6" aria-hidden />{t('Bigger text')}</span>} description={t('Makes all words and buttons larger.')} />
        <Toggle id="set-dark" checked={s.theme === 'dark'} onChange={(v) => set('theme', v ? 'dark' : 'light')}
          label={<span className="flex items-center gap-2 text-lg"><Moon className="h-6 w-6" aria-hidden />{t('Dark screen')}</span>} description={t('Easier on the eyes at night and saves battery during power cuts.')} />
      </Card>
      <AlertSetup />
      <Card className="space-y-3">
        <p className="text-xl font-bold flex items-center gap-2"><WifiOff className="h-6 w-6" aria-hidden />{t('Without internet')}</p>
        <div className="flex flex-wrap items-center gap-2">
          <OfflineBadge />
          {offlineReady && <span className="chip bg-safe text-white text-xs"><CheckCircle2 className="h-4 w-4" aria-hidden />{t('Saved on this phone')}</span>}
        </div>
        <p>{t('iCheck-U keeps working with no Wi-Fi or data. Anything you send while offline goes out by itself when you are connected again.')}</p>
        {outbox.length > 0 && (
          <div className="rounded-xl bg-canvas p-3">
            <p className="font-bold mb-1">{t('{n} waiting to send', { n: outbox.length })}</p>
            <ul className="text-sm space-y-0.5">{outbox.map((o) => <li key={o.id}><span className="muted tabular-nums">{clock(o.at)}</span> — {t(o.label)}</li>)}</ul>
          </div>
        )}
        {!IS_NATIVE && <p className="text-sm muted">{t('To add iCheck-U to your home screen, open your browser menu and choose "Install app" or "Add to Home screen".')}</p>}
      </Card>
      <Link to="/privacy" className="card p-5 flex items-center gap-3 text-lg font-bold"><Shield className="h-6 w-6" aria-hidden /><span className="flex-1">{t('Privacy and my data')}</span><ChevronRight className="h-6 w-6" aria-hidden /></Link>
    </div>
  );
}
