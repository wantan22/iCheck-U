// Global demo store (Zustand + Immer). Everything lives in memory; Reset data restores the seed.
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';

// Device storage for offline use. Writes are batched (at most every 2 s) and flushed when the app is hidden,
// so the 1-second event clock does not hammer localStorage. If storage is unavailable the app still runs in memory.
const deviceStorage = (() => {
  let pending = null;
  let timer = null;
  const flush = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!pending) return;
    try { localStorage.setItem(pending.name, JSON.stringify(pending.value)); } catch { /* storage full or blocked */ }
    pending = null;
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  }
  return {
    getItem: (name) => {
      try { const raw = localStorage.getItem(name); return raw ? JSON.parse(raw) : null; } catch { return null; }
    },
    setItem: (name, value) => {
      pending = { name, value };
      if (!timer) timer = setTimeout(flush, 2000);
    },
    removeItem: (name) => { try { localStorage.removeItem(name); } catch { /* ignore */ } },
  };
})();
import householdsSeed from '../data/households.json';
import businessesSeed from '../data/businesses.json';
import safetyPointsSeed from '../data/safetyPoints.json';
import blockedRoadsSeed from '../data/blockedRoads.json';
import orgsSeed from '../data/orgs.json';
import { alertEffects } from '../utils/alerts.js';
import { distanceBetween, nearest } from '../utils/geo.js';

let counter = 1;
export const uid = (p = 'id') => `${p}-${Date.now().toString(36)}-${(counter++).toString(36)}`;
const clone = (x) => JSON.parse(JSON.stringify(x));

const freshCheckin = () => ({ status: 'pending', help: false, sos: false, respondedAt: null, note: '', location: false, notifiedAt: null, via: null });

const initHousehold = (h) => ({
  ...h,
  checkin: freshCheckin(),
  escalation: [],
  escalationStep: 0,
  neighbourChecks: [],
  rescue: null,
  flaggedAt: null,
  priorityAdjust: 0,
  headingTo: null,
  notes: [],
  privacy: { expiry: 'never', shareMedical: true },
  reviewPrompt: false,
});

const initBusiness = (b) => ({
  ...b,
  checkin: freshCheckin(),
  escalation: [],
  escalationStep: 0,
  neighbourChecks: [],
  rescue: null,
  flaggedAt: null,
  priorityAdjust: 0,
  notes: [],
  hazards: [],
});

function initialData() {
  return {
    households: clone(householdsSeed).map(initHousehold),
    businesses: clone(businessesSeed).map(initBusiness),
    safetyPoints: clone(safetyPointsSeed),
    blockedRoads: clone(blockedRoadsSeed),
    orgs: clone(orgsSeed),
    event: null,
    warning: null,
    phase: 'normal', // normal | alert | active | recovery
    queue: [],
    missingAlerts: [],
    notifications: [],
    toasts: [],
    accessLog: [],
    activity: [],
    reports: [],
    tasks: [],
    orgTasks: [],
    hazards: [],
    pastEvents: [],
  };
}

export const IDENTITY_DEFAULTS = {
  householdId: 'h01',
  businessId: 'b01',
  workerId: 'w002',
  orgId: 'o1',
};

const settingsDefault = {
  theme: 'light',
  lang: 'en',
  largeText: false,
  alertSound: true,
  demoSpeed: true,
  escalationMinutes: 30,
};

// Scripted neighbour behaviour during escalation step 2 (demo only)
const NEIGHBOUR_SCRIPTS = {
  h10: { result: 'no_answer', delay: 5, note: 'Knocked and called out — no answer. Gate is locked.' },
  h21: { result: 'ok', delay: 6, note: 'Both are fine. Grandma has no phone credit. They are staying upstairs.' },
};

export const totalEscalationMs = (s) => (s.settings.demoSpeed ? 60_000 : s.settings.escalationMinutes * 60_000);

export const useStore = create(
  persist(
  immer((set, get) => ({
    ...initialData(),
    now: Date.now(),
    role: null,
    identity: { ...IDENTITY_DEFAULTS },
    settings: { ...settingsDefault },
    registered: {},
    netOnline: typeof navigator === "undefined" ? true : navigator.onLine,
    forceOffline: false,
    offlineReady: false,
    outbox: [],
    bigAlert: null,
    headsUp: null,
    call: null,
    seenAt: 0,

    // ---------- offline ----------
    setOfflineReady: (v) => set((s) => { s.offlineReady = v; }),
    setNetOnline: (v) => { const was = isOffline(get()); set((s) => { s.netOnline = v; }); afterConnectivity(was, get, set); },
    setForceOffline: (v) => { const was = isOffline(get()); set((s) => { s.forceOffline = v; }); afterConnectivity(was, get, set); },

    // ---------- settings / identity ----------
    setSetting: (k, v) => set((s) => { s.settings[k] = v; }),
    setRole: (role, idPatch) =>
      set((s) => {
        if (s.role !== role) { s.toasts = []; s.bigAlert = null; s.headsUp = null; }
        s.role = role;
        if (idPatch) Object.assign(s.identity, idPatch);
      }),
    resetData: () =>
      set((s) => {
        Object.assign(s, initialData());
        s.identity = { ...IDENTITY_DEFAULTS };
        s.registered = {};
        s.now = Date.now();
      }),

    // ---------- notifications / toasts / logs ----------
    notify: (n) => {
      let fx = null;
      set((s) => {
        const item = { id: uid('n'), at: Date.now(), channel: 'push', level: 'info', aud: ['all'], ...n };
        s.notifications.unshift(item);
        if (s.notifications.length > 400) s.notifications.length = 400;
        const keys = identityKeys(s);
        const mine = item.aud.some((a) => keys.includes(a));
        // Nothing pops up by default: messages wait quietly under the bell (Messages).
        // Only two things interrupt: the first emergency check-in (full screen, siren)
        // and important reminders / missing-person alerts (a slim banner at the top).
        if (mine && item.channel === 'push') {
          const resident = ['household', 'business', 'worker'].includes(s.role);
          if (item.big && resident) { s.bigAlert = item; fx = { ...item, role: s.role, kind: 'big' }; }
          else if (resident && item.headsUp !== false && ['critical', 'missing', 'warning'].includes(item.level)) { s.headsUp = item; fx = { ...item, role: s.role, kind: 'banner' }; }
          else if (!resident && item.level === 'critical') fx = { ...item, role: s.role, kind: 'quiet' };
        }
      });
      if (fx) alertEffects(fx, get().settings);
    },
    dismissBigAlert: () => set((s) => { s.bigAlert = null; }),
    // App confirmations go to Messages instead of popping up.
    toast: (title, level = 'info', body = '') =>
      set((s) => {
        s.notifications.unshift({ id: uid('n'), at: Date.now(), channel: 'app', level, aud: ['all'], to: 'You', title, body });
      }),
    dismissHeadsUp: () => set((s) => { s.headsUp = null; }),
    // Demo-only pretend phone call to 999 (shown by CallScreen)
    startCall: () => set((s) => { s.call = { number: '999', startedAt: Date.now() }; s.bigAlert = null; }),
    endCall: () => set((s) => { s.call = null; }),
    markMessagesSeen: () => set((s) => { s.seenAt = Date.now(); }),
    log: (text, type = 'info', vars) =>
      set((s) => {
        s.activity.unshift({ id: uid('a'), at: Date.now(), text, vars, type });
      }),
    logAccess: (recordType, recordId, recordLabel, action = 'Viewed record') =>
      set((s) => {
        const last = s.accessLog[0];
        if (last && last.recordId === recordId && last.action === action && Date.now() - last.at < 2000) return;
        s.accessLog.unshift({ id: uid('al'), at: Date.now(), who: identityLabel(s), role: s.role, recordType, recordId, recordLabel, action });
      }),

    // ---------- event control ----------
    issueWarning: (type, zones) =>
      set((s) => {
        s.warning = { type, zones, at: Date.now() };
        if (s.phase === 'normal' || s.phase === 'recovery') s.phase = 'alert';
      }),
    clearWarning: () => set((s) => { s.warning = null; if (s.phase === 'alert') s.phase = 'normal'; }),

    activateEvent: ({ type = 'flood', zones = ['A', 'B', 'C'], severity = 'high', name } = {}) => {
      const now = Date.now();
      set((s) => {
        s.event = { id: uid('ev'), type, zones, severity, name: name || `${type} — Taman Seri Harmoni`, startedAt: now, endedAt: null, status: 'active' };
        s.phase = 'active';
        s.warning = null;
        s.queue = [];
        s.missingAlerts = [];
        s.tasks = [];
        s.orgTasks = [];
        s.households.forEach((h) => {
          Object.assign(h, { checkin: freshCheckin(), escalation: [], escalationStep: 0, neighbourChecks: [], rescue: null, flaggedAt: null, headingTo: null, priorityAdjust: 0 });
          h.members.forEach((m) => { m.status = 'pending'; });
          if (zones.includes(h.zone)) {
            h.checkin.notifiedAt = now;
            h.escalation.push({ step: 0, at: now, key: 'Check-in request sent (Push)' });
            if (h.script) {
              s.queue.push({ at: now + h.script.delay * 1000, kind: 'hh', id: h.id, ...h.script });
            }
          }
        });
        s.businesses.forEach((b) => {
          Object.assign(b, { checkin: freshCheckin(), escalation: [], escalationStep: 0, neighbourChecks: [], rescue: null, flaggedAt: null, priorityAdjust: 0 });
          b.workers.forEach((w) => { w.status = 'pending'; });
          if (zones.includes(b.zone)) {
            b.checkin.notifiedAt = now;
            b.escalation.push({ step: 0, at: now, key: 'Check-in request sent (Push)' });
            if (b.script) s.queue.push({ at: now + b.script.delay * 1000, kind: 'biz', id: b.id, ...b.script });
          }
        });
        s.orgs.forEach((o) => o.teams.forEach((t) => { t.assignment = null; }));
        s.activity.unshift({ id: uid('a'), at: now, type: 'event', text: 'Event activated: {type} in Zones {zones} (severity {severity})', vars: { type, zones: zones.join(', '), severity } });
      });
      const s = get();
      const affectedH = s.households.filter((h) => zones.includes(h.zone));
      const affectedB = s.businesses.filter((b) => zones.includes(b.zone));
      affectedH.forEach((h) =>
        s.notify({ channel: 'push', aud: [`hh:${h.id}`], to: h.name, level: 'critical', title: 'Flood emergency — check in now', body: 'Is everyone in your household safe? Are the kids with you? Tap to respond.', big: true, action: '/home/checkin' }),
      );
      affectedB.forEach((b) =>
        s.notify({ channel: 'push', aud: [`biz:${b.id}`], to: b.name, level: 'critical', title: 'Emergency — check your premises', body: 'Is everyone at your premises safe? Tap to respond.', big: true, action: '/biz/checkin' }),
      );
      affectedB.forEach((b) => b.workers.filter((w) => w.onSite).forEach((w) =>
        s.notify({ channel: 'push', aud: [`wrk:${w.id}`], to: w.name, level: 'critical', title: 'Flood emergency — are you safe?', body: `There is a flood near ${b.name}. Tell your employer and rescuers you are safe.`, big: true, action: '/worker' }),
      ));
      s.notify({ channel: 'push', aud: ['responders', 'admin'], to: 'All verified responders', level: 'critical', title: `Event active: ${type} in Zones ${zones.join(', ')}`, body: `${affectedH.length} households and ${affectedB.length} businesses notified. Dashboard is live.` });
    },

    endEvent: () => {
      set((s) => {
        if (!s.event) return;
        s.event.status = 'ended';
        s.event.endedAt = Date.now();
        s.phase = 'recovery';
        s.queue = [];
        s.orgs.forEach((o) => o.teams.forEach((t) => { t.assignment = null; }));
        s.pastEvents.unshift(clone(s.event));
        s.activity.unshift({ id: uid('a'), at: Date.now(), type: 'event', text: 'Event ended. Recovery mode started. Responder access to household details has ended.' });
      });
      get().notify({ channel: 'push', aud: ['all'], to: 'Everyone', level: 'success', title: 'Event ended — recovery mode', body: 'The emergency is over. Check your items, mark what was found, damaged or lost, and see replacement guides.' });
    },
    closeRecovery: () => set((s) => { s.phase = 'normal'; }),

    // ---------- the clock: scripted replies + auto-escalation ----------
    tick: () => {
      const now = Date.now();
      const s0 = get();
      set((s) => { s.now = now; });
      if (s0.phase !== 'active' || !s0.event) return;
      // scripted demo responses
      const due = s0.queue.filter((q) => q.at <= now);
      if (due.length) {
        set((s) => { s.queue = s.queue.filter((q) => q.at > now); });
        scripting = true;
        try { due.forEach((q) => runScript(q, get)); } finally { scripting = false; }
      }
      // escalation ladder
      const T = totalEscalationMs(s0);
      ['households', 'businesses'].forEach((coll) => {
        get()[coll].forEach((e) => {
          if (e.checkin.status !== 'pending' || !e.checkin.notifiedAt) return;
          const age = now - e.checkin.notifiedAt;
          if (e.escalationStep < 1 && age >= T / 3) escalateStep1(coll, e.id, get);
          else if (e.escalationStep === 1 && age >= (2 * T) / 3) escalateStep2(coll, e.id, get);
          else if (e.escalationStep === 2 && age >= T) escalateStep3(coll, e.id, get);
        });
      });
    },

    // ---------- household check-in ----------
    setMemberStatus: (hid, mid, status) => {
      set((s) => {
        const h = s.households.find((x) => x.id === hid);
        const m = h?.members.find((x) => x.id === mid);
        if (!m) return;
        m.status = status;
        recomputeHousehold(h, s);
      });
    },
    respondHousehold: (hid, kind, { note = '', location = false, via = 'app', memberIds = [], details = {} } = {}) => {
      if (via !== "sms") queueOffline(get, set, "Safety check-in");
      const now = Date.now();
      set((s) => {
        const h = s.households.find((x) => x.id === hid);
        if (!h) return;
        h.checkin.respondedAt = now;
        h.checkin.note = note || h.checkin.note;
        h.checkin.location = location || h.checkin.location;
        h.checkin.via = via;
        if (kind === 'safe') {
          h.members.forEach((m) => { if (m.status !== 'missing') m.status = 'safe'; });
          h.checkin.help = false;
          h.escalation.push({ step: 9, at: now, key: 'Responded: everyone is safe' });
        }
        if (kind === 'help') {
          h.checkin.help = true;
          h.escalation.push({ step: 9, at: now, key: 'Responded: we need help' });
        }
        if (kind === 'missing') {
          memberIds.forEach((id) => {
            const m = h.members.find((x) => x.id === id);
            if (m) {
              m.status = 'missing';
              if (details[id]?.clothing) m.clothing = details[id].clothing;
            }
          });
          h.escalation.push({ step: 9, at: now, key: 'Responded: someone is missing' });
        }
        recomputeHousehold(h, s);
      });
      const st = get();
      const h = st.households.find((x) => x.id === hid);
      if (kind === 'help') {
        st.notify({ channel: 'push', aud: ['responders', 'admin'], to: 'Responders', level: 'critical', title: `Needs help: ${h.shortAddress}`, body: note || `${h.name} asked for help.` });
        st.log('{name} asked for help', 'critical', { name: `${h.name} (${h.shortAddress})` });
      }
      if (kind === 'safe') st.log('{name} reported everyone safe', 'success', { name: h.name });
      if (kind === 'missing') {
        memberIds.forEach((id) => st.raiseMissing('household', hid, id, details[id] || {}));
      }
    },
    sendSOS: (hid) => {
      queueOffline(get, set, "SOS — I need help now");
      set((s) => {
        const h = s.households.find((x) => x.id === hid);
        if (!h) return;
        h.checkin.help = true;
        h.checkin.sos = true;
        h.checkin.respondedAt = Date.now();
        h.checkin.location = true;
        h.escalation.push({ step: 9, at: Date.now(), key: 'SOS sent with location' });
        recomputeHousehold(h, s);
      });
      const st = get();
      const h = st.households.find((x) => x.id === hid);
      st.notify({ channel: 'push', aud: ['responders', 'admin'], to: 'Responders', level: 'critical', title: `SOS: ${h.shortAddress}`, body: `${h.name} pressed "I need help now". Location shared.` });
      st.notify({ channel: 'sms', aud: [`hh:${hid}`], to: h.phone, level: 'critical', title: 'SOS received', body: 'iCheck-U: Your SOS was received. Responders can see your location. Stay where you are if it is safe.' });
      st.log('SOS from {name}', 'critical', { name: `${h.name} (${h.shortAddress})` });
    },
    cancelHelp: (hid) => set((s) => {
      const h = s.households.find((x) => x.id === hid);
      if (!h) return;
      h.checkin.help = false;
      h.checkin.sos = false;
      recomputeHousehold(h, s);
    }),
    headTo: (kind, id, spId) => {
      queueOffline(get, set, "Heading to a safe place");
      set((s) => {
        const e = s[kind === 'business' ? 'businesses' : 'households'].find((x) => x.id === id);
        if (e) {
          e.headingTo = { spId, at: Date.now() };
          e.escalation.push({ step: 9, at: Date.now(), key: 'Heading to {place}', vars: { place: s.safetyPoints.find((p) => p.id === spId)?.name } });
        }
      });
      const st = get();
      const e = st[kind === 'business' ? 'businesses' : 'households'].find((x) => x.id === id);
      const sp = st.safetyPoints.find((p) => p.id === spId);
      st.notify({ channel: 'push', aud: ['responders'], to: 'Responders', level: 'info', title: `${e.name} is heading to ${sp.name}`, body: e.shortAddress, toast: false });
      st.log('{name} is heading to {place}', 'info', { name: e.name, place: sp.name });
    },

    // ---------- unaccounted-for alerts ----------
    raiseMissing: (kind, entityId, personId, { lastSeen = '', clothing = '', photo = '' } = {}) => {
      const now = Date.now();
      const st = get();
      const coll = kind === 'business' ? 'businesses' : 'households';
      const e = st[coll].find((x) => x.id === entityId);
      const p = (kind === 'business' ? e.workers : e.members).find((x) => x.id === personId);
      if (!p) return;
      if (st.missingAlerts.some((a) => a.personId === personId && a.status === 'active')) return;
      const alertId = uid('ma');
      const nearby = nearest(e, st.households, 8, (h) => h.id !== entityId);
      set((s) => {
        s.missingAlerts.unshift({
          id: alertId, kind, entityId, personId, name: p.name, age: p.age ?? null, photo: photo || p.photo || '',
          lastSeen: lastSeen || `Near ${e.shortAddress}`, clothing: clothing || p.clothing || 'Not given',
          status: 'active', createdAt: now, foundAt: null, responses: [], notified: nearby.map((n) => n.item.id),
          entityName: e.name, address: e.shortAddress, lat: e.lat, lng: e.lng,
        });
        const ent = s[coll].find((x) => x.id === entityId);
        if (!ent.flaggedAt) ent.flaggedAt = now;
      });
      const child = p.age != null && p.age < 13;
      nearby.forEach((n) =>
        get().notify({ channel: 'push', aud: [`hh:${n.item.id}`], to: n.item.name, level: 'missing', title: `Unaccounted-for alert: ${p.name}${p.age != null ? `, ${Math.floor(p.age)}` : ''}`, body: `Last seen ${lastSeen || `near ${e.shortAddress}`}. ${clothing || p.clothing || ''} Can you help look?`, action: '/home/alerts' }),
      );
      get().notify({ channel: 'push', aud: ['responders', 'admin'], to: 'Responders', level: 'missing', title: `${child ? 'MISSING CHILD' : 'Missing person'}: ${p.name}`, body: `${e.name}, ${e.shortAddress}. Top priority case.` });
      get().notify({ channel: 'push', aud: [kind === 'business' ? `biz:${entityId}` : `hh:${entityId}`], to: e.name, level: 'info', title: 'Alert sent to neighbours', body: `${nearby.length} nearby households and all responders were alerted about ${p.name}.` });
      get().log('Unaccounted-for alert: {name} ({where})', 'missing', { name: p.name, where: e.shortAddress });
      // scripted neighbour response for the demo
      const searcher = nearby.find((n) => n.item.id === 'h02') || nearby.find((n) => n.item.script?.status === 'safe');
      const scripts = searcher ? [{ delay: 6, by: searcher.item.id, type: 'searching', note: child ? 'Checking the playground and surau now.' : 'Walking the route to the car park and calling out.' }] : [];
      set((s) => {
        scripts.forEach((sc) => s.queue.push({ at: now + sc.delay * 1000, kind: 'alertResponse', alertId, ...sc }));
      });
    },
    respondAlert: (alertId, byHouseholdId, type, note = '') => {
      queueOffline(get, set, "Response to an unaccounted-for alert");
      const st = get();
      const a = st.missingAlerts.find((x) => x.id === alertId);
      if (!a || a.status !== 'active') return;
      const by = st.households.find((h) => h.id === byHouseholdId);
      const byName = by ? by.members[0].name : 'Responder';
      if (type === 'found') return st.resolveAlert(alertId, `${byName} (${by ? 'neighbour' : 'responder'})`, note);
      set((s) => {
        const al = s.missingAlerts.find((x) => x.id === alertId);
        al.responses.push({ id: uid('r'), by: byName, byId: byHouseholdId, type, note, at: Date.now() });
      });
      const label = type === 'seen' ? "I've seen them" : "I'm searching";
      st.notify({ channel: 'push', aud: [a.kind === 'business' ? `biz:${a.entityId}` : `hh:${a.entityId}`, 'responders'], to: a.entityName, level: 'info', title: `${byName}: "${label}"`, body: note || `About ${a.name}` });
      st.log('{by} responded "{label}" to alert for {name}', 'missing', { by: byName, label, name: a.name });
    },
    resolveAlert: (alertId, by = 'Household', note = '') => {
      const st = get();
      const a = st.missingAlerts.find((x) => x.id === alertId);
      if (!a || a.status !== 'active') return;
      set((s) => {
        const al = s.missingAlerts.find((x) => x.id === alertId);
        al.status = 'found';
        al.foundAt = Date.now();
        al.responses.push({ id: uid('r'), by, type: 'found', note, at: Date.now() });
        const coll = al.kind === 'business' ? 'businesses' : 'households';
        const e = s[coll].find((x) => x.id === al.entityId);
        const p = (al.kind === 'business' ? e.workers : e.members).find((x) => x.id === al.personId);
        if (p) p.status = 'safe';
        if (al.kind === 'business') recomputeBusiness(e); else recomputeHousehold(e, s);
        e.escalation.push({ step: 9, at: Date.now(), key: '{name} found safe', vars: { name: al.name } });
      });
      st.notify({ channel: 'push', aud: [a.kind === 'business' ? `biz:${a.entityId}` : `hh:${a.entityId}`], to: a.entityName, level: 'success', title: `${a.name} has been found`, body: `${by} marked ${a.name} as found. ${note}` });
      st.notify({ channel: 'push', aud: a.notified.map((id) => `hh:${id}`).concat(['responders']), to: 'Neighbours & responders', level: 'success', title: `Found: ${a.name}`, body: 'Thank you for helping. The alert is closed.', toast: false });
      st.log('{name} found — alert closed', 'success', { name: a.name });
    },

    // ---------- neighbour checks ----------
    neighbourReport: (coll, entityId, neighbourId, result, note = '') => {
      queueOffline(get, set, "Neighbour check result");
      const now = Date.now();
      set((s) => {
        const e = s[coll].find((x) => x.id === entityId);
        const c = e?.neighbourChecks.find((x) => x.neighbourId === neighbourId);
        if (!c) return;
        c.result = result;
        c.note = note;
        c.at = now;
        e.escalation.push({ step: 9, at: now, key: 'Neighbour {name}: {result}', vars: { name: c.name, result: NB_LABEL[result] } });
        if (result === 'ok' && e.checkin.status === 'pending') {
          e.checkin.status = coll === 'businesses' ? 'all_safe' : 'safe';
          e.checkin.via = 'neighbour';
          e.checkin.respondedAt = now;
          (coll === 'businesses' ? e.workers : e.members).forEach((m) => { m.status = 'safe'; });
        }
        if (result === 'needs_help') {
          e.checkin.help = true;
          e.checkin.status = 'needs_help';
          if (!e.flaggedAt) e.flaggedAt = now;
        }
      });
      const st = get();
      const e = st[coll].find((x) => x.id === entityId);
      const c = e.neighbourChecks.find((x) => x.neighbourId === neighbourId);
      st.notify({ channel: 'push', aud: ['responders'], to: 'Responders', level: result === 'needs_help' ? 'critical' : 'info', title: `Neighbour check: ${e.shortAddress}`, body: `${c.name}: ${NB_LABEL[result]}. ${note}`, toast: result === 'needs_help' });
      st.log('Neighbour {name} checked {addr}: {result}', result === 'ok' ? 'success' : 'warning', { name: c.name, addr: e.shortAddress, result: NB_LABEL[result] });
    },

    // ---------- business ----------
    respondBusiness: (bid, status, { note = '', missingWorkerIds = [], details = {}, via = 'app' } = {}) => {
      queueOffline(get, set, "Business check-in");
      const now = Date.now();
      set((s) => {
        const b = s.businesses.find((x) => x.id === bid);
        if (!b) return;
        b.checkin.respondedAt = now;
        b.checkin.note = note;
        b.checkin.via = via;
        b.checkin.help = status === 'needs_help';
        if (status === 'all_safe') b.workers.forEach((w) => { if (w.onSite && w.status !== 'missing') w.status = 'safe'; });
        if (status === 'closed') b.workers.forEach((w) => { w.onSite = false; w.status = 'safe'; });
        if (status === 'missing') missingWorkerIds.forEach((id) => { const w = b.workers.find((x) => x.id === id); if (w) w.status = 'missing'; });
        b.checkin.status = status;
        b.escalation.push({ step: 9, at: now, key: 'Responded: {status}', vars: { status: BIZ_LABEL[status] } });
        recomputeBusiness(b);
      });
      const st = get();
      const b = st.businesses.find((x) => x.id === bid);
      if (status === 'missing') missingWorkerIds.forEach((id) => st.raiseMissing('business', bid, id, details[id] || {}));
      if (status === 'needs_help') st.notify({ channel: 'push', aud: ['responders'], to: 'Responders', level: 'critical', title: `Business needs help: ${b.name}`, body: note || b.shortAddress });
      st.log('{name}: {status}', status === 'all_safe' || status === 'closed' ? 'success' : 'critical', { name: b.name, status: BIZ_LABEL[status] });
    },
    setWorker: (bid, wid, patch) => set((s) => {
      const b = s.businesses.find((x) => x.id === bid);
      const w = b?.workers.find((x) => x.id === wid);
      if (!w) return;
      Object.assign(w, patch);
      if (patch.status) recomputeBusiness(b);
    }),
    addWorker: (bid, w) => set((s) => {
      const b = s.businesses.find((x) => x.id === bid);
      b.workers.push({ id: uid('w'), status: 'pending', onSite: true, needs: [], medical: null, medicalConsent: false, commute: '', emergencyContact: '', ...w });
    }),
    removeWorker: (bid, wid) => set((s) => {
      const b = s.businesses.find((x) => x.id === bid);
      b.workers = b.workers.filter((w) => w.id !== wid);
    }),
    reportHazard: (h) => {
      queueOffline(get, set, "Hazard report");
      set((s) => {
        const item = { id: uid('hz'), at: Date.now(), ...h };
        s.hazards.unshift(item);
        if (h.roadId) {
          const r = s.blockedRoads.find((x) => x.id === h.roadId);
          if (r) { r.active = true; r.reason = h.typeLabel || r.reason; r.reportedBy = h.by; }
        }
      });
      get().notify({ channel: 'push', aud: ['responders', 'all'], to: 'Everyone nearby', level: 'warning', headsUp: false, title: `Hazard reported: ${h.typeLabel}`, body: `${h.location}. ${h.note || ''} Routes are updated to avoid it.`, toast: false });
      get().log('Hazard reported by {by}: {type} at {where}', 'warning', { by: h.by, type: h.typeLabel, where: h.location });
    },
    setRoad: (rid, active) => set((s) => { const r = s.blockedRoads.find((x) => x.id === rid); if (r) r.active = active; }),

    // ---------- profile editing ----------
    addHousehold: (h) => {
      const id = uid('h');
      set((s) => {
        s.households.push(initHousehold({ id, script: null, checklist: [], pets: [], contacts: [], isCoordinator: false, ...h }));
        s.identity.householdId = id;
        s.registered.household = id;
      });
      return id;
    },
    updateHousehold: (hid, patch) => set((s) => { const h = s.households.find((x) => x.id === hid); if (h) Object.assign(h, patch); }),
    addMember: (hid, m) => set((s) => {
      const h = s.households.find((x) => x.id === hid);
      h.members.push({ id: uid('m'), status: 'pending', needs: [], photo: '', clothing: '', phone: '', medical: { bloodType: '', allergies: '', medications: '', conditions: '' }, ...m });
      h.reviewPrompt = true;
    }),
    updateMember: (hid, mid, patch) => set((s) => {
      const h = s.households.find((x) => x.id === hid);
      const m = h?.members.find((x) => x.id === mid);
      if (m) Object.assign(m, patch);
    }),
    removeMember: (hid, mid) => set((s) => {
      const h = s.households.find((x) => x.id === hid);
      h.members = h.members.filter((m) => m.id !== mid);
    }),
    deleteHousehold: (hid) => set((s) => {
      s.households = s.households.filter((h) => h.id !== hid);
      s.identity.householdId = IDENTITY_DEFAULTS.householdId;
      s.role = null;
    }),
    addBusiness: (b) => {
      const id = uid('b');
      set((s) => {
        s.businesses.push(initBusiness({ id, workers: [], checklist: [], script: null, risks: [], ...b }));
        s.identity.businessId = id;
        s.registered.business = id;
      });
      return id;
    },
    updateBusiness: (bid, patch) => set((s) => { const b = s.businesses.find((x) => x.id === bid); if (b) Object.assign(b, patch); }),
    deleteBusiness: (bid) => set((s) => {
      s.businesses = s.businesses.filter((b) => b.id !== bid);
      s.identity.businessId = IDENTITY_DEFAULTS.businessId;
      s.role = null;
    }),

    // ---------- checklist (household or business) ----------
    checklistOp: (ownerType, ownerId, op, payload) => set((s) => {
      const e = s[ownerType === 'business' ? 'businesses' : 'households'].find((x) => x.id === ownerId);
      if (!e) return;
      const list = e.checklist;
      if (op === 'add') list.push({ id: uid('c'), recovery: null, photo: '', ownerId: null, format: 'physical', verifiedAt: new Date().toISOString().slice(0, 10), ...payload });
      if (op === 'update') { const it = list.find((x) => x.id === payload.id); if (it) Object.assign(it, payload.patch); }
      if (op === 'remove') e.checklist = list.filter((x) => x.id !== payload.id);
      if (op === 'move') {
        const i = list.findIndex((x) => x.id === payload.id);
        const j = i + payload.dir;
        if (i >= 0 && j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];
      }
      if (op === 'verifyAll') { const d = new Date().toISOString().slice(0, 10); list.forEach((x) => { x.verifiedAt = d; }); e.reviewPrompt = false; }
      if (op === 'dismissPrompt') e.reviewPrompt = false;
    }),

    // ---------- responders ----------
    adjustPriority: (coll, id, delta) => set((s) => {
      const e = s[coll].find((x) => x.id === id);
      if (e) e.priorityAdjust = Math.max(-4, Math.min(4, (e.priorityAdjust || 0) + delta));
    }),
    addNote: (coll, id, text) => set((s) => {
      const e = s[coll].find((x) => x.id === id);
      if (e) e.notes.push({ id: uid('note'), at: Date.now(), by: identityLabel(s), text });
    }),
    claim: (coll, id, orgId, teamId) => {
      const now = Date.now();
      set((s) => {
        const e = s[coll].find((x) => x.id === id);
        const org = s.orgs.find((o) => o.id === orgId);
        const team = org?.teams.find((t) => t.id === teamId);
        if (!e || !team) return;
        e.rescue = { orgId, teamId, teamName: team.name, status: 'dispatched', claimedAt: now, reachedAt: null, history: [{ status: 'dispatched', at: now }] };
        team.assignment = { coll, id };
        if (!e.flaggedAt) e.flaggedAt = e.checkin.notifiedAt || now;
      });
      const st = get();
      const e = st[coll].find((x) => x.id === id);
      st.notify({ channel: 'push', aud: [coll === 'businesses' ? `biz:${id}` : `hh:${id}`], to: e.name, level: 'info', title: 'Help is being sent', body: `${e.rescue.teamName} has been dispatched to ${e.shortAddress}.` });
      st.notify({ channel: 'sms', aud: [coll === 'businesses' ? `biz:${id}` : `hh:${id}`], to: e.phone || e.ownerPhone, level: 'info', title: 'Rescue team dispatched', body: `iCheck-U: ${e.rescue.teamName} is coming to ${e.shortAddress}. Keep your phone on.`, toast: false });
      st.log('{team} claimed {addr}', 'info', { team: e.rescue.teamName, addr: `${e.name}, ${e.shortAddress}` });
    },
    updateRescue: (coll, id, status) => {
      const now = Date.now();
      set((s) => {
        const e = s[coll].find((x) => x.id === id);
        if (!e?.rescue) return;
        e.rescue.status = status;
        e.rescue.history.push({ status, at: now });
        if ((status === 'reached' || status === 'rescued') && !e.rescue.reachedAt) e.rescue.reachedAt = now;
        if (status === 'rescued') {
          e.rescue.rescuedAt = now;
          const team = s.orgs.find((o) => o.id === e.rescue.orgId)?.teams.find((t) => t.id === e.rescue.teamId);
          if (team) team.assignment = null;
          (coll === 'businesses' ? e.workers : e.members).forEach((m) => { if (m.status === 'needs_help' || m.status === 'pending') m.status = 'safe'; });
        }
      });
      const st = get();
      const e = st[coll].find((x) => x.id === id);
      const L = RESCUE_LABEL[status];
      st.notify({ channel: 'push', aud: [coll === 'businesses' ? `biz:${id}` : `hh:${id}`], to: e.name, level: status === 'rescued' ? 'success' : 'info', title: `Rescue update: ${L}`, body: `${e.rescue.teamName} — ${e.shortAddress}` });
      st.log('{team} → {status}: {addr}', status === 'rescued' ? 'success' : 'info', { team: e.rescue.teamName, status: L, addr: e.shortAddress });
    },
    releaseClaim: (coll, id) => set((s) => {
      const e = s[coll].find((x) => x.id === id);
      if (!e?.rescue) return;
      const team = s.orgs.find((o) => o.id === e.rescue.orgId)?.teams.find((t) => t.id === e.rescue.teamId);
      if (team) team.assignment = null;
      e.rescue = null;
    }),
    updateTeam: (orgId, teamId, patch) => set((s) => {
      const t = s.orgs.find((o) => o.id === orgId)?.teams.find((x) => x.id === teamId);
      if (t) Object.assign(t, patch);
    }),
    addTeam: (orgId, team) => set((s) => {
      const o = s.orgs.find((x) => x.id === orgId);
      o.teams.push({ id: uid('t'), members: [], capability: [], available: true, checkedIn: false, checkedInAt: null, capacity: 4, lat: 3.0365, lng: 101.539, ...team });
    }),
    teamCheck: (orgId, teamId, inOut) => {
      set((s) => {
        const t = s.orgs.find((o) => o.id === orgId)?.teams.find((x) => x.id === teamId);
        if (!t) return;
        t.checkedIn = inOut;
        t.checkedInAt = Date.now();
      });
      const t = get().orgs.find((o) => o.id === orgId)?.teams.find((x) => x.id === teamId);
      get().log(inOut ? '{team} checked in for duty' : '{team} checked out safely', 'info', { team: t.name });
    },
    addOrgTask: (task) => set((s) => { s.orgTasks.unshift({ id: uid('ot'), at: Date.now(), status: 'todo', ...task }); }),
    setOrgTask: (id, status) => set((s) => { const t = s.orgTasks.find((x) => x.id === id); if (t) t.status = status; }),
    updateSafetyPoint: (id, patch) => set((s) => {
      const p = s.safetyPoints.find((x) => x.id === id);
      if (p) Object.assign(p, patch, { updatedAt: Date.now(), updatedBy: identityLabel(s) });
    }),

    // ---------- shop workers ----------
    registerWorker: (bid, w) => {
      const id = uid('w');
      set((s) => {
        const b = s.businesses.find((x) => x.id === bid);
        if (!b) return;
        b.workers.push({ id, status: 'pending', onSite: true, needs: [], medical: null, medicalConsent: false, commute: '', emergencyContact: '', ...w });
        s.identity.businessId = bid;
        s.identity.workerId = id;
        s.registered.worker = id;
      });
      const b = get().businesses.find((x) => x.id === bid);
      get().notify({ channel: 'push', aud: [`biz:${bid}`], to: b?.name, level: 'info', title: 'New worker joined your shop', body: `${w.name} added themselves to your worker list.`, headsUp: false });
      return id;
    },
    workerCheckIn: (status) => {
      const st = get();
      const { businessId, workerId } = st.identity;
      const b = st.businesses.find((x) => x.id === businessId);
      const w = b?.workers.find((x) => x.id === workerId);
      if (!w) return;
      queueOffline(get, set, 'Safety check-in');
      st.setWorker(businessId, workerId, { status, onSite: status === 'off_site' ? false : w.onSite });
      if (status === 'off_site') st.setWorker(businessId, workerId, { status: 'safe', onSite: false });
      const label = status === 'needs_help' ? 'needs help' : 'is safe';
      st.notify({ channel: 'push', aud: [`biz:${businessId}`], to: b.name, level: status === 'needs_help' ? 'critical' : 'info', title: `${w.name} ${label}`, body: 'Worker checked in on their own phone.', headsUp: status === 'needs_help' });
      if (status === 'needs_help') {
        st.notify({ channel: 'push', aud: ['responders', 'admin'], to: 'Responders', level: 'critical', title: `Worker needs help: ${b.name}`, body: `${w.name}, ${b.shortAddress}` });
        st.log('{name} at {biz} needs help', 'critical', { name: w.name, biz: b.name });
      }
    },
    /** Log in: find the account that owns this phone number (demo accounts included). */
    findAccount: (phone) => {
      const d = (x = '') => String(x).replace(/\D/g, '');
      const p = d(phone);
      if (!p) return null;
      const st = get();
      if (p === '0355100999') return { role: 'admin', patch: {} };
      const h = st.households.find((x) => d(x.phone) === p || x.members.some((m) => d(m.phone) === p));
      if (h) return { role: 'household', patch: { householdId: h.id }, name: h.name };
      const b = st.businesses.find((x) => d(x.ownerPhone) === p);
      if (b) return { role: 'business', patch: { businessId: b.id }, name: b.name };
      for (const biz of st.businesses) {
        const w = biz.workers.find((x) => d(x.phone) === p);
        if (w) return { role: 'worker', patch: { businessId: biz.id, workerId: w.id }, name: w.name };
      }
      const o = st.orgs.find((x) => d(x.phone) === p);
      if (o) return { role: 'rescue', patch: { orgId: o.id }, name: o.name };
      return null;
    },
    setCertificate: (orgId, index, patch) => set((s) => {
      const c = s.orgs.find((o) => o.id === orgId)?.certificates?.[index];
      if (c) Object.assign(c, patch);
    }),
    addOrg: (o) => {
      const id = uid('o');
      set((s) => {
        s.orgs.push({ id, status: 'pending', teams: [], documents: [], coverage: [], ...o });
        s.identity.orgId = id;
        s.registered.rescue = id;
      });
      return id;
    },

    // ---------- admin ----------
    setOrgStatus: (id, status, reason = '') => {
      set((s) => { const o = s.orgs.find((x) => x.id === id); if (o) { o.status = status; o.rejectReason = reason; } });
      const o = get().orgs.find((x) => x.id === id);
      get().notify({ channel: 'sms', aud: [`org:${id}`], to: o.name, level: status === 'approved' ? 'success' : 'warning', title: `Organisation ${status}`, body: `iCheck-U: ${o.name} is now ${status}. ${reason}` });
      get().log('Admin set {name} to {status}', 'info', { name: o.name, status });
    },
    fileReport: (r) => set((s) => { s.reports.unshift({ id: uid('rep'), at: Date.now(), status: 'open', by: identityLabel(s), ...r }); }),
    setReport: (id, status) => set((s) => { const r = s.reports.find((x) => x.id === id); if (r) r.status = status; }),
  })),
  {
    // Saved on the device so the app keeps your data with no internet, even after a reload.
    name: 'icheck-u-state',
    version: 2, // bumped when the saved data shape changes; older saved demo data is replaced by the new sample data
    migrate: () => undefined,
    storage: deviceStorage,
    partialize: (s) => {
      const { toasts, now, netOnline, offlineReady, forceOffline, bigAlert, headsUp, call, ...rest } = s;
      return Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== 'function'));
    },
  },
  ),
);

// ---------- offline helpers ----------
let scripting = false; // true while scripted demo replies run (those are other people, never "offline")
export const isOffline = (s) => !s.netOnline || s.forceOffline;

function queueOffline(get, set, label) {
  const s = get();
  if (scripting || !s.role || !isOffline(s)) return;
  set((st) => {
    st.outbox.push({ id: uid("ob"), at: Date.now(), label });
  });
}

function afterConnectivity(wasOffline, get, set) {
  const s = get();
  if (wasOffline && !isOffline(s) && s.outbox.length) {
    const n = s.outbox.length;
    set((st) => { st.outbox = []; });
    get().notify({ channel: "app", aud: ["all"], to: "You", level: "success", title: "Back online — " + n + " saved update" + (n === 1 ? "" : "s") + " sent", body: "Everything you did while offline has now been sent." });
  }
}

// ---------- helpers (operate on immer drafts or via get) ----------
export const NB_LABEL = { ok: 'They are OK', no_answer: 'No answer at the door', needs_help: 'They need help', requested: 'Asked to check' };
export const BIZ_LABEL = { all_safe: 'All staff safe', missing: 'Someone missing', needs_help: 'Need help', closed: 'Closed, nobody inside', no_response: 'No response' };
export const RESCUE_LABEL = { dispatched: 'Dispatched', on_the_way: 'On the way', reached: 'Reached', rescued: 'Rescued', further_help: 'Needs further help' };

function recomputeHousehold(h, s) {
  const ms = h.members.map((m) => m.status);
  let status;
  if (ms.includes('missing')) status = 'missing';
  else if (h.checkin.help || ms.includes('needs_help')) status = 'needs_help';
  else if (ms.length && ms.every((x) => x === 'safe' || x === 'with_me')) status = 'safe';
  else status = h.checkin.status === 'no_response' ? 'no_response' : h.checkin.respondedAt ? 'safe' : 'pending';
  h.checkin.status = status;
  if (['missing', 'needs_help', 'no_response'].includes(status) && !h.flaggedAt) h.flaggedAt = Date.now();
  if (s && status !== 'pending' && !h.checkin.respondedAt) h.checkin.respondedAt = Date.now();
}

function recomputeBusiness(b) {
  if (b.checkin.status === 'closed') return;
  const ws = b.workers.filter((w) => w.onSite || w.status === 'missing').map((w) => w.status);
  if (ws.includes('missing')) b.checkin.status = 'missing';
  else if (b.checkin.help || ws.includes('needs_help')) b.checkin.status = 'needs_help';
  else if (ws.length && ws.every((x) => x === 'safe')) b.checkin.status = 'all_safe';
  if (['missing', 'needs_help'].includes(b.checkin.status) && !b.flaggedAt) b.flaggedAt = Date.now();
}

export function identityKeys(s) {
  const id = s.identity;
  switch (s.role) {
    case 'household': return ['all', 'residents', `hh:${id.householdId}`];
    case 'business': return ['all', `biz:${id.businessId}`];
    case 'worker': return ['all', 'workers', `wrk:${id.workerId}`];
    case 'rescue': return ['all', 'responders', `org:${id.orgId}`];
    case 'admin': return ['all', 'admin'];
    default: return ['all'];
  }
}

export function identityLabel(s) {
  const id = s.identity;
  switch (s.role) {
    case 'household': return s.households.find((h) => h.id === id.householdId)?.name || 'Household';
    case 'business': return s.businesses.find((b) => b.id === id.businessId)?.name || 'Business';
    case 'worker': { const b = s.businesses.find((x) => x.id === id.businessId); return `${b?.workers.find((w) => w.id === id.workerId)?.name || 'Worker'} (${b?.name || 'shop'})`; }
    case 'rescue': return s.orgs.find((o) => o.id === id.orgId)?.name || 'Responder';
    case 'admin': return 'Admin (Taman Seri Harmoni)';
    default: return 'Guest';
  }
}

function runScript(q, get) {
  const st = get();
  if (q.kind === 'hh') {
    const h = st.households.find((x) => x.id === q.id);
    if (!h || h.checkin.status !== 'pending') return;
    if (q.status === 'safe') st.respondHousehold(q.id, 'safe', { via: Math.random() > 0.7 ? 'sms' : 'app' });
    if (q.status === 'needs_help') st.respondHousehold(q.id, 'help', { note: q.note, location: true });
    if (q.status === 'missing') {
      const m = h.members[q.missingMember || 0];
      st.respondHousehold(q.id, 'missing', { note: q.note, memberIds: [m.id], details: { [m.id]: { lastSeen: 'Walking to the car park at the end of Jalan Harmoni 1', clothing: m.clothing } } });
    }
  }
  if (q.kind === 'biz') {
    const b = st.businesses.find((x) => x.id === q.id);
    if (!b || b.checkin.status !== 'pending') return;
    if (q.status === 'missing') {
      const w = b.workers[q.missingWorker || 0];
      st.respondBusiness(q.id, 'missing', { note: q.note, missingWorkerIds: [w.id], details: { [w.id]: { lastSeen: 'Driving a white Proton Saga towards Jalan Bukit Harmoni', clothing: 'Blue workshop overalls' } } });
      b.workers.forEach((x) => { if (x.id !== w.id) st.setWorker(q.id, x.id, { status: 'safe' }); });
    } else st.respondBusiness(q.id, q.status);
  }
  if (q.kind === 'alertResponse') st.respondAlert(q.alertId, q.by, q.type, q.note);
  if (q.kind === 'nbReport') st.neighbourReport(q.coll, q.entityId, q.neighbourId, q.result, q.note);
}

function escalateStep1(coll, id, get) {
  const now = Date.now();
  useStore.setState((s) => {
    const e = s[coll].find((x) => x.id === id);
    e.escalationStep = 1;
    e.escalation.push({ step: 1, at: now, key: 'Re-notified by Push, SMS and WhatsApp' });
  });
  const e = get()[coll].find((x) => x.id === id);
  const aud = [coll === 'businesses' ? `biz:${id}` : `hh:${id}`];
  const st = get();
  st.notify({ channel: 'push', aud, to: e.name, level: 'critical', title: 'Reminder: please check in', body: 'We have not heard from you. Are you safe? Tap to respond.' });
  st.notify({ channel: 'sms', aud, to: e.phone || e.ownerPhone, level: 'critical', title: 'SMS fallback', body: 'iCheck-U: Are you safe? Reply 1 = SAFE, 2 = NEED HELP, 3 = SOMEONE MISSING.', toast: false });
  st.notify({ channel: 'whatsapp', aud, to: e.phone || e.ownerPhone, level: 'critical', title: 'WhatsApp fallback', body: `Salam ${e.name}. Flood alert in your area. Are you safe? Reply SAFE or HELP.`, toast: false });
}

function escalateStep2(coll, id, get) {
  const now = Date.now();
  const st = get();
  const e = st[coll].find((x) => x.id === id);
  const near = nearest(e, st.households, 3, (h) => h.id !== id && h.checkin.status === 'safe');
  const list = near.map((n) => ({ h: n.item, km: n.km, coordinator: false }));
  useStore.setState((s) => {
    const x = s[coll].find((y) => y.id === id);
    x.escalationStep = 2;
    x.neighbourChecks = list.map((n) => ({ neighbourId: n.h.id, name: n.h.members[0].name, address: n.h.shortAddress, km: n.km, coordinator: n.coordinator, result: 'requested', note: '', askedAt: now, at: null }));
    x.escalation.push({ step: 2, at: now, key: 'Asked {n} nearest neighbours to check on them', vars: { n: near.length }, extra: list.map((n) => n.h.members[0].name).join(', ') });
    const sc = NEIGHBOUR_SCRIPTS[id];
    if (sc && list[0]) s.queue.push({ at: now + sc.delay * 1000, kind: 'nbReport', coll, entityId: id, neighbourId: list[0].h.id, result: sc.result, note: sc.note });
  });
  list.forEach((n) =>
    get().notify({ channel: 'push', aud: [`hh:${n.h.id}`], to: n.h.name, level: 'warning', title: `Can you check on ${e.shortAddress}?`, body: `${e.name} has not responded. ${coll === 'households' ? `${e.members.length} people live there.` : ''} Only go if it is safe for you.`, action: '/home' }),
  );
}

function escalateStep3(coll, id, get) {
  const st = get();
  const e = st[coll].find((x) => x.id === id);
  if (e.neighbourChecks.some((c) => c.result === 'ok')) return;
  const now = Date.now();
  useStore.setState((s) => {
    const x = s[coll].find((y) => y.id === id);
    x.escalationStep = 3;
    x.checkin.status = 'no_response';
    if (!x.flaggedAt) x.flaggedAt = now;
    x.escalation.push({ step: 3, at: now, key: 'Escalated to responders as "No response"' });
  });
  st.notify({ channel: 'push', aud: ['responders', 'admin'], to: 'Responders', level: 'warning', title: `No response: ${e.shortAddress}`, body: `${e.name} did not respond after re-notify and neighbour check.` });
}

export default useStore;
