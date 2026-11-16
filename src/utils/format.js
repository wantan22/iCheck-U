export function elapsed(ms) {
  if (ms == null || ms < 0) return '0s';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m) return `${m}m ${String(sec).padStart(2, '0')}s`;
  return `${sec}s`;
}

export function clock(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

export function shortDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function daysSince(d, now = Date.now()) {
  if (!d) return Infinity;
  return Math.floor((now - new Date(d).getTime()) / 86400000);
}

export const ageLabel = (age) => (age < 1 ? `${Math.round(age * 12)} mo` : `${Math.floor(age)}`);

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter((w) => w && !['bin', 'binti', 'a/l', 'a/p'].includes(w.toLowerCase()))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

export const cx = (...c) => c.filter(Boolean).join(' ');

export const fmtKmSafe = (km) => (km == null ? '' : km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);
