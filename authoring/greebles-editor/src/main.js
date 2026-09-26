// greebles_001
// Customizable sci-fi greeble generator for embeddable website backgrounds

const stage = document.getElementById('stage');
const displayCanvas = document.getElementById('canvas');
const controls = document.getElementById('controls');
const DPR = Math.min(window.devicePixelRatio || 1, 1.25);
const hoverLayer = document.createElement('div');
hoverLayer.id = 'greeble-hover-layer';
const hoverPip = document.createElement('i');
hoverLayer.appendChild(hoverPip);
Object.assign(hoverLayer.style, {
  position: 'absolute', left: '0', top: '0', zIndex: '8', pointerEvents: 'none', opacity: '0',
  border: '1px solid rgba(255,174,0,.62)', boxShadow: 'inset 0 0 18px rgba(255,174,0,.045)',
  transform: 'translate3d(-100px,-100px,0)', willChange: 'transform,width,height,opacity',
});
Object.assign(hoverPip.style, {
  position: 'absolute', left: '0', top: '0', width: '6px', height: '6px', borderRadius: '50%',
  border: '1px solid rgba(255,174,0,.8)', boxShadow: '0 0 9px rgba(255,174,0,.55)',
  transform: 'translate3d(-20px,-20px,0)', willChange: 'transform',
});
stage.appendChild(hoverLayer);
const searchParams = new URLSearchParams(window.location.search);
const isStaticCustomer = window.__GREEBLES_STATIC_CUSTOMER__ === true;
const isEmbedMode = window.__GREEBLES_EMBED__ === true || searchParams.get('embed') === '1';
let W, H;
let resizeFrame = 0;
let resizeTimer = 0;
let apertureRectCache = null;
const pointerState = { x: -1, y: -1, active: false };

function updatePointer(event) {
  const rect = stage.getBoundingClientRect();
  pointerState.x = event.clientX - rect.left;
  pointerState.y = event.clientY - rect.top;
  pointerState.active = event.pointerType !== 'touch';
  renderImmediatePointerCue();
}
stage.addEventListener('pointermove', updatePointer, { passive: true });
stage.addEventListener('pointerleave', () => {
  pointerState.active = false;
  hoverLayer.style.opacity = '0';
});

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
  panelSpacing: 4,
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
if (!document.querySelector('.syntax-card')) {
  document.title = isEmbedMode ? 'greebles_001 Embed' : 'greebles_001 Editor';
}
showStartHereSplash();

const ctx = displayCanvas.getContext('2d', { alpha: false });

function resize() {
  const controlsWidth = !isEmbedMode && controls ? controls.clientWidth : 0;
  const nextWidth = stage.clientWidth || (window.innerWidth - controlsWidth);
  const nextHeight = stage.clientHeight || window.innerHeight;

  if (!nextWidth || !nextHeight) return;

  W = nextWidth;
  H = nextHeight;
  apertureRectCache = null;
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

function getPanelPointer(x, y, w, h) {
  if (!pointerState.active || pointerState.x < x || pointerState.x > x + w || pointerState.y < y || pointerState.y > y + h) return null;
  return {
    x: pointerState.x,
    y: pointerState.y,
    nx: clamp((pointerState.x - x) / Math.max(1, w), 0, 1),
    ny: clamp((pointerState.y - y) / Math.max(1, h), 0, 1),
  };
}

function renderImmediatePointerCue() {
  if (!Number.isFinite(W) || !Number.isFinite(H) || !pointerState.active || !panelLayout?.length) {
    hoverLayer.style.opacity = '0';
    return;
  }
  const panel = panelLayout.find((item) => (
    pointerState.x >= item.x && pointerState.x <= item.x + item.w &&
    pointerState.y >= item.y && pointerState.y <= item.y + item.h
  ));
  if (!panel) { hoverLayer.style.opacity = '0'; return; }
  const hover = getPanelPointer(panel.x, panel.y, panel.w, panel.h);
  if (!hover) { hoverLayer.style.opacity = '0'; return; }
  hoverLayer.style.width = `${Math.max(0, panel.w - 2)}px`;
  hoverLayer.style.height = `${Math.max(0, panel.h - 2)}px`;
  hoverLayer.style.transform = `translate3d(${panel.x + 1}px,${panel.y + 1}px,0)`;
  hoverLayer.style.opacity = '1';
  hoverPip.style.transform = `translate3d(${hover.x - panel.x - 4}px,${hover.y - panel.y - 4}px,0)`;
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

    ctx.fillStyle = rgba(config.accentBright, alpha);
    const sz = 1.2 * (0.5 + depth * 0.8);
    ctx.fillRect(Math.floor(px), Math.floor(py), Math.ceil(sz), Math.ceil(sz));
  });

  // North pole glow
  const polePulse = 0.7 + 0.3 * Math.sin(t * 0.002);
  for (let i = 4; i >= 0; i--) {
    const gr = 6 + i * 10;
    const a = (0.15 - i * 0.025) * polePulse * config.glowIntensity;
    const grad = ctx.createRadialGradient(cx, cy - r, 0, cx, cy - r, gr);
    grad.addColorStop(0, rgba(config.glowColor, a));
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - gr, cy - r - gr, gr * 2, gr * 2);
  }
  // Core
  ctx.fillStyle = rgba(config.glowColor, 0.9 * polePulse);
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

// Panel: braided telemetry lanes. Each seed creates a distinct phase relationship.
function drawTelemetryBraid(x, y, w, h, t, seed) {
  drawPanelBorder(x, y, w, h);
  const pad = 6;
  const lanes = Math.max(2, Math.min(6, Math.floor(h / 12)));
  const usableW = Math.max(1, w - pad * 2);
  for (let lane = 0; lane < lanes; lane++) {
    const baseY = y + pad + ((lane + 0.5) / lanes) * (h - pad * 2);
    const phase = seed * 0.17 + lane * 1.31;
    ctx.strokeStyle = rgba(lane % 2 ? config.accentDim : config.accentColor, 0.18 + lane * 0.025);
    ctx.lineWidth = lane % 3 === 0 ? 1 : 0.5;
    ctx.beginPath();
    for (let px = 0; px <= usableW; px += 3) {
      const p = px / usableW;
      const wave = Math.sin(p * (8 + seed % 5) + t * 0.0012 * config.animationSpeed + phase) * Math.min(5, h / lanes * 0.28);
      px === 0 ? ctx.moveTo(x + pad + px, baseY + wave) : ctx.lineTo(x + pad + px, baseY + wave);
    }
    ctx.stroke();
    const packetX = x + pad + ((t * (0.018 + lane * 0.003) + seed * 13 + lane * 29) % usableW);
    ctx.fillStyle = rgba(config.accentBright, 0.38 + 0.2 * Math.sin(t * 0.004 + phase));
    ctx.fillRect(packetX, baseY - 1, 3, 2);
  }
  drawTicksH(x + pad, y + h - 4, usableW, 7, t + seed);
  drawMicroText(x + 4, y + 9, t, seed + 401);
}

// Panel: orbital lattice with independently precessing satellites.
function drawOrbitalLattice(x, y, w, h, t, seed) {
  drawPanelBorder(x, y, w, h);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.max(4, Math.min(w, h) * 0.36);
  const rings = 2 + (seed % 4);
  for (let ring = 1; ring <= rings; ring++) {
    const rr = r * ring / rings;
    ctx.strokeStyle = rgba(ring % 2 ? config.accentDim : config.borderColor, 0.15 + ring * 0.045);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rr, rr * (0.42 + (seed % 3) * 0.11), seed * 0.07 + ring * 0.36, 0, Math.PI * 2);
    ctx.stroke();
    const a = t * (0.00035 + ring * 0.00008) * config.animationSpeed * (ring % 2 ? 1 : -1) + seed + ring;
    ctx.fillStyle = rgba(ring === rings ? config.accentBright : config.accentColor, 0.35 + ring * 0.08);
    ctx.fillRect(cx + Math.cos(a) * rr - 1, cy + Math.sin(a) * rr * 0.55 - 1, ring === rings ? 3 : 2, 2);
  }
  const pulse = 2 + Math.max(0, Math.sin(t * 0.0025 + seed)) * r * 0.25;
  ctx.strokeStyle = rgba(config.accentBright, 0.24);
  ctx.strokeRect(cx - pulse, cy - pulse, pulse * 2, pulse * 2);
  drawMicroText(x + 4, y + h - 4, t, seed + 421);
}

// Panel: animated signal-routing bus with branching packets.
function drawCircuitBus(x, y, w, h, t, seed) {
  drawPanelBorder(x, y, w, h);
  const pad = 5;
  const rows = Math.max(2, Math.min(7, Math.floor(h / 10)));
  const span = Math.max(1, w - pad * 2);
  for (let row = 0; row < rows; row++) {
    const yy = y + pad + (row + 0.5) / rows * (h - pad * 2);
    const junction = x + pad + span * (0.22 + ((seed + row * 7) % 58) / 100);
    ctx.strokeStyle = rgba(config.borderColor, 0.24);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x + pad, yy);
    ctx.lineTo(junction, yy);
    ctx.lineTo(junction + 5, yy + (row % 2 ? -5 : 5));
    ctx.lineTo(x + w - pad, yy + (row % 2 ? -5 : 5));
    ctx.stroke();
    const travel = ((t * (0.025 + row * 0.002) + seed * 17 + row * 31) % span) / span;
    const px = x + pad + travel * span;
    ctx.fillStyle = rgba(row % 3 ? config.accentColor : config.accentBright, 0.35 + 0.25 * Math.sin(t * 0.003 + row));
    ctx.fillRect(px, yy - 1, 3, 2);
    ctx.fillStyle = rgba(config.accentDim, 0.28);
    ctx.fillRect(junction - 1, yy - 1, 3, 3);
  }
  drawMicroText(x + 4, y + 9, t, seed + 443);
}

// Panel: nested phase windows, inspired by oscilloscope persistence.
function drawPhaseWindows(x, y, w, h, t, seed) {
  drawPanelBorder(x, y, w, h);
  const pad = 5;
  const count = Math.max(2, Math.min(5, Math.floor(w / 22)));
  for (let cell = 0; cell < count; cell++) {
    const left = x + pad + cell * (w - pad * 2) / count;
    const cw = (w - pad * 2) / count - 3;
    const mid = y + h / 2;
    ctx.strokeStyle = rgba(config.borderColor, 0.2);
    ctx.strokeRect(left, y + pad, cw, h - pad * 2);
    for (let echo = 0; echo < 3; echo++) {
      ctx.strokeStyle = rgba(echo === 0 ? config.accentBright : config.accentColor, 0.3 - echo * 0.075);
      ctx.beginPath();
      for (let px = 0; px <= cw; px += 2) {
        const p = px / Math.max(1, cw);
        const amp = (h - pad * 2) * (0.12 + echo * 0.04);
        const yy = mid + Math.sin(p * Math.PI * (2 + (seed + cell) % 4) + t * 0.0016 + cell + echo * 0.5) * amp;
        px === 0 ? ctx.moveTo(left + px, yy) : ctx.lineTo(left + px, yy);
      }
      ctx.stroke();
    }
  }
  drawTicksV(x + 2, y + pad, h - pad * 2, 6, t + seed);
  drawMicroText(x + w - 31, y + h - 4, t, seed + 467);
}

// Panel: sparse packet constellation with living links.
function drawPacketConstellation(x, y, w, h, t, seed) {
  drawPanelBorder(x, y, w, h);
  const nodes = [];
  srand(seed + 487);
  const count = Math.max(4, Math.min(12, Math.floor((w * h) / 520)));
  for (let i = 0; i < count; i++) nodes.push({x:x + 6 + rand() * Math.max(1, w - 12),y:y + 6 + rand() * Math.max(1, h - 12),phase:rand() * Math.PI * 2});
  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1], b = nodes[i];
    const energy = 0.1 + 0.12 * Math.max(0, Math.sin(t * 0.0018 + a.phase));
    ctx.strokeStyle = rgba(config.accentDim, energy);
    ctx.setLineDash([1 + (i % 3), 3 + (seed % 4)]);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.setLineDash([]);
  nodes.forEach((node, i) => {
    const on = Math.sin(t * (0.002 + i * 0.00017) + node.phase) > 0.12;
    ctx.fillStyle = rgba(on ? config.accentBright : config.accentColor, on ? 0.58 : 0.18);
    ctx.fillRect(node.x - (on ? 1 : 0), node.y - (on ? 1 : 0), on ? 3 : 1, on ? 3 : 1);
  });
  drawMicroText(x + 4, y + 9, t, seed + 503);
}

function drawSpectralWaterfall(x, y, w, h, t, seed) {
  drawPanelBorder(x, y, w, h); const p = 5, rows = Math.max(4, Math.floor((h-p*2)/5));
  for (let r=0;r<rows;r++) { const yy=y+p+r*5, drift=t*.0011+r*.28+seed;
    ctx.strokeStyle=rgba(r%3?config.accentDim:config.accentColor,.12+r/rows*.16); ctx.beginPath();
    for(let px=0;px<=w-p*2;px+=3){const n=px/Math.max(1,w-p*2), v=Math.sin(n*14+drift)*2+Math.sin(n*31-drift*.6); px?ctx.lineTo(x+p+px,yy+v):ctx.moveTo(x+p,yy+v)} ctx.stroke();
  } drawMicroText(x+4,y+9,t,seed+521);
}

function drawHexReactor(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h); const s=Math.max(4,Math.min(9,Math.floor(Math.min(w,h)/6))), dx=s*1.55,dy=s*1.34;
  for(let row=0,yy=y+6;yy<y+h-5;row++,yy+=dy)for(let col=0,xx=x+6+(row%2)*dx/2;xx<x+w-5;col++,xx+=dx){
    const a=.1+.22*Math.max(0,Math.sin(t*.002+(row*7+col*3+seed)*.37)); ctx.strokeStyle=rgba((row+col)%5?config.accentDim:config.accentBright,a);ctx.beginPath();
    for(let k=0;k<6;k++){const q=Math.PI/3*k,px=xx+Math.cos(q)*s*.58,py=yy+Math.sin(q)*s*.58;k?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.closePath();ctx.stroke();
  } drawMicroText(x+4,y+h-4,t,seed+541);
}

function drawDualNeedleScope(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h); const cx=x+w/2,cy=y+h*.72,r=Math.min(w*.42,h*.62);
  ctx.strokeStyle=rgba(config.borderColor,.3);ctx.beginPath();ctx.arc(cx,cy,r,Math.PI,Math.PI*2);ctx.stroke();
  for(let i=0;i<=12;i++){const a=Math.PI+i/12*Math.PI,rr=i%3?3:6;ctx.strokeStyle=rgba(config.accentDim,.18+i/60);ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*(r-rr),cy+Math.sin(a)*(r-rr));ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);ctx.stroke()}
  [1,-1].forEach((dir,i)=>{const a=Math.PI*1.5+Math.sin(t*(.0008+i*.00022)+seed+i)*1.16*dir;ctx.strokeStyle=rgba(i?config.accentColor:config.accentBright,.62);ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*r*.82,cy+Math.sin(a)*r*.82);ctx.stroke()}); drawMicroText(x+4,y+9,t,seed+557);
}

function drawMemoryTape(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h); const p=5,tracks=Math.max(2,Math.min(8,Math.floor(h/9))),span=w-p*2;
  for(let r=0;r<tracks;r++){const yy=y+p+(r+.5)*(h-p*2)/tracks;ctx.fillStyle=rgba(config.borderColor,.28);ctx.fillRect(x+p,yy,span,1);
    srand(seed+r*19);for(let i=0;i<Math.max(3,Math.floor(span/14));i++){const xx=x+p+rand()*span,len=2+rand()*9,on=Math.sin(t*.002+i+r+seed)>.15;ctx.fillStyle=rgba(on?config.accentBright:config.accentColor,on?.42:.16);ctx.fillRect(xx,yy-1,len,3)}
  } const head=x+p+(t*.025+seed*23)%Math.max(1,span);ctx.fillStyle=rgba(config.accentDim,.38);ctx.fillRect(head,y+p,1,h-p*2);drawMicroText(x+4,y+h-4,t,seed+577);
}

function drawTriangulationMap(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);srand(seed+593);const pts=Array.from({length:Math.max(5,Math.min(13,Math.floor(w*h/480)))},()=>({x:x+5+rand()*(w-10),y:y+5+rand()*(h-10)}));
  for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],c0=pts[(i+3)%pts.length];ctx.strokeStyle=rgba(config.accentDim,.1+.08*Math.sin(t*.001+i));ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c0.x,c0.y);ctx.closePath();ctx.stroke();
    ctx.fillStyle=rgba(i%4?config.accentColor:config.accentBright,.3+.18*Math.sin(t*.003+i));ctx.fillRect(a.x-1,a.y-1,2,2)}drawMicroText(x+4,y+9,t,seed+601);
}

function drawGlyphRain(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const cols=Math.max(3,Math.floor((w-8)/7)),rows=Math.max(2,Math.floor((h-8)/7));ctx.font='6px monospace';
  for(let col=0;col<cols;col++){const head=Math.floor((t*.006+seed+col*3.7)%Math.max(1,rows));for(let row=0;row<rows;row++){const d=(head-row+rows)%rows,a=d<4?.45-d*.09:.07;ctx.fillStyle=rgba(d===0?config.accentBright:config.accentDim,a);ctx.fillText('0123456789ABCDEF'[(seed+col*5+row*3)%16],x+5+col*7,y+9+row*7)}}
}

function drawCapacitorBank(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const p=5,cols=Math.max(2,Math.floor((w-p*2)/11)),rows=Math.max(1,Math.floor((h-p*2)/15));
  for(let r=0;r<rows;r++)for(let col=0;col<cols;col++){const cx=x+p+col*11+5,cy=y+p+r*15+7,charge=.5+.5*Math.sin(t*(.001+col*.00004)+seed+r);
    ctx.strokeStyle=rgba(config.borderColor,.32);ctx.strokeRect(cx-3,cy-5,6,10);ctx.fillStyle=rgba((r+col)%4?config.accentColor:config.accentBright,.12+charge*.34);ctx.fillRect(cx-2,cy+4-charge*8,4,charge*8);ctx.fillStyle=rgba(config.accentDim,.3);ctx.fillRect(cx-1,cy-7,2,2)}drawMicroText(x+4,y+h-4,t,seed+617);
}

function drawRadialPetals(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const cx=x+w/2,cy=y+h/2,r=Math.min(w,h)*.36,petals=5+seed%7,rot=t*.00022+seed;
  for(let i=0;i<petals;i++){const a=rot+i/petals*Math.PI*2,pulse=.55+.35*Math.sin(t*.0018+i);ctx.strokeStyle=rgba(i%3?config.accentDim:config.accentBright,.18+pulse*.18);ctx.beginPath();ctx.ellipse(cx+Math.cos(a)*r*.42,cy+Math.sin(a)*r*.42,r*.52,r*.14,a,0,Math.PI*2);ctx.stroke()}
  ctx.fillStyle=rgba(config.accentBright,.48);ctx.fillRect(cx-1,cy-1,3,3);drawMicroText(x+4,y+9,t,seed+631);
}

function drawBarcodeScanner(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const p=5,span=w-p*2;srand(seed+647);let xx=x+p;while(xx<x+w-p){const bw=1+Math.floor(rand()*4),bright=rand()>.72;ctx.fillStyle=rgba(bright?config.accentColor:config.borderColor,bright?.34:.26);ctx.fillRect(xx,y+p,bw,h-p*2);xx+=bw+1+Math.floor(rand()*3)}
  const scan=x+p+(t*.035+seed*11)%Math.max(1,span);const g=ctx.createLinearGradient(scan-8,0,scan+8,0);g.addColorStop(0,'transparent');g.addColorStop(.5,rgba(config.accentBright,.48));g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(scan-8,y+p,16,h-p*2);drawMicroText(x+4,y+h-4,t,seed+653);
}

function drawTopoContours(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const cx=x+w*(.35+(seed%4)*.1),cy=y+h*(.35+(seed%3)*.14),rings=Math.max(3,Math.min(9,Math.floor(Math.min(w,h)/7)));
  for(let ring=1;ring<=rings;ring++){ctx.strokeStyle=rgba(ring===rings?config.accentColor:config.accentDim,.1+ring*.025);ctx.beginPath();const steps=32;for(let i=0;i<=steps;i++){const a=i/steps*Math.PI*2,noise=1+Math.sin(a*(3+seed%5)+t*.0007+ring)*.09+Math.sin(a*7-seed)*.04,rx=ring/rings*w*.42*noise,ry=ring/rings*h*.38*noise;i?ctx.lineTo(cx+Math.cos(a)*rx,cy+Math.sin(a)*ry):ctx.moveTo(cx+Math.cos(a)*rx,cy+Math.sin(a)*ry)}ctx.closePath();ctx.stroke()}drawMicroText(x+4,y+9,t,seed+673);
}

function drawBinaryRegister(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const p=5,cell=6,cols=Math.max(1,Math.floor((w-p*2)/cell)),rows=Math.max(1,Math.floor((h-p*2)/cell));
  for(let r=0;r<rows;r++)for(let col=0;col<cols;col++){const clock=Math.floor(t/(180+((seed+col)%5)*35)),on=((seed+r*13+col*7+clock)^(col<<r%3))&1;ctx.fillStyle=rgba(on?config.accentBright:config.accentDim,on?.4:.08);on?ctx.fillRect(x+p+col*cell,y+p+r*cell,3,3):ctx.strokeRect(x+p+col*cell,y+p+r*cell,3,3)}drawMicroText(x+4,y+h-4,t,seed+691);
}

function drawCrosshairTracker(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const p=7,hover=getPanelPointer(x,y,w,h),px=hover?hover.x:x+p+(.5+.42*Math.sin(t*.0007+seed))*(w-p*2),py=hover?hover.y:y+p+(.5+.4*Math.cos(t*.00091+seed*.37))*(h-p*2),r=Math.max(4,Math.min(w,h)*.16);
  ctx.strokeStyle=rgba(config.accentDim,.28);ctx.setLineDash([2,3]);ctx.beginPath();ctx.moveTo(x+p,py);ctx.lineTo(x+w-p,py);ctx.moveTo(px,y+p);ctx.lineTo(px,y+h-p);ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle=rgba(config.accentBright,.52);ctx.strokeRect(px-r,py-r,r*2,r*2);ctx.beginPath();ctx.arc(px,py,r*.55,0,Math.PI*2);ctx.stroke();ctx.fillStyle=rgba(config.accentBright,.6);ctx.fillRect(px-1,py-1,3,3);drawMicroText(x+4,y+9,t,seed+709);
}

function drawLissajousScope(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const cx=x+w/2,cy=y+h/2,rx=Math.max(2,w*.39),ry=Math.max(2,h*.36),a=2+seed%4,b=3+(seed>>2)%5,phase=t*.00055+seed;
  for(let echo=3;echo>=0;echo--){ctx.strokeStyle=rgba(echo?config.accentDim:config.accentBright,.08+(3-echo)*.09);ctx.beginPath();for(let i=0;i<=100;i++){const q=i/100*Math.PI*2,px=cx+Math.sin(a*q+phase-echo*.08)*rx,py=cy+Math.sin(b*q)*ry;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.stroke()}drawMicroText(x+4,y+h-4,t,seed+727);
}

function drawFrequencyComb(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const p=5,count=Math.max(4,Math.floor((w-p*2)/5)),base=y+h-p;
  for(let i=0;i<count;i++){const resonance=Math.pow(Math.max(0,Math.sin(i*.61+seed)+Math.sin(t*.0013+i*.17)*.28),2),hh=Math.min(h-p*2,3+resonance*(h-p*2)*.7);ctx.fillStyle=rgba(i%7===seed%7?config.accentBright:config.accentColor,.2+resonance*.36);ctx.fillRect(x+p+i*5,base-hh,2,hh);if(i%4===0){ctx.fillStyle=rgba(config.accentDim,.22);ctx.fillRect(x+p+i*5-1,base-hh-3,4,1)}}drawTicksH(x+p,base,w-p*2,5,t+seed);drawMicroText(x+4,y+9,t,seed+743);
}

function drawVectorField(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const p=6,step=Math.max(8,Math.min(14,Math.floor(Math.min(w,h)/4))),hover=getPanelPointer(x,y,w,h);
  for(let yy=y+p;yy<y+h-p;yy+=step)for(let xx=x+p;xx<x+w-p;xx+=step){const base=Math.sin(xx*.06+t*.0007+seed)+Math.cos(yy*.08-t*.0005),a=hover?Math.atan2(hover.y-yy,hover.x-xx)+base*.18:base,len=3+2*Math.sin(t*.001+xx+yy);ctx.strokeStyle=rgba(config.accentDim,.18+.12*Math.sin(base));ctx.beginPath();ctx.moveTo(xx-Math.cos(a)*len,yy-Math.sin(a)*len);ctx.lineTo(xx+Math.cos(a)*len,yy+Math.sin(a)*len);ctx.stroke();ctx.fillStyle=rgba(config.accentBright,.28);ctx.fillRect(xx+Math.cos(a)*len-1,yy+Math.sin(a)*len-1,2,2)}drawMicroText(x+4,y+h-4,t,seed+761);
}

function drawMechanicalEscapement(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const cx=x+w/2,cy=y+h/2,r=Math.max(4,Math.min(w,h)*.29),teeth=7+seed%8,a=t*.00048+seed;
  ctx.strokeStyle=rgba(config.accentColor,.32);ctx.beginPath();for(let i=0;i<teeth*2;i++){const q=i/(teeth*2)*Math.PI*2+a,rr=i%2?r:r*.74;i?ctx.lineTo(cx+Math.cos(q)*rr,cy+Math.sin(q)*rr):ctx.moveTo(cx+Math.cos(q)*rr,cy+Math.sin(q)*rr)}ctx.closePath();ctx.stroke();
  const arm=Math.sin(t*.0017+seed)*.36;ctx.strokeStyle=rgba(config.accentBright,.58);ctx.beginPath();ctx.moveTo(cx-r*.8,cy-r*.75);ctx.lineTo(cx+Math.sin(arm)*r*.55,cy+Math.cos(arm)*r*.55);ctx.lineTo(cx+r*.8,cy-r*.75);ctx.stroke();ctx.strokeRect(cx-3,cy-3,6,6);drawMicroText(x+4,y+9,t,seed+773);
}

function drawThermalCells(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const p=4,cell=5,cols=Math.max(1,Math.floor((w-p*2)/cell)),rows=Math.max(1,Math.floor((h-p*2)/cell)),hover=getPanelPointer(x,y,w,h);
  for(let r=0;r<rows;r++)for(let col=0;col<cols;col++){const hx=x+p+col*cell,hy=y+p+r*cell,heat=hover?Math.max(0,1-Math.hypot(hover.x-hx,hover.y-hy)/Math.max(20,Math.min(w,h)*.7)):0,n=clamp((Math.sin(col*.51+t*.001+seed)+Math.cos(r*.63-t*.0013)+Math.sin((col+r)*.29+seed))* .166+.5+heat*.55,0,1);ctx.fillStyle=rgba(n>.72?config.accentBright:n>.43?config.accentColor:config.accentDim,.08+n*.35);ctx.fillRect(hx,hy,cell-1,cell-1)}drawMicroText(x+4,y+h-4,t,seed+797);
}

function drawParabolaArray(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const p=5,count=3+seed%5,span=w-p*2,hover=getPanelPointer(x,y,w,h);
  for(let k=0;k<count;k++){const phase=t*.00065+k*.7+seed,apex=hover?hover.x:x+p+span*(.15+.7*(.5+.5*Math.sin(phase*.37+k))),base=y+h-p-k%2*3,curve=hover?.75+hover.ny*2.2:1.7+Math.sin(phase)*.22;ctx.strokeStyle=rgba(k===0?config.accentBright:k%2?config.accentDim:config.accentColor,.16+(count-k)*.035);ctx.beginPath();for(let px=0;px<=span;px+=2){const q=(x+p+px-apex)/Math.max(1,span),yy=base-(q*q)*(h-p*2)*curve;px?ctx.lineTo(x+p+px,yy):ctx.moveTo(x+p,yy)}ctx.stroke()}drawMicroText(x+4,y+9,t,seed+811);
}

function drawCatenaryBridges(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const p=5,bridges=2+seed%4;
  for(let b=0;b<bridges;b++){const yy=y+p+(b+.5)*(h-p*2)/bridges,sag=(h-p*2)/bridges*.42;ctx.strokeStyle=rgba(b%2?config.accentDim:config.accentColor,.24);ctx.beginPath();for(let px=0;px<=w-p*2;px+=2){const q=px/Math.max(1,w-p*2)*2-1,v=(Math.cosh(q*1.7)-1)/(Math.cosh(1.7)-1);px?ctx.lineTo(x+p+px,yy-sag+v*sag):ctx.moveTo(x+p,yy-sag+v*sag)}ctx.stroke();const packet=(t*.022+seed*13+b*29)%Math.max(1,w-p*2);ctx.fillStyle=rgba(config.accentBright,.5);ctx.fillRect(x+p+packet,yy-sag+2,3,2)}drawMicroText(x+4,y+h-4,t,seed+823);
}

function drawPendulumBank(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const p=5,count=Math.max(3,Math.floor((w-p*2)/10));
  for(let i=0;i<count;i++){const top=x+p+(i+.5)*(w-p*2)/count,len=(h-p*2)*(.35+.5*(i+1)/count),a=Math.sin(t*(.0011+i*.000035)+seed)*(.18+.25*i/count);ctx.strokeStyle=rgba(config.borderColor,.3);ctx.beginPath();ctx.moveTo(top,y+p);ctx.lineTo(top+Math.sin(a)*len,y+p+Math.cos(a)*len);ctx.stroke();ctx.fillStyle=rgba(i%5?config.accentColor:config.accentBright,.3+.2*Math.sin(t*.002+i));ctx.beginPath();ctx.arc(top+Math.sin(a)*len,y+p+Math.cos(a)*len,1.5+i%2,0,Math.PI*2);ctx.fill()}drawMicroText(x+4,y+h-4,t,seed+839);
}

function drawInterferenceField(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const p=4,step=4,c1={x:x+w*.32,y:y+h*.48},c2={x:x+w*.69,y:y+h*.52};
  for(let yy=y+p;yy<y+h-p;yy+=step)for(let xx=x+p;xx<x+w-p;xx+=step){const d1=Math.hypot(xx-c1.x,yy-c1.y),d2=Math.hypot(xx-c2.x,yy-c2.y),v=.5+.5*Math.sin((d1-d2)*.42+t*.002+seed);ctx.fillStyle=rgba(v>.76?config.accentBright:v>.48?config.accentColor:config.accentDim,.06+v*.28);ctx.fillRect(xx,yy,2,2)}drawMicroText(x+4,y+9,t,seed+853);
}

function drawPolarRose(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const cx=x+w/2,cy=y+h/2,R=Math.min(w,h)*.39,n=2+seed%7,phase=t*.00035;
  for(let echo=2;echo>=0;echo--){ctx.strokeStyle=rgba(echo?config.accentDim:config.accentBright,.12+(2-echo)*.12);ctx.beginPath();for(let i=0;i<=140;i++){const a=i/140*Math.PI*2,r=R*Math.cos(n*a+phase-echo*.05),px=cx+Math.cos(a)*r,py=cy+Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.stroke()}drawMicroText(x+4,y+h-4,t,seed+877);
}

function drawLensCaustic(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const p=5,hover=getPanelPointer(x,y,w,h),focus=hover?hover.x:x+w*(.62+.12*Math.sin(t*.0007+seed)),focusY=hover?hover.y:y+h/2,rays=Math.max(6,Math.floor(h/6));
  for(let i=0;i<rays;i++){const sy=y+p+i/(rays-1)*(h-p*2),bend=(sy-focusY)*.32;ctx.strokeStyle=rgba(i%4?config.accentDim:config.accentBright,.1+.18*Math.sin(t*.001+i));ctx.beginPath();ctx.moveTo(x+p,sy);ctx.quadraticCurveTo(x+w*.42,sy-bend,focus,focusY);ctx.lineTo(x+w-p,focusY+bend*.45);ctx.stroke()}ctx.fillStyle=rgba(config.accentBright,.55);ctx.fillRect(focus-1,focusY-3,2,6);drawMicroText(x+4,y+9,t,seed+887);
}

function drawLogSpiral(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const cx=x+w/2,cy=y+h/2,maxR=Math.min(w,h)*.43,arms=2+seed%4,rot=t*.00028;
  for(let arm=0;arm<arms;arm++){ctx.strokeStyle=rgba(arm?config.accentDim:config.accentBright,.2+arm*.04);ctx.beginPath();for(let i=0;i<=90;i++){const q=i/90*4.8,a=q+rot+arm/arms*Math.PI*2,r=maxR*(Math.exp(.25*q)-1)/(Math.exp(1.2)-1),px=cx+Math.cos(a)*r,py=cy+Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.stroke()}drawMicroText(x+4,y+h-4,t,seed+907);
}

function drawSeismicDrums(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const p=5,tracks=Math.max(2,Math.floor((h-p*2)/12)),span=w-p*2;
  for(let r=0;r<tracks;r++){const yy=y+p+(r+.5)*(h-p*2)/tracks;ctx.strokeStyle=rgba(config.borderColor,.18);ctx.fillRect(x+p,yy,span,1);ctx.strokeStyle=rgba(r%2?config.accentDim:config.accentColor,.3);ctx.beginPath();for(let px=0;px<=span;px+=2){const event=Math.exp(-Math.pow((px/span-.25-.12*Math.sin(seed+r))/.09,2)),v=Math.sin(px*.65-t*.004-r)*event*6+Math.sin(px*.12+t*.001+r)*1.2;px?ctx.lineTo(x+p+px,yy+v):ctx.moveTo(x+p,yy+v)}ctx.stroke()}drawMicroText(x+4,y+9,t,seed+919);
}

function drawEnvelopeAnalyzer(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const p=6,span=w-p*2,base=y+h-p;
  for(let layer=0;layer<3;layer++){ctx.strokeStyle=rgba(layer?config.accentDim:config.accentBright,.18+layer*.07);ctx.beginPath();for(let px=0;px<=span;px+=2){const q=px/span,attack=Math.min(1,q*(3+layer)),decay=Math.exp(-q*(1.1+layer*.3)),env=attack*decay*(.75+.2*Math.sin(t*.001+seed+layer)),yy=base-env*(h-p*2);px?ctx.lineTo(x+p+px,yy):ctx.moveTo(x+p,yy)}ctx.stroke()}drawTicksH(x+p,base,span,7,t+seed);drawMicroText(x+4,y+9,t,seed+937);
}

function drawPhasePortrait(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const cx=x+w/2,cy=y+h/2,rx=w*.38,ry=h*.37;
  for(let orbit=0;orbit<5;orbit++){ctx.strokeStyle=rgba(orbit%2?config.accentDim:config.accentColor,.11+orbit*.035);ctx.beginPath();for(let i=0;i<=100;i++){const q=i/100*Math.PI*2,a=2+seed%3,b=3+(seed+orbit)%4,px=cx+Math.sin(a*q+t*.0003+orbit)*rx*(.45+orbit*.12),py=cy+Math.sin(b*q+q*.17)*ry*(.45+orbit*.12);i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.stroke()}drawMicroText(x+4,y+h-4,t,seed+953);
}

function drawTopologyKnot(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const cx=x+w/2,cy=y+h/2,R=Math.min(w,h)*.32,p=2+seed%4,q=3+(seed>>2)%5,rot=t*.00024;
  ctx.strokeStyle=rgba(config.accentBright,.36);ctx.beginPath();for(let i=0;i<=150;i++){const a=i/150*Math.PI*2,r=R*(1+.32*Math.cos(q*a)),px=cx+Math.cos(p*a+rot)*r,py=cy+Math.sin(p*a+rot)*r*.7;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.stroke();ctx.strokeStyle=rgba(config.accentDim,.16);ctx.strokeRect(cx-R,cy-R*.7,R*2,R*1.4);drawMicroText(x+4,y+9,t,seed+971);
}

function drawCellularAutomata(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const p=4,cell=4,cols=Math.max(3,Math.floor((w-p*2)/cell)),rows=Math.max(2,Math.floor((h-p*2)/cell)),gen=Math.floor(t/260)%cols;let line=Array.from({length:cols},(_,i)=>((i+seed)%11===0?1:0));
  for(let r=0;r<rows;r++){const next=[];for(let c0=0;c0<cols;c0++){const l=line[(c0-1+cols)%cols],m=line[c0],rr=line[(c0+1)%cols],on=(l^(m||rr))?1:0,nextOn=c0===gen?1:on;ctx.fillStyle=rgba(nextOn?config.accentBright:config.accentDim,nextOn?.35:.055);ctx.fillRect(x+p+c0*cell,y+p+r*cell,cell-1,cell-1);next[c0]=nextOn}line=next}drawMicroText(x+4,y+h-4,t,seed+983);
}

function drawPrimeLattice(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const p=5,cell=6,cols=Math.max(1,Math.floor((w-p*2)/cell)),rows=Math.max(1,Math.floor((h-p*2)/cell)),isPrime=n=>{if(n<2)return false;for(let d=2;d*d<=n;d++)if(n%d===0)return false;return true};
  for(let r=0;r<rows;r++)for(let c0=0;c0<cols;c0++){const n=seed+r*cols+c0+Math.floor(t/1800),prime=isPrime(n%211);ctx.fillStyle=rgba(prime?config.accentBright:config.accentDim,prime?.46:.06);prime?ctx.fillRect(x+p+c0*cell,y+p+r*cell,3,3):ctx.fillRect(x+p+c0*cell+1,y+p+r*cell+1,1,1)}drawMicroText(x+4,y+9,t,seed+997);
}

function drawOdometer(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const p=6,digits=Math.max(2,Math.min(9,Math.floor((w-p*2)/11))),dh=h-p*2;ctx.font=`${Math.max(7,Math.min(12,dh*.42))}px monospace`;
  for(let i=0;i<digits;i++){const xx=x+p+i*(w-p*2)/digits,rate=Math.pow(10,Math.max(0,digits-i-2)),v=Math.floor(t/(80*rate)+seed*i)%10,offset=(t/(80*rate))%1;ctx.strokeStyle=rgba(config.borderColor,.3);ctx.strokeRect(xx,y+p,(w-p*2)/digits-2,dh);ctx.fillStyle=rgba(i===digits-1?config.accentBright:config.accentColor,.42);ctx.fillText(String(v),xx+2,y+p+dh*.62-offset*2)}drawMicroText(x+4,y+h-4,t,seed+1013);
}

function drawSonarHistory(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const p=5,cols=Math.max(4,Math.floor((w-p*2)/5)),rows=Math.max(3,Math.floor((h-p*2)/4)),head=Math.floor(t/90)%cols;
  for(let c0=0;c0<cols;c0++)for(let r=0;r<rows;r++){const age=(head-c0+cols)%cols,target=Math.sin((c0+seed)*.27)*.35+.5,strength=Math.exp(-Math.abs(r/(rows-1)-target)*10)*Math.exp(-age*.08);ctx.fillStyle=rgba(strength>.55?config.accentBright:config.accentColor,.04+strength*.5);ctx.fillRect(x+p+c0*5,y+p+r*4,3,2)}ctx.fillStyle=rgba(config.accentDim,.35);ctx.fillRect(x+p+head*5,y+p,1,h-p*2);drawMicroText(x+4,y+9,t,seed+1031);
}

function drawNavigationCompass(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const cx=x+w/2,cy=y+h/2,r=Math.min(w,h)*.36,heading=t*.00035+seed;
  ctx.strokeStyle=rgba(config.accentDim,.25);ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();for(let i=0;i<16;i++){const a=i/16*Math.PI*2,len=i%4?3:7;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*(r-len),cy+Math.sin(a)*(r-len));ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);ctx.stroke()}ctx.fillStyle=rgba(config.accentBright,.55);ctx.beginPath();ctx.moveTo(cx+Math.cos(heading)*r*.8,cy+Math.sin(heading)*r*.8);ctx.lineTo(cx+Math.cos(heading+2.5)*r*.25,cy+Math.sin(heading+2.5)*r*.25);ctx.lineTo(cx+Math.cos(heading-2.5)*r*.25,cy+Math.sin(heading-2.5)*r*.25);ctx.closePath();ctx.fill();drawMicroText(x+4,y+h-4,t,seed+1049);
}

function drawChecksumBlocks(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const p=5,block=8,cols=Math.max(1,Math.floor((w-p*2)/block)),rows=Math.max(1,Math.floor((h-p*2)/block)),tick=Math.floor(t/420);
  for(let r=0;r<rows;r++)for(let c0=0;c0<cols;c0++){const code=((seed+c0*31+r*17+tick*(c0%3===0))>>>0)%256,bits=((code^(code>>3))&7),hot=bits===0;ctx.strokeStyle=rgba(hot?config.accentBright:config.borderColor,hot?.48:.2);ctx.strokeRect(x+p+c0*block,y+p+r*block,block-2,block-2);ctx.fillStyle=rgba(hot?config.accentBright:config.accentDim,hot?.26:.08);ctx.fillRect(x+p+c0*block+2,y+p+r*block+2,bits%3+1,bits%3+1)}drawMicroText(x+4,y+9,t,seed+1061);
}

function drawRibbonCable(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const p=5,lanes=Math.max(3,Math.min(10,Math.floor(h/6)));
  for(let l=0;l<lanes;l++){const sy=y+p+(l+.5)*(h-p*2)/lanes,ey=y+p+((l*3+seed)%lanes+.5)*(h-p*2)/lanes;ctx.strokeStyle=rgba(l%4?config.accentDim:config.accentBright,.14+l/lanes*.13);ctx.beginPath();ctx.moveTo(x+p,sy);ctx.bezierCurveTo(x+w*.34,sy+Math.sin(t*.001+l)*5,x+w*.66,ey-Math.cos(t*.0008+l)*5,x+w-p,ey);ctx.stroke();const q=(t*.00018+l*.09)%1,px=x+p+q*(w-p*2);ctx.fillStyle=rgba(config.accentColor,.38);ctx.fillRect(px,sy+(ey-sy)*q-1,2,2)}drawMicroText(x+4,y+h-4,t,seed+1087);
}

function drawMagneticField(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const hover=getPanelPointer(x,y,w,h),cx1=x+w*.35,cy=hover?hover.y:y+h*.5,cx2=x+w*.65,polarity=Math.sin(t*.0005+seed);
  for(let line=1;line<=7;line++){const spread=line/7*h*.42;ctx.strokeStyle=rgba(line%2?config.accentDim:config.accentColor,.1+line*.025);ctx.beginPath();ctx.moveTo(cx1,cy);ctx.bezierCurveTo(x+w*.45,cy-spread*polarity,x+w*.55,cy-spread*polarity,cx2,cy);ctx.stroke();ctx.beginPath();ctx.moveTo(cx1,cy);ctx.bezierCurveTo(x+w*.45,cy+spread*polarity,x+w*.55,cy+spread*polarity,cx2,cy);ctx.stroke()}ctx.fillStyle=rgba(config.accentBright,.48);ctx.fillRect(cx1-2,cy-4,4,8);ctx.fillRect(cx2-2,cy-4,4,8);drawMicroText(x+4,y+9,t,seed+1097);
}

function drawProbabilityCloud(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);srand(seed+1117);const hover=getPanelPointer(x,y,w,h),count=Math.max(15,Math.floor(w*h/85)),cx=hover?hover.x:x+w*(.5+.14*Math.sin(t*.0004+seed)),cy=hover?hover.y:y+h*(.5+.1*Math.cos(t*.0006+seed));
  for(let i=0;i<count;i++){const a=rand()*Math.PI*2,r=Math.sqrt(rand())*Math.min(w,h)*.42,wobble=Math.sin(t*.001+i+seed)*3,px=cx+Math.cos(a)*(r+wobble),py=cy+Math.sin(a)*r*.58;ctx.fillStyle=rgba(i%11?config.accentDim:config.accentBright,.08+.28*(1-r/Math.max(1,Math.min(w,h)*.42)));ctx.fillRect(px,py,i%11?1:2,i%11?1:2)}drawMicroText(x+4,y+h-4,t,seed+1123);
}

function drawStepSequencer(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const p=5,hover=getPanelPointer(x,y,w,h),steps=Math.max(4,Math.floor((w-p*2)/8)),rows=Math.max(2,Math.floor((h-p*2)/8)),play=hover?Math.min(steps-1,Math.floor(hover.nx*steps)):Math.floor(t/130)%steps;
  for(let r=0;r<rows;r++)for(let s=0;s<steps;s++){const on=((s*7+r*11+seed)%9)<3,active=s===play;ctx.strokeStyle=rgba(active?config.accentBright:config.borderColor,active?.55:.22);ctx.strokeRect(x+p+s*8,y+p+r*8,6,6);if(on){ctx.fillStyle=rgba(active?config.accentBright:config.accentColor,active?.52:.2);ctx.fillRect(x+p+s*8+2,y+p+r*8+2,2,2)}}drawMicroText(x+4,y+h-4,t,seed+1151);
}

function drawOrbitalDecay(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const cx=x+w/2,cy=y+h/2,R=Math.min(w,h)*.41,turns=4+seed%4,phase=t*.00035;
  ctx.strokeStyle=rgba(config.accentDim,.23);ctx.beginPath();for(let i=0;i<=150;i++){const q=i/150,a=q*turns*Math.PI*2+phase,r=R*(1-q*.88),px=cx+Math.cos(a)*r,py=cy+Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.stroke();const q=(t*.00012)%1,a=q*turns*Math.PI*2+phase,r=R*(1-q*.88);ctx.fillStyle=rgba(config.accentBright,.64);ctx.fillRect(cx+Math.cos(a)*r-1,cy+Math.sin(a)*r-1,3,3);drawMicroText(x+4,y+9,t,seed+1163);
}

function drawHarmonicLadder(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const p=5,rungs=Math.max(3,Math.floor((h-p*2)/7)),span=w-p*2;
  for(let r=1;r<=rungs;r++){const yy=y+p+r/(rungs+1)*(h-p*2),nodes=1+r+seed%3;ctx.strokeStyle=rgba(config.borderColor,.25);ctx.fillRect(x+p,yy,span,1);ctx.strokeStyle=rgba(r%3?config.accentColor:config.accentBright,.26);ctx.beginPath();for(let px=0;px<=span;px+=2){const q=px/span,v=Math.sin(q*Math.PI*nodes)*Math.sin(t*.001+seed+r)*(h-p*2)/rungs*.35;px?ctx.lineTo(x+p+px,yy+v):ctx.moveTo(x+p,yy+v)}ctx.stroke()}drawMicroText(x+4,y+h-4,t,seed+1181);
}

function drawClockDivider(x,y,w,h,t,seed){
  drawPanelBorder(x,y,w,h);const p=5,rows=Math.max(2,Math.floor((h-p*2)/7)),span=w-p*2;
  for(let r=0;r<rows;r++){const yy=y+p+r*7,period=12*(r+1+seed%3),offset=(t*.035)%period;ctx.fillStyle=rgba(config.borderColor,.22);ctx.fillRect(x+p,yy,span,1);for(let px=-offset;px<span;px+=period){ctx.fillStyle=rgba(r===0?config.accentBright:r%2?config.accentColor:config.accentDim,.3+r/rows*.16);ctx.fillRect(x+p+px,yy-2,Math.max(2,period*.42),4)}}drawMicroText(x+4,y+h-4,t,seed+1201);
}

const interactivePanelTypes = new Set([
  drawCrosshairTracker,
  drawVectorField,
  drawThermalCells,
  drawParabolaArray,
  drawLensCaustic,
  drawProbabilityCloud,
  drawStepSequencer,
  drawMagneticField,
  drawOrbitalLattice,
  drawPolarRose,
  drawNavigationCompass,
  drawLissajousScope,
]);

function drawPanelHoverResponse(panel, hover, t, specialized = false) {
  const { x, y, w, h } = panel;
  const pulse = 0.55 + 0.45 * Math.sin(t * 0.006);
  const radius = 10 + pulse * 7;
  const mode = Math.abs(panel.seed) % 6;
  const glow = ctx.createRadialGradient(hover.x, hover.y, 0, hover.x, hover.y, Math.max(26, Math.min(w, h) * 0.72));
  glow.addColorStop(0, rgba(config.accentBright, specialized ? 0.09 : 0.055));
  glow.addColorStop(0.45, rgba(config.accentColor, 0.025));
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, w, h);
  ctx.lineWidth = 0.5;

  if (specialized || mode === 0) {
    ctx.strokeStyle = rgba(config.accentBright, 0.2 + pulse * 0.18);
    ctx.beginPath();
    ctx.arc(hover.x, hover.y, radius, 0, Math.PI * 2);
    ctx.moveTo(hover.x - radius - 5, hover.y); ctx.lineTo(hover.x - radius + 1, hover.y);
    ctx.moveTo(hover.x + radius - 1, hover.y); ctx.lineTo(hover.x + radius + 5, hover.y);
    ctx.moveTo(hover.x, hover.y - radius - 5); ctx.lineTo(hover.x, hover.y - radius + 1);
    ctx.moveTo(hover.x, hover.y + radius - 1); ctx.lineTo(hover.x, hover.y + radius + 5);
    ctx.stroke();
  } else if (mode === 1) {
    const scanX = x + ((hover.nx * w + t * 0.035) % Math.max(1, w));
    const scanGlow = ctx.createLinearGradient(scanX - 8, 0, scanX + 8, 0);
    scanGlow.addColorStop(0, 'transparent'); scanGlow.addColorStop(0.5, rgba(config.accentBright, 0.32)); scanGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = scanGlow; ctx.fillRect(scanX - 8, y + 2, 16, h - 4);
    ctx.strokeStyle = rgba(config.accentBright, 0.25); ctx.beginPath(); ctx.moveTo(scanX, y + 3); ctx.lineTo(scanX, y + h - 3); ctx.stroke();
  } else if (mode === 2) {
    ctx.strokeStyle = rgba(config.accentDim, 0.18 + pulse * 0.16);
    for (let ring = 1; ring <= 3; ring++) { ctx.beginPath(); ctx.arc(hover.x, hover.y, radius * ring * 0.58, 0, Math.PI * 2); ctx.stroke(); }
  } else if (mode === 3) {
    const reach = 7 + pulse * 5;
    ctx.strokeStyle = rgba(config.accentBright, 0.28);
    [[x+3,y+3,1,1],[x+w-3,y+3,-1,1],[x+3,y+h-3,1,-1],[x+w-3,y+h-3,-1,-1]].forEach(([cx,cy,dx,dy])=>{ctx.beginPath();ctx.moveTo(cx+dx*reach,cy);ctx.lineTo(cx,cy);ctx.lineTo(cx,cy+dy*reach);ctx.stroke()});
    ctx.setLineDash([1,4]); ctx.beginPath(); ctx.moveTo(x+w/2,y+h/2); ctx.lineTo(hover.x,hover.y); ctx.stroke(); ctx.setLineDash([]);
  } else if (mode === 4) {
    ctx.strokeStyle = rgba(config.accentBright, 0.25); ctx.beginPath(); ctx.moveTo(x+3,hover.y); ctx.lineTo(x+w-3,hover.y); ctx.stroke();
    for(let pip=0;pip<5;pip++){const px=x+4+((t*.025+panel.seed*13+pip*w*.21)%Math.max(1,w-8));ctx.fillStyle=rgba(pip?config.accentColor:config.accentBright,.28+pip*.035);ctx.fillRect(px,hover.y-1,2,2)}
  } else {
    const diamond = 7 + pulse * 5;
    ctx.strokeStyle = rgba(config.accentBright, 0.28); ctx.beginPath(); ctx.moveTo(hover.x,hover.y-diamond);ctx.lineTo(hover.x+diamond,hover.y);ctx.lineTo(hover.x,hover.y+diamond);ctx.lineTo(hover.x-diamond,hover.y);ctx.closePath();ctx.stroke();
    ctx.strokeStyle = rgba(config.accentDim, 0.16); ctx.beginPath();ctx.moveTo(x+3,hover.y);ctx.lineTo(x+w-3,hover.y);ctx.moveTo(hover.x,y+3);ctx.lineTo(hover.x,y+h-3);ctx.stroke();
  }

  ctx.fillStyle = rgba(config.accentBright, 0.68);
  ctx.fillRect(hover.x - 1, hover.y - 1, 2, 2);
  ctx.fillStyle = rgba(config.accentBright, specialized ? 0.46 : 0.34);
  ctx.font = '6px monospace';
  ctx.fillText(specialized ? 'LINK' : ['SYNC','SCAN','ECHO','LOCK','TRACE','FOCUS'][mode], x + 4, y + h - 4);
  ctx.strokeStyle = rgba(config.accentBright, specialized ? 0.5 : 0.32);
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

// ── PANEL LAYOUT ────────────────────────────────────────
// Fill the full viewport with a dense field of modular greeble panels

function generatePanelLayout(revealOptions = {}) {
  const panels = [];
  const density = Math.max(0.3, config.greeblingDensity);
  const densityScale = 1 / density;
  const margin = Math.max(2, Math.round(config.panelSpacing));
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
    [drawTelemetryBraid],
    [drawOrbitalLattice],
    [drawCircuitBus],
    [drawPhaseWindows],
    [drawPacketConstellation],
    [drawSpectralWaterfall],
    [drawHexReactor],
    [drawDualNeedleScope],
    [drawMemoryTape],
    [drawTriangulationMap],
    [drawGlyphRain],
    [drawCapacitorBank],
    [drawRadialPetals],
    [drawBarcodeScanner],
    [drawTopoContours],
    [drawBinaryRegister],
    [drawCrosshairTracker],
    [drawLissajousScope],
    [drawFrequencyComb],
    [drawVectorField],
    [drawMechanicalEscapement],
    [drawThermalCells],
    [drawParabolaArray],
    [drawCatenaryBridges],
    [drawPendulumBank],
    [drawInterferenceField],
    [drawPolarRose],
    [drawLensCaustic],
    [drawLogSpiral],
    [drawSeismicDrums],
    [drawEnvelopeAnalyzer],
    [drawPhasePortrait],
    [drawTopologyKnot],
    [drawCellularAutomata],
    [drawPrimeLattice],
    [drawOdometer],
    [drawSonarHistory],
    [drawNavigationCompass],
    [drawChecksumBlocks],
    [drawRibbonCable],
    [drawMagneticField],
    [drawProbabilityCloud],
    [drawStepSequencer],
    [drawOrbitalDecay],
    [drawHarmonicLadder],
    [drawClockDivider],
  ];

  srand(123);

  // Pull from a shuffled deck so a family cannot repeat until the full visual
  // vocabulary has been used. Variants are resolved when the deck is rebuilt.
  let typeDeck = [];
  function rebuildTypeDeck() {
    typeDeck = panelTypes.map((family) => (
      family.length > 1 && rand() > 0.48 ? family[1] : family[0]
    ));
    for (let i = typeDeck.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [typeDeck[i], typeDeck[j]] = [typeDeck[j], typeDeck[i]];
    }
  }

  function choosePanelType() {
    if (!typeDeck.length) rebuildTypeDeck();
    return typeDeck.pop();
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

  if (stage.dataset.fullField === 'true') {
    fillRegion(margin, margin, W - margin * 2, H - margin * 2, 100);
  } else {
    const aperture = getApertureRect();
    const ax = aperture.x;
    const ay = aperture.y;
    const ar = aperture.x + aperture.w;
    const ab = aperture.y + aperture.h;
    // Optical spacing: the center bezel contributes its own stroke, so half the
    // nominal panel gap reads as the same visual rhythm as a full cell-to-cell gap.
    const apertureGap = getApertureGap();

    // Eight independent packing regions surround the center. The final cell in
    // every row absorbs leftover pixels, so responsive changes never leave gaps.
    fillRegion(margin, margin, ax - apertureGap - margin, ay - apertureGap - margin, 100);
    fillRegion(ax + apertureGap, margin, aperture.w - apertureGap * 2, ay - apertureGap - margin, 110);
    fillRegion(ar + apertureGap, margin, W - margin - ar - apertureGap, ay - apertureGap - margin, 120);
    fillRegion(margin, ay + apertureGap, ax - apertureGap - margin, aperture.h - apertureGap * 2, 200);
    fillRegion(ar + apertureGap, ay + apertureGap, W - margin - ar - apertureGap, aperture.h - apertureGap * 2, 300);
    fillRegion(margin, ab + apertureGap, ax - apertureGap - margin, H - margin - ab - apertureGap, 400);
    fillRegion(ax + apertureGap, ab + apertureGap, aperture.w - apertureGap * 2, H - margin - ab - apertureGap, 410);
    fillRegion(ar + apertureGap, ab + apertureGap, W - margin - ar - apertureGap, H - margin - ab - apertureGap, 420);
  }

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

function getApertureRect() {
  if (apertureRectCache) return apertureRectCache;
  if (W <= 720) {
    const gutter = 16;
    const top = 64;
    apertureRectCache = {
      x: gutter,
      y: top,
      w: Math.max(0, W - gutter * 2),
      h: Math.max(320, H - top * 2),
    };
    return apertureRectCache;
  }

  const card = document.querySelector('.syntax-card');
  if (card) {
    const stageRect = stage.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    apertureRectCache = {
      x: Math.round(cardRect.left - stageRect.left),
      y: Math.round(cardRect.top - stageRect.top),
      w: Math.round(cardRect.width),
      h: Math.round(cardRect.height),
    };
    return apertureRectCache;
  }

  const h = Math.min(H * 0.76, 680, W * 0.82);
  const w = Math.min(W * 0.74, 1040);
  apertureRectCache = {
    x: Math.floor((W - w) * 0.5),
    y: Math.floor((H - h) * 0.5),
    w: Math.ceil(w),
    h: Math.ceil(h),
  };
  return apertureRectCache;
}

function getApertureGap() {
  const panelGap = Math.max(2, Math.round(config.panelSpacing));
  return Math.max(1, Math.round(panelGap * 0.5));
}

function drawApertureMoat() {
  const aperture = getApertureRect();
  const gap = getApertureGap();
  const left = aperture.x - gap;
  const top = aperture.y - gap;
  const outerW = aperture.w + gap * 2;
  ctx.fillStyle = config.bgColor;
  ctx.fillRect(left, top, outerW, gap);
  ctx.fillRect(left, aperture.y + aperture.h, outerW, gap);
  ctx.fillRect(left, aperture.y, gap, aperture.h);
  ctx.fillRect(aperture.x + aperture.w, aperture.y, gap, aperture.h);
}

function drawCentralAperture(t) {
  const aperture = getApertureRect();
  const { x, y, w, h } = aperture;

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
    ctx.beginPath();
    ctx.rect(p.x, p.y, p.w, p.h);
    ctx.clip();
    ctx.globalAlpha *= easedReveal;
    ctx.translate(0, (1 - easedReveal) * 8);
    const hover = getPanelPointer(p.x, p.y, p.w, p.h);
    const specialized = hover && interactivePanelTypes.has(p.type);
    p.type(p.x, p.y, p.w, p.h, hover ? t * (specialized ? 1.45 : 1.16) : t, p.seed);
    if (hover) drawPanelHoverResponse(p, hover, t, specialized);
    ctx.restore();
  });

  drawPanelGlow();

  // Edge greeblings
  drawEdgeGreeblings(t);

  // Floating greeblings
  drawFloatingGreeblings(t);

  // Treat the center as a masonry block: clear its optical moat after every
  // glow/floating pass, then redraw the bezel and underlying telemetry last.
  if (stage.dataset.fullField !== 'true') {
    drawApertureMoat();
    drawCentralAperture(t);
    drawConnectors(t);
    drawSphere(t);
  }

  ctx.restore();
  requestAnimationFrame(animate);
}

animate();
