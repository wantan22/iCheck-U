// Geometry helpers and the simulated hazard-aware router.

export const CENTER = [3.0295, 101.5365];

export function haversineKm(a, b) {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const pt = (e) => [e.lat, e.lng];
export const distanceBetween = (a, b) => haversineKm(pt(a), pt(b));

function ccw(a, b, c) {
  return (c[0] - a[0]) * (b[1] - a[1]) > (b[0] - a[0]) * (c[1] - a[1]);
}
export function segmentsIntersect(p1, p2, q1, q2) {
  return ccw(p1, q1, q2) !== ccw(p2, q1, q2) && ccw(p1, p2, q1) !== ccw(p1, p2, q2);
}

function firstBlock(a, b, roads, skip) {
  for (const r of roads) {
    if (!r.active || skip.has(r.id)) continue;
    for (let i = 0; i < r.path.length - 1; i += 1) {
      if (segmentsIntersect(a, b, r.path[i], r.path[i + 1])) return r;
    }
  }
  return null;
}

/**
 * Simulated hazard-aware routing. Draws a straight-line route and, when it crosses an active
 * blocked road, detours around the nearer end of that road. Road distance is approximated as
 * 1.35 × the straight-line distance.
 */
export function planRoute(from, to, roads = []) {
  const path = [from];
  const detours = [];
  const used = new Set();
  let cur = from;
  for (let guard = 0; guard < 4; guard += 1) {
    const block = firstBlock(cur, to, roads, used);
    if (!block) break;
    used.add(block.id);
    detours.push(block);
    const ends = [block.path[0], block.path[block.path.length - 1]];
    const others = [block.path[1] || ends[1], block.path[block.path.length - 2] || ends[0]];
    let best = null;
    ends.forEach((end, i) => {
      const other = others[i];
      const dx = end[0] - other[0];
      const dy = end[1] - other[1];
      const len = Math.hypot(dx, dy) || 1;
      const wp = [end[0] + (dx / len) * 0.0007, end[1] + (dy / len) * 0.0007];
      const cost = haversineKm(cur, wp) + haversineKm(wp, to);
      if (!best || cost < best.cost) best = { wp, cost };
    });
    path.push(best.wp);
    cur = best.wp;
  }
  path.push(to);
  let straight = 0;
  for (let i = 0; i < path.length - 1; i += 1) straight += haversineKm(path[i], path[i + 1]);
  return { path, distanceKm: straight * 1.35, detours };
}

const SPEED = { walk: 4.2, vehicle: 18 }; // km/h, slowed for flood conditions
export function travelMinutes(km, mode = 'walk') {
  return Math.max(1, Math.round((km / (SPEED[mode] || SPEED.walk)) * 60));
}

export function nearest(origin, list, n = 3, filter = () => true) {
  return list
    .filter((x) => x !== origin && filter(x))
    .map((x) => ({ item: x, km: distanceBetween(origin, x) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, n);
}

export const googleMapsUrl = (p, mode = 'walk') =>
  `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=${mode === 'walk' ? 'walking' : 'driving'}`;
export const wazeUrl = (p) => `https://waze.com/ul?ll=${p.lat},${p.lng}&navigate=yes`;

export const fmtKm = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);
