import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap, useMapEvents, Polygon } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { renderToStaticMarkup } from 'react-dom/server';
import { CENTER } from '../utils/geo.js';
import { IS_ARTIFACT } from '../utils/env.js';
import { useStore, isOffline } from '../store/useStore.js';
import { useT } from '../i18n/index.js';

const iconCache = new Map();
function pinIcon({ color, Icon, shape = 'circle', size = 34, selected = false, pulse = false, badge }) {
  const key = `${color}|${Icon?.displayName || Icon?.name}|${shape}|${size}|${selected}|${pulse}|${badge}`;
  if (iconCache.has(key)) return iconCache.get(key);
  const radius = shape === 'square' ? '8px' : shape === 'diamond' ? '6px' : '50%';
  const rotate = shape === 'diamond' ? 'transform:rotate(45deg);' : '';
  const unrotate = shape === 'diamond' ? 'transform:rotate(-45deg);' : '';
  const svg = Icon ? renderToStaticMarkup(<Icon size={size * 0.52} color="#fff" strokeWidth={2.6} aria-hidden="true" />) : '';
  const ring = selected ? `box-shadow:0 0 0 4px #fff,0 0 0 8px ${color};` : 'box-shadow:0 2px 6px rgba(0,0,0,.45);';
  const html = `<div style="position:relative;width:${size}px;height:${size}px">
    ${pulse ? `<span style="position:absolute;inset:-6px;border-radius:50%;background:${color};opacity:.35" class="animate-ring"></span>` : ''}
    <div style="position:absolute;inset:0;background:${color};border:2.5px solid #fff;border-radius:${radius};${rotate}${ring}display:grid;place-items:center">
      <div style="${unrotate}display:grid;place-items:center">${svg}</div>
    </div>
    ${badge ? `<span style="position:absolute;top:-8px;right:-10px;background:#0B1F3A;color:#fff;font:700 11px/1 Inter,system-ui;border-radius:9px;padding:3px 5px;border:1.5px solid #fff">${badge}</span>` : ''}
  </div>`;
  const icon = L.divIcon({ html, className: 'ns-pin', iconSize: [size, size], iconAnchor: [size / 2, size / 2], tooltipAnchor: [size / 2, 0] });
  iconCache.set(key, icon);
  return icon;
}

function ClickHandler({ onClick }) {
  useMapEvents({ click: (e) => onClick?.([e.latlng.lat, e.latlng.lng]) });
  return null;
}

function FitBounds({ points }) {
  const map = useMap();
  const key = JSON.stringify(points);
  useEffect(() => {
    if (points && points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 17 });
    else if (points && points.length === 1) map.setView(points[0], 17);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}

// Mock flood extent for Zone A (low-lying, beside Sungai Harmoni)
export const FLOOD_AREA = [[3.0228, 101.5270], [3.0228, 101.5440], [3.0275, 101.5440], [3.0278, 101.5270]];
export const RIVER = [[3.0226, 101.5240], [3.0232, 101.5300], [3.0229, 101.5360], [3.0234, 101.5420], [3.0230, 101.5480]];

export default function MapView({
  markers = [], lines = [], height = 420, center = CENTER, zoom = 16, onMapClick, fit, showFlood = false, label = 'Map',
}) {
  const offline = useStore(isOffline);
  const t = useT();
  const ms = useMemo(() => markers.filter((m) => m.lat && m.lng), [markers]);
  return (
    <div style={{ height }} className="relative w-full rounded-2xl overflow-hidden border border-line" role="region" aria-label={label}>
      {(offline || IS_ARTIFACT) && (
        <p className="absolute z-[500] left-2 right-2 bottom-8 sm:right-auto rounded-xl bg-[#1f2937]/90 text-white text-xs font-semibold px-3 py-2 pointer-events-none">
          {IS_ARTIFACT ? t('Simple map: pins, routes and blocked roads. Street map shows in the installed app.') : t('Offline map: showing areas you opened before. Pins, routes and blocked roads still work.')}
        </p>
      )}
      <MapContainer center={center} zoom={zoom} scrollWheelZoom style={{ height: '100%', width: '100%', background: IS_ARTIFACT ? 'repeating-linear-gradient(0deg, rgb(var(--c-canvas)), rgb(var(--c-canvas)) 39px, rgb(var(--c-line)) 40px), rgb(var(--c-canvas))' : undefined }} keyboard>
        {!IS_ARTIFACT && <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />}
        <Polyline positions={RIVER} pathOptions={{ color: '#1565C0', weight: 10, opacity: 0.45 }}>
          <Tooltip sticky>Sungai Harmoni</Tooltip>
        </Polyline>
        {showFlood && (
          <Polygon positions={FLOOD_AREA} pathOptions={{ color: '#1565C0', fillColor: '#1565C0', fillOpacity: 0.18, weight: 1, dashArray: '4 6' }}>
            <Tooltip sticky>Flooded area (mock)</Tooltip>
          </Polygon>
        )}
        {lines.map((l, i) => (
          <Polyline key={l.id || i} positions={l.positions} pathOptions={{ color: l.color, weight: l.weight || 6, dashArray: l.dashed ? '8 8' : undefined, opacity: l.opacity ?? 0.9 }}>
            {l.label && <Tooltip sticky>{l.label}</Tooltip>}
          </Polyline>
        ))}
        {ms.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={pinIcon({ color: m.color, Icon: m.icon, shape: m.shape, size: m.size, selected: m.selected, pulse: m.pulse, badge: m.badge })}
            eventHandlers={m.onClick ? { click: () => m.onClick(m) } : undefined} keyboard title={m.label} alt={m.label} zIndexOffset={m.selected ? 1000 : m.z || 0}>
            <Tooltip direction="top" offset={[0, -6]}>{m.label}</Tooltip>
          </Marker>
        ))}
        {onMapClick && <ClickHandler onClick={onMapClick} />}
        {fit && <FitBounds points={fit} />}
      </MapContainer>
    </div>
  );
}
