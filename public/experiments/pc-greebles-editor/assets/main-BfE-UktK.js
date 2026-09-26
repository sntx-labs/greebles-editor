// greebles_001
// Customizable sci-fi greeble generator for embeddable website backgrounds

const stage = document.getElementById('stage');
const displayCanvas = document.getElementById('canvas');
const controls = document.getElementById('controls');
const DPR = window.devicePixelRatio || 1;
const searchParams = new URLSearchParams(window.location.search);
const isStaticCustomer = window.__GREEBLES_STATIC_CUSTOMER__ === true;
const isEmbedMode = window.__GREEBLES_EMBED__ === true || searchParams.get('embed') === '1';
let W, H;
let resizeFrame = 0;
let resizeTimer = 0;

// ── Config ──────────────────────────────────────────────
const DEFAULT_CONFIG = {
  bgColor: '#0a0a08',
  panelBg: '#0e0e0b',
  borderColor: '#2a2a1e',
  accentColor: '#ff7b00',
  accentDim: '#00ccff',
  accentBright: '#ffae00',
  glowColor: '#ffbf00',
  textColor: '#887744',
  glowIntensity: 2.0,
  animationSpeed: 1.0,
  greeblingDensity: 0.75,
  panelSpacing: 5,
  floatingDensity: 1,
  colorPreset: 'Default',
};

const config = { ...DEFAULT_CONFIG };
const exportSettings = {
  iframeHeight: 720,
};

const colorKeys = [
  'bgColor',
  'panelBg',
  'borderColor',
  'accentColor',
  'accentDim',
  'accentBright',
  'glowColor',
  'textColor',
];

const exportKeys = [
  'bgColor',
  'panelBg',
  'borderColor',
  'accentColor',
  'accentDim',
  'accentBright',
  'glowColor',
  'textColor',
  'glowIntensity',
  'animationSpeed',
  'greeblingDensity',
  'panelSpacing',
  'floatingDensity',
  'colorPreset',
];

const colorPresets = {
  Default: {
    bgColor: '#0a0a08',
    panelBg: '#0e0e0b',
    borderColor: '#2a2a1e',
    accentColor: '#ff7b00',
    accentDim: '#00ccff',
    accentBright: '#ffae00',
    glowColor: '#ffbf00',
    textColor: '#887744',
  },
  'Ice Station': {
    bgColor: '#05080a',
    panelBg: '#09131b',
    borderColor: '#183448',
    accentColor: '#58d7ff',
    accentDim: '#ff9a4d',
    accentBright: '#d8fbff',
    glowColor: '#9ae8ff',
    textColor: '#6f9fb0',
  },
  'Reactor Core': {
    bgColor: '#0a0605',
    panelBg: '#1b0f0b',
    borderColor: '#4a2416',
    accentColor: '#ff5b2e',
    accentDim: '#4ecbff',
    accentBright: '#fff0a8',
    glowColor: '#ffb347',
    textColor: '#aa6f52',
  },
  'Bio Terminal': {
    bgColor: '#040805',
    panelBg: '#08140d',
    borderColor: '#1a3c28',
    accentColor: '#56ff87',
    accentDim: '#c86cff',
    accentBright: '#d9ffe6',
    glowColor: '#87ffb7',
    textColor: '#6ea47c',
  },
  'Ultraviolet': {
    bgColor: '#06050a',
    panelBg: '#120d1d',
    borderColor: '#342258',
    accentColor: '#b06cff',
    accentDim: '#9cff57',
    accentBright: '#ffd0ff',
    glowColor: '#d296ff',
    textColor: '#8d7bb0',
  },
  'Amber Monochrome': {
    bgColor: '#080603',
    panelBg: '#120c06',
    borderColor: '#47311b',
    accentColor: '#ff9c1a',
    accentDim: '#53c8ff',
    accentBright: '#ffe29a',
    glowColor: '#ffc14d',
    textColor: '#9d7743',
  },
};

function readConfigFromUrl() {
  const inlineConfig = window.__GREEBLES_CONFIG__;

  if (inlineConfig && typeof inlineConfig === 'object') {
    exportKeys.forEach((key) => {
      if (Object.hasOwn(inlineConfig, key)) {
        config[key] = inlineConfig[key];
      }
    });
  }

  const encoded = searchParams.get('config');

  if (!encoded) return;

  try {
    const parsed = JSON.parse(atob(encoded));
    if (parsed && typeof parsed === 'object') {
      exportKeys.forEach((key) => {
        if (Object.hasOwn(parsed, key)) {
          config[key] = parsed[key];
        }
      });
    }
  } catch (error) {
    console.warn('Unable to parse config from URL.', error);
  }
}

function getSerializableConfig() {
  return exportKeys.reduce((payload, key) => {
    payload[key] = config[key];
    return payload;
  }, {});
}

function buildShareUrl({ embed = false } = {}) {
  const url = new URL(window.location.href);
  url.searchParams.set('config', btoa(JSON.stringify(getSerializableConfig())));
  if (embed) {
    url.searchParams.set('embed', '1');
  } else {
    url.searchParams.delete('embed');
  }
  return url.toString();
}

function escapeHtmlAttribute(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

let mainSourcePromise = null;

async function getMainSource() {
  if (typeof window.__GREEBLES_MAIN_SOURCE__ === 'string' && window.__GREEBLES_MAIN_SOURCE__.length > 0) {
    return window.__GREEBLES_MAIN_SOURCE__;
  }

  if (!mainSourcePromise) {
    mainSourcePromise = fetch(new URL('./main.js', import.meta.url)).then((response) => response.text());
  }

  return mainSourcePromise;
}

async function buildStandaloneHtml() {
  const mainSource = await getMainSource();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>greebles_001 Embed</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: ${config.bgColor}; }
    body.embed-mode { color: #fff; }
    #stage { position: relative; width: 100%; height: 100%; overflow: hidden; background: ${config.bgColor}; }
    #canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  </style>
</head>
<body>
  <div id="stage">
    <canvas id="canvas"></canvas>
  </div>
  <script>
    window.__GREEBLES_EMBED__ = true;
    window.__GREEBLES_CONFIG__ = ${JSON.stringify(getSerializableConfig())};
  </script>
  <script type="module">
${mainSource}
  </script>
</body>
</html>`;
}

async function buildIframeSrcdocMarkup() {
  const html = await buildStandaloneHtml();
  const heightPx = `${Math.round(exportSettings.iframeHeight)}px`;
  const iframeMarkup = `<div style="width:100%;height:${heightPx};overflow:hidden;"><iframe srcdoc="${escapeHtmlAttribute(html)}" loading="lazy" title="greebles_001 embed" scrolling="no" sandbox="allow-scripts" style="width:100%;height:100%;border:0;display:block;overflow:hidden;background:${config.bgColor};" referrerpolicy="no-referrer"></iframe></div>`;

  return iframeMarkup;
}

function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.position = 'fixed';
    toast.style.left = '50%';
    toast.style.bottom = '24px';
    toast.style.transform = 'translateX(-50%)';
    toast.style.padding = '10px 14px';
    toast.style.border = '1px solid rgba(255, 174, 0, 0.35)';
    toast.style.background = 'rgba(10, 10, 8, 0.92)';
    toast.style.color = '#fff0b8';
    toast.style.font = '12px/1.2 monospace';
    toast.style.letterSpacing = '0.04em';
    toast.style.zIndex = '100';
    toast.style.pointerEvents = 'none';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.style.opacity = '1';
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.style.opacity = '0';
  }, 1600);
}

async function copyText(value, message) {
  try {
    await navigator.clipboard.writeText(value);
    showToast(message);
  } catch (error) {
    console.error('Clipboard write failed.', error);
    window.alert(value);
  }
}

function downloadTextFile(filename, contents) {
  const blob = new Blob([contents], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function showStartHereSplash() {
  if (isEmbedMode || !isStaticCustomer) return;

  const overlay = document.createElement('div');
  overlay.id = 'start-here';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.zIndex = '120';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'flex-start';
  overlay.style.justifyContent = 'flex-start';
  overlay.style.padding = '24px';
  overlay.style.pointerEvents = 'none';

  const card = document.createElement('div');
  card.style.width = 'min(360px, calc(100vw - 48px))';
  card.style.padding = '16px 18px 14px';
  card.style.border = '1px solid rgba(255, 174, 0, 0.3)';
  card.style.background = 'rgba(8, 8, 8, 0.92)';
  card.style.boxShadow = '0 14px 40px rgba(0, 0, 0, 0.4)';
  card.style.color = '#f3e6b1';
  card.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  card.style.pointerEvents = 'auto';

  const title = document.createElement('div');
  title.textContent = 'Start Here';
  title.style.fontSize = '14px';
  title.style.fontWeight = '700';
  title.style.letterSpacing = '0.08em';
  title.style.textTransform = 'uppercase';
  title.style.marginBottom = '10px';

  const body = document.createElement('div');
  body.style.fontSize = '12px';
  body.style.lineHeight = '1.55';
  body.style.color = '#d5c990';
  body.innerHTML = [
    '1. Tweak colors, density, glow, and motion.',
    '2. Set the export height for your layout.',
    '3. Use <strong>Copy Iframe Embed</strong> for Webflow or Framer.',
    '4. If a builder rejects large embeds, use <strong>Download Standalone HTML</strong>.',
  ].join('<br>');

  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Got it';
  close.style.marginTop = '12px';
  close.style.padding = '8px 12px';
  close.style.border = '1px solid rgba(255, 174, 0, 0.28)';
  close.style.background = 'rgba(255, 174, 0, 0.1)';
  close.style.color = '#fff0b8';
  close.style.cursor = 'pointer';
  close.style.font = 'inherit';
  close.addEventListener('click', () => overlay.remove());

  card.append(title, body, close);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

readConfigFromUrl();
document.body.classList.toggle('embed-mode', isEmbedMode);
document.title = isEmbedMode ? 'greebles_001 Embed' : 'greebles_001 Editor';
showStartHereSplash();

const ctx = displayCanvas.getContext('2d', { alpha: false });

function resize() {
  const controlsWidth = !isEmbedMode && controls ? controls.clientWidth : 0;
  const nextWidth = stage.clientWidth || (window.innerWidth - controlsWidth);
  const nextHeight = stage.clientHeight || window.innerHeight;

  if (!nextWidth || !nextHeight) return;

  W = nextWidth;
  H = nextHeight;
  displayCanvas.width = Math.max(1, Math.round(W * DPR));
  displayCanvas.height = Math.max(1, Math.round(H * DPR));
  displayCanvas.style.width = `${W}px`;
  displayCanvas.style.height = `${H}px`;
  regeneratePanelLayout();
}

function hasValidViewportSize() {
  return Number.isFinite(W) && Number.isFinite(H) && W > 0 && H > 0;
}

function scheduleResize() {
  if (resizeTimer) clearTimeout(resizeTimer);
  if (resizeFrame) {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = 0;
  }

  // Wait for the stage/sidebar transition to settle so we only rebuild once.
  resizeTimer = window.setTimeout(() => {
    resizeTimer = 0;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      resize();
    });
  }, 120);
}

window.addEventListener('resize', scheduleResize);
new ResizeObserver(scheduleResize).observe(stage);

// ── SHPanel ─────────────────────────────────────────────
let panelLayout = [];
const colorControls = {};

function applyColorPreset(presetName) {
  const preset = colorPresets[presetName];
  if (!preset) return;

  config.colorPreset = presetName;

  colorKeys.forEach((key) => {
    config[key] = preset[key];
    colorControls[key]?.setValue(preset[key]);
  });
}

function regeneratePanelLayout() {
  panelLayout = generatePanelLayout({
    revealStartAt: performance.now() + 20,
    revealStepMs: 6,
    revealDurationMs: 90,
    maxRevealTotalMs: 350,
  });
}

if (!isEmbedMode && controls && window.SHPanel) {
  const panel = new SHPanel(controls);
  const colorsF = panel.folder('Colors');
  const colorPresetControl = colorsF.select(config, 'colorPreset', {
    label: 'Color Preset',
    options: Object.keys(colorPresets),
  });
  colorPresetControl.on('change', (event) => {
    applyColorPreset(event.value);
    colorPresetControl.setValue(config.colorPreset);
  });

  colorControls.bgColor = colorsF.color(config, 'bgColor', { label: 'Background' });
  colorControls.panelBg = colorsF.color(config, 'panelBg', { label: 'Panel Fill' });
  colorControls.borderColor = colorsF.color(config, 'borderColor', { label: 'Borders' });
  colorControls.accentColor = colorsF.color(config, 'accentColor', { label: 'Accent' });
  colorControls.accentDim = colorsF.color(config, 'accentDim', { label: 'Accent Dim' });
  colorControls.accentBright = colorsF.color(config, 'accentBright', { label: 'Accent Bright' });
  colorControls.glowColor = colorsF.color(config, 'glowColor', { label: 'Glow' });
  colorControls.textColor = colorsF.color(config, 'textColor', { label: 'Text' });

  const compositionF = panel.folder('Composition');
  compositionF.slider(config, 'greeblingDensity', { min: 0.35, max: 2.5, step: 0.05, label: 'Density' })
    .on('change', regeneratePanelLayout);
  compositionF.slider(config, 'panelSpacing', { min: 2, max: 14, step: 1, label: 'Panel Spacing' })
    .on('change', regeneratePanelLayout);
  compositionF.slider(config, 'floatingDensity', { min: 0, max: 2, step: 0.05, label: 'Floating Detail' });

  const fxF = panel.folder('Effects');
  fxF.slider(config, 'glowIntensity', { min: 0.2, max: 3, step: 0.05, label: 'Glow Strength' });

  const animF = panel.folder('Animation');
  animF.slider(config, 'animationSpeed', { min: 0, max: 3, step: 0.1, label: 'Speed' });

  const exportF = panel.folder('Export');
  exportF.slider(exportSettings, 'iframeHeight', { min: 240, max: 1400, step: 10, label: 'Embed Height' });
  exportF.button('Copy Config JSON', () => {
    copyText(JSON.stringify(getSerializableConfig(), null, 2), 'Copied config JSON');
  });
  if (!isStaticCustomer) {
    exportF.button('Copy Share URL', () => {
      copyText(buildShareUrl(), 'Copied share URL');
    });
  }
  exportF.button('Copy Iframe Embed', async () => {
    const iframeMarkup = await buildIframeSrcdocMarkup();
    copyText(iframeMarkup, 'Copied iframe embed');
  });
  exportF.button('Download Standalone HTML', async () => {
    const standaloneHtml = await buildStandaloneHtml();
    downloadTextFile('greebles-001-embed.html', standaloneHtml);
    showToast('Downloaded standalone HTML');
  });
  exportF.button('Reset Defaults', () => {
    Object.assign(config, DEFAULT_CONFIG);
    applyColorPreset(config.colorPreset);
    regeneratePanelLayout();
    showToast('Reset to defaults');
  });
} else if (controls) {
  controls.hidden = true;
}

scheduleResize();

// ── Helpers ─────────────────────────────────────────────
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// Seeded pseudo-random for deterministic panel layout
let seed = 42;
function srand(s) { seed = s; }
function rand() {
  seed = (seed * 16807 + 0) % 2147483647;
  return (seed - 1) / 2147483646;
}

// ── PARTICLE SPHERE ─────────────────────────────────────
const spherePoints = [];
function initSphere() {
  const latitudes = 40;
  const dotsPerLat = 80;
  for (let lat = 0; lat < latitudes; lat++) {
    const phi = (lat / (latitudes - 1)) * Math.PI;
    const count = Math.floor(dotsPerLat * Math.sin(phi)) + 1;
    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2;
      spherePoints.push({
        phi,
        theta,
        baseAlpha: 0.3 + rand() * 0.5,
        flicker: rand() * 0.02 + 0.002,
        offset: rand() * Math.PI * 2,
      });
    }
  }
}
srand(77);
initSphere();

function drawSphere(t) {
  const cx = W * 0.5;
  const cy = H * 0.5;
  const r = Math.min(W, H) * 0.26;
  const spd = t * 0.0003 * config.sphereRotation;

  // Faint outer rings (concentric)
  for (let i = 1; i <= 8; i++) {
    const rr = r + i * 12;
    ctx.strokeStyle = rgba(config.borderColor, 0.08 + 0.02 * Math.sin(t * 0.0005 + i));
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Dots
  spherePoints.forEach(p => {
    const theta = p.theta + spd;
    const x3d = Math.sin(p.phi) * Math.cos(theta);
    const y3d = Math.cos(p.phi);
    const z3d = Math.sin(p.phi) * Math.sin(theta);

    // Only front-facing
    if (z3d < -0.05) return;

    const px = cx + x3d * r;
    const py = cy + y3d * r;
    const depth = (z3d + 1) / 2;
    const flicker = 0.5 + 0.5 * Math.sin(t * p.flicker + p.offset);
    const alpha = p.baseAlpha * depth * flicker;

    ctx.fillStyle = rgba(config.sphereDotColor, alpha);
    const sz = config.sphereDotSize * (0.5 + depth * 0.8);
    ctx.fillRect(Math.floor(px), Math.floor(py), Math.ceil(sz), Math.ceil(sz));
  });

  // North pole glow
  const polePulse = 0.7 + 0.3 * Math.sin(t * 0.002);
  for (let i = 4; i >= 0; i--) {
    const gr = 6 + i * 10;
    const a = (0.15 - i * 0.025) * polePulse * config.glowIntensity;
    const grad = ctx.createRadialGradient(cx, cy - r, 0, cx, cy - r, gr);
    grad.addColorStop(0, rgba(config.sphereGlowColor, a));
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - gr, cy - r - gr, gr * 2, gr * 2);
  }
  // Core
  ctx.fillStyle = rgba(config.sphereGlowColor, 0.9 * polePulse);
  ctx.beginPath();
  ctx.arc(cx, cy - r, 4, 0, Math.PI * 2);
  ctx.fill();
}

// ── PANEL TYPES ─────────────────────────────────────────
// Each draws into a rectangular area with dense greebling detail

function drawPanelBorder(x, y, w, h) {
  ctx.strokeStyle = rgba(config.borderColor, 0.5);
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = rgba(config.panelBg, 0.6);
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);

  // Corner greeblings
  const cs = 3;
  const cc = rgba(config.borderColor, 0.7);
  ctx.fillStyle = cc;
  // TL
  ctx.fillRect(x, y, cs, 1); ctx.fillRect(x, y, 1, cs);
  // TR
  ctx.fillRect(x + w - cs, y, cs, 1); ctx.fillRect(x + w - 1, y, 1, cs);
  // BL
  ctx.fillRect(x, y + h - 1, cs, 1); ctx.fillRect(x, y + h - cs, 1, cs);
  // BR
  ctx.fillRect(x + w - cs, y + h - 1, cs, 1); ctx.fillRect(x + w - 1, y + h - cs, 1, cs);
}

function drawPanelGlow() {
  if (config.glowIntensity <= 0) return;

  const blur = 8 + config.glowIntensity * 12;
  const alpha = Math.min(0.42, 0.04 + config.glowIntensity * 0.06);

  ctx.save();
  ctx.shadowColor = rgba(config.glowColor, 0.95);
  ctx.shadowBlur = blur;
  ctx.strokeStyle = rgba(config.glowColor, alpha);
  ctx.lineWidth = 1;

  panelLayout.forEach((panelItem) => {
    ctx.strokeRect(panelItem.x + 1, panelItem.y + 1, panelItem.w - 2, panelItem.h - 2);
  });

  ctx.restore();
}

function drawTicksH(x, y, w, spacing, t) {
  const count = Math.floor(w / spacing);
  for (let i = 0; i <= count; i++) {
    const tx = x + i * spacing;
    const tall = i % 4 === 0;
    const flicker = Math.sin(t * 0.003 + i * 0.8) > 0.3 ? 1 : 0.3;
    ctx.fillStyle = rgba(config.accentDim, 0.4 * flicker);
    ctx.fillRect(tx, y, 1, tall ? 4 : 2);
  }
}

function drawTicksV(x, y, h, spacing, t) {
  const count = Math.floor(h / spacing);
  for (let i = 0; i <= count; i++) {
    const ty = y + i * spacing;
    const wide = i % 4 === 0;
    const flicker = Math.sin(t * 0.002 + i * 1.1) > 0.2 ? 1 : 0.4;
    ctx.fillStyle = rgba(config.accentDim, 0.4 * flicker);
    ctx.fillRect(x, ty, wide ? 4 : 2, 1);
  }
}

function drawDotGrid(x, y, w, h, spacing, t, seedOffset) {
  for (let gx = 0; gx < w; gx += spacing) {
    for (let gy = 0; gy < h; gy += spacing) {
      const flicker = Math.sin(t * 0.002 + gx * 0.1 + gy * 0.15 + seedOffset) > 0.4;
      if (flicker) {
        ctx.fillStyle = rgba(config.accentDim, 0.2 + Math.sin(t * 0.003 + gx + gy) * 0.15);
        ctx.fillRect(x + gx, y + gy, 1, 1);
      }
    }
  }
}

function drawMicroText(x, y, t, seedVal) {
  srand(seedVal);
  const chars = '0123456789ABCDEF.:';
  let text = '';
  for (let i = 0; i < 6; i++) text += chars[Math.floor(rand() * chars.length)];
  ctx.fillStyle = rgba(config.textColor, 0.3 + 0.1 * Math.sin(t * 0.001 + seedVal));
  ctx.font = '6px monospace';
  ctx.fillText(text, x, y);
}

function drawRuneGlyph(x, y, scale, motif, alpha, bright = false) {
  const stroke = bright ? config.accentBright : config.accentColor;
  const dim = bright ? config.accentColor : config.accentDim;
  const glyph = ((motif % 6) + 6) % 6;

  ctx.strokeStyle = rgba(stroke, alpha);
  ctx.fillStyle = rgba(stroke, alpha * 0.7);
  ctx.lineWidth = 1;

  if (glyph === 0) {
    ctx.beginPath();
    ctx.moveTo(x, y - scale);
    ctx.lineTo(x, y + scale);
    ctx.moveTo(x - scale * 0.7, y - scale * 0.2);
    ctx.lineTo(x + scale * 0.7, y - scale * 0.8);
    ctx.moveTo(x - scale * 0.6, y + scale * 0.5);
    ctx.lineTo(x + scale * 0.5, y + scale * 0.2);
    ctx.stroke();
  } else if (glyph === 1) {
    ctx.beginPath();
    ctx.moveTo(x - scale * 0.8, y - scale);
    ctx.lineTo(x + scale * 0.2, y - scale);
    ctx.lineTo(x + scale * 0.8, y - scale * 0.15);
    ctx.lineTo(x - scale * 0.1, y + scale);
    ctx.lineTo(x - scale * 0.8, y + scale);
    ctx.stroke();
  } else if (glyph === 2) {
    ctx.beginPath();
    ctx.moveTo(x - scale * 0.8, y - scale * 0.8);
    ctx.lineTo(x, y - scale);
    ctx.lineTo(x + scale * 0.8, y - scale * 0.4);
    ctx.lineTo(x - scale * 0.2, y + scale);
    ctx.stroke();
    ctx.fillRect(x - 1, y - 1, 2, 2);
  } else if (glyph === 3) {
    ctx.beginPath();
    ctx.moveTo(x - scale * 0.7, y - scale);
    ctx.lineTo(x + scale * 0.7, y - scale);
    ctx.lineTo(x + scale * 0.1, y);
    ctx.lineTo(x + scale * 0.7, y + scale);
    ctx.lineTo(x - scale * 0.7, y + scale);
    ctx.stroke();
  } else if (glyph === 4) {
    ctx.beginPath();
    ctx.moveTo(x - scale * 0.8, y - scale);
    ctx.lineTo(x - scale * 0.1, y - scale * 0.2);
    ctx.lineTo(x + scale * 0.8, y - scale);
    ctx.moveTo(x - scale * 0.8, y + scale);
    ctx.lineTo(x - scale * 0.1, y + scale * 0.2);
    ctx.lineTo(x + scale * 0.8, y + scale);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x - scale * 0.75, y - scale * 0.8);
    ctx.lineTo(x + scale * 0.25, y - scale * 0.8);
    ctx.lineTo(x + scale * 0.75, y);
    ctx.lineTo(x + scale * 0.25, y + scale * 0.8);
    ctx.lineTo(x - scale * 0.75, y + scale * 0.8);
    ctx.lineTo(x - scale * 0.15, y);
    ctx.closePath();
    ctx.stroke();
  }

  ctx.fillStyle = rgba(dim, alpha * 0.45);
  ctx.fillRect(x - scale - 1, y + scale + 1, scale * 2 + 2, 1);
}

function drawMorphRuneCell(x, y, scale, t, seedVal, variant = 0) {
  const phase = t * 0.011 * config.animationSpeed + seedVal * 0.37;
  const frame = Math.floor(phase);
  const blend = phase - frame;
  const snap = blend < 0.14 || blend > 0.86;
  const motifA = frame % 6;
  const motifB = (motifA + 1 + (seedVal % 2)) % 6;
  const halo = 0.12 + 0.08 * Math.sin(t * 0.004 + seedVal);

  ctx.strokeStyle = rgba(config.borderColor, 0.22 + halo);
  ctx.lineWidth = 1;

  if (variant === 0) {
    ctx.strokeRect(x - scale * 2 - 2, y - scale * 2 - 2, scale * 4 + 4, scale * 4 + 4);
    ctx.fillStyle = rgba(config.accentDim, 0.12 + halo);
    ctx.fillRect(x - scale * 2, y - scale * 2, scale * 4, 1);
  } else if (variant === 1) {
    ctx.beginPath();
    ctx.arc(x, y, scale * 2.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, scale * 1.4, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x - scale * 2.2, y - scale * 1.8);
    ctx.lineTo(x - scale * 2.2, y + scale * 1.8);
    ctx.moveTo(x + scale * 2.2, y - scale * 1.8);
    ctx.lineTo(x + scale * 2.2, y + scale * 1.8);
    ctx.stroke();
    ctx.fillStyle = rgba(config.accentDim, 0.16 + halo);
    ctx.fillRect(x - scale * 2.2, y - scale * 2.3, scale * 4.4, 1);
    ctx.fillRect(x - scale * 2.2, y + scale * 2.3, scale * 4.4, 1);
  }

  drawRuneGlyph(x, y, scale, motifA, 0.28 + (1 - blend) * 0.35, false);
  drawRuneGlyph(x, y, scale * (snap ? 1.08 : 1), motifB, 0.1 + blend * 0.32, true);

  if (variant === 2) {
    drawRuneGlyph(x, y - scale * 2.6, scale * 0.7, motifB + 2, 0.16 + halo, false);
    drawRuneGlyph(x, y + scale * 2.6, scale * 0.7, motifA + 4, 0.16 + halo, false);
  }

  ctx.fillStyle = rgba(config.accentBright, snap ? 0.22 : 0.08);
  ctx.fillRect(x - 1, y - 1, 2, 2);
}

function drawMorphRuneScatter(t) {
  srand(1337);
  const count = Math.floor(6 + config.floatingDensity * 24);
  for (let i = 0; i < count; i++) {
    const rx = 20 + rand() * (W - 40);
    const ry = 20 + rand() * (H - 40);
    const scale = 2 + Math.floor(rand() * 3);
    const variant = i % 3;
    const pulseY = Math.sin(t * 0.0014 + i * 0.7) * 1.5;
    drawMorphRuneCell(rx, ry + pulseY, scale, t, 900 + i * 17, variant);
  }
}

// Panel: Circular Gauge
function drawCircularGauge(x, y, w, h, t, seed) {
  drawPanelBorder(x, y, w, h);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) * 0.35;

  ctx.strokeStyle = rgba(config.accentDim, 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = rgba(config.accentDim, 0.22);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.48, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const inner = r - (i % 3 === 0 ? 5 : 3);
    const outer = r + (i % 6 === 0 ? 3 : 1);
    const flicker = 0.2 + 0.45 * Math.max(0, Math.sin(t * 0.003 + i * 0.5 + seed));
    ctx.strokeStyle = rgba(config.accentColor, flicker);
    ctx.lineWidth = i % 6 === 0 ? 1 : 0.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
    ctx.stroke();
  }

  const sweepStart = t * 0.00045 * config.animationSpeed + seed * 0.03;
  ctx.strokeStyle = rgba(config.accentBright, 0.45);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.88, sweepStart, sweepStart + Math.PI * 0.35);
  ctx.stroke();

  for (let i = 0; i < 4; i++) {
    const a = sweepStart - i * 0.18;
    ctx.fillStyle = rgba(config.accentBright, 0.3 - i * 0.06);
    ctx.fillRect(cx + Math.cos(a) * r * 0.88 - 1, cy + Math.sin(a) * r * 0.88 - 1, 2, 2);
  }

  const needleAngle = Math.sin(t * 0.0008 * config.animationSpeed + seed) * Math.PI * 0.82;
  const counterAngle = needleAngle * -0.55 + Math.sin(t * 0.0012 + seed) * 0.12;

  ctx.strokeStyle = rgba(config.accentBright, 0.78);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - Math.cos(needleAngle) * r * 0.18, cy - Math.sin(needleAngle) * r * 0.18);
  ctx.lineTo(cx + Math.cos(needleAngle) * r * 0.72, cy + Math.sin(needleAngle) * r * 0.72);
  ctx.stroke();

  ctx.strokeStyle = rgba(config.accentColor, 0.45);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(counterAngle) * r * 0.42, cy + Math.sin(counterAngle) * r * 0.42);
  ctx.stroke();

  ctx.strokeStyle = rgba(config.borderColor, 0.35);
  ctx.strokeRect(cx - 5, cy - 5, 10, 10);
  ctx.fillStyle = rgba(config.accentColor, 0.6);
  ctx.fillRect(cx - 1, cy - 1, 2, 2);

  ctx.fillStyle = rgba(config.accentDim, 0.28);
  ctx.fillRect(x + 4, y + 4, 10, 2);
  ctx.fillRect(x + w - 14, y + h - 6, 10, 2);

  drawDotGrid(x + 2, y + 2, 8, 8, 3, t, seed);
  drawDotGrid(x + w - 10, y + 2, 8, 8, 3, t, seed + 10);
  drawMicroText(x + 3, y + h - 3, t, seed);
  drawMicroText(x + w - 30, y + 8, t, seed + 11);
}

function drawCircularGaugeVariant(x, y, w, h, t, seed) {
  drawPanelBorder(x, y, w, h);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) * 0.34;
  const sweep = t * 0.0007 * config.animationSpeed + seed * 0.05;

  for (let band = 0; band < 3; band++) {
    const rr = r * (1 - band * 0.23);
    for (let seg = 0; seg < 6; seg++) {
      const start = sweep * (0.3 + band * 0.12) + (seg / 6) * Math.PI * 2;
      const span = Math.PI * (0.18 + band * 0.03);
      ctx.strokeStyle = rgba(
        band === 0 ? config.accentColor : config.accentDim,
        0.2 + band * 0.08 + 0.08 * Math.sin(t * 0.002 + seg + band)
      );
      ctx.lineWidth = band === 1 ? 1 : 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, start, start + span);
      ctx.stroke();
    }
  }

  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + sweep * 0.2;
    const inner = r * 0.3;
    const outer = r * (i % 3 === 0 ? 0.95 : 0.8);
    ctx.strokeStyle = rgba(config.borderColor, i % 3 === 0 ? 0.26 : 0.16);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
    ctx.stroke();
  }

  const orbitA = -sweep * 1.2;
  const orbitB = sweep * 0.8 + Math.PI * 0.75;
  ctx.strokeStyle = rgba(config.accentBright, 0.52);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.84, orbitA, orbitA + Math.PI * 0.28);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.58, orbitB, orbitB + Math.PI * 0.22);
  ctx.stroke();

  const satelliteRadii = [r * 0.92, r * 0.66, r * 0.42];
  satelliteRadii.forEach((rr, idx) => {
    const a = sweep * (0.9 - idx * 0.22) + idx * 1.9;
    ctx.fillStyle = rgba(idx === 1 ? config.accentBright : config.accentColor, 0.42 - idx * 0.08);
    ctx.fillRect(cx + Math.cos(a) * rr - 1, cy + Math.sin(a) * rr - 1, 2, 2);
  });

  ctx.strokeStyle = rgba(config.borderColor, 0.35);
  ctx.strokeRect(cx - 6, cy - 6, 12, 12);
  ctx.strokeRect(cx - 2, cy - 2, 4, 4);

  const pointer = Math.sin(t * 0.0012 * config.animationSpeed + seed * 0.3) * Math.PI;
  ctx.strokeStyle = rgba(config.accentBright, 0.8);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - Math.cos(pointer) * r * 0.12, cy - Math.sin(pointer) * r * 0.12);
  ctx.lineTo(cx + Math.cos(pointer) * r * 0.68, cy + Math.sin(pointer) * r * 0.68);
  ctx.stroke();

  ctx.fillStyle = rgba(config.accentDim, 0.24);
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(x + 5 + i * 5, y + h - 7, 3, 2 + ((i + seed) % 3));
  }
  ctx.fillRect(x + w - 20, y + 4, 14, 2);
  drawDotGrid(x + 2, y + 2, 8, 8, 3, t, seed + 20);
  drawMicroText(x + 4, y + 9, t, seed + 21);
  drawMicroText(x + w - 30, y + h - 4, t, seed + 22);
}

// Panel: Waveform Display
function drawWaveform(x, y, w, h, t, seed) {
  drawPanelBorder(x, y, w, h);
  const pad = 4;

  drawDotGrid(x + pad, y + pad, w - pad * 2, h - pad * 2, 4, t, seed);
  ctx.strokeStyle = rgba(config.borderColor, 0.3);
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(x + pad, y + h / 2);
  ctx.lineTo(x + w - pad, y + h / 2);
  ctx.stroke();

  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  for (let i = 0; i <= 6; i++) {
    const gx = x + pad + (i / 6) * innerW;
    ctx.strokeStyle = rgba(config.borderColor, 0.16);
    ctx.beginPath();
    ctx.moveTo(gx, y + pad);
    ctx.lineTo(gx, y + h - pad);
    ctx.stroke();
  }

  const traceOffsets = [-0.22, 0, 0.22];
  traceOffsets.forEach((offset, idx) => {
    ctx.strokeStyle = rgba(
      idx === 1 ? config.accentBright : config.accentColor,
      idx === 1 ? 0.6 : 0.22
    );
    ctx.lineWidth = idx === 1 ? 1 : 0.5;
    ctx.beginPath();
    for (let i = 0; i < innerW; i++) {
      const nx = i / innerW;
      let val = Math.sin(nx * 11 + t * 0.0022 * config.animationSpeed + seed) * 0.22;
      val += Math.sin(nx * 23 + t * 0.0031 + seed * 1.8) * 0.1;
      val += Math.sin(nx * 5 + t * 0.0012 + seed * 0.35) * 0.14;
      val += offset;
      const py = y + h / 2 + val * innerH * 0.72;
      if (i === 0) ctx.moveTo(x + pad + i, py);
      else ctx.lineTo(x + pad + i, py);
    }
    ctx.stroke();
  });

  const cursor = innerW * 0.68 + Math.sin(t * 0.0012 * config.animationSpeed + seed) * 6;

  for (let i = 0; i < 3; i++) {
    const nx = clamp((cursor + i * 5) / innerW, 0, 1);
    let val = Math.sin(nx * 11 + t * 0.0022 * config.animationSpeed + seed) * 0.22;
    val += Math.sin(nx * 23 + t * 0.0031 + seed * 1.8) * 0.1;
    val += Math.sin(nx * 5 + t * 0.0012 + seed * 0.35) * 0.14;
    const py = y + h / 2 + val * innerH * 0.72;
    ctx.fillStyle = rgba(config.accentBright, 0.45 - i * 0.08);
    ctx.fillRect(x + pad + cursor + i * 2 - 1, py - 1, 2, 2);
  }

  drawMorphRuneCell(x + w - 18, y + 11, 3, t, seed + 200, 0);

  ctx.fillStyle = rgba(config.accentDim, 0.28);
  ctx.fillRect(x + pad, y + pad, innerW * 0.25, 2);
  ctx.fillRect(x + w - pad - innerW * 0.18, y + h - pad - 2, innerW * 0.18, 2);

  drawTicksH(x + pad, y + h - 4, w - pad * 2, 3, t + seed);
  drawTicksV(x + 2, y + pad, h - pad * 2, 4, t + seed * 2);
  drawMicroText(x + w - 30, y + 4, t, seed);
  drawMicroText(x + 4, y + 9, t, seed + 5);
}

function drawWaveformVariant(x, y, w, h, t, seed) {
  drawPanelBorder(x, y, w, h);
  const pad = 4;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const lanes = 4;

  for (let lane = 0; lane < lanes; lane++) {
    const ly = y + pad + ((lane + 0.5) / lanes) * innerH;
    ctx.strokeStyle = rgba(config.borderColor, 0.16 + lane * 0.03);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x + pad, ly);
    ctx.lineTo(x + w - pad, ly);
    ctx.stroke();
  }

  for (let lane = 0; lane < lanes; lane++) {
    const baseY = y + pad + ((lane + 0.5) / lanes) * innerH;
    const amp = innerH * (0.1 + lane * 0.015);
    ctx.strokeStyle = rgba(lane % 2 === 0 ? config.accentColor : config.accentBright, lane === 1 ? 0.52 : 0.28);
    ctx.lineWidth = lane === 1 ? 1 : 0.5;
    ctx.beginPath();
    for (let i = 0; i < innerW; i += 2) {
      const nx = i / Math.max(1, innerW - 1);
      let val = Math.sin(nx * (9 + lane * 4) + t * 0.0018 * config.animationSpeed + seed * 0.3);
      val += Math.sign(Math.sin(nx * (18 + lane * 7) - t * 0.003 + seed + lane)) * 0.45;
      val += Math.sin(nx * 40 + t * 0.004 + lane * 1.7) * 0.12;
      const py = baseY + val * amp;
      if (i === 0) ctx.moveTo(x + pad + i, py);
      else ctx.lineTo(x + pad + i, py);
    }
    ctx.stroke();
  }

  const scan = innerW * 0.62 + Math.sin(t * 0.0011 * config.animationSpeed + seed * 0.4) * 8;
  drawMorphRuneCell(x + w - 18, y + 12, 3, t, seed + 230, 1);

  for (let i = 0; i < 3; i++) {
    const px = x + pad + ((scan + i * 9) % innerW);
    const lane = i % lanes;
    const baseY = y + pad + ((lane + 0.5) / lanes) * innerH;
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.005 + i + seed);
    ctx.fillStyle = rgba(config.accentBright, 0.25 + pulse * 0.25);
    ctx.fillRect(px - 2, baseY - 3, 4, 6);
  }

  drawDotGrid(x + pad, y + pad, innerW, innerH, 5, t, seed + 30);
  drawTicksH(x + pad, y + h - 4, innerW, 4, t + seed);
  drawTicksV(x + 2, y + pad, innerH, 5, t + seed * 2);
  drawMicroText(x + 4, y + 9, t, seed + 31);
  drawMicroText(x + w - 30, y + h - 4, t, seed + 32);
}

// Panel: Bar Chart
function drawBarChart(x, y, w, h, t, seed) {
  drawPanelBorder(x, y, w, h);
  const pad = 4;
  const numBars = Math.floor((w - pad * 2) / 4);
  const maxH = h - pad * 2 - 6;

  srand(seed);
  for (let i = 0; i < numBars; i++) {
    const baseH = rand() * 0.7 + 0.1;
    const anim = baseH + Math.sin(t * 0.002 * config.animationSpeed + i * 0.5 + seed) * 0.15;
    const barH = Math.max(2, anim * maxH);
    const bx = x + pad + i * 4;
    const by = y + h - pad - barH;

    const flicker = Math.sin(t * 0.005 + i * 1.3) > 0 ? 0.6 : 0.35;
    ctx.fillStyle = rgba(config.accentColor, flicker);
    ctx.fillRect(bx, by, 2, barH);
  }

  // Top ticks
  drawTicksH(x + pad, y + pad, w - pad * 2, 6, t + seed);
  drawMicroText(x + 3, y + 8, t, seed);
}

function drawBarChartVariant(x, y, w, h, t, seed) {
  drawPanelBorder(x, y, w, h);
  const pad = 4;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2 - 5;
  const numBars = Math.max(4, Math.floor(innerW / 6));

  ctx.strokeStyle = rgba(config.borderColor, 0.18);
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 4; i++) {
    const gy = y + pad + (i / 3) * innerH;
    ctx.beginPath();
    ctx.moveTo(x + pad, gy);
    ctx.lineTo(x + w - pad, gy);
    ctx.stroke();
  }

  let prevX = x + pad;
  let prevY = y + h - pad;
  srand(seed + 40);
  for (let i = 0; i < numBars; i++) {
    const bx = x + pad + i * 6;
    const base = 0.18 + rand() * 0.62;
    const pulse = Math.sin(t * 0.0018 * config.animationSpeed + i * 0.8 + seed) * 0.18;
    const barH = clamp((base + pulse) * innerH, 3, innerH);
    const segments = Math.max(2, Math.floor(barH / 5));
    for (let s = 0; s < segments; s++) {
      const segY = y + h - pad - (s + 1) * (barH / segments);
      const alpha = 0.16 + s / segments * 0.32;
      ctx.fillStyle = rgba(s === segments - 1 ? config.accentBright : config.accentColor, alpha);
      ctx.fillRect(bx, segY, 3, Math.max(1, barH / segments - 1));
    }

    const capY = y + h - pad - barH;
    ctx.fillStyle = rgba(config.accentBright, 0.32 + 0.16 * Math.sin(t * 0.004 + i));
    ctx.fillRect(bx - 1, capY - 1, 5, 2);

    const midX = bx + 1.5;
    if (i > 0) {
      ctx.strokeStyle = rgba(config.accentDim, 0.28);
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(midX, capY);
      ctx.stroke();
    }
    prevX = midX;
    prevY = capY;
  }

  const scan = innerW * 0.24 + Math.sin(t * 0.001 * config.animationSpeed + seed) * 5;
  drawMorphRuneCell(x + w - 16, y + 12, 3, t, seed + 260, 2);
  ctx.strokeStyle = rgba(config.accentBright, 0.14);
  ctx.beginPath();
  ctx.moveTo(x + pad + scan + 2, y + pad + 12);
  ctx.lineTo(x + pad + scan + 2, y + h - pad - 6);
  ctx.stroke();

  drawTicksH(x + pad, y + h - 4, innerW, 4, t + seed);
  drawMicroText(x + 4, y + 9, t, seed + 41);
  drawMicroText(x + w - 30, y + h - 4, t, seed + 42);
}

// Panel: Dot Matrix Display
function drawDotMatrix(x, y, w, h, t, seed) {
  drawPanelBorder(x, y, w, h);
  const pad = 3;
  const dotSize = 2;
  const gap = 3;

  for (let gx = pad; gx < w - pad; gx += gap) {
    for (let gy = pad; gy < h - pad; gy += gap) {
      const on = Math.sin(t * 0.001 + gx * 0.2 + gy * 0.3 + seed) > 0.1;
      const bright = Math.sin(t * 0.003 + gx * 0.1 - gy * 0.15 + seed * 2) > 0.5;
      if (on) {
        ctx.fillStyle = rgba(config.accentColor, bright ? 0.5 : 0.15);
        ctx.fillRect(x + gx, y + gy, dotSize, dotSize);
      }
    }
  }
}

function drawDotMatrixVariant(x, y, w, h, t, seed) {
  drawPanelBorder(x, y, w, h);
  const pad = 4;
  const cell = 7;
  const cols = Math.floor((w - pad * 2) / cell);
  const rows = Math.floor((h - pad * 2) / cell);
  const sweep = (t * 0.002 * config.animationSpeed + seed) % (cols + rows + 1);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const ox = x + pad + col * cell;
      const oy = y + pad + row * cell;
      const motif = (col * 3 + row * 5 + seed) % 4;
      const hot = Math.abs(col + row - sweep) < 1.5;
      const pulse = 0.16 + 0.12 * Math.max(0, Math.sin(t * 0.004 + col * 0.7 + row + seed));
      const color = hot ? config.accentBright : config.accentColor;
      ctx.fillStyle = rgba(color, hot ? 0.42 : pulse);

      if (motif === 0) {
        ctx.fillRect(ox + 1, oy, 3, 1);
        ctx.fillRect(ox, oy + 1, 1, 3);
        ctx.fillRect(ox + 5, oy + 1, 1, 3);
        ctx.fillRect(ox + 1, oy + 5, 3, 1);
      } else if (motif === 1) {
        ctx.fillRect(ox + 2, oy, 1, 6);
        ctx.fillRect(ox, oy + 2, 6, 1);
      } else if (motif === 2) {
        ctx.fillRect(ox + 1, oy + 1, 1, 1);
        ctx.fillRect(ox + 2, oy + 2, 1, 1);
        ctx.fillRect(ox + 3, oy + 3, 1, 1);
        ctx.fillRect(ox + 4, oy + 4, 1, 1);
      } else {
        ctx.fillRect(ox + 1, oy + 1, 4, 1);
        ctx.fillRect(ox + 1, oy + 4, 4, 1);
        ctx.fillRect(ox + 1, oy + 2, 1, 2);
        ctx.fillRect(ox + 4, oy + 2, 1, 2);
      }

      if (hot) {
        ctx.strokeStyle = rgba(config.accentBright, 0.2);
        ctx.strokeRect(ox, oy, 6, 6);
      }
    }
  }

  ctx.fillStyle = rgba(config.accentDim, 0.22);
  ctx.fillRect(x + pad, y + h - pad - 2, w - pad * 2, 1);
  drawMicroText(x + 4, y + 9, t, seed + 50);
  drawMicroText(x + w - 30, y + h - 4, t, seed + 51);
}

// Panel: Knob Cluster
function drawKnobCluster(x, y, w, h, t, seed) {
  drawPanelBorder(x, y, w, h);

  const cols = Math.max(1, Math.floor(w / 20));
  const rows = Math.max(1, Math.floor(h / 20));

  srand(seed);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const kx = x + 10 + col * (w - 20) / Math.max(1, cols - 1);
      const ky = y + 10 + row * (h - 20) / Math.max(1, rows - 1);
      const kr = 5 + rand() * 3;
      const plateW = kr * 3.2;
      const plateH = kr * 3.2;

      ctx.strokeStyle = rgba(config.borderColor, 0.28);
      ctx.lineWidth = 1;
      ctx.strokeRect(kx - plateW / 2, ky - plateH / 2, plateW, plateH);

      ctx.strokeStyle = rgba(config.accentDim, 0.18);
      ctx.beginPath();
      ctx.moveTo(kx - plateW / 2, ky);
      ctx.lineTo(kx + plateW / 2, ky);
      ctx.moveTo(kx, ky - plateH / 2);
      ctx.lineTo(kx, ky + plateH / 2);
      ctx.stroke();

      ctx.strokeStyle = rgba(config.accentDim, 0.42);
      ctx.beginPath();
      ctx.arc(kx, ky, kr + 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(kx, ky, kr, 0, Math.PI * 2);
      ctx.stroke();

      for (let ti = 0; ti < 12; ti++) {
        const ta = (ti / 12) * Math.PI * 2;
        const tr = kr + (ti % 3 === 0 ? 4 : 2);
        ctx.fillStyle = rgba(config.accentDim, ti % 3 === 0 ? 0.35 : 0.2);
        ctx.fillRect(
          kx + Math.cos(ta) * tr - 0.5,
          ky + Math.sin(ta) * tr - 0.5,
          1,
          1
        );
      }

      const angle = Math.sin(t * 0.001 * config.animationSpeed + seed + col * 2 + row * 3) * Math.PI;
      ctx.strokeStyle = rgba(config.accentBright, 0.56);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(kx - Math.cos(angle) * kr * 0.15, ky - Math.sin(angle) * kr * 0.15);
      ctx.lineTo(kx + Math.cos(angle) * kr * 0.75, ky + Math.sin(angle) * kr * 0.75);
      ctx.stroke();

      const satelliteAngle = -angle * 0.7 + t * 0.001 * config.animationSpeed;
      ctx.fillStyle = rgba(config.accentBright, 0.35 + 0.15 * Math.sin(t * 0.004 + col + row));
      ctx.fillRect(
        kx + Math.cos(satelliteAngle) * (kr + 5) - 1,
        ky + Math.sin(satelliteAngle) * (kr + 5) - 1,
        2,
        2
      );

      ctx.fillStyle = rgba(config.accentColor, 0.55);
      ctx.fillRect(kx - 1, ky - 1, 2, 2);

      ctx.fillStyle = rgba(config.accentDim, 0.25);
      ctx.fillRect(kx - plateW / 2 + 2, ky + plateH / 2 - 3, plateW - 4, 1);
    }
  }

  drawMicroText(x + 4, y + 8, t, seed);
  drawMicroText(x + w - 30, y + h - 4, t, seed + 8);
}

// Panel: Horizontal Bars (status strips)
function drawHBars(x, y, w, h, t, seed) {
  drawPanelBorder(x, y, w, h);
  const pad = 3;
  const barH = 3;
  const gap = 5;
  const numBars = Math.floor((h - pad * 2) / gap);

  srand(seed);
  for (let i = 0; i < numBars; i++) {
    const by = y + pad + i * gap;
    const fillW = (rand() * 0.6 + 0.2) * (w - pad * 2 - 20);
    const anim = fillW + Math.sin(t * 0.0015 * config.animationSpeed + i + seed) * 10;

    ctx.fillStyle = rgba(config.panelBg, 0.8);
    ctx.fillRect(x + pad, by, w - pad * 2, barH);

    const flicker = Math.sin(t * 0.004 + i * 0.7 + seed) > -0.2 ? 0.45 : 0.15;
    ctx.fillStyle = rgba(config.accentColor, flicker);
    ctx.fillRect(x + pad + 16, by, Math.max(4, Math.min(anim, w - pad * 2 - 20)), barH);

    // Label dot
    ctx.fillStyle = rgba(config.accentBright, 0.4 + 0.2 * Math.sin(t * 0.003 + i));
    ctx.fillRect(x + pad + 2, by, 2, barH);

    // Right-side pip
    ctx.fillStyle = rgba(config.accentDim, 0.3);
    ctx.fillRect(x + w - pad - 5, by + 1, 3, 1);
  }
}

function drawHBarsVariant(x, y, w, h, t, seed) {
  drawPanelBorder(x, y, w, h);
  const pad = 4;
  const laneGap = 6;
  const laneCount = Math.max(2, Math.floor((h - pad * 2) / laneGap));
  const innerW = w - pad * 2;

  for (let lane = 0; lane < laneCount; lane++) {
    const ly = y + pad + lane * laneGap;
    ctx.fillStyle = rgba(config.panelBg, 0.82);
    ctx.fillRect(x + pad, ly, innerW, 2);
    ctx.fillStyle = rgba(config.accentDim, 0.22);
    ctx.fillRect(x + pad + 8, ly, innerW - 12, 1);
    ctx.fillRect(x + pad + 2, ly - 1, 3, 4);

    const flow = innerW * (0.34 + ((lane % 3) * 0.18)) + Math.sin(t * 0.0012 * config.animationSpeed + seed + lane) * 5;
    for (let i = 0; i < 3; i++) {
      const px = x + pad + 10 + clamp(flow + i * 10, 0, Math.max(10, innerW - 12));
      const alpha = 0.18 + 0.12 * Math.max(0, Math.sin(t * 0.004 + i + lane));
      ctx.fillStyle = rgba(i === 1 ? config.accentBright : config.accentColor, alpha);
      ctx.fillRect(px, ly - (i % 2), 8, 4);
    }

    if (lane % 3 === 1) {
      drawMorphRuneCell(x + w - 15, ly + 1, 2, t, seed + lane * 13, lane % 2);
    }

    if (lane % 2 === 0) {
      ctx.strokeStyle = rgba(config.borderColor, 0.28);
      ctx.strokeRect(x + w - pad - 7, ly - 1, 4, 4);
    } else {
      ctx.fillStyle = rgba(config.accentBright, 0.22 + 0.14 * Math.sin(t * 0.005 + lane));
      ctx.fillRect(x + w - pad - 6, ly, 3, 2);
    }
  }

  drawTicksH(x + pad, y + h - 4, innerW, 4, t + seed);
  drawMicroText(x + 4, y + 9, t, seed + 60);
  drawMicroText(x + w - 30, y + h - 4, t, seed + 61);
}

// Panel: Radar/Sweep Display
function drawRadar(x, y, w, h, t, seed) {
  drawPanelBorder(x, y, w, h);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) * 0.4;

  // Concentric rings
  for (let i = 1; i <= 4; i++) {
    ctx.strokeStyle = rgba(config.borderColor, 0.2 + 0.05 * i);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r * (i / 4), 0, Math.PI * 2);
    ctx.stroke();
  }

  // Cross
  ctx.strokeStyle = rgba(config.borderColor, 0.2);
  ctx.beginPath();
  ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
  ctx.stroke();

  const sweepAngle = (t * 0.001 * config.animationSpeed + seed) % (Math.PI * 2);
  ctx.fillStyle = rgba(config.accentColor, 0.08);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, sweepAngle - 0.24, sweepAngle + 0.08);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = rgba(config.accentColor, 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(sweepAngle) * r, cy + Math.sin(sweepAngle) * r);
  ctx.stroke();

  for (let i = 0; i < 8; i++) {
    const a = sweepAngle - i * 0.06;
    const alpha = 0.15 - i * 0.018;
    ctx.strokeStyle = rgba(config.accentColor, Math.max(0, alpha));
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r * 0.95);
    ctx.stroke();
  }

  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.fillStyle = rgba(config.accentDim, i % 3 === 0 ? 0.32 : 0.16);
    ctx.fillRect(cx + Math.cos(a) * r - 1, cy + Math.sin(a) * r - 1, 2, 2);
  }

  srand(seed + Math.floor(t / 3000));
  for (let i = 0; i < 5; i++) {
    const ba = rand() * Math.PI * 2;
    const bd = rand() * r * 0.8;
    const alpha = 0.3 + 0.3 * Math.sin(t * 0.005 + i);
    ctx.fillStyle = rgba(config.accentBright, alpha);
    ctx.fillRect(cx + Math.cos(ba) * bd - 1, cy + Math.sin(ba) * bd - 1, 2, 2);

    if (alpha > 0.42) {
      ctx.strokeStyle = rgba(config.accentBright, 0.18);
      ctx.strokeRect(
        cx + Math.cos(ba) * bd - 3,
        cy + Math.sin(ba) * bd - 3,
        6,
        6
      );
    }
  }

  const lockAngle = sweepAngle * 0.55 + Math.sin(t * 0.0018 + seed) * 0.3;
  ctx.strokeStyle = rgba(config.accentBright, 0.35);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.62, lockAngle - 0.18, lockAngle + 0.18);
  ctx.stroke();

  drawDotGrid(x + 2, y + 2, 6, 6, 2, t, seed);
  drawDotGrid(x + w - 8, y + h - 8, 6, 6, 2, t, seed + 5);
  drawMicroText(x + 4, y + 8, t, seed);
  drawMicroText(x + w - 30, y + h - 4, t, seed + 9);
}

// Panel: Grid Mesh (wireframe surface)
function drawGridMesh(x, y, w, h, t, seed) {
  drawPanelBorder(x, y, w, h);
  const pad = 4;
  const gridW = w - pad * 2;
  const gridH = h - pad * 2;
  const cols = Math.floor(gridW / 6);
  const rows = Math.floor(gridH / 6);

  ctx.strokeStyle = rgba(config.accentColor, 0.2);
  ctx.lineWidth = 0.5;

  // Horizontal lines with wave
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    for (let c = 0; c <= cols; c++) {
      const px = x + pad + (c / cols) * gridW;
      const wave = Math.sin(c * 0.5 + r * 0.3 + t * 0.001 * config.animationSpeed + seed) * 2;
      const py = y + pad + (r / rows) * gridH + wave;
      if (c === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // Intersection highlight dots
  for (let r = 0; r <= rows; r += 2) {
    for (let c = 0; c <= cols; c += 2) {
      const px = x + pad + (c / cols) * gridW;
      const wave = Math.sin(c * 0.5 + r * 0.3 + t * 0.001 + seed) * 2;
      const py = y + pad + (r / rows) * gridH + wave;
      const bright = Math.sin(t * 0.002 + c + r + seed) > 0.5;
      if (bright) {
        ctx.fillStyle = rgba(config.accentBright, 0.3);
        ctx.fillRect(px, py, 1, 1);
      }
    }
  }
}

function drawGridMeshVariant(x, y, w, h, t, seed) {
  drawPanelBorder(x, y, w, h);
  const pad = 4;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const cols = Math.max(6, Math.floor(innerW / 8));
  const rows = Math.max(4, Math.floor(innerH / 7));

  ctx.lineWidth = 0.5;
  for (let row = 0; row <= rows; row++) {
    ctx.strokeStyle = rgba(config.accentColor, 0.18 + 0.04 * (row % 2));
    ctx.beginPath();
    for (let col = 0; col <= cols; col++) {
      const px = x + pad + (col / cols) * innerW;
      const py = y + pad + (row / rows) * innerH
        + Math.sin(col * 0.6 + row * 0.25 + t * 0.0013 * config.animationSpeed + seed) * 2.2;
      if (col === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  for (let col = 0; col <= cols; col += 2) {
    ctx.strokeStyle = rgba(config.borderColor, 0.22);
    ctx.beginPath();
    for (let row = 0; row <= rows; row++) {
      const px = x + pad + (col / cols) * innerW
        + Math.sin(row * 0.75 + t * 0.0011 + seed * 0.2) * 1.6;
      const py = y + pad + (row / rows) * innerH;
      if (row === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  for (let row = 1; row < rows; row += 2) {
    for (let col = 1; col < cols; col += 3) {
      const px = x + pad + (col / cols) * innerW;
      const py = y + pad + (row / rows) * innerH
        + Math.sin(col * 0.6 + row * 0.25 + t * 0.0013 * config.animationSpeed + seed) * 2.2;
      const hot = Math.sin(t * 0.003 + col * 0.8 - row * 0.4 + seed) > 0.55;
      if (hot) {
        ctx.fillStyle = rgba(config.accentBright, 0.32);
        ctx.fillRect(px - 1, py - 1, 2, 2);
        ctx.strokeStyle = rgba(config.accentBright, 0.14);
        ctx.strokeRect(px - 3, py - 3, 6, 6);
      }
    }
  }

  const probeX = x + pad + ((Math.sin(t * 0.0012 + seed) * 0.5 + 0.5) * innerW);
  const probeY = y + pad + ((Math.cos(t * 0.0017 + seed * 0.3) * 0.5 + 0.5) * innerH);
  ctx.strokeStyle = rgba(config.accentBright, 0.3);
  ctx.beginPath();
  ctx.moveTo(probeX - 6, probeY);
  ctx.lineTo(probeX + 6, probeY);
  ctx.moveTo(probeX, probeY - 6);
  ctx.lineTo(probeX, probeY + 6);
  ctx.stroke();

  drawMicroText(x + 4, y + 9, t, seed + 70);
  drawMicroText(x + w - 30, y + h - 4, t, seed + 71);
}

// Panel: Image/Data Scan (fake thermal/satellite)
function drawDataScan(x, y, w, h, t, seed) {
  drawPanelBorder(x, y, w, h);
  const pad = 2;

  srand(seed);
  const blockSize = 4;
  for (let bx = pad; bx < w - pad; bx += blockSize) {
    for (let by = pad; by < h - pad; by += blockSize) {
      const base = rand();
      const anim = Math.sin(t * 0.001 + bx * 0.1 + by * 0.1 + seed) * 0.15;
      const val = Math.max(0, Math.min(1, base + anim));
      if (val > 0.3) {
        ctx.fillStyle = rgba(val > 0.7 ? config.accentBright : config.accentColor, val * 0.45);
        ctx.fillRect(x + bx, y + by, blockSize - 1, blockSize - 1);
      }
    }
  }

  for (let row = 0; row < 4; row++) {
    const ry = y + pad + ((row + 0.5) / 4) * (h - pad * 2);
    ctx.strokeStyle = rgba(config.borderColor, 0.14);
    ctx.beginPath();
    ctx.moveTo(x + pad, ry);
    ctx.lineTo(x + w - pad, ry);
    ctx.stroke();
  }

  const scanY = ((t * 0.03 * config.animationSpeed + seed * 20) % (h - pad * 2));
  ctx.fillStyle = rgba(config.accentBright, 0.15);
  ctx.fillRect(x + pad, y + pad + scanY, w - pad * 2, 2);

  const scanX = (w - pad * 2) * 0.7 + Math.sin(t * 0.001 * config.animationSpeed + seed * 0.6) * 6;
  drawMorphRuneCell(x + w - 16, y + 12, 3, t, seed + 290, 1);
  ctx.fillStyle = rgba(config.accentColor, 0.1);
  ctx.fillRect(x + pad + scanX - 6, y + pad + 13, 12, 1);

  ctx.strokeStyle = rgba(config.accentBright, 0.22);
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let i = 0; i < w - pad * 2; i++) {
    const nx = i / Math.max(1, w - pad * 2 - 1);
    const py = y + pad + (h - pad * 2) * (0.2 + 0.55 * nx);
    const wobble = Math.sin(nx * 8 + t * 0.0014 + seed) * 4;
    if (i === 0) ctx.moveTo(x + pad + i, py + wobble);
    else ctx.lineTo(x + pad + i, py + wobble);
  }
  ctx.stroke();

  ctx.strokeStyle = rgba(config.accentDim, 0.28);
  ctx.strokeRect(x + pad + scanX - 3, y + pad + scanY - 3, 6, 6);
  drawMicroText(x + 3, y + 8, t, seed);
  drawMicroText(x + w - 30, y + h - 4, t, seed + 6);
}

// Panel: LED Row (indicator lights)
function drawLEDRow(x, y, w, h, t, seed) {
  drawPanelBorder(x, y, w, h);
  const pad = 3;
  const numLEDs = Math.floor((w - pad * 2) / 6);

  for (let i = 0; i < numLEDs; i++) {
    const lx = x + pad + i * 6 + 2;
    const ly = y + h / 2 - 1;
    const on = Math.sin(t * 0.004 * config.animationSpeed + i * 0.9 + seed) > 0;
    ctx.fillStyle = rgba(on ? config.accentBright : config.accentDim, on ? 0.7 : 0.15);
    ctx.fillRect(lx, ly, 3, 3);

    if (i % 3 === 0) {
      ctx.fillStyle = rgba(config.borderColor, 0.25);
      ctx.fillRect(lx + 1, ly - 4, 1, 3);
    }
  }

  const chase = Math.floor(numLEDs * 0.74 + Math.sin(t * 0.0014 * config.animationSpeed + seed) * 1.5);
  const chaseX = x + pad + chase * 6 + 2;
  drawMorphRuneCell(chaseX, y + h / 2 - 5, 3, t, seed + 320, 0);
  ctx.strokeStyle = rgba(config.accentBright, 0.14);
  ctx.strokeRect(chaseX - 5, y + pad, 10, h - pad * 2 - 2);

  drawTicksH(x + pad, y + h - 3, w - pad * 2, 3, t + seed);
  drawMicroText(x + 3, y + 8, t, seed);
}

// Panel: Vertical Slider Bank
function drawSliderBank(x, y, w, h, t, seed) {
  drawPanelBorder(x, y, w, h);
  const pad = 4;
  const numSliders = Math.floor((w - pad * 2) / 8);

  srand(seed);
  for (let i = 0; i < numSliders; i++) {
    const sx = x + pad + i * 8 + 3;
    const trackTop = y + pad + 2;
    const trackH = h - pad * 2 - 4;

    ctx.fillStyle = rgba(config.borderColor, 0.4);
    ctx.fillRect(sx, trackTop, 1, trackH);
    ctx.fillRect(sx - 2, trackTop, 1, trackH);
    ctx.fillRect(sx + 2, trackTop, 1, trackH);

    const val = 0.2 + rand() * 0.6 + Math.sin(t * 0.001 * config.animationSpeed + i + seed) * 0.15;
    const fillH = val * trackH;
    ctx.fillStyle = rgba(config.accentColor, 0.4);
    ctx.fillRect(sx - 1, trackTop + trackH - fillH, 3, fillH);

    ctx.fillStyle = rgba(config.accentBright, 0.6);
    ctx.fillRect(sx - 2, trackTop + trackH - fillH - 1, 5, 2);

    ctx.fillStyle = rgba(config.accentDim, 0.24);
    ctx.fillRect(sx - 3, trackTop + 2, 7, 1);
    ctx.fillRect(sx - 3, trackTop + trackH - 3, 7, 1);

    if (i % 2 === 0) {
      const pulse = 0.18 + 0.18 * Math.max(0, Math.sin(t * 0.004 + i + seed));
      ctx.fillStyle = rgba(config.accentBright, pulse);
      ctx.fillRect(sx - 1, trackTop + trackH - fillH - 4, 3, 2);
    }
  }

  ctx.fillStyle = rgba(config.accentDim, 0.3);
  ctx.fillRect(x + pad, y + pad, w - pad * 2, 1);
  ctx.fillRect(x + pad, y + h - pad - 1, w - pad * 2, 1);
  drawTicksH(x + pad, y + h - 3, w - pad * 2, 4, t + seed);
  drawMicroText(x + 3, y + 8, t, seed);
}

// ── PANEL LAYOUT ────────────────────────────────────────
// Fill the full viewport with a dense field of modular greeble panels

function generatePanelLayout(revealOptions = {}) {
  const panels = [];
  const density = Math.max(0.3, config.greeblingDensity);
  const densityScale = 1 / density;
  const margin = Math.max(2, Math.round(config.panelSpacing * densityScale));
  const revealStartAt = revealOptions.revealStartAt ?? 0;
  const revealStepMs = revealOptions.revealStepMs ?? 0;
  const revealDurationMs = revealOptions.revealDurationMs ?? 1;
  const maxRevealTotalMs = revealOptions.maxRevealTotalMs ?? Infinity;
  const revealOrder = [];

  const panelTypes = [
    [drawCircularGauge, drawCircularGaugeVariant],
    [drawWaveform, drawWaveformVariant],
    [drawBarChart, drawBarChartVariant],
    [drawDotMatrix, drawDotMatrixVariant],
    [drawKnobCluster],
    [drawHBars, drawHBarsVariant],
    [drawRadar],
    [drawGridMesh, drawGridMeshVariant],
    [drawDataScan],
    [drawLEDRow],
    [drawSliderBank],
  ];

  srand(123);

  function choosePanelType() {
    const family = panelTypes[Math.floor(rand() * panelTypes.length)];
    return family.length > 1 && rand() > 0.48 ? family[1] : family[0];
  }

  // Fill regions without leaving sliver gaps at resize boundaries.
  function fillRegion(rx, ry, rw, rh, panelSeed) {
    let py = ry;
    let localSeed = panelSeed;
    const maxX = rx + rw;
    const maxY = ry + rh;

    while (py < maxY - 14) {
      const remainingH = maxY - py;
      let rowH = Math.round((22 + rand() * 42) * densityScale);
      if (remainingH < rowH + margin + 16) rowH = remainingH;
      rowH = Math.max(16, rowH);

      let px = rx;
      while (px < maxX - 14) {
        const remainingW = maxX - px;
        let pw = Math.round((30 + rand() * 70) * densityScale);
        if (remainingW < pw + margin + 16) pw = remainingW;
        pw = Math.max(16, pw);

        if (pw > 15 && rowH > 15) {
          const panelIndex = panels.length;
          panels.push({
            x: px,
            y: py,
            w: pw,
            h: rowH,
            type: choosePanelType(),
            seed: localSeed,
            revealAt: revealStartAt,
            revealDuration: revealDurationMs,
          });
          revealOrder.push(panelIndex);
          localSeed += 7;
        }

        if (remainingW <= pw) break;
        px += pw + margin;
      }

      if (remainingH <= rowH) break;
      py += rowH + margin;
    }
  }

  fillRegion(margin, margin, W - margin * 2, H - margin * 2, 100);

  for (let i = revealOrder.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const temp = revealOrder[i];
    revealOrder[i] = revealOrder[j];
    revealOrder[j] = temp;
  }

  const maxStaggerSpan = Math.max(0, maxRevealTotalMs - revealDurationMs);
  const effectiveRevealStepMs = revealOrder.length > 1
    ? Math.min(revealStepMs, maxStaggerSpan / (revealOrder.length - 1))
    : 0;

  revealOrder.forEach((panelIndex, orderIndex) => {
    panels[panelIndex].revealAt = revealStartAt + orderIndex * effectiveRevealStepMs;
  });

  return panels;
}

// ── EDGE GREEBLINGS ─────────────────────────────────────
function drawEdgeGreeblings(t) {
  // Top edge ticks
  drawTicksH(0, 1, W, 4 / config.greeblingDensity, t);
  // Bottom edge ticks
  drawTicksH(0, H - 3, W, 4 / config.greeblingDensity, t + 100);
  // Left edge ticks
  drawTicksV(1, 0, H, 4 / config.greeblingDensity, t + 200);
  // Right edge ticks
  drawTicksV(W - 3, 0, H, 4 / config.greeblingDensity, t + 300);

  // Corner ornaments
  const corners = [[8, 8], [W - 20, 8], [8, H - 20], [W - 20, H - 20]];
  corners.forEach(([cx, cy], ci) => {
    ctx.strokeStyle = rgba(config.borderColor, 0.5);
    ctx.lineWidth = 1;
    const dx = ci % 2 === 0 ? 1 : -1;
    const dy = ci < 2 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(cx + dx * 12, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + dy * 12);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + dx * 6, cy + dy * 2);
    ctx.lineTo(cx + dx * 6, cy + dy * 8);
    ctx.moveTo(cx + dx * 2, cy + dy * 6);
    ctx.lineTo(cx + dx * 8, cy + dy * 6);
    ctx.stroke();

    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = rgba(config.accentDim, 0.3 + 0.2 * Math.sin(t * 0.002 + ci + i));
      ctx.fillRect(cx + dx * (3 + i * 4), cy + dy * 3, 2, 2);
    }

    const pulse = 0.2 + 0.25 * Math.max(0, Math.sin(t * 0.003 + ci * 0.8));
    ctx.strokeStyle = rgba(config.accentBright, pulse);
    ctx.strokeRect(cx + dx * 9 - 2, cy + dy * 9 - 2, 4, 4);
  });

  // Scattered micro-text along edges
  for (let i = 0; i < 20; i++) {
    srand(500 + i);
    const ex = rand() * W;
    const ey = rand() < 0.5 ? 6 + rand() * 15 : H - 8 - rand() * 15;
    drawMicroText(ex, ey, t, 500 + i);
  }
  for (let i = 0; i < 14; i++) {
    srand(600 + i);
    const ex = rand() < 0.5 ? 5 + rand() * 10 : W - 35 - rand() * 10;
    const ey = rand() * H;
    drawMicroText(ex, ey, t, 600 + i);
  }
}

// ── SCANLINES ───────────────────────────────────────────
function drawScanlines() {
  if (config.scanlineOpacity <= 0) return;
  ctx.fillStyle = `rgba(0,0,0,${config.scanlineOpacity})`;
  for (let y = 0; y < H; y += 2) {
    ctx.fillRect(0, y, W, 1);
  }
}

function drawCentralAperture(t) {
  const cx = W * 0.5;
  const cy = H * 0.5;
  const sphereR = Math.min(W, H) * 0.29;
  const bezelPad = 8;
  const x = Math.floor(cx - sphereR - bezelPad);
  const y = Math.floor(cy - sphereR - bezelPad);
  const w = Math.ceil(sphereR * 2 + bezelPad * 2);
  const h = Math.ceil(sphereR * 2 + bezelPad * 2);

  ctx.fillStyle = config.bgColor;
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = rgba(config.borderColor, 0.5);
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  ctx.strokeStyle = rgba(config.borderColor, 0.22);
  ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);

  ctx.strokeStyle = rgba(config.accentDim, 0.16);
  ctx.beginPath();
  ctx.moveTo(x + 20, y + 1);
  ctx.lineTo(x + w - 20, y + 1);
  ctx.moveTo(x + 20, y + h - 2);
  ctx.lineTo(x + w - 20, y + h - 2);
  ctx.moveTo(x + 1, y + 20);
  ctx.lineTo(x + 1, y + h - 20);
  ctx.moveTo(x + w - 2, y + 20);
  ctx.lineTo(x + w - 2, y + h - 20);
  ctx.stroke();

  const corners = [
    [x + 5, y + 5, 1, 1],
    [x + w - 5, y + 5, -1, 1],
    [x + 5, y + h - 5, 1, -1],
    [x + w - 5, y + h - 5, -1, -1],
  ];

  corners.forEach(([cx0, cy0, dx, dy], i) => {
    ctx.strokeStyle = rgba(config.borderColor, 0.55);
    ctx.beginPath();
    ctx.moveTo(cx0, cy0 + dy * 10);
    ctx.lineTo(cx0, cy0);
    ctx.lineTo(cx0 + dx * 10, cy0);
    ctx.stroke();

    ctx.fillStyle = rgba(config.accentBright, 0.15 + 0.08 * Math.sin(t * 0.003 + i));
    ctx.fillRect(cx0 + dx * 6 - 1, cy0 + dy * 6 - 1, 3, 3);
  });

  drawTicksH(x + 24, y + 3, w - 48, 5, t + 50);
  drawTicksH(x + 24, y + h - 6, w - 48, 5, t + 150);
  drawTicksV(x + 3, y + 24, h - 48, 5, t + 250);
  drawTicksV(x + w - 6, y + 24, h - 48, 5, t + 350);
}

// ── CONNECTOR LINES ─────────────────────────────────────
function drawConnectors(t) {
  const cx = W * 0.5;
  const cy = H * 0.5;
  const r = Math.min(W, H) * 0.29;

  const endpoints = [
    { a: -0.5, d: 1.05 }, { a: -1.2, d: 1.1 }, { a: -1.8, d: 1.05 },
    { a: 0.3, d: 1.08 }, { a: 1.0, d: 1.1 }, { a: 2.0, d: 1.05 },
    { a: 2.5, d: 1.08 }, { a: -2.5, d: 1.12 },
  ];

  endpoints.forEach((ep, i) => {
    const x1 = cx + Math.cos(ep.a) * r * 0.95;
    const y1 = cy + Math.sin(ep.a) * r * 0.95;
    const x2 = cx + Math.cos(ep.a) * r * ep.d * 1.3;
    const y2 = cy + Math.sin(ep.a) * r * ep.d * 1.3;

    ctx.strokeStyle = rgba(config.borderColor, 0.15 + 0.08 * Math.sin(t * 0.001 + i));
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Junction dot
    ctx.fillStyle = rgba(config.accentDim, 0.4);
    ctx.fillRect(x2 - 1, y2 - 1, 2, 2);
  });
}

// ── FLOATING GREEBLINGS (between panels) ────────────────
function drawFloatingGreeblings(t) {
  if (config.floatingDensity <= 0) return;

  const density = Math.floor(26 * config.greeblingDensity * config.floatingDensity);
  const alphaScale = 0.3 + config.floatingDensity * 0.9;
  const brightScale = 0.25 + config.floatingDensity * 0.75;

  srand(999);
  for (let i = 0; i < density; i++) {
    const fx = rand() * W;
    const fy = rand() * H;
    const type = Math.floor(rand() * 8);
    const phase = rand() * Math.PI * 2;
    const speed = rand() * 0.003 + 0.001;
    const alpha = (0.1 + 0.15 * Math.sin(t * speed + phase)) * alphaScale;

    ctx.fillStyle = rgba(config.accentDim, alpha);

    switch (type) {
      case 0: // single dot
        ctx.fillRect(fx, fy, 1, 1);
        break;
      case 1: // cross
        ctx.fillRect(fx - 1, fy, 3, 1);
        ctx.fillRect(fx, fy - 1, 1, 3);
        break;
      case 2: // L shape
        ctx.fillRect(fx, fy, 3, 1);
        ctx.fillRect(fx, fy, 1, 3);
        break;
      case 3: // dash pair
        ctx.fillRect(fx, fy, 2, 1);
        ctx.fillRect(fx + 4, fy, 2, 1);
        break;
      case 4: // corner bracket
        ctx.fillRect(fx, fy, 4, 1);
        ctx.fillRect(fx, fy, 1, 4);
        ctx.fillRect(fx + 6, fy, 1, 4);
        ctx.fillRect(fx, fy + 3, 4, 1);
        break;
      case 5: { // spinner cell
        const ang = t * speed + phase;
        ctx.fillRect(fx - 1, fy - 1, 3, 3);
        ctx.fillRect(fx + Math.cos(ang) * 4, fy + Math.sin(ang) * 4, 2, 2);
        break;
      }
      case 6: { // bus bracket
        const pulse = (0.12 + 0.15 * Math.sin(t * speed * 1.3 + phase)) * brightScale;
        ctx.fillStyle = rgba(config.accentColor, pulse);
        ctx.fillRect(fx, fy, 8, 1);
        ctx.fillRect(fx, fy + 4, 8, 1);
        ctx.fillRect(fx, fy + 1, 1, 3);
        ctx.fillRect(fx + 7, fy + 1, 1, 3);
        break;
      }
      case 7: { // pulse ladder
        for (let j = 0; j < 4; j++) {
          const on = Math.sin(t * speed * 2 + phase - j * 0.5) > 0;
          ctx.fillStyle = rgba(on ? config.accentBright : config.accentDim, (on ? 0.28 : 0.1) * alphaScale);
          ctx.fillRect(fx + j * 3, fy + (j % 2), 2, 1);
        }
        break;
      }
    }
  }

  // Blinking LED clusters
  srand(888);
  const clusterCount = Math.floor(4 + config.floatingDensity * 28);
  for (let i = 0; i < clusterCount; i++) {
    const bx = rand() * W;
    const by = rand() * H;
    const numPips = 3 + Math.floor(rand() * 5);
    for (let j = 0; j < numPips; j++) {
      const on = Math.sin(t * 0.005 + j * 1.2 + i * 0.7) > 0.2;
      ctx.fillStyle = rgba(config.accentBright, (on ? 0.4 : 0.05) * brightScale);
      ctx.fillRect(bx + j * 4, by, 2, 2);
    }
  }

  drawMorphRuneScatter(t);
}

// ── MAIN LOOP ───────────────────────────────────────────
function animate() {
  if (!hasValidViewportSize()) {
    resize();

    if (!hasValidViewportSize()) {
      requestAnimationFrame(animate);
      return;
    }
  }

  const t = performance.now();

  ctx.save();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  // Background
  ctx.fillStyle = config.bgColor;
  ctx.fillRect(0, 0, W, H);

  // Panels
  panelLayout.forEach(p => {
    const revealDuration = p.revealDuration || 1;
    const revealProgress = Math.max(0, Math.min(1, (t - (p.revealAt || 0)) / revealDuration));

    if (revealProgress <= 0) return;

    const easedReveal = 1 - Math.pow(1 - revealProgress, 3);
    ctx.save();
    ctx.globalAlpha *= easedReveal;
    ctx.translate(0, (1 - easedReveal) * 8);
    p.type(p.x, p.y, p.w, p.h, t, p.seed);
    ctx.restore();
  });

  drawPanelGlow();

  // Edge greeblings
  drawEdgeGreeblings(t);

  // Floating greeblings
  drawFloatingGreeblings(t);

  ctx.restore();
  requestAnimationFrame(animate);
}

animate();
