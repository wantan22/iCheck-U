// Lets the phone-frame demo page (outside the phone) drive the app inside it, using postMessage.
// Only active in the artifact build when embedded (see IS_EMBED).
import { useEffect } from 'react';
import { useStore } from '../store/useStore.js';
import { ROLE_HOME } from '../components/nav.js';
import { IS_EMBED } from './env.js';

export function useDemoBridge(navigate) {
  useEffect(() => {
    if (!IS_EMBED) return undefined;
    const st = () => useStore.getState();
    const onMessage = (e) => {
      const m = e.data;
      if (!m || m.type !== 'icheck-demo') return;
      switch (m.action) {
        case 'simulate': if (st().phase !== 'active') st().activateEvent({ type: 'flood', zones: ['A', 'B', 'C'], severity: 'high' }); break;
        case 'warning': st().issueWarning('flood', ['A', 'B', 'C']); break;
        case 'end': st().endEvent(); break;
        case 'reset': st().resetData(); st().setRole(null); navigate('/'); break;
        case 'role': st().setRole(m.value); navigate(ROLE_HOME[m.value] || '/'); break;
        case 'go': navigate(m.value); break;
        case 'lang': st().setSetting('lang', m.value); break;
        case 'theme': st().setSetting('theme', m.value); break;
        case 'offline': st().setForceOffline(!!m.value); break;
        case 'speed': st().setSetting('demoSpeed', !!m.value); break;
        default:
      }
    };
    window.addEventListener('message', onMessage);
    // Tell the demo page what is going on, so its buttons can show the current state.
    let last = '';
    const report = () => {
      const s = st();
      const msg = { type: 'icheck-state', phase: s.phase, role: s.role, lang: s.settings.lang, theme: s.settings.theme, offline: s.forceOffline, eventStartedAt: s.event?.startedAt || null };
      const key = JSON.stringify(msg);
      if (key !== last) { last = key; window.parent.postMessage(msg, '*'); }
    };
    report();
    const unsub = useStore.subscribe(report);
    return () => { window.removeEventListener('message', onMessage); unsub(); };
  }, [navigate]);
}
