// ── CITY CATALOG ────────────────────────────────────────────────────
// 31 cities covering all major UTC offsets.
// Each entry: { label, tz (IANA), lat, lon } — lat/lon used for NOAA sunrise/sunset.
const CITY_CATALOG = [
  { label: 'Baker Island',  tz: 'Etc/GMT+12',                        lat:   0.19, lon: -176.48 },
  { label: 'Pago Pago',     tz: 'Pacific/Pago_Pago',                 lat: -14.28, lon: -170.70 },
  { label: 'Honolulu',      tz: 'Pacific/Honolulu',                  lat:  21.31, lon: -157.86 },
  { label: 'Anchorage',     tz: 'America/Anchorage',                 lat:  61.22, lon: -149.90 },
  { label: 'Los Angeles',   tz: 'America/Los_Angeles',               lat:  34.05, lon: -118.24 },
  { label: 'Denver',        tz: 'America/Denver',                    lat:  39.74, lon: -104.98 },
  { label: 'Chicago',       tz: 'America/Chicago',                   lat:  41.88, lon:  -87.63 },
  { label: 'NYC',           tz: 'America/New_York',                  lat:  40.71, lon:  -74.01 },
  { label: 'Halifax',       tz: 'America/Halifax',                   lat:  44.65, lon:  -63.57 },
  { label: 'São Paulo',     tz: 'America/Sao_Paulo',                 lat: -23.55, lon:  -46.63 },
  { label: 'Buenos Aires',  tz: 'America/Argentina/Buenos_Aires',    lat: -34.60, lon:  -58.38 },
  { label: 'Reykjavik',     tz: 'Atlantic/Reykjavik',                lat:  64.13, lon:  -21.90 },
  { label: 'London',        tz: 'Europe/London',                     lat:  51.51, lon:   -0.13 },
  { label: 'Paris',         tz: 'Europe/Paris',                      lat:  48.86, lon:    2.35 },
  { label: 'Berlin',        tz: 'Europe/Berlin',                     lat:  52.52, lon:   13.41 },
  { label: 'Cairo',         tz: 'Africa/Cairo',                      lat:  30.04, lon:   31.24 },
  { label: 'Istanbul',      tz: 'Europe/Istanbul',                   lat:  41.01, lon:   28.98 },
  { label: 'Moscow',        tz: 'Europe/Moscow',                     lat:  55.76, lon:   37.62 },
  { label: 'Dubai',         tz: 'Asia/Dubai',                        lat:  25.20, lon:   55.27 },
  { label: 'Karachi',       tz: 'Asia/Karachi',                      lat:  24.86, lon:   67.01 },
  { label: 'Mumbai',        tz: 'Asia/Kolkata',                      lat:  19.08, lon:   72.88 },
  { label: 'Kathmandu',     tz: 'Asia/Kathmandu',                    lat:  27.72, lon:   85.32 },
  { label: 'Dhaka',         tz: 'Asia/Dhaka',                        lat:  23.81, lon:   90.41 },
  { label: 'Bangkok',       tz: 'Asia/Bangkok',                      lat:  13.76, lon:  100.50 },
  { label: 'Singapore',     tz: 'Asia/Singapore',                    lat:   1.35, lon:  103.82 },
  { label: 'Beijing',       tz: 'Asia/Shanghai',                     lat:  39.90, lon:  116.41 },
  { label: 'Hong Kong',     tz: 'Asia/Hong_Kong',                    lat:  22.32, lon:  114.17 },
  { label: 'Tokyo',         tz: 'Asia/Tokyo',                        lat:  35.68, lon:  139.69 },
  { label: 'Seoul',         tz: 'Asia/Seoul',                        lat:  37.57, lon:  126.98 },
  { label: 'Sydney',        tz: 'Australia/Sydney',                  lat: -33.87, lon:  151.21 },
  { label: 'Auckland',      tz: 'Pacific/Auckland',                  lat: -36.85, lon:  174.76 },
];

// Maximally distinct palette: red, blue, green, gold, purple, orange.
const HAND_COLORS = [
  '#e94560', '#4e9af1', '#2ecc71', '#e9b44c', '#9b59b6', '#e67e22',
];
const MAX_ZONES = HAND_COLORS.length;

// ── STATE ───────────────────────────────────────────────────────────
let zones = [
  { label: 'NYC',    tz: 'America/New_York',    color: HAND_COLORS[0] },
  { label: 'London', tz: 'Europe/London',       color: HAND_COLORS[1] },
  { label: 'Tokyo',  tz: 'Asia/Tokyo',          color: HAND_COLORS[2] },
  { label: 'Sydney', tz: 'Australia/Sydney',     color: HAND_COLORS[3] },
];

const canvas = document.getElementById('clock');
const ctx = canvas.getContext('2d');
const SMALL_BREAKPOINT = 300;
const XSMALL_BREAKPOINT = 220;
const DEBUG_FRAME_TARGET_IDS = ['controls', 'clock', 'zone-bar'];
const ClockUtils = window.ClockUtils || {};
const deriveViewportFlags = ClockUtils.deriveViewportFlags || ((size, smallBp, xsmallBp) => {
  const isXSmall = size < xsmallBp;
  const isSmall = size < smallBp;
  return { isSmall, isXSmall, tier: isXSmall ? 'xsmall' : (isSmall ? 'small' : 'medium') };
});
const is24hNumeralVisible = ClockUtils.is24hNumeralVisible || ((hour, small, xsmall) => {
  if (xsmall) return hour % 4 === 0;
  if (small) return hour % 2 === 0;
  return true;
});
const is12hNumeralVisible = ClockUtils.is12hNumeralVisible || ((hour, xsmall) => {
  if (!xsmall) return true;
  return hour % 3 === 0;
});
const get24hNumeralStyle = ClockUtils.get24hNumeralStyle || ((radius, small, xsmall) => ({
  fontSize: xsmall ? radius * 0.16 : (small ? radius * 0.14 : radius * 0.09),
  numeralRadius: xsmall ? radius * 0.84 : (small ? radius * 0.88 : radius * 0.76)
}));
const get12hNumeralStyle = ClockUtils.get12hNumeralStyle || ((radius, small, xsmall) => ({
  fontSize: xsmall ? radius * 0.2 : (small ? radius * 0.18 : radius * 0.14),
  numeralRadius: xsmall ? radius * 0.82 : (small ? radius * 0.85 : radius * 0.72)
}));
const getBezelLabelLayout = ClockUtils.getBezelLabelLayout || ((radius, handLength, small, xsmall) => ({
  fontSize: xsmall ? 10 : (small ? 12 : 13),
  bezelRadius: xsmall ? (radius + 12) : Math.min(radius * 0.62, handLength + (small ? 14 : 18))
}));
let isSmall = false;
let isXSmall = false;
let viewportTier = 'medium';
let lastSrUpdate = -1;
let selectedDebugTargetId = '';
let lastFrameTs = 0;

function isLightMode() {
  return window.matchMedia('(prefers-color-scheme: light)').matches;
}
function is24h() {
  return document.getElementById('use24h').checked;
}

function syncCityControlState() {
  const bezelToggle = document.getElementById('showBezelLabels');
  const cityToggle = document.getElementById('showOuterCity');
  const cityLabel = document.getElementById('showOuterCityLabel');
  if (!bezelToggle || !cityToggle || !cityLabel) return;
  const bezelEnabled = bezelToggle.checked;
  cityToggle.disabled = !bezelEnabled;
  cityLabel.classList.toggle('control-disabled', !bezelEnabled);
}

function isDebugOn() {
  const el = document.getElementById('showDebug');
  return !!el && el.checked;
}

function isDebugFramesOn() {
  const el = document.getElementById('showDebugFrames');
  return isDebugOn() && !!el && el.checked;
}

function syncDebugFrameSelection() {
  for (const id of DEBUG_FRAME_TARGET_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    const selected = isDebugFramesOn() && id === selectedDebugTargetId;
    el.classList.toggle('debug-frame-selected', selected);
  }
}

function setDebugFrameSelection(id) {
  selectedDebugTargetId = id || '';
  syncDebugFrameSelection();
}

function syncDebugControlState() {
  const debugToggle = document.getElementById('showDebug');
  const framesToggle = document.getElementById('showDebugFrames');
  const framesLabel = document.getElementById('showDebugFramesLabel');
  if (!debugToggle || !framesToggle || !framesLabel) return;

  const debugEnabled = debugToggle.checked;
  if (!debugEnabled) {
    framesToggle.checked = false;
    selectedDebugTargetId = '';
  }
  framesToggle.disabled = !debugEnabled;
  framesLabel.classList.toggle('control-disabled', !debugEnabled);

  document.body.classList.toggle('debug-on', debugEnabled);
  document.body.classList.toggle('debug-frames-on', debugEnabled && framesToggle.checked);
  syncDebugFrameSelection();
}

function setupDebugFrameTargets() {
  for (const id of DEBUG_FRAME_TARGET_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.addEventListener('click', (event) => {
      if (!isDebugFramesOn()) return;
      if (id === 'controls' && event.target.closest('input,button,select,label')) return;
      event.stopPropagation();
      setDebugFrameSelection(id);
    });
  }

  document.addEventListener('click', (event) => {
    if (!isDebugFramesOn()) return;
    const inTarget = event.target.closest('#controls,#clock,#zone-bar');
    if (!inTarget) {
      setDebugFrameSelection('');
    }
  });
}

function updateDebugOverlay(size, r, dedupedCount, frameMs) {
  const main = document.getElementById('debug-main');
  const selected = document.getElementById('debug-selected');
  if (!main || !selected || !isDebugOn()) return;

  const dpr = window.devicePixelRatio || 1;
  const fps = frameMs > 0 ? (1000 / frameMs) : 0;
  const bezelOn = document.getElementById('showBezelLabels')?.checked;
  const cityOn = document.getElementById('showOuterCity')?.checked;
  const secOn = document.getElementById('showSeconds')?.checked;
  const use24 = document.getElementById('use24h')?.checked;

  main.textContent = [
    `viewport: ${window.innerWidth} x ${window.innerHeight}`,
    `canvas: ${Math.round(size)}px (r=${Math.round(r)})`,
    `dpr: ${dpr.toFixed(2)}  tier: ${viewportTier}`,
    `zones: active=${zones.length} deduped=${dedupedCount}`,
    `toggles: bezel=${bezelOn} city=${cityOn} sec=${secOn} 24h=${use24}`,
    `frame: ${frameMs.toFixed(1)}ms (${fps.toFixed(1)} fps)`
  ].join('\n');

  if (!selectedDebugTargetId) {
    selected.textContent = 'selected: none\n(click a dashed frame)';
    return;
  }

  const el = document.getElementById(selectedDebugTargetId);
  if (!el) {
    selected.textContent = 'selected: none';
    return;
  }

  const rect = el.getBoundingClientRect();
  selected.textContent = [
    `selected: #${selectedDebugTargetId}`,
    `x=${Math.round(rect.left)} y=${Math.round(rect.top)}`,
    `w=${Math.round(rect.width)} h=${Math.round(rect.height)}`
  ].join('\n');
}

// ── SIZING ──────────────────────────────────────────────────────────
function resize() {
  const dpr = window.devicePixelRatio || 1;
  const rawSize = Math.min(window.innerWidth - 32, window.innerHeight - 220, 600);
  const size = Math.max(rawSize, 120);
  const flags = deriveViewportFlags(size, SMALL_BREAKPOINT, XSMALL_BREAKPOINT);
  isXSmall = flags.isXSmall;
  isSmall = flags.isSmall;
  viewportTier = flags.tier;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();
document.getElementById('showBezelLabels').addEventListener('change', syncCityControlState);
document.getElementById('showDebug').addEventListener('change', syncDebugControlState);
document.getElementById('showDebugFrames').addEventListener('change', syncDebugControlState);
syncCityControlState();
syncDebugControlState();
setupDebugFrameTargets();

// ── HELPERS ─────────────────────────────────────────────────────────

/** Return { h (0-11), m, s, h24 (0-23) } for the given IANA timezone. */
function getTimeInTZ(tz) {
  const now = new Date();
  const str = now.toLocaleString('en-US', {
    timeZone: tz,
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false
  });
  const [h, m, s] = str.split(':').map(Number);
  return { h: h % 12, m, s, h24: h };
}

// Fallback abbreviations for zones where browsers may return GMT+N
const TZ_ABBREV_FALLBACK = {
  'Etc/GMT+12': 'AoE', 'Pacific/Pago_Pago': 'SST', 'Pacific/Honolulu': 'HST',
  'America/Anchorage': 'AKST', 'America/Los_Angeles': 'PST', 'America/Denver': 'MST',
  'America/Chicago': 'CST', 'America/New_York': 'EST', 'America/Halifax': 'AST',
  'America/Sao_Paulo': 'BRT', 'America/Argentina/Buenos_Aires': 'ART',
  'Atlantic/Reykjavik': 'GMT', 'Europe/London': 'GMT', 'Europe/Paris': 'CET',
  'Europe/Berlin': 'CET', 'Africa/Cairo': 'EET', 'Europe/Istanbul': 'TRT',
  'Europe/Moscow': 'MSK', 'Asia/Dubai': 'GST', 'Asia/Karachi': 'PKT',
  'Asia/Kolkata': 'IST', 'Asia/Kathmandu': 'NPT', 'Asia/Dhaka': 'BDT',
  'Asia/Bangkok': 'ICT', 'Asia/Singapore': 'SGT', 'Asia/Shanghai': 'CST',
  'Asia/Hong_Kong': 'HKT', 'Asia/Tokyo': 'JST', 'Asia/Seoul': 'KST',
  'Australia/Sydney': 'AEST', 'Pacific/Auckland': 'NZST',
};

/** Short timezone abbreviation (e.g. "EST"). Uses Intl API, falls back to TZ_ABBREV_FALLBACK. */
function getTzAbbrev(tz) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(new Date());
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    const val = tzPart ? tzPart.value : '';
    // If browser returned a proper abbreviation (no offset), use it
    if (val && !/[+-]\d/.test(val)) return val;
    // Otherwise use fallback map or last segment of IANA name
    return TZ_ABBREV_FALLBACK[tz] || tz.split('/').pop().replace(/_/g, ' ');
  } catch {
    return TZ_ABBREV_FALLBACK[tz] || tz.split('/').pop().replace(/_/g, ' ');
  }
}

// ── NOAA SUNRISE/SUNSET ─────────────────────────────────────────────

/**
 * Simplified NOAA solar algorithm.
 * @returns {{ sunrise: number, sunset: number } | { polarDay: true } | { polarNight: true }}
 *          sunrise/sunset are hours in UTC (may be negative or >24).
 */
function getSunTimes(lat, lon) {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  const D2R = Math.PI / 180;
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1 + (now.getUTCHours() - 12) / 24);

  // Equation of time (minutes)
  const eqTime = 229.18 * (
    0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma)
  );

  // Solar declination (radians)
  const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);

  const zenith = 90.833 * D2R;
  const latRad = lat * D2R;
  const cosHA = (Math.cos(zenith) / (Math.cos(latRad) * Math.cos(decl)))
    - Math.tan(latRad) * Math.tan(decl);

  if (cosHA > 1) return { polarNight: true };
  if (cosHA < -1) return { polarDay: true };

  const ha = Math.acos(cosHA) * (180 / Math.PI);
  return {
    sunrise: (720 - 4 * (lon + ha) - eqTime) / 60,  // hours UTC
    sunset:  (720 - 4 * (lon - ha) - eqTime) / 60,
  };
}

/** True if the given timezone is currently in daylight (uses NOAA, falls back to 6-18h). */
function isDaytime(tz) {
  const city = CITY_CATALOG.find(c => c.tz === tz);
  if (!city || city.lat == null) {
    const t = getTimeInTZ(tz);
    return t.h24 >= 6 && t.h24 < 18;
  }
  const sun = getSunTimes(city.lat, city.lon);
  if (sun.polarDay) return true;
  if (sun.polarNight) return false;

  const now = new Date();
  const utcH = now.getUTCHours() + now.getUTCMinutes() / 60;
  let sr = ((sun.sunrise % 24) + 24) % 24;
  let ss = ((sun.sunset  % 24) + 24) % 24;
  return sr < ss ? (utcH >= sr && utcH < ss) : (utcH >= sr || utcH < ss);
}

/** Merge zones sharing the same 12h hour into one entry with combined labels. */
function dedupeZones(list) {
  const map = new Map();
  for (const z of list) {
    const t = getTimeInTZ(z.tz);
    const key = t.h;
    if (map.has(key)) {
      const existing = map.get(key);
      if (!existing.label.includes(z.label)) {
        existing.label += ' / ' + z.label;
      }
    } else {
      map.set(key, { ...z, label: z.label, _time: t });
    }
  }
  return Array.from(map.values());
}

/** Sort zone entries by 24h time ascending (used for zone bar and screen reader). */
function sortByTime(deduped) {
  return [...deduped].sort((a, b) => {
    const ta = a._time || getTimeInTZ(a.tz);
    const tb = b._time || getTimeInTZ(b.tz);
    return (ta.h24 * 60 + ta.m) - (tb.h24 * 60 + tb.m);
  });
}

// ── ZONE BAR ────────────────────────────────────────────────────────

/** Full DOM rebuild of zone chips + add-zone select. Called on zone add/remove. */
function renderZoneBar() {
  const bar = document.getElementById('zone-bar');
  const sorted = sortByTime(zones.map(z => ({ ...z, _time: getTimeInTZ(z.tz) })));

  let html = sorted.map(z => {
    const idx = zones.findIndex(orig => orig.tz === z.tz);
    const t = z._time || getTimeInTZ(z.tz);
    const timeStr = `${String(t.h24).padStart(2,'0')}:${String(t.m).padStart(2,'0')}`;
    const day = isDaytime(z.tz);
    const dayClass = day ? 'zone-day' : 'zone-night';
    return `<span class="zone-item ${dayClass}" role="listitem" data-tz="${z.tz}" style="--zone-color:${z.color}">
      <span class="zone-swatch" style="background:${z.color}" aria-hidden="true"></span>
      <span>${z.label}</span>
      <span class="zone-time">${timeStr}</span>
      <button class="zone-remove" onclick="removeZone(${idx})" aria-label="Remove ${z.label}">&times;</button>
    </span>`;
  }).join('');

  if (zones.length < MAX_ZONES) {
    const usedTzs = new Set(zones.map(z => z.tz));
    const opts = CITY_CATALOG
      .filter(c => !usedTzs.has(c.tz))
      .map(c => `<option value="${c.tz}">${c.label}</option>`)
      .join('');
    html += `<select id="addTzSelect" aria-label="Add a time zone">
      <option value="">+ Add…</option>${opts}
    </select>`;
  }
  bar.innerHTML = html;

  const sel = document.getElementById('addTzSelect');
  if (sel) sel.addEventListener('change', () => { if (sel.value) addZone(sel.value); });
}

/** Lightweight per-frame update — only patches time text in existing chips. */
function updateZoneBarTimes() {
  const items = document.querySelectorAll('.zone-item[data-tz]');
  for (const item of items) {
    const tz = item.dataset.tz;
    const day = isDaytime(tz);
    item.classList.toggle('zone-day', day);
    item.classList.toggle('zone-night', !day);
    const t = getTimeInTZ(tz);
    const timeStr = `${String(t.h24).padStart(2,'0')}:${String(t.m).padStart(2,'0')}`;
    const timeEl = item.querySelector('.zone-time');
    if (timeEl && timeEl.textContent !== timeStr) {
      timeEl.textContent = timeStr;
    }
  }
}

function addZone(tz) {
  if (zones.length >= MAX_ZONES) return;
  const city = CITY_CATALOG.find(c => c.tz === tz);
  if (!city) return;
  const usedColors = new Set(zones.map(z => z.color));
  const color = HAND_COLORS.find(c => !usedColors.has(c)) || HAND_COLORS[zones.length % HAND_COLORS.length];
  zones.push({ label: city.label, tz: city.tz, color });
  renderZoneBar();
}

function removeZone(index) {
  zones.splice(index, 1);
  renderZoneBar();
}
window.removeZone = removeZone;

renderZoneBar();

// ── CLOCK FACE RENDERING ────────────────────────────────────────────

/** Draw day/night shaded face (24h mode). Bottom half = day, top = night. */
function drawDayNightFace(cx, cy, r) {
  const light = isLightMode();
  const dayColor   = light ? '#f5e6c8' : '#2e3a1e';
  const dayCenter  = light ? '#fdf0d5' : '#3d4a28';
  const nightColor = light ? '#d0cfc8' : '#0d1321';
  const midColor   = light ? '#e8d8b8' : '#1a2418';

  // Night base
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = nightColor;
  ctx.fill();

  // Day semicircle (bottom half — noon/12 is at 6 o'clock on 24h face)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx + r, cy);
  ctx.arc(cx, cy, r, 0, Math.PI);
  ctx.closePath();
  ctx.clip();
  const dayGrad = ctx.createRadialGradient(cx, cy + r * 0.3, 0, cx, cy + r * 0.3, r * 1.1);
  dayGrad.addColorStop(0, dayCenter);
  dayGrad.addColorStop(0.6, dayColor);
  dayGrad.addColorStop(1, midColor);
  ctx.fillStyle = dayGrad;
  ctx.fillRect(cx - r, cy, r * 2, r);
  ctx.restore();

  // Horizon blend (at 6am/6pm line — the horizontal center)
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const horizGrad = ctx.createLinearGradient(cx, cy - 16, cx, cy + 16);
  horizGrad.addColorStop(0, nightColor);
  horizGrad.addColorStop(0.5, light ? '#ddd0b0' : '#151d18');
  horizGrad.addColorStop(1, midColor);
  ctx.fillStyle = horizGrad;
  ctx.fillRect(cx - r, cy - 16, r * 2, 32);
  ctx.restore();
}

/** Draw plain solid-color face (12h mode). */
function drawPlainFace(cx, cy, r) {
  const light = isLightMode();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = light ? '#ebe8e0' : '#16213e';
  ctx.fill();
}

/**
 * Draw complete clock face: background, ring, ticks, numerals, center dot.
 * Delegates to drawDayNightFace or drawPlainFace based on 24h toggle.
 */
function drawFace(cx, cy, r) {
  const use24 = is24h();
  const light = isLightMode();

  // Background: day/night for 24h, plain for 12h
  if (use24) {
    drawDayNightFace(cx, cy, r);
  } else {
    drawPlainFace(cx, cy, r);
  }

  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = light ? '#b0b0b8' : '#0f3460';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Tick marks — none on small viewports
  if (!isSmall) {
    for (let i = 0; i < 60; i++) {
      const isHour = i % 5 === 0;
      const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const inner = r * (isHour ? 0.82 : 0.88);
      const outer = r * 0.92;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      ctx.strokeStyle = isHour
        ? (light ? '#333' : '#eee')
        : (light ? '#999' : '#555');
      ctx.lineWidth = isHour ? 2.5 : 1;
      ctx.stroke();
    }
  }

  // Numerals
  if (use24) {
    // 24h: progressively reduce density on smaller tiers.
    const numeralStyle = get24hNumeralStyle(r, isSmall, isXSmall);
    const fontSize = numeralStyle.fontSize;
    const numR = numeralStyle.numeralRadius;
    ctx.fillStyle = light ? '#222' : '#ddd';
    ctx.font = `bold ${fontSize}px "Segoe UI", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let n = 1; n <= 24; n++) {
      if (!is24hNumeralVisible(n, isSmall, isXSmall)) continue;
      const angle = (n / 24) * Math.PI * 2 - Math.PI / 2;
      ctx.fillText(n.toString(), cx + Math.cos(angle) * numR, cy + Math.sin(angle) * numR);
    }
  } else {
    // 12h: xsmall shows quarter markers to keep numerals legible.
    const numeralStyle = get12hNumeralStyle(r, isSmall, isXSmall);
    const fontSize = numeralStyle.fontSize;
    const numR = numeralStyle.numeralRadius;
    ctx.fillStyle = light ? '#222' : '#ddd';
    ctx.font = `bold ${fontSize}px "Segoe UI", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let n = 1; n <= 12; n++) {
      if (!is12hNumeralVisible(n, isXSmall)) continue;
      const angle = (n / 12) * Math.PI * 2 - Math.PI / 2;
      ctx.fillText(n.toString(), cx + Math.cos(angle) * numR, cy + Math.sin(angle) * numR);
    }
  }

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, isSmall ? 3 : 5, 0, Math.PI * 2);
  ctx.fillStyle = light ? '#333' : '#eee';
  ctx.fill();
}

/**
 * Draw a single timezone hour hand with optional bezel label.
 */
function drawHand(cx, cy, r, angle, length, width, color, label, tz, showBezelLabel) {
  const tipX = cx + Math.cos(angle) * length;
  const tipY = cy + Math.sin(angle) * length;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(tipX, tipY);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();

  // Bezel label: one shared chip component (TZ or City text) with TZ-local day/night styling.
  if (label && showBezelLabel) {
    const light = isLightMode();
    const day = isDaytime(tz);
    const showCityInBezel = document.getElementById('showOuterCity').checked;
    const tzAbbrev = getTzAbbrev(tz);
    const bezelText = showCityInBezel ? label : tzAbbrev;
    const bezelLayout = getBezelLabelLayout(r, length, isSmall, isXSmall);
    const fs = bezelLayout.fontSize;
    const bezelR = bezelLayout.bezelRadius;
    const bx = cx + Math.cos(angle) * bezelR;
    const by = cy + Math.sin(angle) * bezelR;
    const needsFlip = angle > 0 && angle < Math.PI;

    const bezelBg = day
      ? (light ? 'rgba(255,246,216,0.96)' : 'rgba(247,229,180,0.94)')
      : (light ? 'rgba(28,41,74,0.95)' : 'rgba(12,24,46,0.94)');
    const bezelTextColor = day ? '#1f1700' : '#f3f7ff';

    ctx.save();
    ctx.translate(bx, by);
    if (needsFlip) {
      ctx.rotate(angle + Math.PI / 2 + Math.PI);
    } else {
      ctx.rotate(angle + Math.PI / 2);
    }

    ctx.font = `bold ${fs}px "Segoe UI", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const tw = ctx.measureText(bezelText).width + 10;
    const th = fs + 7;
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.roundRect(-tw / 2, -th / 2, tw, th, 4);
    ctx.fillStyle = bezelBg;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = bezelTextColor;
    ctx.fillText(bezelText, 0, 0);
    ctx.restore();
  }
}
/** Draw shared UTC minute + second hands (second hand hidden on small viewports). */
function drawMinuteSecondHands(cx, cy, r) {
  const now = new Date();
  const m = now.getUTCMinutes();
  const s = now.getUTCSeconds();
  const ms = now.getUTCMilliseconds();
  const light = isLightMode();

  // Minute hand — always visible
  const mAngle = ((m + s / 60) / 60) * Math.PI * 2 - Math.PI / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(mAngle) * r * 0.7, cy + Math.sin(mAngle) * r * 0.7);
  ctx.strokeStyle = light ? '#444' : '#bbb';
  ctx.lineWidth = isSmall ? 2 : 3;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Second hand — hide on small viewports
  if (!isSmall && document.getElementById('showSeconds').checked) {
    const useSmooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sVal = useSmooth ? (s + ms / 1000) : s;
    const sAngle = (sVal / 60) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sAngle) * r * 0.75, cy + Math.sin(sAngle) * r * 0.75);
    ctx.strokeStyle = light ? '#c0392b' : '#e94560';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = light ? '#c0392b' : '#e94560';
  ctx.fill();
}

// ── SCREEN READER ───────────────────────────────────────────────────
function updateScreenReader(deduped) {
  const now = new Date();
  const minute = now.getUTCMinutes();
  if (minute === lastSrUpdate) return;
  lastSrUpdate = minute;
  const el = document.getElementById('sr-times');
  const sorted = sortByTime(deduped);
  const lines = sorted.map(z => {
    const t = getTimeInTZ(z.tz);
    return `${z.label}: ${t.h24}:${String(t.m).padStart(2,'0')}`;
  });
  el.textContent = 'Current times \u2014 ' + lines.join(', ');
}

// ── MAIN LOOP ───────────────────────────────────────────────────────
function draw() {
  const frameNow = performance.now();
  const frameMs = lastFrameTs > 0 ? (frameNow - lastFrameTs) : 0;
  lastFrameTs = frameNow;

  const size = parseFloat(canvas.style.width);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 20;

  ctx.clearRect(0, 0, size, size);
  drawFace(cx, cy, r);

  const showBezelLabels = document.getElementById('showBezelLabels').checked;
  const deduped = dedupeZones(zones);
  const handWidth = isSmall ? 3.5 : 5;
  const use24 = is24h();
  const divisor = use24 ? 24 : 12;

  for (const z of deduped) {
    const t = z._time || getTimeInTZ(z.tz);
    const hVal = use24 ? (t.h24 + t.m / 60) : (t.h + t.m / 60);
    const hourAngle = (hVal / divisor) * Math.PI * 2 - Math.PI / 2;
    drawHand(cx, cy, r, hourAngle, r * 0.468, handWidth, z.color, z.label, z.tz, showBezelLabels);
  }

  drawMinuteSecondHands(cx, cy, r);
  updateZoneBarTimes();
  updateScreenReader(deduped);
  updateDebugOverlay(size, r, deduped.length, frameMs);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setTimeout(() => requestAnimationFrame(draw), 1000);
  } else {
    requestAnimationFrame(draw);
  }
}

draw();
