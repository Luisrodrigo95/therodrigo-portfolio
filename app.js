// Initialize environment variables at the absolute entry point
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');

const siteData = require('./data/profile');

const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// HTTP Basic Authentication para la Suite de Inspección Técnica (Usuario: Admin, Contraseña: Marcelia2026)
function requireInspectionAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Industrial Plant Inspection Suite - Access Restricted"');
        return res.status(401).send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="utf-8">
                <title>Acceso Restringido</title>
                <style>
                    body { background: #0b1120; color: #f8fafc; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
                    .box { background: #111827; border: 1px solid #334155; padding: 2rem; border-radius: 1rem; max-width: 420px; }
                    h2 { color: #f59e0b; margin-top: 0; }
                    p { color: #94a3b8; font-size: 0.9rem; line-height: 1.5; }
                    a { color: #38bdf8; text-decoration: none; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="box">
                    <h2>🔒 Acceso Restringido</h2>
                    <p>Se requieren credenciales autorizadas (Admin) para acceder al Sistema de Inspección Técnica, Punch List y Ejecución de OTs.</p>
                    <p><a href="/">← Volver al Portafolio</a></p>
                </div>
            </body>
            </html>
        `);
    }

    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Basic') {
        const credentials = Buffer.from(parts[1], 'base64').toString('utf8').split(':');
        const user = credentials[0];
        const pass = credentials.slice(1).join(':');

        if (user === 'Admin' && pass === 'Marcelia2026') {
            return next();
        }
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="Industrial Plant Inspection Suite - Access Restricted"');
    return res.status(401).send('Credenciales incorrectas. Acceso denegado.');
}

// Proteger todas las variantes de rutas para la suite de inspección técnica
app.use('/technical-inspection', requireInspectionAuth);
app.use('/TechnicalInspection', requireInspectionAuth);
app.use('/hornos', requireInspectionAuth);
app.use('/horno7', requireInspectionAuth);

app.use(express.static(path.join(__dirname, 'public')));

// Rutas directas para Wiwi Shop (tienda artesanal)
app.get(['/Wiwishop', '/wiwishop', '/wiwi-shop', '/WiwiShop'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Wiwishop', 'index.html'));
});


app.get('/', (req, res) => {
    res.render('index', siteData);
});

// Rutas directas para la suite de inspección técnica
app.get('/technical-inspection', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'technical-inspection', 'index.html'));
});

app.get('/TechnicalInspection', (req, res) => {
    res.redirect(301, '/technical-inspection');
});

app.get('/hornos', (req, res) => {
    res.redirect(301, '/technical-inspection');
});

// Redirigir el antiguo /horno7 a /technical-inspection
app.get('/horno7', (req, res) => {
    res.redirect(301, '/technical-inspection');
});

// ===========================================================================
// RRD TELEMETRY ENGINE v2.0 (Improvements A, B, C, D, E)
//   A: Live telemetry endpoint (/api/fleet/telemetry) with real LAST/AVG/MIN/MAX/JITTER/LOSS
//   B: Smokeping-style variance band ("smoke") + sub-ms datacenter thresholds (0.85ms / 2.0ms)
//   C: Interactive time windows (1h, 4h, 24h, 7d)
//   D: Parallel collector & Multi-RRA schema support (1m/24h, 15m/7d, 1h/30d)
//   E: HiDPI 2x Retina rendering (600x160) + 6-theme dynamic palette sync
// ===========================================================================
const RRD_DIR = process.env.RRD_DIR || '/var/lib/rrd';
const SNAPSHOT_FILE = path.join(__dirname, 'data', 'rrd-snapshot.json');

const ALLOWED_RANGES = {
    '1h':  { start: '-1h',  seconds: 3600,   points: 60,   trendWindow: 300,  label: '1 Hour (1m step)' },
    '4h':  { start: '-4h',  seconds: 14400,  points: 240,  trendWindow: 900,  label: '4 Hours (1m step)' },
    '24h': { start: '-24h', seconds: 86400,  points: 1440, trendWindow: 3600, label: '24 Hours (1m step)' },
    '7d':  { start: '-7d',  seconds: 604800, points: 672,  trendWindow: 21600, label: '7 Days (15m RRA)' }
};

const THEME_PALETTES = {
    'dark': {
        grid: '222d41', mgrid: '3b82f6', font: '8fa0b8', axis: '4a5a75',
        ok: '10b981', warn: 'f59e0b', bad: 'ef4444', trend: '60a5fa', smoke: '3b82f6'
    },
    'solid-black': {
        grid: '1f1f26', mgrid: '3b82f6', font: '9ca3af', axis: '4b5563',
        ok: '10b981', warn: 'f59e0b', bad: 'ef4444', trend: '60a5fa', smoke: '3b82f6'
    },
    'light': {
        grid: 'cbd5e1', mgrid: '1d4ed8', font: '475569', axis: '64748b',
        ok: '059669', warn: 'd97706', bad: 'dc2626', trend: '1d4ed8', smoke: '2563eb'
    },
    'neon': {
        grid: '3b1a66', mgrid: 'e879f9', font: 'a794c4', axis: '6b21a8',
        ok: '10b981', warn: 'fbbf24', bad: 'f87171', trend: 'e879f9', smoke: 'c026d3'
    },
    'forest': {
        grid: '1e3b2a', mgrid: '22c55e', font: '93ac9d', axis: '2d5a3f',
        ok: '22c55e', warn: 'fbbf24', bad: 'f87171', trend: '4ade80', smoke: '16a34a'
    },
    'ocean': {
        grid: '16405a', mgrid: '06b6d4', font: '8fb0c0', axis: '1e5b7a',
        ok: '06b6d4', warn: 'fbbf24', bad: 'f87171', trend: '22d3ee', smoke: '0891b2'
    }
};

// Load local VPS snapshot for Windows dev preview
let localSnapshotCache = null;
function getLocalSnapshot() {
    if (localSnapshotCache) return localSnapshotCache;
    try {
        if (fs.existsSync(SNAPSHOT_FILE)) {
            localSnapshotCache = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));
            return localSnapshotCache;
        }
    } catch (e) {
        console.error('Failed to read rrd-snapshot.json:', e.message);
    }
    return {};
}

// Fetch time-series points [[ts, val], ...] from live RRD or local VPS snapshot
function fetchNodeSeries(serverId, rangeKey) {
    const rangeCfg = ALLOWED_RANGES[rangeKey] || ALLOWED_RANGES['4h'];
    const rrdFile = path.join(RRD_DIR, `${serverId.toLowerCase()}_ping.rrd`);

    return new Promise((resolve) => {
        if (fs.existsSync(rrdFile)) {
            execFile('rrdtool', ['fetch', rrdFile, 'AVERAGE', '-s', rangeCfg.start], { timeout: 4000 }, (err, stdout) => {
                if (!err && stdout) {
                    const points = [];
                    for (const line of stdout.split(/\r?\n/)) {
                        const m = line.match(/^(\d+):\s+(\S+)/);
                        if (m) {
                            const ts = parseInt(m[1], 10);
                            const rawVal = m[2].toLowerCase();
                            const val = rawVal.includes('nan') ? null : parseFloat(rawVal);
                            points.push([ts, (val !== null && !isNaN(val) && val <= 200) ? val : null]);
                        }
                    }
                    // Trim trailing NaN bucket if rrdtool includes the current unclosed minute
                    while (points.length > 1 && points[points.length - 1][1] === null) {
                        points.pop();
                    }
                    if (points.length > 0) {
                        return resolve({ source: 'live-rrd', points });
                    }
                }
                resolve(getFallbackSeries(serverId, rangeKey));
            });
        } else {
            resolve(getFallbackSeries(serverId, rangeKey));
        }
    });
}

function getFallbackSeries(serverId, rangeKey) {
    const snap = getLocalSnapshot();
    const base = snap[serverId] || (serverId === 'NODE-WIN-04' ? (snap['NODE-WIN-02'] || snap['NODE-DEB-01']) : []) || [];
    if (base.length === 0) {
        return { source: 'offline', points: [] };
    }

    // Filter out trailing nulls
    const clean = base.slice();
    while (clean.length > 1 && clean[clean.length - 1][1] === null) {
        clean.pop();
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (rangeKey === '1h') {
        const slice = clean.slice(-60);
        return { source: 'vps-snapshot', points: reanchorTimestamps(slice, nowSec, 60) };
    }
    if (rangeKey === '4h') {
        const slice = clean.slice(-240);
        return { source: 'vps-snapshot', points: reanchorTimestamps(slice, nowSec, 60) };
    }
    if (rangeKey === '24h') {
        const slice = clean.slice(-1440);
        return { source: 'vps-snapshot', points: reanchorTimestamps(slice, nowSec, 60) };
    }
    if (rangeKey === '7d') {
        // Build 672 15-min consolidated points across 7 days from the real 24h profile
        const pts = [];
        const validVals = clean.map(p => p[1]).filter(v => v !== null);
        const len = validVals.length || 1;
        for (let i = 0; i < 672; i++) {
            const ts = nowSec - (672 - 1 - i) * 900;
            const idx = (i * 15) % len;
            // Subtle deterministic diurnal modulation so 7d view shows multi-day wave
            const dayWave = 1 + 0.08 * Math.sin((i / 96) * Math.PI * 2);
            const v = Number((validVals[idx] * dayWave).toFixed(4));
            pts.push([ts, v]);
        }
        return { source: 'vps-snapshot', points: pts };
    }

    return { source: 'vps-snapshot', points: clean.slice(-240) };
}

function reanchorTimestamps(points, nowSec, stepSec) {
    const n = points.length;
    // Add tiny live micro-variation on the very last point so manual refresh feels alive
    return points.map((pt, i) => {
        const ts = nowSec - (n - 1 - i) * stepSec;
        let val = pt[1];
        if (i === n - 1 && val !== null) {
            const micro = 1 + ((Date.now() % 11) - 5) * 0.004;
            val = Number((val * micro).toFixed(3));
        }
        return [ts, val];
    });
}

// Real RRD telemetry inception timestamp on the VPS (stat -c '%w' /var/lib/rrd/*.rrd)
const RRD_INCEPTION_MS = Date.parse('2026-07-19T05:52:43Z');

function getNodeTrackedDays(serverId) {
    const rrdFile = path.join(RRD_DIR, `${serverId.toLowerCase()}_ping.rrd`);
    try {
        if (fs.existsSync(rrdFile)) {
            const st = fs.statSync(rrdFile);
            const birthMs = (st.birthtimeMs && st.birthtimeMs > 0) ? st.birthtimeMs : RRD_INCEPTION_MS;
            return Math.max(1, Math.floor((Date.now() - birthMs) / 86400000));
        }
    } catch (e) { /* ignore stat error */ }
    return Math.max(1, Math.floor((Date.now() - RRD_INCEPTION_MS) / 86400000));
}

// Compute Smokeping statistics (LAST, AVG, MIN, MAX, JITTER, LOSS, REAL UPTIME % & DAYS)
function computeStats(points, serverId) {
    const daysOnline = getNodeTrackedDays(serverId || 'NODE-DEB-01');
    if (!points || points.length === 0) {
        return {
            last: null, avg: null, min: null, max: null, jitter: null,
            lossPct: 100, uptimePct: 0, daysOnline, samples: 0, status: 'OFFLINE'
        };
    }

    const valid = [];
    let missing = 0;
    for (const [, val] of points) {
        if (val === null || isNaN(val) || val > 200) {
            missing++;
        } else {
            valid.push(val);
        }
    }

    if (valid.length === 0) {
        return {
            last: null, avg: null, min: null, max: null, jitter: null,
            lossPct: 100, uptimePct: 0, daysOnline, samples: 0, status: 'OFFLINE'
        };
    }

    const last = valid[valid.length - 1];
    const sum = valid.reduce((a, b) => a + b, 0);
    const avg = sum / valid.length;
    const min = Math.min(...valid);
    const max = Math.max(...valid);

    // RFC 3550 consecutive packet-to-packet jitter mean
    let diffSum = 0;
    for (let i = 1; i < valid.length; i++) {
        diffSum += Math.abs(valid[i] - valid[i - 1]);
    }
    const jitter = valid.length > 1 ? diffSum / (valid.length - 1) : 0;
    const lossPct = Math.max(0, ((missing / points.length) * 100));
    const uptimePct = Math.max(0, Math.min(100, Number(((valid.length / points.length) * 100).toFixed(2))));

    let status = 'NOMINAL';
    if (lossPct > 5 || last > 2.0) {
        status = 'SPIKE';
    } else if (last > 0.85) {
        status = 'ELEVATED';
    }

    return {
        last: Number(last.toFixed(2)),
        avg: Number(avg.toFixed(2)),
        min: Number(min.toFixed(2)),
        max: Number(max.toFixed(2)),
        jitter: Number(jitter.toFixed(3)),
        lossPct: Number(lossPct.toFixed(1)),
        uptimePct,
        daysOnline,
        samples: valid.length,
        status
    };
}

// --- Improvement A & C & D: Live Fleet Telemetry JSON Endpoint ---
app.get('/api/fleet/telemetry', async (req, res) => {
    const rangeKey = ALLOWED_RANGES[req.query.range] ? req.query.range : '4h';
    const nodes = {};
    let dataSource = 'live-rrd';

    await Promise.all(siteData.vpsFleet.map(async (server) => {
        const { source, points } = await fetchNodeSeries(server.id, rangeKey);
        if (source !== 'live-rrd') dataSource = source;
        nodes[server.id] = computeStats(points, server.id);
    }));

    const hostUptimeSec = Math.floor(os.uptime());

    res.setHeader('Cache-Control', 'no-store');
    res.json({
        range: rangeKey,
        rangeLabel: ALLOWED_RANGES[rangeKey].label,
        source: dataSource,
        hostUptimeSec,
        hostUptimeDays: Math.max(1, Math.floor(hostUptimeSec / 86400)),
        collector: {
            mode: 'PARALLEL_ICMP',
            stepSec: 60,
            rraTiers: ['24h @ 1m', '7d @ 15m', '30d @ 1h'],
            thresholds: { nominal: '0-0.85ms', elevated: '0.85-2.0ms', spike: '>2.0ms' }
        },
        updatedAt: new Date().toISOString(),
        nodes
    });
});

// --- Improvement B, C, E: HiDPI Smokeping SVG Renderer (used on Windows Local or fallback) ---
function renderHiDpiSmokepingSvg(serverId, points, stats, rangeKey, themeKey) {
    const pal = THEME_PALETTES[themeKey] || THEME_PALETTES['dark'];
    const W = 600;
    const H = 160;
    const padL = 48;
    const padR = 14;
    const padT = 14;
    const padB = 34;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    if (!points || points.length < 2 || stats.last === null) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Latency graph unavailable">
  <rect width="${W}" height="${H}" fill="none"/>
  <line x1="${padL}" y1="${padT + plotH / 2}" x2="${W - padR}" y2="${padT + plotH / 2}" stroke="#${pal.mgrid}" stroke-opacity="0.35" stroke-width="1.5" stroke-dasharray="5 6"/>
  <text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="13" fill="#${pal.font}">[ NO DATA // RRD OFFLINE ]</text>
</svg>`;
    }

    // Adaptive scale (--alt-autoscale-max + 98th percentile protection so a single
    // transient spike like 71ms doesn't flatten 239 sub-millisecond samples)
    const sortedVals = points.map(p => p[1]).filter(v => v !== null && !isNaN(v)).sort((a, b) => a - b);
    const p98 = sortedVals.length ? sortedVals[Math.floor(sortedVals.length * 0.98)] : stats.max;
    const adaptivePeak = Math.min(stats.max, Math.max(p98 * 1.35, stats.avg * 2.4));
    const yMaxRaw = Math.max(adaptivePeak * 1.15, 0.12);
    const yMin = 0;
    const ySpan = yMaxRaw - yMin || 1;

    const xOf = (i) => padL + (i / (points.length - 1)) * plotW;
    const yOf = (v) => padT + plotH - Math.min(1, Math.max(0, (v - yMin) / ySpan)) * plotH;

    // Downsample into ~120 buckets for crisp Smokeping min/max variance shadow + curve
    const bucketCount = Math.min(120, points.length);
    const bucketSize = points.length / bucketCount;
    const buckets = [];

    for (let b = 0; b < bucketCount; b++) {
        const startIdx = Math.floor(b * bucketSize);
        const endIdx = Math.max(startIdx + 1, Math.floor((b + 1) * bucketSize));
        const slice = [];
        let tsSum = 0;
        let tsCount = 0;
        for (let k = startIdx; k < endIdx && k < points.length; k++) {
            tsSum += points[k][0];
            tsCount++;
            if (points[k][1] !== null && !isNaN(points[k][1])) {
                slice.push(points[k][1]);
            }
        }
        const ts = tsCount ? tsSum / tsCount : points[startIdx][0];
        if (slice.length === 0) {
            buckets.push({ x: (b / (bucketCount - 1)) * plotW + padL, ts, avg: null, min: null, max: null });
        } else {
            const avg = slice.reduce((a, c) => a + c, 0) / slice.length;
            const min = Math.min(...slice);
            const max = Math.max(...slice);
            // Expand smoke band by local jitter so sub-ms variance is clearly visible
            const localSpread = Math.max(max - min, stats.jitter * 1.35, yMaxRaw * 0.045);
            buckets.push({
                x: (b / (bucketCount - 1)) * plotW + padL,
                ts,
                avg,
                min: Math.max(0, avg - localSpread),
                max: Math.min(yMaxRaw, avg + localSpread)
            });
        }
    }

    // Moving average trend (15-bucket window)
    for (let b = 0; b < buckets.length; b++) {
        let sum = 0, cnt = 0;
        for (let j = Math.max(0, b - 6); j <= Math.min(buckets.length - 1, b + 6); j++) {
            if (buckets[j].avg !== null) { sum += buckets[j].avg; cnt++; }
        }
        buckets[b].trend = cnt > 0 ? sum / cnt : null;
    }

    // Build SVG paths for:
    // 1) Area under curve
    // 2) Smokeping variance band (min-to-max polygon around average)
    // 3) Main latency line
    // 4) Moving average trend line
    const validBuckets = buckets.filter(b => b.avg !== null);
    let areaPath = '';
    let linePath = '';
    let smokePath = '';
    let trendPath = '';

    if (validBuckets.length > 1) {
        linePath = validBuckets.map((b, idx) => `${idx === 0 ? 'M' : 'L'}${b.x.toFixed(1)},${yOf(b.avg).toFixed(1)}`).join(' ');
        const firstX = validBuckets[0].x.toFixed(1);
        const lastX = validBuckets[validBuckets.length - 1].x.toFixed(1);
        const baseY = (padT + plotH).toFixed(1);
        areaPath = `${linePath} L${lastX},${baseY} L${firstX},${baseY} Z`;

        const upperSmoke = validBuckets.map((b, idx) => `${idx === 0 ? 'M' : 'L'}${b.x.toFixed(1)},${yOf(b.max).toFixed(1)}`).join(' ');
        const lowerSmoke = validBuckets.slice().reverse().map((b) => `L${b.x.toFixed(1)},${yOf(b.min).toFixed(1)}`).join(' ');
        smokePath = `${upperSmoke} ${lowerSmoke} Z`;

        trendPath = validBuckets.map((b, idx) => `${idx === 0 ? 'M' : 'L'}${b.x.toFixed(1)},${yOf(b.trend).toFixed(1)}`).join(' ');
    }

    // Determine primary stroke color by sub-ms datacenter thresholds (Improvement B)
    let strokeHex = pal.ok;
    if (stats.last > 2.0) strokeHex = pal.bad;
    else if (stats.last > 0.85) strokeHex = pal.warn;

    // Horizontal Y-grid lines (3 steps)
    const yTicks = [0, yMaxRaw * 0.5, yMaxRaw];
    const hGridSvg = yTicks.map((val, idx) => {
        const y = yOf(val).toFixed(1);
        const label = val < 0.1 && val > 0 ? val.toFixed(2) : val.toFixed(val >= 1 ? 1 : 2);
        const isMajor = idx === 1;
        return `
    <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#${isMajor ? pal.mgrid : pal.grid}" stroke-opacity="${isMajor ? '0.32' : '0.55'}" stroke-width="1" stroke-dasharray="${isMajor ? '3 3' : '2 4'}"/>
    <text x="${padL - 6}" y="${Number(y) + 3.5}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#${pal.font}">${label}ms</text>`;
    }).join('');

    // Vertical X-grid lines (4 intervals)
    const vTicks = [0, 0.25, 0.5, 0.75, 1];
    const xLabels = {
        '1h':  ['-60m', '-45m', '-30m', '-15m', 'now'],
        '4h':  ['-4h', '-3h', '-2h', '-1h', 'now'],
        '24h': ['-24h', '-18h', '-12h', '-6h', 'now'],
        '7d':  ['-7d', '-5d', '-3d', '-1d', 'now']
    }[rangeKey] || ['-4h', '-3h', '-2h', '-1h', 'now'];

    const vGridSvg = vTicks.map((frac, idx) => {
        const x = (padL + frac * plotW).toFixed(1);
        return `
    <line x1="${x}" y1="${padT}" x2="${x}" y2="${padT + plotH}" stroke="#${pal.grid}" stroke-opacity="0.45" stroke-width="1" stroke-dasharray="2 4"/>
    <text x="${x}" y="${padT + plotH + 13}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#${pal.font}">${xLabels[idx]}</text>`;
    }).join('');

    // Optional threshold reference line at 0.85ms if visible within Y range
    let thresholdSvg = '';
    if (yMaxRaw >= 0.75 && yMaxRaw <= 3.0) {
        const yWarn = yOf(0.85).toFixed(1);
        thresholdSvg = `<line x1="${padL}" y1="${yWarn}" x2="${W - padR}" y2="${yWarn}" stroke="#${pal.warn}" stroke-opacity="0.4" stroke-width="1" stroke-dasharray="4 4"/>`;
    }

    const gradId = `rrdGrad_${serverId.replace(/[^a-zA-Z0-9]/g, '')}`;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${serverId} latency graph (${rangeKey})">
  <defs>
    <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#${strokeHex}" stop-opacity="0.34"/>
      <stop offset="100%" stop-color="#${strokeHex}" stop-opacity="0.03"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="none"/>
  ${hGridSvg}
  ${vGridSvg}
  ${thresholdSvg}
  <!-- Smokeping Jitter / Variance Envelope Band -->
  <path d="${smokePath}" fill="#${pal.smoke}" fill-opacity="0.16" stroke="none"/>
  <!-- Area Fill Under Latency Curve -->
  <path d="${areaPath}" fill="url(#${gradId})"/>
  <!-- 15m Moving Average Trend Line -->
  <path d="${trendPath}" fill="none" stroke="#${pal.trend}" stroke-opacity="0.65" stroke-width="1.3" stroke-dasharray="4 3"/>
  <!-- Primary RTT Curve -->
  <path d="${linePath}" fill="none" stroke="#${strokeHex}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Plot Baseline -->
  <line x1="${padL}" y1="${padT + plotH}" x2="${W - padR}" y2="${padT + plotH}" stroke="#${pal.axis}" stroke-width="1"/>
  <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" stroke="#${pal.axis}" stroke-width="1"/>
  <!-- Embedded RRD GPRINT Telemetry Footer -->
  <text x="${padL}" y="${H - 5}" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#${pal.font}">
    LAST: <tspan fill="#${strokeHex}" font-weight="700">${stats.last.toFixed(2)}ms</tspan>   AVG: ${stats.avg.toFixed(2)}ms   MIN: ${stats.min.toFixed(2)}ms   MAX: ${stats.max.toFixed(2)}ms   JITTER: ±${stats.jitter.toFixed(3)}ms
  </text>
</svg>`;
}

// --- Improvement B, C, E: HiDPI & Theme-Aware RRD Graph Endpoint ---
app.get('/api/graphs/latency/:serverId', async (req, res) => {
    const serverId = req.params.serverId;

    // SECURITY: Validate input against whitelist to prevent command injection
    const allowedServers = siteData.vpsFleet.map(server => server.id);
    if (!allowedServers.includes(serverId)) {
        return res.status(403).send("Unauthorized node");
    }

    const rangeKey = ALLOWED_RANGES[req.query.range] ? req.query.range : '4h';
    const themeKey = THEME_PALETTES[req.query.theme] ? req.query.theme : 'dark';
    const rangeCfg = ALLOWED_RANGES[rangeKey];
    const pal = THEME_PALETTES[themeKey];

    const rrdFile = path.join(RRD_DIR, `${serverId.toLowerCase()}_ping.rrd`);

    // If running on Windows local dev (or if 7d multi-RRA is requested before RRA migration finishes),
    // render the HiDPI Smokeping SVG from the real VPS telemetry series.
    if (!fs.existsSync(rrdFile)) {
        const { points } = await fetchNodeSeries(serverId, rangeKey);
        const stats = computeStats(points);
        const svg = renderHiDpiSmokepingSvg(serverId, points, stats, rangeKey, themeKey);
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'no-store');
        return res.send(svg);
    }

    // Native Linux RRDtool HiDPI 600x160 Graph with Smokeping Trend & Sub-ms Thresholds
    const rrdArgs = [
        'graph', '-',
        '--start', rangeCfg.start,
        '--width', '600',
        '--height', '160',
        '--full-size-mode',
        '--lower-limit', '0',
        '--alt-autoscale-max',
        '--units-exponent', '0',
        '--slope-mode',
        '--border', '0',
        '--color', 'BACK#00000000',
        '--color', 'CANVAS#00000000',
        '--color', `GRID#${pal.grid}`,
        '--color', `MGRID#${pal.mgrid}`,
        '--color', `FONT#${pal.font}`,
        '--color', `AXIS#${pal.axis}`,
        '--color', `ARROW#${pal.axis}`,

        `DEF:rawping=${rrdFile}:ping:AVERAGE`,

        // Outliers > 200ms treated as packet loss gap
        'CDEF:ping=rawping,200,GT,UNKN,rawping,IF',

        // Smokeping-style moving average trend & variance envelope
        `CDEF:trend=ping,${rangeCfg.trendWindow},TRENDNAN`,
        'CDEF:smoke_low=trend,0.88,*',
        'CDEF:smoke_band=trend,0.24,*',

        // Sub-millisecond datacenter thresholds:
        //   0 - 0.85ms: Nominal (green / theme ok)
        //   0.85 - 2.0ms: Elevated Jitter (amber)
        //   2.0 - 200ms: Spike / Congestion (red)
        'CDEF:ping_good=ping,0,0.85,LIMIT',
        'CDEF:ping_warn=ping,0.85,2.0,LIMIT',
        'CDEF:ping_bad=ping,2.0,200,LIMIT',

        // Smokeping variance shadow around trend
        'AREA:smoke_low#00000000',
        `AREA:smoke_band#${pal.smoke}28::STACK`,

        // Threshold area fills
        `AREA:ping_good#${pal.ok}38`,
        `AREA:ping_warn#${pal.warn}42`,
        `AREA:ping_bad#${pal.bad}48`,

        // Moving average trend line
        `LINE1.2:trend#${pal.trend}99::dashes=4,3`,

        // Crisp HiDPI threshold curves
        `LINE2:ping_good#${pal.ok}`,
        `LINE2:ping_warn#${pal.warn}`,
        `LINE2:ping_bad#${pal.bad}`,

        // Embedded GPRINT telemetry summary
        'GPRINT:ping:LAST:LAST\\: %5.2lfms',
        'GPRINT:ping:AVERAGE:AVG\\: %5.2lfms',
        'GPRINT:ping:MIN:MIN\\: %5.2lfms',
        'GPRINT:ping:MAX:MAX\\: %5.2lfms\\j'
    ];

    execFile('rrdtool', rrdArgs, { encoding: 'buffer', timeout: 5000 }, async (error, stdout, stderr) => {
        if (error) {
            console.error(`RRDTool Error: ${stderr}`);
            const { points } = await fetchNodeSeries(serverId, rangeKey);
            const stats = computeStats(points);
            const svg = renderHiDpiSmokepingSvg(serverId, points, stats, rangeKey, themeKey);
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'no-store');
            return res.send(svg);
        }

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=30');
        res.send(stdout);
    });
});

// --- Real Per-Core CPU Delta Tracker (100% safe, zero shell execution) ---
let prevCpuSnap = os.cpus();
function getRealCpuCorePercents() {
    const current = os.cpus();
    const percents = current.slice(0, 4).map((core, idx) => {
        const prev = prevCpuSnap[idx] || core;
        const prevTotal = Object.values(prev.times).reduce((a, b) => a + b, 0);
        const currTotal = Object.values(core.times).reduce((a, b) => a + b, 0);
        const totalDiff = currTotal - prevTotal;
        const idleDiff = core.times.idle - prev.times.idle;
        if (totalDiff <= 0) {
            // Fallback ratio from cumulative boot times if called within same tick
            const bootBusy = currTotal - core.times.idle;
            return Number(Math.max(0.8, Math.min(99.9, (bootBusy / (currTotal || 1)) * 100)).toFixed(1));
        }
        const pct = ((totalDiff - idleDiff) / totalDiff) * 100;
        return Number(Math.max(0.4, Math.min(99.9, pct)).toFixed(1));
    });
    prevCpuSnap = current;
    return percents;
}

// --- Real `uptime` & safe `htop` telemetry for terminal, status bar & footer ---
app.get('/api/uptime', (req, res) => {
    const sec = Math.floor(os.uptime());
    const days = Math.floor(sec / 86400);
    const hrs = Math.floor((sec % 86400) / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const fallbackPretty = `up ${days > 0 ? days + ' days, ' : ''}${hrs} hours, ${mins} minutes`;
    const osLoad = os.loadavg().map(n => n.toFixed(2)).join(', ');
    const memTotalMb = Math.round(os.totalmem() / 1048576);
    const memUsedMb = Math.round((os.totalmem() - os.freemem()) / 1048576);
    const cores = getRealCpuCorePercents();
    const nodeMemMb = Number((process.memoryUsage().rss / 1048576).toFixed(1));
    const nodePid = process.pid;

    // No user input reaches the command: fixed binary, fixed args.
    execFile('uptime', ['-p'], { timeout: 4000 }, (error, prettyOut) => {
        execFile('uptime', [], { timeout: 4000 }, (loadErr, rawOut) => {
            if (error && loadErr) {
                res.setHeader('Cache-Control', 'no-store');
                return res.json({
                    pretty: fallbackPretty,
                    seconds: sec,
                    days,
                    load: osLoad,
                    memUsedMb,
                    memTotalMb,
                    cores,
                    nodePid,
                    nodeMemMb,
                    host: os.hostname()
                });
            }
            const raw = (rawOut || '').trim();
            const loadMatch = raw.match(/load average:\s*(.+)$/);
            res.setHeader('Cache-Control', 'no-store');
            res.json({
                pretty: (prettyOut || '').trim() || raw || fallbackPretty,
                seconds: sec,
                days,
                load: loadMatch ? loadMatch[1].trim() : osLoad,
                memUsedMb,
                memTotalMb,
                cores,
                nodePid,
                nodeMemMb,
                host: os.hostname()
            });
        });
    });
});

// --- Consolidated Game Activity Endpoint ---
app.get('/api/game-activity', async (req, res) => {
    const apiKey = process.env.STEAM_API_KEY;
    const steamId = process.env.STEAM_ID;

    if (!apiKey || !steamId) {
        return res.status(500).json({ error: "Environment configuration missing variables." });
    }

    try {
        const [recentRes, vaultRes] = await Promise.all([
            fetch(`https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${apiKey}&steamid=${steamId}&format=json`),
            fetch(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${steamId}&include_appinfo=1&format=json`)
        ]);

        const recentData = await recentRes.json();
        const vaultData = await vaultRes.json();

        // 1. Current Obsession (Mapping appid for frontend images)
        let currentObsession = [];
        if (recentData.response && recentData.response.games) {
            currentObsession = recentData.response.games.slice(0, 3).map(game => ({
                appid: game.appid,
                name: game.name,
                playtime2Weeks: (game.playtime_2weeks / 60).toFixed(1)
            }));
        }

        // 2. The Entire Vault
        const allGames = vaultData.response.games || [];
        const totalHours = (allGames.reduce((sum, game) => sum + game.playtime_forever, 0) / 60).toFixed(1);
        const pileOfShame = allGames.filter(game => game.playtime_forever === 0).length;

        // Hall of Fame Top 5 (Mapping appid for library box art generation)
        const top5 = allGames.sort((a, b) => b.playtime_forever - a.playtime_forever).slice(0, 5).map(game => ({
            appid: game.appid,
            name: game.name,
            totalHours: (game.playtime_forever / 60).toFixed(1)
        }));

        // 3. Dynamic Trophy Cabinet (wrapped in try/catch to safely ignore unsupported games)
        let unlockedTrophies = 0;
        let activeGameName = "None";

        if (currentObsession.length > 0) {
            const activeAppId = currentObsession[0].appid;
            activeGameName = currentObsession[0].name;

            try {
                const trophyRes = await fetch(`https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${activeAppId}&key=${apiKey}&steamid=${steamId}`);
                if (trophyRes.ok) {
                    const trophyData = await trophyRes.json();
                    unlockedTrophies = trophyData.playerstats && trophyData.playerstats.achievements ?
                        trophyData.playerstats.achievements.filter(a => a.achieved === 1).length : 0;
                }
            } catch (achErr) {
                console.log(`Achievements not available for AppID: ${activeAppId}`);
            }
        }

        // Send the complete formatted JSON package to the frontend
        res.json({
            obsession: currentObsession,
            vault: { totalHours, pileOfShame, top5 },
            currentTrophies: { game: activeGameName, unlocked: unlockedTrophies }
        });

    } catch (error) {
        console.error("Steam API Error:", error);
        res.status(500).json({ error: "Failed to fetch game activity" });
    }
});

// ===========================================================================
// DARKBOT DmPlugin MCP BRIDGE ENGINE (JSON-RPC 2.0 over Loopback / SSH Tunnel)
//   - Auto-Handshake: initialize -> notifications/initialized
//   - Port Auto-Discovery: probes [9876, 9877, 9878, 19876, 19877, 19878]
//   - 2-Tier Security: Public Read-Only Whitelist + Operator PIN/Token for Tools
//   - Strict Privacy Sanitizer: masks pilot/account IDs, player names, blocks memory peek
//   - Resilient Fallback: serves sanitized data/mcp-snapshot.json when tunnel/bot is offline
// ===========================================================================
const http = require('http');
const crypto = require('crypto');

const MCP_SNAPSHOT_FILE = path.join(__dirname, 'data', 'mcp-snapshot.json');
const MCP_DEFAULT_PORT = parseInt(process.env.MCP_BRIDGE_PORT || '9876', 10);
const MCP_CANDIDATE_PORTS = Array.from(new Set([
    MCP_DEFAULT_PORT, 9876, 9877, 9878, 19876, 19877, 19878
]));

const mcpState = {
    initialized: false,
    activePort: MCP_DEFAULT_PORT,
    sessionId: null,
    serverInfo: { name: 'DmPlugin', version: '2.14.3' },
    rpcId: 1,
    readCache: new Map(), // key -> { ts, data }
    authAttempts: new Map() // ip -> { count, resetAt }
};

function loadMcpSnapshot() {
    try {
        if (fs.existsSync(MCP_SNAPSHOT_FILE)) {
            return JSON.parse(fs.readFileSync(MCP_SNAPSHOT_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Failed to read mcp-snapshot.json:', e.message);
    }
    return { resources: {} };
}

let mcpSnapshotCache = loadMcpSnapshot();

function saveMcpSnapshotResource(key, sanitizedData) {
    try {
        if (!mcpSnapshotCache || typeof mcpSnapshotCache !== 'object') {
            mcpSnapshotCache = { resources: {} };
        }
        if (!mcpSnapshotCache.resources) mcpSnapshotCache.resources = {};
        mcpSnapshotCache.resources[key] = sanitizedData;
        mcpSnapshotCache.updatedAt = new Date().toISOString();
    } catch (e) { /* ignore memory update error */ }
}

// Recursively mask sensitive account/pilot identifiers and block memory inspection
const SENSITIVE_KEYS = new Set([
    'username', 'user_name', 'userid', 'user_id', 'pilot_name', 'pilot',
    'sid', 'sessionid', 'session_id', 'instanceid', 'instance_id',
    'clan', 'clan_tag', 'clan_name', 'clan_id', 'token', 'password'
]);

function sanitizeMcpData(input, contextKey) {
    if (input === null || input === undefined) return input;
    if (typeof input === 'string') {
        // Mask 8-12 digit account IDs in log lines or strings
        return input.replace(/\b(id|userId|pilot|sid)[=:\s]+([A-Za-z0-9_-]{4,})/gi, '$1=REDACTED');
    }
    if (Array.isArray(input)) {
        return input.map(item => sanitizeMcpData(item, contextKey));
    }
    if (typeof input === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(input)) {
            const lower = k.toLowerCase();
            if (SENSITIVE_KEYS.has(lower)) {
                out[k] = 'REDACTED_PILOT';
            } else if (lower === 'id' && contextKey === 'hero') {
                out[k] = 'REDACTED_PILOT';
            } else if (lower === 'address' || lower === 'addresses' || lower === 'memory_address') {
                out[k] = '0xREDACTED';
            } else if (contextKey === 'entities' && lower === 'name' && (input.type === 'player' || input.type === 'players')) {
                out[k] = 'REDACTED_PLAYER';
            } else {
                out[k] = sanitizeMcpData(v, contextKey);
            }
        }
        return out;
    }
    return input;
}

// Low-level JSON-RPC 2.0 HTTP POST to a specific local port
function rawMcpPost(port, payloadObj, extraHeaders = {}, timeoutMs = 2200) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(payloadObj);
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
            'Content-Length': Buffer.byteLength(body),
            ...extraHeaders
        };
        if (mcpState.sessionId && !headers['Mcp-Session-Id']) {
            headers['Mcp-Session-Id'] = mcpState.sessionId;
        }

        const req = http.request({
            hostname: '127.0.0.1',
            port,
            path: '/mcp',
            method: 'POST',
            headers,
            timeout: timeoutMs
        }, (res) => {
            const sid = res.headers['mcp-session-id'];
            if (sid) mcpState.sessionId = sid;
            let raw = '';
            res.setEncoding('utf8');
            res.on('data', chunk => { raw += chunk; });
            res.on('end', () => {
                resolve({ status: res.statusCode, text: raw, port });
            });
        });

        req.on('error', err => reject(err));
        req.on('timeout', () => {
            req.destroy(new Error('MCP_TIMEOUT'));
        });
        req.write(body);
        req.end();
    });
}

function parseMcpRpcEnvelope(rawText) {
    if (!rawText || !rawText.trim()) return {};
    const trimmed = rawText.trim();
    // Handle SSE data: lines if server streams
    if (trimmed.startsWith('event:') || trimmed.startsWith('data:')) {
        const dataLines = trimmed.split(/\r?\n/)
            .filter(l => l.startsWith('data:'))
            .map(l => l.replace(/^data:\s*/, ''));
        if (dataLines.length > 0) {
            return JSON.parse(dataLines[dataLines.length - 1]);
        }
    }
    return JSON.parse(trimmed);
}

// Perform MCP lifecycle handshake: initialize -> notifications/initialized
async function ensureMcpHandshake(forceReset = false) {
    if (mcpState.initialized && !forceReset) {
        return mcpState.activePort;
    }

    const portsToTry = Array.from(new Set([mcpState.activePort, ...MCP_CANDIDATE_PORTS]));
    let lastErr = null;

    for (const port of portsToTry) {
        try {
            mcpState.sessionId = null;
            const initRes = await rawMcpPost(port, {
                jsonrpc: '2.0',
                id: mcpState.rpcId++,
                method: 'initialize',
                params: {
                    protocolVersion: '2025-03-26',
                    capabilities: {},
                    clientInfo: { name: 'therodrigo-fleet-console', version: '2.0.0' }
                }
            }, {}, 1800);

            if (initRes.status >= 200 && initRes.status < 300 && initRes.text) {
                const parsed = parseMcpRpcEnvelope(initRes.text);
                if (parsed && parsed.result) {
                    if (parsed.result.serverInfo) {
                        mcpState.serverInfo = parsed.result.serverInfo;
                    }
                    // Send notifications/initialized (ignore empty 202/204 body)
                    try {
                        await rawMcpPost(port, {
                            jsonrpc: '2.0',
                            method: 'notifications/initialized'
                        }, {}, 1200);
                    } catch (notifErr) {
                        // Some lightweight HTTP servers close immediately on notifications
                    }
                    mcpState.activePort = port;
                    mcpState.initialized = true;
                    return port;
                }
            }
        } catch (err) {
            lastErr = err;
        }
    }

    mcpState.initialized = false;
    throw lastErr || new Error('MCP Bridge unreachable on all candidate ports');
}

// Execute an MCP JSON-RPC call with automatic re-handshake if DarkBot restarted
async function callMcpWithAutoHeal(method, params) {
    const t0 = Date.now();
    let port = await ensureMcpHandshake(false);

    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const res = await rawMcpPost(port, {
                jsonrpc: '2.0',
                id: mcpState.rpcId++,
                method,
                params
            });
            const rpc = parseMcpRpcEnvelope(res.text);
            if (rpc.error) {
                const msg = String(rpc.error.message || '').toLowerCase();
                // If server restarted and requires re-initialization
                if (attempt === 0 && (msg.includes('init') || msg.includes('session') || rpc.error.code === -32002)) {
                    port = await ensureMcpHandshake(true);
                    continue;
                }
                const rpcErr = new Error(rpc.error.message || 'MCP RPC Error');
                rpcErr.code = rpc.error.code;
                throw rpcErr;
            }
            return {
                result: rpc.result,
                rpcEnvelope: rpc,
                port,
                latencyMs: Date.now() - t0
            };
        } catch (err) {
            if (attempt === 0 && err.code !== -32602) {
                port = await ensureMcpHandshake(true);
                continue;
            }
            throw err;
        }
    }
}

// Read an MCP resource trying candidate URIs (handles bot:// vs mcp:// differences)
async function readMcpResource(candidateUris, contextKey, cacheTtlMs = 3000) {
    const now = Date.now();
    const cached = mcpState.readCache.get(contextKey);
    if (cached && (now - cached.ts) < cacheTtlMs) {
        return { ...cached.payload, cached: true };
    }

    let lastError = null;
    for (const uri of candidateUris) {
        try {
            const { result, port, latencyMs } = await callMcpWithAutoHeal('resources/read', { uri });
            const contentItem = result && Array.isArray(result.contents) ? result.contents[0] : null;
            const rawJson = contentItem && contentItem.text ? JSON.parse(contentItem.text) : (result || {});
            const sanitized = sanitizeMcpData(rawJson, contextKey);

            saveMcpSnapshotResource(contextKey, sanitized);
            const payload = {
                ok: true,
                source: 'live-mcp',
                uri,
                port,
                latencyMs,
                serverInfo: mcpState.serverInfo,
                data: sanitized
            };
            mcpState.readCache.set(contextKey, { ts: now, payload });
            return payload;
        } catch (err) {
            lastError = err;
            // If resource URI was not found (-32602), try next candidate URI
            if (err.code === -32602) continue;
            // Otherwise tunnel/server is unreachable; break out to snapshot fallback
            break;
        }
    }

    // Fallback to sanitized snapshot so the portfolio console is always responsive
    const snapData = (mcpSnapshotCache && mcpSnapshotCache.resources && mcpSnapshotCache.resources[contextKey]) || {};
    return {
        ok: true,
        source: 'cached-snapshot',
        uri: candidateUris[0],
        port: mcpState.activePort,
        latencyMs: 0,
        serverInfo: (mcpSnapshotCache && mcpSnapshotCache.serverInfo) || mcpState.serverInfo,
        snapshotUpdatedAt: mcpSnapshotCache && mcpSnapshotCache.updatedAt,
        offlineReason: lastError ? lastError.message : 'Tunnel standby',
        data: sanitizeMcpData(snapData, contextKey)
    };
}

// Constant-time Operator Token verification + brute-force rate limit
function verifyOperatorToken(req) {
    const configuredToken = (process.env.MCP_OPERATOR_TOKEN || '2006').trim();
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const rate = mcpState.authAttempts.get(clientIp) || { count: 0, resetAt: now + 60000 };
    if (now > rate.resetAt) {
        rate.count = 0;
        rate.resetAt = now + 60000;
    }
    if (rate.count >= 12) {
        return { valid: false, error: 'Too many authentication attempts. Wait 60s.' };
    }

    const provided = String(req.headers['x-mcp-token'] || (req.body && req.body.token) || '').trim();
    if (!provided) {
        return { valid: false, error: 'Operator PIN/Token required for control commands.' };
    }

    const bufA = Buffer.from(configuredToken, 'utf8');
    const bufB = Buffer.from(provided, 'utf8');
    const match = (bufA.length === bufB.length) && crypto.timingSafeEqual(bufA, bufB);

    if (!match) {
        rate.count++;
        mcpState.authAttempts.set(clientIp, rate);
        return { valid: false, error: 'Invalid Operator PIN/Token.' };
    }

    rate.count = 0;
    mcpState.authAttempts.set(clientIp, rate);
    return { valid: true };
}

// Whitelisted Read-Only Resource Map
const PUBLIC_MCP_RESOURCES = {
    'status':   { uris: ['bot://status'], key: 'status' },
    'stats':    { uris: ['bot://stats'], key: 'stats' },
    'hero':     { uris: ['bot://hero'], key: 'hero' },
    'module':   { uris: ['bot://module'], key: 'module' },
    'plugins':  { uris: ['bot://plugins'], key: 'plugins' },
    'entities': { uris: ['mcp://entities?limit=12', 'bot://entities?limit=12', 'mcp://entities'], key: 'entities' },
    'pet':      { uris: ['mcp://pet', 'bot://pet'], key: 'pet' },
    'boosters': { uris: ['mcp://boosters', 'bot://boosters'], key: 'boosters' },
    'repair':   { uris: ['mcp://repair', 'bot://repair'], key: 'repair' },
    'logs':     { uris: ['mcp://log?tail=15', 'bot://logs'], key: 'logs' },
    'config':   { uris: ['bot://config', 'mcp://config'], key: 'config' }
};

const ALLOWED_PET_GEARS = new Set([
    'PASSIVE', 'GUARD', 'DESTROYER', 'LOOTER', 'RESOURCE',
    'ENEMY_LOCATOR', 'RESOURCE_LOCATOR', 'TRADER', 'REPAIR',
    'KAMIKAZE', 'COMBO_REPAIR', 'COMBO_GUARD'
]);

// GET /api/mcp/:nodeId/overview — Hydrates the MCP Console Modal HUD on open
app.get('/api/mcp/:nodeId/overview', async (req, res) => {
    const nodeId = String(req.params.nodeId || '').toUpperCase();
    const serverNode = siteData.vpsFleet.find(s => s.id === nodeId && s.mcpEnabled);
    if (!serverNode) {
        return res.status(404).json({ ok: false, error: 'Console not available for this node' });
    }

    res.setHeader('Cache-Control', 'no-store');

    const [statusRes, statsRes, heroRes] = await Promise.all([
        readMcpResource(PUBLIC_MCP_RESOURCES.status.uris, 'status', 2500),
        readMcpResource(PUBLIC_MCP_RESOURCES.stats.uris, 'stats', 2500),
        readMcpResource(PUBLIC_MCP_RESOURCES.hero.uris, 'hero', 2500)
    ]);

    res.json({
        ok: true,
        node: serverNode,
        source: statusRes.source,
        port: statusRes.port,
        latencyMs: statusRes.latencyMs,
        serverInfo: statusRes.serverInfo,
        snapshotUpdatedAt: statusRes.snapshotUpdatedAt || null,
        status: statusRes.data,
        stats: statsRes.data,
        hero: heroRes.data
    });
});

// POST /api/mcp/:nodeId/command — Executes preconfigured Read or Operator commands
app.post('/api/mcp/:nodeId/command', express.json({ limit: '16kb' }), async (req, res) => {
    const nodeId = String(req.params.nodeId || '').toUpperCase();
    const serverNode = siteData.vpsFleet.find(s => s.id === nodeId && s.mcpEnabled);
    if (!serverNode) {
        return res.status(404).json({ ok: false, error: 'Console not available for this node' });
    }

    res.setHeader('Cache-Control', 'no-store');
    const cmd = String((req.body && req.body.command) || '').trim().toLowerCase();
    const args = (req.body && req.body.args) || {};

    // 1. Explicitly block memory inspection URIs/commands
    if (cmd.includes('inspect') || cmd.includes('peek') || cmd.includes('address')) {
        return res.status(403).json({
            ok: false,
            error: 'Memory inspection resources (bot://inspect, bot://peek, bot://addresses) are disabled by security policy.'
        });
    }

    // 2. Operator Token verification check
    if (cmd === 'verify-auth') {
        const check = verifyOperatorToken(req);
        if (!check.valid) {
            return res.status(401).json({ ok: false, error: check.error });
        }
        return res.json({
            ok: true,
            command: 'verify-auth',
            message: 'Operator privileges unlocked. Mutating MCP tools enabled.'
        });
    }

    // 3. Public Read-Only Resource Commands
    if (Object.prototype.hasOwnProperty.call(PUBLIC_MCP_RESOURCES, cmd)) {
        const spec = PUBLIC_MCP_RESOURCES[cmd];
        const result = await readMcpResource(spec.uris, spec.key, 2500);
        return res.json({
            ok: true,
            tier: 'public-read',
            command: cmd,
            ...result
        });
    }

    // 4. Operator Mutating Tool Commands (Requires valid X-MCP-Token)
    const auth = verifyOperatorToken(req);
    if (!auth.valid) {
        return res.status(401).json({
            ok: false,
            requiresAuth: true,
            error: auth.error
        });
    }

    let toolName = null;
    let toolArgs = {};

    switch (cmd) {
        case 'toggle-pause':
        case 'pause':
        case 'resume':
            toolName = 'toggle_pause';
            toolArgs = {};
            break;

        case 'reload-plugins':
        case 'reload':
            toolName = 'reload_plugins';
            toolArgs = {};
            break;

        case 'reset-deaths':
            toolName = 'reset_deaths';
            toolArgs = {};
            break;

        case 'set-pet': {
            const gear = String(args.gear || 'LOOTER').toUpperCase().trim();
            if (!ALLOWED_PET_GEARS.has(gear)) {
                return res.status(400).json({
                    ok: false,
                    error: `Invalid PET gear '${gear}'. Allowed: ${Array.from(ALLOWED_PET_GEARS).join(', ')}`
                });
            }
            toolName = 'set_pet';
            toolArgs = { enabled: args.enabled !== false, gear };
            break;
        }

        case 'get-config':
        case 'config-get': {
            const reqPath = String(args.path || '').trim();
            try {
                const targetUri = reqPath ? `bot://config/tree?path=${encodeURIComponent(reqPath)}` : 'bot://config/tree';
                const { result, port, latencyMs } = await callMcpWithAutoHeal('resources/read', { uri: targetUri });
                const contentItem = result && Array.isArray(result.contents) ? result.contents[0] : null;
                let rawJson = contentItem && contentItem.text ? JSON.parse(contentItem.text) : (result || {});

                // If path is a specific setting, fallback to bot://config/value
                if (reqPath && (!rawJson.children || rawJson.children.length === 0)) {
                    try {
                        const valRes = await callMcpWithAutoHeal('resources/read', { uri: `bot://config/value?path=${encodeURIComponent(reqPath)}` });
                        const vItem = valRes.result && Array.isArray(valRes.result.contents) ? valRes.result.contents[0] : null;
                        if (vItem && vItem.text) {
                            rawJson = JSON.parse(vItem.text);
                        }
                    } catch (_) {}
                }

                // If querying root, also attach available profiles
                if (!reqPath) {
                    try {
                        const profRes = await callMcpWithAutoHeal('resources/read', { uri: 'bot://profiles' });
                        const pItem = profRes.result && Array.isArray(profRes.result.contents) ? profRes.result.contents[0] : null;
                        if (pItem && pItem.text) {
                            rawJson.available_profiles = JSON.parse(pItem.text).profiles;
                        }
                    } catch (_) {}
                }

                return res.json({
                    ok: true,
                    tier: 'operator-write',
                    command: cmd,
                    tool: 'get_config',
                    toolArgs: reqPath ? { path: reqPath } : {},
                    source: 'live-mcp',
                    port,
                    latencyMs,
                    data: sanitizeMcpData(rawJson, 'config')
                });
            } catch (liveErr) {
                const snapConfig = (mcpSnapshotCache && mcpSnapshotCache.resources && mcpSnapshotCache.resources.config) || {};
                let returnData = snapConfig;
                if (reqPath) {
                    const parts = reqPath.split('.');
                    let curr = snapConfig;
                    for (const p of parts) {
                        if (curr && typeof curr === 'object' && p in curr) {
                            curr = curr[p];
                        } else {
                            curr = null;
                            break;
                        }
                    }
                    returnData = curr !== null ? curr : snapConfig;
                }
                return res.json({
                    ok: true,
                    tier: 'operator-write',
                    command: cmd,
                    tool: 'get_config',
                    toolArgs: reqPath ? { path: reqPath } : {},
                    source: 'cached-snapshot',
                    port: mcpState.activePort,
                    latencyMs: 0,
                    offlineReason: liveErr.message,
                    data: sanitizeMcpData(returnData, 'config')
                });
            }
        }

        case 'set-config':
        case 'config-set': {
            const configPath = String(args.path || '').trim();
            if (!configPath || configPath.length > 80) {
                return res.status(400).json({
                    ok: false,
                    error: 'Specify a valid config path (e.g. general.working_map, general.offensive_config, loot.sab).'
                });
            }
            if (args.value === undefined || args.value === null || args.value === '') {
                return res.status(400).json({
                    ok: false,
                    error: `Specify a value to set for '${configPath}'.`
                });
            }
            let parsedVal = args.value;
            if (typeof parsedVal === 'string') {
                const lower = parsedVal.trim().toLowerCase();
                if (lower === 'true') parsedVal = true;
                else if (lower === 'false') parsedVal = false;
                else if (!isNaN(Number(parsedVal)) && parsedVal.trim() !== '') parsedVal = Number(parsedVal);
            }

            // DarkBot requires integer map ID for general.working_map
            if (configPath === 'general.working_map' && typeof parsedVal === 'string') {
                const MAP_IDS = {
                    '1-1': 1, '1-2': 2, '1-3': 3, '1-4': 4,
                    '2-1': 5, '2-2': 6, '2-3': 7, '2-4': 8,
                    '3-1': 9, '3-2': 10, '3-3': 11, '3-4': 12,
                    '4-1': 13, '4-2': 14, '4-3': 15, '4-4': 16,
                    '4-5': 17,
                    '1-5': 18, '1-6': 19, '1-7': 20, '1-8': 21,
                    '2-5': 22, '2-6': 23, '2-7': 24, '2-8': 24,
                    '3-5': 25, '3-6': 26, '3-7': 27, '3-8': 28,
                    '5-1': 91, '5-2': 92, '5-3': 93,
                    'eternal': 307
                };
                const mLower = parsedVal.toLowerCase();
                if (MAP_IDS[mLower] !== undefined) parsedVal = MAP_IDS[mLower];
            }

            toolName = 'set_config';
            toolArgs = { path: configPath, value: parsedVal };
            break;
        }

        case 'set-map': {
            const mapName = String(args.map || '').trim();
            if (!mapName || mapName.length > 24) {
                return res.status(400).json({ ok: false, error: 'Specify a valid working map name (e.g. 2-8, 4-4, Eternal Blacklight).' });
            }
            let mapVal = parseInt(mapName, 10);
            if (isNaN(mapVal)) {
                const MAP_IDS = {
                    '1-1': 1, '1-2': 2, '1-3': 3, '1-4': 4,
                    '2-1': 5, '2-2': 6, '2-3': 7, '2-4': 8,
                    '3-1': 9, '3-2': 10, '3-3': 11, '3-4': 12,
                    '4-1': 13, '4-2': 14, '4-3': 15, '4-4': 16,
                    '4-5': 17,
                    '1-5': 18, '1-6': 19, '1-7': 20, '1-8': 21,
                    '2-5': 22, '2-6': 23, '2-7': 24, '2-8': 24,
                    '3-5': 25, '3-6': 26, '3-7': 27, '3-8': 28,
                    '5-1': 91, '5-2': 92, '5-3': 93,
                    'eternal': 307
                };
                const mLower = mapName.toLowerCase();
                mapVal = MAP_IDS[mLower] !== undefined ? MAP_IDS[mLower] : 24;
            }
            toolName = 'set_config';
            toolArgs = { path: 'general.working_map', value: mapVal };
            break;
        }

        case 'set-profile': {
            const profile = String(args.profile || '').trim();
            if (!profile || profile.length > 40) {
                return res.status(400).json({ ok: false, error: 'Specify a valid config profile name.' });
            }
            toolName = 'set_profile';
            toolArgs = { profile };
            break;
        }

        case 'move-stop':
            toolName = 'move';
            toolArgs = { action: 'stop', stop_hard: Boolean(args.hard) };
            break;

        case 'move-random':
            toolName = 'move';
            toolArgs = { action: 'random' };
            break;

        default:
            return res.status(400).json({
                ok: false,
                error: `Unknown or unpermitted MCP command '${cmd}'.`
            });
    }

    try {
        const rpcCall = await callMcpWithAutoHeal('tools/call', {
            name: toolName,
            arguments: toolArgs
        });

        // Clear read cache after any mutating tool call; if reload_plugins was run, force re-handshake next time
        mcpState.readCache.clear();
        if (toolName === 'reload_plugins') {
            mcpState.initialized = false;
        }

        let parsedResult = rpcCall.result;
        if (parsedResult && Array.isArray(parsedResult.content) && parsedResult.content[0] && parsedResult.content[0].text) {
            try {
                parsedResult = JSON.parse(parsedResult.content[0].text);
            } catch (_) {}
        }

        return res.json({
            ok: true,
            tier: 'operator-write',
            command: cmd,
            tool: toolName,
            toolArgs,
            source: 'live-mcp',
            port: rpcCall.port,
            latencyMs: rpcCall.latencyMs,
            data: sanitizeMcpData(parsedResult, 'tool')
        });
    } catch (err) {
        // Fallback for offline/standby mode: query configuration from snapshot cache
        if (toolName === 'get_config') {
            const snapConfig = (mcpSnapshotCache && mcpSnapshotCache.resources && mcpSnapshotCache.resources.config) || {};
            let returnData = snapConfig;
            if (toolArgs.path) {
                const parts = toolArgs.path.split('.');
                let curr = snapConfig;
                for (const p of parts) {
                    if (curr && typeof curr === 'object' && p in curr) {
                        curr = curr[p];
                    } else {
                        curr = null;
                        break;
                    }
                }
                returnData = curr !== null ? curr : snapConfig;
            }
            return res.json({
                ok: true,
                tier: 'operator-write',
                command: cmd,
                tool: toolName,
                toolArgs,
                source: 'cached-snapshot',
                port: mcpState.activePort,
                latencyMs: 0,
                offlineReason: err.message,
                data: sanitizeMcpData(returnData, 'config')
            });
        }

        // Fallback for offline/standby mode: hot-mutate snapshot config in memory
        if (toolName === 'set_config' || toolName === 'set_profile') {
            if (!mcpSnapshotCache.resources) mcpSnapshotCache.resources = {};
            if (!mcpSnapshotCache.resources.config) mcpSnapshotCache.resources.config = {};
            const cfg = mcpSnapshotCache.resources.config;

            if (toolName === 'set_profile') {
                cfg.profile = toolArgs.profile;
            } else if (toolName === 'set_config' && toolArgs.path) {
                const parts = toolArgs.path.split('.');
                let curr = cfg;
                for (let i = 0; i < parts.length - 1; i++) {
                    if (!curr[parts[i]] || typeof curr[parts[i]] !== 'object') {
                        curr[parts[i]] = {};
                    }
                    curr = curr[parts[i]];
                }
                curr[parts[parts.length - 1]] = toolArgs.value;

                if (toolArgs.path === 'general.working_map') {
                    if (mcpSnapshotCache.resources.status) {
                        mcpSnapshotCache.resources.status.map_name = String(toolArgs.value);
                    }
                    if (mcpSnapshotCache.resources.hero) {
                        mcpSnapshotCache.resources.hero.map_name = String(toolArgs.value);
                    }
                } else if (toolArgs.path === 'general.offensive_config') {
                    if (mcpSnapshotCache.resources.hero) {
                        mcpSnapshotCache.resources.hero.config = Number(toolArgs.value) || 1;
                    }
                }
            }

            mcpState.readCache.clear();
            return res.json({
                ok: true,
                tier: 'operator-write',
                command: cmd,
                tool: toolName,
                toolArgs,
                source: 'cached-snapshot',
                port: mcpState.activePort,
                latencyMs: 0,
                notice: 'Standby mode: Applied to snapshot in-memory cache (Live tunnel standby)',
                data: {
                    status: 'OK',
                    path: toolArgs.path || (toolName === 'set_profile' ? 'profile' : 'config'),
                    value: toolArgs.value !== undefined ? toolArgs.value : toolArgs.profile,
                    applied: true
                }
            });
        }

        return res.status(503).json({
            ok: false,
            tier: 'operator-write',
            command: cmd,
            tool: toolName,
            error: `Live MCP tunnel required for mutating tool '${toolName}': ${err.message}`
        });
    }
});

// ===========================================================================
// PURE SERVER & SECURITY TELEMETRY ENGINE (Section 06 · SecOps)
//   1. Cloudflare Edge & Perimeter (live req headers + 1.1.1.1/cdn-cgi/trace)
//   2. Local PM2 & Systemd Supervisor (live `pm2 jlist` + `systemctl is-active`)
//   3. Live CVE / CISA KEV Vulnerability Radar (sorted newest + infra filtered)
// ===========================================================================
const secOpsCache = {
    cfTrace: { ts: 0, data: null },
    cveFeed: { ts: 0, data: null }
};

const FALLBACK_CVE_LIST = [
    {
        cveID: 'CVE-2025-24472',
        vendorProject: 'Fortinet',
        product: 'FortiOS / FortiProxy',
        vulnerabilityName: 'Fortinet FortiOS and FortiProxy Authentication Bypass Vulnerability',
        dateAdded: '2025-02-11',
        dueDate: '2025-03-04',
        knownRansomwareCampaignUse: 'Known',
        cwes: ['CWE-288'],
        shortDescription: 'Fortinet FortiOS and FortiProxy contain an authentication bypass vulnerability using an alternate path or channel affecting CSF proxy requests.'
    },
    {
        cveID: 'CVE-2025-0282',
        vendorProject: 'Ivanti',
        product: 'Connect Secure / Policy Secure',
        vulnerabilityName: 'Ivanti Connect Secure Stack-Based Buffer Overflow Vulnerability',
        dateAdded: '2025-01-08',
        dueDate: '2025-01-15',
        knownRansomwareCampaignUse: 'Known',
        cwes: ['CWE-121'],
        shortDescription: 'Ivanti Connect Secure, Policy Secure, and Neurons for ZTA Gateways contain a stack-based buffer overflow allowing unauthenticated remote code execution.'
    },
    {
        cveID: 'CVE-2024-6387',
        vendorProject: 'OpenBSD',
        product: 'OpenSSH (regreSSHion)',
        vulnerabilityName: 'OpenSSH Server Signal Handler Race Condition Vulnerability',
        dateAdded: '2024-07-02',
        dueDate: '2024-07-23',
        knownRansomwareCampaignUse: 'Unknown',
        cwes: ['CWE-362'],
        shortDescription: 'OpenSSH server (sshd) on glibc-based Linux systems contains a signal handler race condition allowing unauthenticated remote code execution as root.'
    },
    {
        cveID: 'CVE-2024-21626',
        vendorProject: 'Linux Foundation',
        product: 'runc (Docker / Kubernetes)',
        vulnerabilityName: 'runc File Descriptor Leak Container Escape Vulnerability',
        dateAdded: '2024-02-09',
        dueDate: '2024-03-01',
        knownRansomwareCampaignUse: 'Unknown',
        cwes: ['CWE-403'],
        shortDescription: 'runc container runtime contains an internal file descriptor leak via WORKDIR that allows container escape to the underlying Linux host.'
    },
    {
        cveID: 'CVE-2024-1086',
        vendorProject: 'Linux',
        product: 'Linux Kernel (nf_tables)',
        vulnerabilityName: 'Linux Kernel netfilter nf_tables Use-After-Free Privilege Escalation',
        dateAdded: '2024-05-30',
        dueDate: '2024-06-20',
        knownRansomwareCampaignUse: 'Known',
        cwes: ['CWE-416'],
        shortDescription: 'The Linux kernel netfilter: nf_tables component contains a use-after-free vulnerability in nft_verdict_init() allowing local privilege escalation to root.'
    },
    {
        cveID: 'CVE-2024-3400',
        vendorProject: 'Palo Alto Networks',
        product: 'PAN-OS GlobalProtect',
        vulnerabilityName: 'Palo Alto Networks PAN-OS Command Injection Vulnerability',
        dateAdded: '2024-04-12',
        dueDate: '2024-04-19',
        knownRansomwareCampaignUse: 'Known',
        cwes: ['CWE-77'],
        shortDescription: 'Palo Alto Networks PAN-OS software contains a command injection vulnerability in the GlobalProtect feature allowing unauthenticated root arbitrary code execution.'
    }
];

async function getCloudflareEdgeTrace(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && secOpsCache.cfTrace.data && (now - secOpsCache.cfTrace.ts) < 60000) {
        return secOpsCache.cfTrace.data;
    }

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        const resp = await fetch('https://1.1.1.1/cdn-cgi/trace', { signal: controller.signal });
        clearTimeout(timer);
        if (resp.ok) {
            const text = await resp.text();
            const kv = {};
            text.split(/\r?\n/).forEach(line => {
                const idx = line.indexOf('=');
                if (idx > 0) {
                    kv[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
                }
            });
            const parsed = {
                fl: kv.fl || 'edge-node',
                colo: kv.colo || 'LAX',
                http: kv.http || 'http/2',
                tls: kv.tls || 'TLSv1.3',
                loc: kv.loc || 'US',
                warp: kv.warp || 'off',
                sni: kv.sni || 'plaintext'
            };
            secOpsCache.cfTrace = { ts: now, data: parsed };
            return parsed;
        }
    } catch (e) { /* fallback below */ }

    return secOpsCache.cfTrace.data || {
        fl: '618f218',
        colo: 'LAX',
        http: 'http/2',
        tls: 'TLSv1.3',
        loc: 'US',
        warp: 'off',
        sni: 'encrypted'
    };
}

function getLocalPm2AndSystemdTelemetry() {
    return new Promise((resolve) => {
        execFile('pm2', ['jlist'], { timeout: 3500 }, (pm2Err, pm2Stdout) => {
            let processes = [];
            if (!pm2Err && pm2Stdout) {
                try {
                    const rawList = JSON.parse(pm2Stdout);
                    if (Array.isArray(rawList)) {
                        processes = rawList.map(proc => {
                            const env = proc.pm2_env || {};
                            const monit = proc.monit || {};
                            const uptimeMs = env.pm_uptime ? Math.max(0, Date.now() - env.pm_uptime) : 0;
                            return {
                                id: `pm2:${proc.pm_id !== undefined ? proc.pm_id : 0}`,
                                name: proc.name || 'node-app',
                                type: env.exec_mode ? String(env.exec_mode).replace('_mode', '') : 'fork',
                                pid: proc.pid || 0,
                                status: env.status || 'online',
                                cpu: Number(monit.cpu || 0),
                                memMb: Number(((monit.memory || 0) / 1048576).toFixed(1)),
                                restarts: Number(env.restart_time || 0),
                                uptimeSeconds: Math.floor(uptimeMs / 1000),
                                nodeVersion: env.node_version || process.version.replace(/^v/, '')
                            };
                        });
                    }
                } catch (parseErr) { /* fallback below */ }
            }

            // Fallback if running on local dev machine without pm2
            if (processes.length === 0) {
                processes = [
                    {
                        id: 'pm2:0',
                        name: 'portfolio',
                        type: 'fork',
                        pid: process.pid,
                        status: 'online',
                        cpu: 0.3,
                        memMb: Number((process.memoryUsage().rss / 1048576).toFixed(1)),
                        restarts: 0,
                        uptimeSeconds: Math.floor(process.uptime()),
                        nodeVersion: process.version.replace(/^v/, '')
                    },
                    {
                        id: 'pm2:1',
                        name: 'preswin',
                        type: 'fork',
                        pid: 602076,
                        status: 'online',
                        cpu: 0.2,
                        memMb: 121.8,
                        restarts: 7,
                        uptimeSeconds: 302400,
                        nodeVersion: process.version.replace(/^v/, '')
                    }
                ];
            }

            // Probe systemd services (mcp-costalito tunnel + nginx reverse proxy)
            execFile('systemctl', ['is-active', 'mcp-costalito.service', 'nginx'], { timeout: 2000 }, (_sysErr, sysOut) => {
                const lines = String(sysOut || '').trim().split(/\r?\n/);
                const tunnelState = (lines[0] || 'active').trim();
                const nginxState = (lines[1] || 'active').trim();

                const systemdUnits = [
                    {
                        id: 'systemd:tunnel',
                        name: 'mcp-costalito.service',
                        type: 'ssh-tunnel :9876',
                        pid: 0,
                        status: tunnelState === 'active' ? 'online' : tunnelState,
                        cpu: 0.0,
                        memMb: 5.4,
                        restarts: 0,
                        uptimeSeconds: Math.floor(os.uptime())
                    },
                    {
                        id: 'systemd:proxy',
                        name: 'nginx.service',
                        type: 'reverse-proxy :443',
                        pid: 0,
                        status: nginxState === 'active' ? 'online' : nginxState,
                        cpu: 0.1,
                        memMb: 12.4,
                        restarts: 0,
                        uptimeSeconds: Math.floor(os.uptime())
                    }
                ];

                const allDaemons = [...processes, ...systemdUnits];
                const totalRssMb = Number(allDaemons.reduce((sum, d) => sum + (d.memMb || 0), 0).toFixed(1));
                const onlineCount = allDaemons.filter(d => d.status === 'online' || d.status === 'active').length;

                resolve({
                    processes,
                    systemdUnits,
                    allDaemons,
                    onlineCount,
                    totalCount: allDaemons.length,
                    totalRssMb,
                    tunnelActive: tunnelState === 'active',
                    nginxActive: nginxState === 'active'
                });
            });
        });
    });
}

function mapCisaVuln(v) {
    return {
        id: v.cveID,
        vendor: v.vendorProject || 'Vendor',
        product: v.product || 'System',
        name: v.vulnerabilityName || v.cveID,
        dateAdded: v.dateAdded || '2026-01-01',
        dueDate: v.dueDate || '--',
        ransomware: v.knownRansomwareCampaignUse === 'Known',
        cwe: Array.isArray(v.cwes) && v.cwes.length > 0 ? v.cwes[0] : 'CWE-NVD',
        summary: v.shortDescription || 'Active exploitation tracked in CISA KEV catalog.',
        url: `https://nvd.nist.gov/vuln/detail/${encodeURIComponent(v.cveID)}`
    };
}

async function getCveRadarFeed(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && secOpsCache.cveFeed.data && (now - secOpsCache.cveFeed.ts) < 900000) {
        return secOpsCache.cveFeed.data;
    }

    const infraRegex = /linux|kernel|debian|ubuntu|canonical|openssh|openbsd|nginx|apache|docker|runc|kubernetes|proxmox|vmware|fortinet|ivanti|cisco|palo alto|juniper|postgresql|redis|node|openssl|git/i;

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const resp = await fetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', {
            signal: controller.signal
        });
        clearTimeout(timer);

        if (resp.ok) {
            const catalog = await resp.json();
            const rawVulns = Array.isArray(catalog.vulnerabilities) ? catalog.vulnerabilities : [];
            // Sort newest first by dateAdded, then by CVE ID descending
            const sorted = rawVulns.slice().sort((a, b) => {
                const cmp = String(b.dateAdded || '').localeCompare(String(a.dateAdded || ''));
                if (cmp !== 0) return cmp;
                return String(b.cveID || '').localeCompare(String(a.cveID || ''));
            });

            const latest = sorted.slice(0, 6).map(mapCisaVuln);
            const infra = sorted
                .filter(v => infraRegex.test(`${v.vendorProject} ${v.product} ${v.vulnerabilityName}`))
                .slice(0, 6)
                .map(mapCisaVuln);
            const ransomware = sorted
                .filter(v => v.knownRansomwareCampaignUse === 'Known')
                .slice(0, 6)
                .map(mapCisaVuln);

            const payload = {
                source: 'cisa-kev-live',
                catalogVersion: catalog.catalogVersion || new Date().toISOString().slice(0, 10),
                totalTracked: catalog.count || rawVulns.length,
                categories: {
                    latest: latest.length ? latest : FALLBACK_CVE_LIST.map(mapCisaVuln),
                    infra: infra.length ? infra : FALLBACK_CVE_LIST.map(mapCisaVuln),
                    ransomware: ransomware.length ? ransomware : FALLBACK_CVE_LIST.map(mapCisaVuln)
                }
            };
            secOpsCache.cveFeed = { ts: now, data: payload };
            return payload;
        }
    } catch (err) {
        console.warn('CISA KEV fetch warning (using cached/fallback):', err.message);
    }

    if (secOpsCache.cveFeed.data) return secOpsCache.cveFeed.data;

    const mappedFallback = FALLBACK_CVE_LIST.map(mapCisaVuln);
    return {
        source: 'kev-snapshot',
        catalogVersion: '2026.10',
        totalTracked: 1739,
        categories: {
            latest: mappedFallback,
            infra: mappedFallback,
            ransomware: mappedFallback.filter(v => v.ransomware)
        }
    };
}

app.get('/api/security-telemetry', async (req, res) => {
    const forceRefresh = req.query.refresh === '1';
    res.setHeader('Cache-Control', 'no-store');

    const [cfTrace, pm2Data, cveRadar] = await Promise.all([
        getCloudflareEdgeTrace(forceRefresh),
        getLocalPm2AndSystemdTelemetry(),
        getCveRadarFeed(forceRefresh)
    ]);

    const cfRayHeader = req.headers['cf-ray'] || null;
    const visitorColo = cfRayHeader && cfRayHeader.includes('-')
        ? cfRayHeader.split('-').pop().toUpperCase()
        : (cfTrace.colo || 'LAX');
    const visitorCountry = (req.headers['cf-ipcountry'] || 'MX').toUpperCase();
    const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'https');

    const memTotalMb = Math.round(os.totalmem() / 1048576);
    const memUsedMb = Math.round((os.totalmem() - os.freemem()) / 1048576);
    const memPct = Number(((memUsedMb / (memTotalMb || 1)) * 100).toFixed(1));
    const loadAvg = os.loadavg().map(n => n.toFixed(2)).join(', ');

    res.json({
        ok: true,
        timestamp: new Date().toISOString(),
        cloudflare: {
            status: 'ACTIVE',
            visitorRay: cfRayHeader || `${cfTrace.fl}-${visitorColo}`,
            visitorColo,
            visitorCountry,
            vpsEdgeColo: cfTrace.colo || 'LAX',
            vpsEdgeLoc: cfTrace.loc || 'US',
            vpsEdgeFl: cfTrace.fl || '618f218',
            httpVersion: (cfTrace.http || 'http/2').toUpperCase(),
            tlsVersion: cfTrace.tls || 'TLSv1.3',
            scheme: proto.toUpperCase(),
            sniMode: cfTrace.sni || 'encrypted',
            warpState: cfTrace.warp || 'off',
            originGateway: 'Nginx 1.26 -> 127.0.0.1:3000',
            firewallPosture: 'nftables + Loopback SSH (:9876)'
        },
        pm2: {
            host: os.hostname(),
            kernel: `${os.type()} ${os.release()}`,
            uptimeSeconds: Math.floor(os.uptime()),
            loadAvg,
            memUsedMb,
            memTotalMb,
            memPct,
            onlineCount: pm2Data.onlineCount,
            totalCount: pm2Data.totalCount,
            totalRssMb: pm2Data.totalRssMb,
            tunnelActive: pm2Data.tunnelActive,
            nginxActive: pm2Data.nginxActive,
            daemons: pm2Data.allDaemons
        },
        cveRadar
    });
});

app.listen(PORT, () => {
    console.log(`Server online on port ${PORT}`);
});


