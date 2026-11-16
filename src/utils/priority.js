// Transparent rescue-priority scoring. Every point added comes with a human-readable reason.
import { distanceBetween } from './geo.js';

export const RULES = [
  { id: 'help', label: 'Needs help (SOS or reported)', points: 100 },
  { id: 'missingChild', label: 'Missing child (under 13)', points: 130 },
  { id: 'missingAdult', label: 'Missing adult', points: 70 },
  { id: 'bizMissing', label: 'Business with unaccounted-for worker', points: 90 },
  { id: 'noResponse', label: 'No response after escalation', points: 60 },
  { id: 'escalating', label: 'No reply yet (escalation running)', points: 15 },
  { id: 'infant', label: 'Each infant (under 2)', points: 18 },
  { id: 'child', label: 'Each young child (2–12)', points: 12 },
  { id: 'elderly', label: 'Each elderly member (65+)', points: 12 },
  { id: 'bedridden', label: 'Each bedridden member', points: 25 },
  { id: 'disabled', label: 'Each disabled member', points: 18 },
  { id: 'lifeSupport', label: 'Each oxygen or dialysis dependent member', points: 30 },
  { id: 'mobility', label: 'Each mobility-aid user', points: 6 },
  { id: 'pregnant', label: 'Each pregnant member', points: 10 },
  { id: 'safe', label: 'Reported safe — vulnerability ignored', points: 0 },
  { id: 'manual', label: 'Manual adjustment by responder (per step)', points: 25 },
];
const P = Object.fromEntries(RULES.map((r) => [r.id, r.points]));

/** Normalised status used for colour + icon: safe | needs_help | missing | no_response | pending | rescued */
export function displayStatus(entity) {
  if (!entity) return 'pending';
  const s = entity.checkin?.status;
  if (entity.rescue?.status === 'rescued' && s !== 'missing') return 'rescued';
  if (s === 'all_safe' || s === 'closed' || s === 'safe') return 'safe';
  if (s === 'needs_help' || s === 'missing' || s === 'no_response') return s;
  return 'pending';
}

function needCounts(people) {
  const c = { infant: 0, child: 0, elderly: 0, bedridden: 0, disabled: 0, lifeSupport: 0, mobility: 0, pregnant: 0 };
  people.forEach((m) => {
    const n = m.needs || [];
    if (n.includes('infant')) c.infant += 1;
    if (n.includes('child')) c.child += 1;
    if (n.includes('elderly')) c.elderly += 1;
    if (n.includes('bedridden')) c.bedridden += 1;
    if (n.includes('disabled')) c.disabled += 1;
    if (n.includes('oxygen') || n.includes('dialysis')) c.lifeSupport += 1;
    if (n.includes('mobility')) c.mobility += 1;
    if (n.includes('pregnant')) c.pregnant += 1;
  });
  return c;
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Returns { score, reasons: string[] (English, translate per word group), level } */
export function scoreEntity(entity, kind) {
  const status = displayStatus(entity);
  const reasons = [];
  let score = 0;
  const people = kind === 'business' ? entity.workers.filter((w) => w.onSite) : entity.members;

  if (status === 'rescued') return { score: -10, reasons: ['Rescued'], level: 'done', status };

  if (kind === 'business') {
    const missingW = entity.workers.filter((w) => w.status === 'missing').length;
    if (entity.checkin?.status === 'needs_help') { score += P.help; reasons.push('Needs help'); }
    if (missingW) { score += P.bizMissing; reasons.push(`${plural(missingW, 'worker', 'workers')} unaccounted for`); }
  } else {
    if (entity.checkin?.help || entity.checkin?.status === 'needs_help') { score += P.help; reasons.push(entity.checkin?.sos ? 'SOS sent' : 'Needs help'); }
    const missing = entity.members.filter((m) => m.status === 'missing');
    const mc = missing.filter((m) => m.age < 13).length;
    const ma = missing.length - mc;
    if (mc) { score += P.missingChild * mc; reasons.push(`Missing child (${missing.filter((m) => m.age < 13).map((m) => `${Math.floor(m.age)}y`).join(', ')})`); }
    if (ma) { score += P.missingAdult * ma; reasons.push(`${plural(ma, 'missing adult', 'missing adults')}`); }
  }

  if (entity.checkin?.status === 'no_response') { score += P.noResponse; reasons.push('No response after escalation'); }
  else if (status === 'pending' && entity.checkin?.notifiedAt) { score += P.escalating; reasons.push('No reply yet'); }

  if (status === 'safe') {
    return { score: 1 + (entity.priorityAdjust || 0) * P.manual, reasons: ['Reported safe'], level: 'low', status };
  }

  const c = needCounts(people);
  if (c.infant) { score += c.infant * P.infant; reasons.push(plural(c.infant, 'infant', 'infants')); }
  if (c.child) { score += c.child * P.child; reasons.push(plural(c.child, 'child', 'children')); }
  if (c.lifeSupport) {
    score += c.lifeSupport * P.lifeSupport;
    const who = people.filter((m) => m.needs.includes('oxygen') || m.needs.includes('dialysis'));
    who.forEach((m) => reasons.push(`${m.needs.includes('oxygen') ? 'oxygen-dependent' : 'dialysis-dependent'}${m.age >= 65 ? ' elder' : ''}`));
  }
  if (c.bedridden) { score += c.bedridden * P.bedridden; reasons.push(plural(c.bedridden, 'bedridden member', 'bedridden members')); }
  if (c.disabled) { score += c.disabled * P.disabled; reasons.push(plural(c.disabled, 'disabled member', 'disabled members')); }
  const plainElderly = people.filter((m) => m.needs.includes('elderly') && !m.needs.includes('oxygen') && !m.needs.includes('dialysis')).length;
  if (c.elderly) { score += c.elderly * P.elderly; if (plainElderly) reasons.push(plural(plainElderly, 'elderly', 'elderly')); }
  if (c.mobility) { score += c.mobility * P.mobility; reasons.push(plural(c.mobility, 'mobility-aid user', 'mobility-aid users')); }
  if (c.pregnant) { score += c.pregnant * P.pregnant; reasons.push(plural(c.pregnant, 'pregnant member', 'pregnant members')); }
  if (kind === 'business') reasons.push(`${people.length} on site`);

  if (entity.priorityAdjust) {
    score += entity.priorityAdjust * P.manual;
    reasons.push(`Manual ${entity.priorityAdjust > 0 ? '+' : ''}${entity.priorityAdjust * P.manual}`);
  }
  const level = score >= 100 ? 'critical' : score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';
  return { score, reasons, level, status };
}

const NEEDS_BOAT_ZONES = ['A'];

/** Suggests teams for a household/business by capability, distance and availability. */
export function suggestTeams(entity, kind, teams, event, busyTeamIds = new Set()) {
  const people = kind === 'business' ? entity.workers : entity.members;
  const needsMedical = people.some((m) => (m.needs || []).some((n) => ['oxygen', 'dialysis', 'bedridden', 'infant'].includes(n))) || entity.checkin?.help;
  const needsBoat = event?.type === 'flood' && NEEDS_BOAT_ZONES.includes(entity.zone);
  const needsLifting = people.some((m) => (m.needs || []).some((n) => ['bedridden', 'disabled', 'mobility'].includes(n)));
  return teams
    .map((t) => {
      const km = distanceBetween(entity, t);
      let fit = 0;
      const why = [];
      if (needsBoat && t.capability.includes('boat')) { fit += 40; why.push('boat for flooded zone'); }
      if (needsMedical && t.capability.includes('medical')) { fit += 35; why.push('medical need'); }
      if (needsLifting && (t.capability.includes('lifting') || t.capability.includes('rescue'))) { fit += 15; why.push('lifting / carrying'); }
      if (!needsBoat && t.capability.includes('vehicle')) { fit += 10; why.push('road access'); }
      if (!t.available || busyTeamIds.has(t.id)) fit -= 50;
      return { team: t, km, fit: fit - km * 10, why, busy: busyTeamIds.has(t.id) || !t.available };
    })
    .sort((a, b) => b.fit - a.fit);
}
