import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell, Moon, Sun, Languages, Menu, X, Siren, MessageSquare, Smartphone, MessageCircle, Info, ShieldAlert,
  RotateCcw, AlertTriangle, CheckCircle2, UserSearch, WifiOff, ChevronRight,
} from 'lucide-react';
import { useStore, isOffline, identityKeys } from '../store/useStore.js';
import { useT, LANGUAGES } from '../i18n/index.js';
import { NAV, ROLE_LABEL, DESKTOP_ROLES, ROLE_HOME } from './nav.js';
import { cx, elapsed, clock } from '../utils/format.js';
import DemoControls from './DemoControls.jsx';
import Logo from './Logo.jsx';
import BigAlert from './BigAlert.jsx';
import CallScreen from './CallScreen.jsx';
import { stopAlarm } from '../utils/alerts.js';

const EVENT_LABEL = { flood: 'Flood', landslide: 'Landslide', earthquake: 'Earthquake', fire: 'Fire' };

/** Colour = meaning. Green: all OK. Yellow: pay attention. Red: emergency. */
export const STATUS_TONE = {
  normal: { bar: 'bg-safe text-white', strip: 'bg-[#1B5E20] text-white', pill: 'bg-white text-safe' },
  recovery: { bar: 'bg-safe text-white', strip: 'bg-[#1B5E20] text-white', pill: 'bg-white text-safe' },
  alert: { bar: 'bg-caution text-neutral-900', strip: 'bg-[#FFD54F] text-neutral-900', pill: 'bg-neutral-900 text-caution' },
  active: { bar: 'bg-emergency text-white', strip: 'bg-[#8E0000] text-white', pill: 'bg-white text-emergency' },
};

export function ModePill() {
  const t = useT();
  const phase = useStore((s) => s.phase);
  const warning = useStore((s) => s.warning);
  const text = {
    normal: t('All calm'),
    alert: t(`${EVENT_LABEL[warning?.type] || 'Flood'} Warning`),
    active: t('EMERGENCY'),
    recovery: t('Recovering'),
  }[phase];
  return (
    <span className={cx('chip text-xs sm:text-sm min-w-0 overflow-hidden', STATUS_TONE[phase].pill)} aria-live="polite">
      <span className={cx('relative inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-current', phase === 'active' && 'animate-slowpulse')}>
        {phase === 'active' && <span className="absolute inset-0 rounded-full bg-current animate-ring" />}
      </span>
      <span className="truncate">{text}</span>
    </span>
  );
}

function LanguageMenu() {
  const t = useT();
  const lang = useStore((s) => s.settings.lang);
  const setSetting = useStore((s) => s.setSetting);
  const [open, setOpen] = useState(false);
  const cur = LANGUAGES.find((l) => l.id === lang) || LANGUAGES[0];
  return (
    <div className="relative">
      <button type="button" className="btn btn-sm !min-h-[48px] !min-w-[44px] !px-2 sm:!px-3 hover:bg-black/10 font-bold"
        onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="true" aria-label={`${t('Language')}: ${cur.label}`}>
        <Languages className="h-5 w-5 shrink-0" aria-hidden /><span className="whitespace-nowrap">{cur.short}</span>
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-[600] cursor-default" aria-label={t('Close')} onClick={() => setOpen(false)} />
          <ul className="absolute right-0 mt-2 z-[610] w-56 card p-2 shadow-2xl text-ink">
            {LANGUAGES.map((l) => (
              <li key={l.id}>
                <button type="button" onClick={() => { setSetting('lang', l.id); setOpen(false); }} aria-pressed={l.id === lang}
                  className={cx('w-full text-left rounded-xl px-4 min-h-[52px] text-lg font-semibold', l.id === lang ? 'bg-brand text-neutral-900' : 'hover:bg-canvas')}>
                  {l.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** Messages addressed to the current user that arrived after they last opened Messages. */
function useUnread() {
  return useStore((s) => {
    const keys = identityKeys(s);
    return s.notifications.filter((n) => n.at > (s.seenAt || 0) && n.aud.some((a) => keys.includes(a))).length;
  });
}

function TopBar({ onMenu, onTray }) {
  const t = useT();
  const role = useStore((s) => s.role);
  const phase = useStore((s) => s.phase);
  const settings = useStore((s) => s.settings);
  const setSetting = useStore((s) => s.setSetting);
  const unread = useUnread();
  return (
    <header className={cx('sticky top-0 z-[500] no-print shadow-md transition-colors', STATUS_TONE[phase].bar)}>
      <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 h-16 min-w-0">
        {role && (
          <button type="button" className="lg:hidden btn btn-sm !min-h-[48px] !min-w-[44px] !px-2 hover:bg-black/10" onClick={onMenu} aria-label={t('Open menu')}>
            <Menu className="h-6 w-6" aria-hidden />
          </button>
        )}
        <NavLink to="/" className="flex items-center gap-2 mr-1 shrink-0" aria-label="iCheck-U">
          <Logo className="h-9 w-9" inverse />
          <span className="hidden sm:block leading-tight">
            <span className="block font-extrabold text-lg">iCheck-U</span>
            <span className="block text-[0.7rem] opacity-90 -mt-0.5">{t('No one left unchecked')}</span>
          </span>
        </NavLink>
        <ModePill />
        <div className="flex-1" />
        {role && <span className="hidden xl:inline text-sm opacity-90 mr-1">{t(ROLE_LABEL[role])}</span>}
        <LanguageMenu />
        <button type="button" className="btn btn-sm !min-h-[48px] !min-w-[44px] !px-2 sm:!px-3 hover:bg-black/10"
          onClick={() => setSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')}
          aria-label={settings.theme === 'dark' ? t('Light mode') : t('Dark mode')}>
          {settings.theme === 'dark' ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
        </button>
        <button type="button" className="btn btn-sm !min-h-[48px] !min-w-[44px] !px-2 sm:!px-3 hover:bg-black/10 relative"
          onClick={onTray} aria-label={`${t('Messages')} (${unread} ${t('new')})`}>
          <Bell className="h-5 w-5" aria-hidden />
          {unread > 0 && <span className="absolute -top-0.5 right-0 min-w-[22px] h-[22px] rounded-full bg-neutral-900 text-white text-xs font-extrabold grid place-items-center px-1 ring-2 ring-white">{unread > 99 ? '99+' : unread}</span>}
        </button>
      </div>
    </header>
  );
}

function StatusStrip() {
  const t = useT();
  const phase = useStore((s) => s.phase);
  const event = useStore((s) => s.event);
  const now = useStore((s) => s.now);
  const role = useStore((s) => s.role);
  const tone = STATUS_TONE[phase].strip;
  let icon = CheckCircle2;
  let main = t('All is calm in your area.');
  let sub = t('We will alert you if anything happens.');
  if (phase === 'active' && event) {
    icon = Siren;
    main = `${t(EVENT_LABEL[event.type])} — ${t('Zones')} ${event.zones.join(', ')}`;
    sub = t('Started {time} ago', { time: elapsed(now - event.startedAt) });
  } else if (phase === 'alert') {
    icon = AlertTriangle;
    main = t('Flood Warning');
    sub = t('Get your grab list ready and know where your nearest safe place is.');
  } else if (phase === 'recovery') {
    icon = RotateCcw;
    main = t('The emergency is over');
    sub = t('Take your time. Check your belongings and see how to replace lost documents.');
  }
  if (phase === 'normal' && !role) return null;
  const Icon = icon;
  return (
    <div role={phase === 'active' ? 'alert' : 'status'} className={cx('no-print', tone)}>
      <div className="px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-semibold">
        <span className="flex items-center gap-2 font-extrabold"><Icon className={cx('h-5 w-5', phase === 'active' && 'animate-slowpulse')} aria-hidden />{main}</span>
        <span className="tabular-nums opacity-95">{sub}</span>
      </div>
    </div>
  );
}

function OfflineBanner() {
  const t = useT();
  const offline = useStore(isOffline);
  const waiting = useStore((s) => s.outbox.length);
  if (!offline) return null;
  return (
    <div role="status" className="bg-neutral-900 text-white border-b-4 border-caution no-print">
      <div className="px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-semibold">
        <span className="flex items-center gap-2 font-extrabold"><WifiOff className="h-5 w-5 text-caution" aria-hidden />{t('No internet')}</span>
        <span>{t('iCheck-U still works on this phone. Your updates are saved and sent when you reconnect.')}</span>
        {waiting > 0 && <span className="chip bg-caution text-neutral-900 text-xs">{t('{n} waiting to send', { n: waiting })}</span>}
      </div>
    </div>
  );
}

const CH_ICON = { push: Smartphone, sms: MessageSquare, whatsapp: MessageCircle, app: Info };
const CH_LABEL = { push: 'Push', sms: 'SMS', whatsapp: 'WhatsApp', app: 'App' };
const LV_ICON = { critical: ShieldAlert, warning: AlertTriangle, success: CheckCircle2, missing: UserSearch, info: Info };
const LV_BORDER = { critical: 'border-l-emergency', warning: 'border-l-caution', success: 'border-l-safe', missing: 'border-l-missing', info: 'border-l-line' };

export function NotificationItem({ n }) {
  const t = useT();
  const Ch = CH_ICON[n.channel] || Info;
  const Lv = LV_ICON[n.level] || Info;
  return (
    <li className={cx('card p-3 border-l-8', LV_BORDER[n.level] || 'border-l-line')}>
      <div className="flex items-center gap-2 text-xs font-bold muted">
        <span className={cx('chip !py-0.5 !px-2 text-xs', n.channel === 'whatsapp' ? 'bg-safe text-white' : n.channel === 'sms' ? 'bg-neutral-900 text-white dark:bg-neutral-700' : 'bg-brand text-neutral-900')}>
          <Ch className="h-3.5 w-3.5" aria-hidden />{CH_LABEL[n.channel]}
        </span>
        <span className="truncate">{t('To')}: {n.to}</span>
        <span className="ml-auto tabular-nums whitespace-nowrap">{clock(n.at)}</span>
      </div>
      <p className="font-bold mt-1.5 flex items-start gap-2"><Lv className="h-4 w-4 mt-1 shrink-0" aria-hidden />{t(n.title)}</p>
      {n.body && <p className="text-sm mt-0.5 muted">{t(n.body)}</p>}
    </li>
  );
}

function NotificationTray({ open, onClose }) {
  const t = useT();
  const notifications = useStore((s) => s.notifications);
  const keys = useStore((s) => identityKeys(s).join('|'));
  const [mine, setMine] = useState(true);
  if (!open) return null;
  const k = keys.split('|');
  const list = mine ? notifications.filter((n) => n.aud.some((a) => k.includes(a))) : notifications;
  return (
    <div className="fixed inset-0 z-[900] bg-black/50 no-print" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside role="dialog" aria-modal="true" aria-label={t('Messages')} className="absolute right-0 top-0 h-full w-full sm:w-[440px] bg-canvas shadow-2xl flex flex-col animate-slidein">
        <div className="flex items-center justify-between p-4 bg-brand text-neutral-900">
          <h2 className="h2 flex items-center gap-2"><Bell className="h-6 w-6" aria-hidden />{t('Messages')}</h2>
          <button type="button" onClick={onClose} className="btn btn-sm !min-h-[48px] hover:bg-black/10" aria-label={t('Close')}><X className="h-6 w-6" aria-hidden /></button>
        </div>
        <div className="p-3 flex gap-2">
          <button type="button" className={cx('btn btn-sm flex-1', mine ? 'btn-primary' : 'btn-ghost')} onClick={() => setMine(true)} aria-pressed={mine}>{t('For me')}</button>
          <button type="button" className={cx('btn btn-sm flex-1', !mine ? 'btn-primary' : 'btn-ghost')} onClick={() => setMine(false)} aria-pressed={!mine}>{t('All channels (demo log)')}</button>
        </div>
        <p className="px-4 pb-2 text-xs muted">{t('Push, SMS and WhatsApp are simulated. Nothing is really sent.')}</p>
        <ul className="flex-1 overflow-y-auto px-3 pb-6 space-y-2">
          {list.length === 0 && <li className="muted p-6 text-center">{t('No messages yet.')}</li>}
          {list.slice(0, 150).map((n) => <NotificationItem key={n.id} n={n} />)}
        </ul>
      </aside>
    </div>
  );
}

/** Slim heads-up banner (like a phone notification) for reminders and missing-person alerts.
    It never blocks the screen: people can keep using the app, and it slides away by itself. */
function HeadsUp() {
  const t = useT();
  const nav = useNavigate();
  const item = useStore((s) => s.headsUp);
  const dismiss = useStore((s) => s.dismissHeadsUp);
  const role = useStore((s) => s.role);
  useEffect(() => {
    if (!item) return undefined;
    const id = setTimeout(dismiss, 8000);
    return () => clearTimeout(id);
  }, [item, dismiss]);
  if (!item) return null;
  const missing = item.level === 'missing';
  const urgent = item.level === 'critical';
  const Lv = LV_ICON[item.level] || Info;
  const target = item.action || (missing ? '/home/alerts' : ROLE_HOME[role] || '/');
  return (
    <div className="fixed z-[950] top-2 inset-x-2 sm:left-auto sm:right-3 sm:w-[420px] no-print pointer-events-none" aria-live="polite">
      <div role="status" className={cx('pointer-events-auto rounded-2xl shadow-2xl border-2 flex items-stretch overflow-hidden animate-slidein bg-surface',
        missing ? 'border-missing' : urgent ? 'border-emergency' : 'border-caution')}>
        <span className={cx('w-2 shrink-0', missing ? 'bg-missing' : urgent ? 'bg-emergency' : 'bg-caution')} aria-hidden />
        <button type="button" className="flex-1 min-w-0 text-left p-3 flex gap-3 items-start" onClick={() => { stopAlarm(); dismiss(); nav(target); }}>
          <Lv className={cx('h-6 w-6 shrink-0 mt-0.5', missing ? 'text-missing' : urgent ? 'text-emergency' : 'text-alert')} aria-hidden />
          <span className="min-w-0">
            <span className="block text-xs font-bold muted">iCheck-U · {clock(item.at)}</span>
            <span className="block font-bold leading-snug">{t(item.title)}</span>
            {item.body && <span className="block text-sm muted line-clamp-2">{t(item.body)}</span>}
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 self-center muted" aria-hidden />
        </button>
        <button type="button" onClick={() => { stopAlarm(); dismiss(); }} className="px-3 hover:bg-canvas" aria-label={t('Dismiss')}><X className="h-5 w-5" aria-hidden /></button>
      </div>
    </div>
  );
}

function SideNav({ items, onNavigate }) {
  const t = useT();
  return (
    <nav aria-label={t('Main')} className="p-3 space-y-1">
      {items.map((it) => (
        <NavLink key={it.to} to={it.to} end={it.end} onClick={onNavigate}
          className={({ isActive }) => cx('flex items-center gap-3 rounded-2xl px-4 min-h-touch font-semibold', isActive ? 'bg-brand text-neutral-900' : 'hover:bg-canvas')}>
          <it.icon className="h-5 w-5 shrink-0" aria-hidden />
          <span>{t(it.label)}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function BottomNav({ items, onMore }) {
  const t = useT();
  return (
    <nav aria-label={t('Main')} className="lg:hidden fixed bottom-0 inset-x-0 z-[400] bg-surface border-t border-line no-print pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5">
        {items.slice(0, 4).map((it) => (
          <li key={it.to}>
            <NavLink to={it.to} end={it.end}
              className={({ isActive }) => cx('relative flex flex-col items-center justify-center gap-0.5 min-h-[64px] text-[0.7rem] font-bold leading-tight text-center px-1', isActive ? 'text-ink' : 'muted')}>
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute top-0 inset-x-4 h-1 rounded-b bg-brand" aria-hidden />}
                  <span className={cx('rounded-full px-3 py-0.5', isActive && 'bg-brand/30')}><it.icon className="h-6 w-6" aria-hidden /></span>
                  <span>{t(it.label)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
        <li>
          <button type="button" onClick={onMore} className="w-full flex flex-col items-center justify-center gap-0.5 min-h-[64px] text-[0.7rem] font-bold muted">
            <Menu className="h-6 w-6" aria-hidden /><span>{t('More')}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}

export default function Layout() {
  const role = useStore((s) => s.role);
  const markSeen = useStore((s) => s.markMessagesSeen);
  const [menu, setMenu] = useState(false);
  const [tray, setTray] = useState(false);
  const loc = useLocation();
  const t = useT();
  const items = NAV[role] || [];
  const desktop = DESKTOP_ROLES.includes(role);
  useEffect(() => { setMenu(false); }, [loc.pathname]);
  const openTray = () => { setTray(true); markSeen(); };

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[2000] btn btn-primary">{t('Skip to content')}</a>
      <TopBar onMenu={() => setMenu(true)} onTray={openTray} />
      <StatusStrip />
      <OfflineBanner />
      <div className="flex flex-1">
        {items.length > 0 && (
          <aside className="hidden lg:block w-64 shrink-0 border-r border-line bg-surface no-print">
            <div className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto"><SideNav items={items} /></div>
          </aside>
        )}
        <main id="main" tabIndex={-1} className={cx('flex-1 min-w-0 px-4 pt-5 pb-36 lg:pb-16', desktop ? 'lg:px-6' : '')}>
          <div className={cx('mx-auto', desktop ? 'max-w-[1500px]' : 'max-w-3xl')}>
            <Outlet />
          </div>
        </main>
      </div>
      {items.length > 0 && <BottomNav items={items} onMore={() => setMenu(true)} />}
      {menu && (
        <div className="lg:hidden fixed inset-0 z-[800] bg-black/50 no-print" onMouseDown={(e) => e.target === e.currentTarget && setMenu(false)}>
          <aside role="dialog" aria-modal="true" aria-label={t('Menu')} className="absolute left-0 top-0 h-full w-[85%] max-w-sm bg-surface overflow-y-auto animate-slidein">
            <div className="flex items-center justify-between p-4 bg-brand text-neutral-900">
              <span className="font-extrabold flex items-center gap-2"><Logo className="h-8 w-8" inverse />iCheck-U</span>
              <button type="button" onClick={() => setMenu(false)} className="btn btn-sm !min-h-[48px] hover:bg-black/10" aria-label={t('Close')}><X className="h-6 w-6" aria-hidden /></button>
            </div>
            {items.length > 0 ? <SideNav items={items} onNavigate={() => setMenu(false)} /> : <p className="p-4">{t('Choose a role first.')}</p>}
          </aside>
        </div>
      )}
      <NotificationTray open={tray} onClose={() => setTray(false)} />
      <HeadsUp />
      <DemoControls />
      <BigAlert />
      <CallScreen />
    </div>
  );
}
