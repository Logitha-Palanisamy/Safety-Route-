// ═══════════════════════════════════════════════════════════════
//  FemRoute — app.js  (Main App Logic)
//  Handles: Map, ORS Routing, AI Scoring, Nearby, Rides, UI
// ═══════════════════════════════════════════════════════════════

'use strict';

// ── CONFIG ─────────────────────────────────────────────────────
let ORS_KEY = localStorage.getItem('ors_key') || '';
const ORS_BASE = 'https://api.openrouteservice.org';

// ── STATE ───────────────────────────────────────────────────────
let map, currentMode = 'women';
let drawnLayers = [], routeData = null;
let userLat = null, userLng = null;
let nearbyCat = 'police';
let currentDest = { lat: null, lng: null, text: '' };
let mapMobileVisible = false;

// ── CRIME HOTSPOTS (simulated — replace with SafeCity API) ──────
const HOTSPOTS = [
  { lat: 13.092, lng: 80.275, r: 0.8, risk: 0.75 },
  { lat: 13.072, lng: 80.268, r: 0.6, risk: 0.60 },
  { lat: 13.052, lng: 80.255, r: 1.0, risk: 0.45 },
  { lat: 13.035, lng: 80.232, r: 0.5, risk: 0.55 },
  { lat: 13.080, lng: 80.260, r: 0.7, risk: 0.65 },
];

// ── NEARBY DATA (simulated — replace with Google Places / ORS POI) ─
const NEARBY_DATA = {
  police: [
    { name: 'Egmore Police Station', dist: '0.4 km', status: '24h', icon: '👮', lat: 13.083, lng: 80.272 },
    { name: 'Park Town Police Station', dist: '0.9 km', status: '24h', icon: '👮', lat: 13.079, lng: 80.268 },
    { name: 'Vepery Police Station', dist: '1.2 km', status: '24h', icon: '👮', lat: 13.088, lng: 80.265 },
  ],
  hospital: [
    { name: 'Govt. General Hospital', dist: '0.7 km', status: '24h', icon: '🏥', lat: 13.080, lng: 80.274 },
    { name: 'Apollo Hospital', dist: '1.4 km', status: 'Open', icon: '🏥', lat: 13.069, lng: 80.259 },
    { name: 'MIOT International', dist: '2.1 km', status: 'Open', icon: '🏥', lat: 13.055, lng: 80.248 },
  ],
  ngo: [
    { name: 'Snehi Women Centre', dist: '0.6 km', status: 'Open', icon: '🤝', lat: 13.085, lng: 80.270 },
    { name: 'HELP Foundation', dist: '1.1 km', status: 'Open', icon: '🤝', lat: 13.074, lng: 80.261 },
    { name: 'Nirbhaya Centre', dist: '1.8 km', status: 'Open', icon: '🤝', lat: 13.060, lng: 80.252 },
  ],
  bus: [
    { name: 'Chennai Central Bus Stop', dist: '0.1 km', status: 'Open', icon: '🚌', lat: 13.082, lng: 80.276 },
    { name: 'Egmore Bus Terminus', dist: '0.5 km', status: 'Open', icon: '🚌', lat: 13.078, lng: 80.271 },
    { name: 'Park Town Bus Stop', dist: '0.8 km', status: 'Open', icon: '🚌', lat: 13.076, lng: 80.267 },
  ],
  auto: [
    { name: 'Central Station Auto Stand', dist: '0.1 km', status: 'Open', icon: '🛺', lat: 13.082, lng: 80.274 },
    { name: 'Egmore Auto Stand', dist: '0.4 km', status: 'Open', icon: '🛺', lat: 13.079, lng: 80.270 },
    { name: 'EVR Road Auto Stand', dist: '0.9 km', status: 'Open', icon: '🛺', lat: 13.084, lng: 80.264 },
  ],
  pharmacy: [
    { name: 'MedPlus Pharmacy', dist: '0.3 km', status: 'Open', icon: '💊', lat: 13.081, lng: 80.273 },
    { name: 'Apollo Pharmacy', dist: '0.7 km', status: '24h', icon: '💊', lat: 13.076, lng: 80.269 },
    { name: 'NetMeds Store', dist: '1.0 km', status: 'Open', icon: '💊', lat: 13.070, lng: 80.262 },
  ],
};

// ── SPLASH ──────────────────────────────────────────────────────
setTimeout(() => {
  document.getElementById('splash').classList.add('hide');
  setTimeout(() => document.getElementById('splash').remove(), 600);
}, 2400);

// ── CLOCK ────────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2,'0');
  const m = String(now.getMinutes()).padStart(2,'0');
  const ampm = now.getHours() >= 12 ? 'pm' : 'am';
  document.getElementById('live-time').textContent = `${h}:${m} ${ampm}`;
}
setInterval(updateClock, 1000);
updateClock();

// ── MAP INIT ──────────────────────────────────────────────────────
function initMap() {
  map = L.map('map', { center: [13.065, 80.255], zoom: 13, zoomControl: false });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '©OpenStreetMap ©CartoDB', maxZoom: 19
  }).addTo(map);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
}

// ── ORS KEY ──────────────────────────────────────────────────────
function saveKey() {
  const val = document.getElementById('ors-key').value.trim();
  if (!val) return;
  ORS_KEY = val;
  localStorage.setItem('ors_key', val);
  setKeyBadge(true);
}

function setKeyBadge(ok) {
  const b = document.getElementById('ors-badge');
  b.textContent = ok ? '✓ ACTIVE' : 'NOT SET';
  b.className = 'ors-badge' + (ok ? ' ok' : '');
}

// Pre-fill
window.addEventListener('DOMContentLoaded', () => {
  if (ORS_KEY) {
    document.getElementById('ors-key').value = ORS_KEY;
    setKeyBadge(true);
  }
  initMap();
  // auto-analyse on load for demo
  setTimeout(analyseRoutes, 2600);
});

// ── MODE ─────────────────────────────────────────────────────────
function setMode(btn) {
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentMode = btn.dataset.mode;
}

// ── SWAP & LOCATE ─────────────────────────────────────────────────
function swapLocations() {
  const o = document.getElementById('origin');
  const d = document.getElementById('destination');
  [o.value, d.value] = [d.value, o.value];
}

function fillMyLocation(field) {
  if (!userLat) { getUserLocation(field); return; }
  document.getElementById(field).value = `${userLat.toFixed(5)}, ${userLng.toFixed(5)}`;
}

function getUserLocation(field) {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(pos => {
    userLat = pos.coords.latitude;
    userLng = pos.coords.longitude;
    if (field) {
      document.getElementById(field).value = `${userLat.toFixed(5)}, ${userLng.toFixed(5)}`;
    }
    map.setView([userLat, userLng], 14);
    const icon = L.divIcon({
      html: `<div style="width:14px;height:14px;background:#06b6d4;border-radius:50%;border:3px solid white;box-shadow:0 0 12px rgba(6,182,212,0.7)"></div>`,
      className: '', iconSize: [14,14], iconAnchor: [7,7]
    });
    L.marker([userLat, userLng], { icon }).addTo(map).bindPopup('📍 You are here');
  });
}

// ── HAVERSINE ─────────────────────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── AI RISK SCORING ──────────────────────────────────────────────
function segmentRisk(lat, lng) {
  let base = 0.15;
  const h = new Date().getHours();
  let tMult = h >= 22 || h < 5 ? (currentMode==='night' ? 1.6 : 2.2) : h >= 18 ? 1.2 : 1.0;
  for (const s of HOTSPOTS) {
    const d = haversine(lat, lng, s.lat, s.lng);
    if (d < s.r) base += s.risk * (1 - d/s.r);
  }
  if (currentMode==='women')   base *= 1.15;
  if (currentMode==='walking') base *= 1.30;
  if (currentMode==='night')   base *= 1.50;
  return Math.min(base * tMult, 1.0);
}

function riskLevel(r) { return r < 0.3 ? 'low' : r < 0.6 ? 'medium' : 'high'; }
function safetyPct(avgRisk) { return Math.round((1 - avgRisk) * 100); }

// ── ORS GEOCODE ───────────────────────────────────────────────────
async function geocode(text) {
  if (!ORS_KEY) return null;
  try {
    const r = await fetch(`${ORS_BASE}/geocode/search?api_key=${ORS_KEY}&text=${encodeURIComponent(text)}&boundary.country=IN&size=1`);
    const d = await r.json();
    if (d.features?.length) {
      const [lng, lat] = d.features[0].geometry.coordinates;
      return { lat, lng, label: d.features[0].properties.label };
    }
    return null;
  } catch { return null; }
}

// ── ORS ROUTE ─────────────────────────────────────────────────────
async function getRoute(oLat, oLng, dLat, dLng, profile='driving-car') {
  if (!ORS_KEY) return null;
  try {
    const url = `${ORS_BASE}/v2/directions/${profile}?api_key=${ORS_KEY}&start=${oLng},${oLat}&end=${dLng},${dLat}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const d = await r.json();
    const feat = d.features[0];
    const coords = feat.geometry.coordinates.map(([lng,lat]) => ({ lat, lng }));
    const s = feat.properties.summary;
    return { coords, dist: (s.distance/1000).toFixed(1)+' km', time: fmtDur(s.duration) };
  } catch { return null; }
}

function fmtDur(sec) {
  const m = Math.round(sec/60);
  return m < 60 ? `${m} min` : `${Math.floor(m/60)}h ${m%60}m`;
}

function orsProfile() {
  return currentMode === 'walking' ? 'foot-walking' : 'driving-car';
}

// ── SIMULATED FALLBACK ────────────────────────────────────────────
function simRoutes() {
  return [
    { name:'Route A — Anna Salai', coords:[[13.082,80.275],[13.078,80.272],[13.072,80.268],[13.065,80.260],[13.058,80.252],[13.050,80.245],[13.044,80.238],[13.040,80.233]].map(([lat,lng])=>({lat,lng})), dist:'7.4 km', time:'28 min' },
    { name:'Route B — EVR Salai',  coords:[[13.082,80.275],[13.085,80.270],[13.088,80.260],[13.083,80.248],[13.072,80.240],[13.058,80.238],[13.048,80.236],[13.040,80.233]].map(([lat,lng])=>({lat,lng})), dist:'8.1 km', time:'32 min' },
    { name:'Route C — Back Roads', coords:[[13.082,80.275],[13.076,80.268],[13.068,80.262],[13.060,80.256],[13.055,80.248],[13.050,80.238],[13.045,80.235],[13.040,80.233]].map(([lat,lng])=>({lat,lng})), dist:'9.0 km', time:'35 min' },
  ];
}

// ── SCORE A ROUTE ─────────────────────────────────────────────────
function scoreRoute(name, coords, dist, time) {
  const step = Math.max(1, Math.floor(coords.length / 9));
  const segs = coords.filter((_,i) => i%step===0 || i===coords.length-1).map(({lat,lng}) => {
    const risk = segmentRisk(lat, lng);
    return { lat, lng, risk, level: riskLevel(risk) };
  });
  const avgRisk = segs.reduce((s,sg) => s+sg.risk, 0) / segs.length;
  const safety = safetyPct(avgRisk);
  return { name, coords, segs, avgRisk, safety, dist, time };
}

function offsetCoords(coords, delta) {
  return coords.map((c,i) => ({ lat: c.lat + delta*Math.sin(i*0.5), lng: c.lng + delta*Math.cos(i*0.3) }));
}

function addMin(t, m) { const v = parseInt(t)+m; return v<60 ? `${v} min` : `${Math.floor(v/60)}h ${v%60}m`; }

// ── MAIN ANALYSE ─────────────────────────────────────────────────
async function analyseRoutes() {
  const originTxt = document.getElementById('origin').value.trim();
  const destTxt   = document.getElementById('destination').value.trim();
  if (!originTxt || !destTxt) return;

  // Loader
  const loader = document.getElementById('loader');
  loader.classList.add('show');
  const steps = ['Geocoding locations…','Fetching real routes…','Analysing crime data…','Scoring segments…','Computing safety index…','Ranking routes…'];
  let si = 0;
  const si_ = setInterval(() => { document.getElementById('loader-step').textContent = steps[si++ % steps.length]; }, 650);

  let routes = [];
  let usedORS = false;

  try {
    if (ORS_KEY) {
      const [oCoord, dCoord] = await Promise.all([geocode(originTxt), geocode(destTxt)]);
      if (oCoord && dCoord) {
        currentDest = { lat: dCoord.lat, lng: dCoord.lng, text: destTxt };
        const [driveRoute, walkRoute] = await Promise.all([
          getRoute(oCoord.lat, oCoord.lng, dCoord.lat, dCoord.lng, 'driving-car'),
          getRoute(oCoord.lat, oCoord.lng, dCoord.lat, dCoord.lng, 'foot-walking'),
        ]);
        if (driveRoute) {
          usedORS = true;
          routes.push(scoreRoute('Route A — ORS Direct', driveRoute.coords, driveRoute.dist, driveRoute.time));
          routes.push(scoreRoute('Route B — Alt Corridor', offsetCoords(driveRoute.coords, 0.003), driveRoute.dist, addMin(driveRoute.time, 5)));
          if (walkRoute) routes.push(scoreRoute('Route C — Walking', walkRoute.coords, walkRoute.dist, walkRoute.time));
          else routes.push(scoreRoute('Route C — Back Roads', offsetCoords(driveRoute.coords, -0.002), driveRoute.dist, addMin(driveRoute.time, 8)));

          // Update route info card
          document.getElementById('route-info-card').style.display = 'block';
          document.getElementById('ric-dist').textContent = driveRoute.dist;
          document.getElementById('ric-time').textContent = driveRoute.time;
        }
      }
    }
    if (!usedORS) {
      currentDest = { lat: 13.040, lng: 80.233, text: destTxt };
      await new Promise(r => setTimeout(r, 1500));
      routes = simRoutes().map(r => scoreRoute(r.name, r.coords, r.dist, r.time));
    }
  } catch (e) {
    console.error(e);
    routes = simRoutes().map(r => scoreRoute(r.name, r.coords, r.dist, r.time));
  }

  clearInterval(si_);
  loader.classList.remove('show');

  routes.sort((a,b) => b.safety - a.safety);
  routeData = routes;

  // Update safety in info card
  const top = routes[0];
  document.getElementById('ric-safety').textContent = `${top.safety}% Safe`;
  document.getElementById('ric-safety').style.color = safetyColor(top.safety);
  document.getElementById('map-legend').style.display = 'flex';

  renderResults(routes);
  drawMap(routes, 0);
}

// ── RENDER RESULTS ────────────────────────────────────────────────
function renderResults(routes) {
  const el = document.getElementById('results');
  el.innerHTML = '';

  // Summary
  const sum = document.createElement('div');
  sum.className = 'summary-card';
  sum.innerHTML = `
    <div class="card-title">✦ AI Recommendation — ${currentMode} mode</div>
    <div style="font-size:0.78rem;color:var(--text-dim);line-height:1.55">${routes.length} routes · ${routes[0].segs.length * routes.length} micro-segments analysed</div>
    <div class="summary-row">
      ${routes.map((r,i) => `<div class="sum-chip"><span style="color:${safetyColor(r.safety)}">${r.safety}%</span><b>${r.name.split('—')[0].trim()}</b>${i===0?'<span class="best-badge">Safest</span>':''}</div>`).join('')}
    </div>`;
  el.appendChild(sum);

  // Route cards
  const rcWrap = document.createElement('div');
  rcWrap.className = 'card';
  rcWrap.innerHTML = '<div class="card-title">⊙ Route Analysis</div>';
  routes.forEach((r,i) => {
    const sc = r.safety;
    const cat = sc >= 70 ? 'safe' : sc >= 50 ? 'warn' : 'danger';
    const card = document.createElement('div');
    card.className = 'route-card';
    card.id = `rc-${i}`;
    card.onclick = () => selectRoute(i);
    const strip = r.segs.map(s => `<div class="seg-chunk ${s.level}"></div>`).join('');
    card.innerHTML = `
      <div class="rc-header">
        <div class="rc-name">${['🛡️','⚡','🗺️'][i]||'🔵'} ${r.name}</div>
        <span class="rc-badge badge-${cat}">${sc}% Safe</span>
      </div>
      <div class="rc-body">
        <div class="rc-arc">
          <svg width="50" height="50" viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="21" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="4"/>
            <circle cx="25" cy="25" r="21" fill="none" stroke="${safetyColor(sc)}" stroke-width="4"
              stroke-dasharray="${2*Math.PI*21}" stroke-dashoffset="${2*Math.PI*21*(1-sc/100)}" stroke-linecap="round"/>
          </svg>
          <div class="arc-num" style="color:${safetyColor(sc)}">${sc}%</div>
        </div>
        <div class="rc-meta">
          <span>⏱ ${r.time}</span>
          <span>📍 ${r.dist}</span>
          <span>📊 ${r.segs.length} segments</span>
        </div>
      </div>
      <div class="seg-strip">${strip}</div>`;
    rcWrap.appendChild(card);
  });
  el.appendChild(rcWrap);

  // Risk breakdown
  renderRisk(routes[0], el);
  renderWarnings(routes[0], el);

  // Book ride button
  const rideBtn = document.createElement('button');
  rideBtn.className = 'analyse-btn';
  rideBtn.style.cssText = 'background:linear-gradient(135deg,#f59e0b,#ef4444);box-shadow:0 4px 20px rgba(245,158,11,0.25)';
  rideBtn.innerHTML = '🚗 Book Safe Ride to Destination';
  rideBtn.onclick = showRide;
  el.appendChild(rideBtn);
}

function renderRisk(route, parent) {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = '<div class="card-title">⚑ Micro-Segment Risk</div>';
  const panel = document.createElement('div');
  panel.className = 'risk-panel';
  panel.innerHTML = `<div class="risk-panel-hdr">🔍 Segment analysis — ${route.name.split('—')[0].trim()}</div>`;
  route.segs.forEach((seg,i) => {
    const pct = Math.round(seg.risk*100);
    const row = document.createElement('div');
    row.className = 'risk-row';
    row.innerHTML = `<div class="risk-seg">SEG-${String(i+1).padStart(2,'0')}</div><div class="risk-bar-bg"><div class="risk-bar-fill ${seg.level}" style="width:${pct}%"></div></div><div class="risk-lbl lbl-${seg.level}">${seg.level==='low'?'Safe':seg.level==='medium'?'Mod.':'Risk'}</div>`;
    panel.appendChild(row);
  });
  card.appendChild(panel);
  parent.appendChild(card);
}

function renderWarnings(route, parent) {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = '<div class="card-title">⚠ Live Warnings</div>';
  const h = new Date().getHours();
  const warns = [];
  const hs = route.segs.filter(s=>s.level==='high'), ms = route.segs.filter(s=>s.level==='medium');
  if (hs.length) warns.push({icon:'🔴',level:'high',text:`High-risk area detected — ${hs.length} segment(s). Consider safer alternative.`});
  if (ms.length) warns.push({icon:'🟡',level:'medium',text:`${ms.length} moderate-risk segment(s). Stay on main roads.`});
  if (h>=20||h<6) warns.push({icon:'🌙',level:'high',text:'Night travel alert: Risk is elevated. Prefer busy, well-lit roads.'});
  if (currentMode==='women') warns.push({icon:'♀',level:'medium',text:'Women Safety Mode active — route avoids isolated corridors.'});
  if (route.safety>=75) warns.push({icon:'✅',level:'low',text:'AI-verified safe route. Proceed with confidence.'});
  warns.forEach((w,i) => {
    const item = document.createElement('div');
    item.className = `warn-item ${w.level}`;
    item.style.animationDelay = (i*0.12)+'s';
    item.innerHTML = `<span class="warn-icon">${w.icon}</span><span>${w.text}</span>`;
    card.appendChild(item);
  });
  parent.appendChild(card);
}

// ── SELECT ROUTE ──────────────────────────────────────────────────
function selectRoute(idx) {
  document.querySelectorAll('.route-card').forEach((c,i) => c.classList.toggle('selected', i===idx));
  if (routeData) drawMap(routeData, idx);
}

// ── MAP DRAW ──────────────────────────────────────────────────────
function drawMap(routes, selIdx) {
  drawnLayers.forEach(l => map.removeLayer(l));
  drawnLayers = [];
  let allPts = [];

  routes.forEach((route, ri) => {
    const sel = ri === selIdx;
    const coords = route.coords;
    if (coords.length < 2) return;

    if (sel) {
      const step = Math.max(1, Math.floor(coords.length / route.segs.length));
      for (let si = 0; si < route.segs.length-1; si++) {
        const a = coords[Math.min(si*step, coords.length-1)];
        const b = coords[Math.min((si+1)*step, coords.length-1)];
        const line = L.polyline([[a.lat,a.lng],[b.lat,b.lng]], {
          color: segColour(route.segs[si].level), weight: 7, opacity: 0.92, lineCap: 'round'
        }).addTo(map);
        drawnLayers.push(line);
      }
      route.segs.forEach((seg,i) => {
        if (seg.level !== 'low') {
          const c = L.circleMarker([seg.lat,seg.lng], {
            radius: 8, color: segColour(seg.level), fillColor: segColour(seg.level), fillOpacity: 0.22, weight: 2
          }).addTo(map);
          c.bindPopup(`<b style="color:${segColour(seg.level)}">${seg.level.toUpperCase()} RISK</b><br>Seg ${i+1} · Risk ${Math.round(seg.risk*100)}%`);
          drawnLayers.push(c);
        }
      });
    } else {
      const line = L.polyline(coords.map(c=>[c.lat,c.lng]), { color:'rgba(255,255,255,0.1)', weight:2.5, opacity:0.3 }).addTo(map);
      drawnLayers.push(line);
    }
    coords.forEach(c => allPts.push([c.lat,c.lng]));
  });

  // Markers
  const sel = routes[selIdx];
  const O = sel.coords[0], D = sel.coords[sel.coords.length-1];
  [[O,'#e8357a','rgba(232,53,122,0.6)','📍 Origin'],[D,'#10d98a','rgba(16,217,138,0.6)','🏁 Destination']].forEach(([pos,col,glow,lbl]) => {
    const icon = L.divIcon({ html:`<div style="width:14px;height:14px;background:${col};border-radius:50%;border:3px solid white;box-shadow:0 0 14px ${glow}"></div>`, className:'', iconSize:[14,14], iconAnchor:[7,7] });
    const m = L.marker([pos.lat,pos.lng],{icon}).addTo(map);
    m.bindPopup(`<b>${lbl}</b>`);
    drawnLayers.push(m);
  });

  if (allPts.length) map.fitBounds(allPts, { padding: [50,50] });
}

// ── NEARBY ────────────────────────────────────────────────────────
function showNearby() {
  loadNearbyList(nearbyCat);
  document.getElementById('nearby-overlay').classList.add('show');
}
function closeNearby() { document.getElementById('nearby-overlay').classList.remove('show'); }
function setNearbycat(btn, cat) {
  document.querySelectorAll('.ncat').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  nearbyCat = cat;
  loadNearbyList(cat);
}

function loadNearbyList(cat) {
  const items = NEARBY_DATA[cat] || [];
  const list = document.getElementById('nearby-list');
  list.innerHTML = '';
  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'nearby-item';
    el.innerHTML = `
      <div class="nearby-item-icon">${item.icon}</div>
      <div class="nearby-item-info">
        <div class="nearby-item-name">${item.name}</div>
        <div class="nearby-item-dist">${item.dist} away</div>
      </div>
      <span class="nearby-item-status ${item.status==='24h'?'status-24h':'status-open'}">${item.status}</span>
      <button class="nearby-dir-btn" onclick="navigateTo(${item.lat},${item.lng},'${item.name}')">→</button>
    `;
    list.appendChild(el);
  });
}

function navigateTo(lat, lng, name) {
  closeNearby();
  // Pan map to location
  map.setView([lat, lng], 16);
  const icon = L.divIcon({
    html:`<div style="background:#06b6d4;border-radius:50%;width:14px;height:14px;border:3px solid white;box-shadow:0 0 12px rgba(6,182,212,0.7)"></div>`,
    className:'', iconSize:[14,14], iconAnchor:[7,7]
  });
  const m = L.marker([lat,lng],{icon}).addTo(map);
  m.bindPopup(`<b>${name}</b>`).openPopup();
  drawnLayers.push(m);
  // Also open Google Maps for directions
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
  window.open(url, '_blank');
}

// ── RIDE ─────────────────────────────────────────────────────────
function showRide() {
  const destText = document.getElementById('destination').value.trim() || 'your destination';
  document.getElementById('ride-dest-info').textContent = `🏁 Destination: ${destText}`;
  document.getElementById('ride-overlay').classList.add('show');
}
function closeRide() { document.getElementById('ride-overlay').classList.remove('show'); }

function openRideApp(app) {
  const dest = currentDest;
  const destText = encodeURIComponent(document.getElementById('destination').value.trim());
  const lat = dest.lat || 13.040, lng = dest.lng || 80.233;
  const urls = {
    ola:    `https://book.olacabs.com/?drop_lat=${lat}&drop_lng=${lng}&drop_name=${destText}`,
    uber:   `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}&dropoff[nickname]=${destText}`,
    rapido: `https://app.rapido.bike/`,
    gmaps:  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
  };
  window.open(urls[app] || urls.gmaps, '_blank');
}

// ── SOS ──────────────────────────────────────────────────────────
function triggerSOS() {
  document.getElementById('sos-overlay').classList.add('show');
}
function closeSOS() {
  document.getElementById('sos-overlay').classList.remove('show');
}

// ── MOBILE MAP TOGGLE ─────────────────────────────────────────────
function toggleMapMobile() {
  mapMobileVisible = !mapMobileVisible;
  const mapWrap = document.querySelector('.map-wrap');
  const controlPanel = document.getElementById('control-panel');
  const toggleBtn = document.getElementById('map-toggle');
  mapWrap.classList.toggle('mobile-show', mapMobileVisible);
  controlPanel.classList.toggle('map-active', mapMobileVisible);
  toggleBtn.textContent = mapMobileVisible ? '📋 Controls' : '🗺️ Map';
  if (mapMobileVisible) setTimeout(() => map.invalidateSize(), 100);
}

// ── HELPERS ───────────────────────────────────────────────────────
function segColour(level) { return level==='low'?'#10d98a':level==='medium'?'#f59e0b':'#ef4444'; }
function safetyColor(sc) { return sc>=70?'#10d98a':sc>=50?'#f59e0b':'#ef4444'; }
