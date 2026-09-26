const defaults = {
  crtEnabled: false,
  crtBarrel: 0.0,
  crtChromatic: 0.0,
  crtScanline: 0.0,
  crtVignette: 1.44,
  crtFlicker: 0.0,
  crtBandSpeed: 0.103,
  exposure: 1.67,
  contrast: 1.03,
  whiteBalance: 0.0,
  overlayEnabled: true,
  tileSize: 144,
  tileBlend: 'overlay',
  tileOpacity: 0.52,
  tileContrast: 0.53,
  overlayGlow: 0.73,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function ensureLayer(container, id) {
  let element = document.getElementById(id);
  if (!element) {
    element = document.createElement('div');
    element.id = id;
    container.appendChild(element);
  }
  return element;
}

function applyBaseLayerStyles(element, zIndex) {
  Object.assign(element.style, {
    position: 'absolute',
    inset: '0',
    pointerEvents: 'none',
    zIndex: String(zIndex),
  });
}

function applyOverlayStyle(overlay, config, timeSeconds) {
  applyBaseLayerStyles(overlay, 4);

  if (!config.overlayEnabled) {
    overlay.style.display = 'none';
    return;
  }

  const driftY = Math.round(timeSeconds * 10);
  overlay.style.display = 'block';
  overlay.style.opacity = String(config.tileOpacity);
  overlay.style.mixBlendMode = config.tileBlend;
  overlay.style.filter = `contrast(${config.tileContrast})`;
  overlay.style.backgroundImage = [
    'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.00) 24%, rgba(255,255,255,0.04) 49%, rgba(255,255,255,0.00) 76%, rgba(255,255,255,0.02))',
    'repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0 1px, rgba(0,0,0,0.0) 1px 3px)',
    'repeating-linear-gradient(90deg, rgba(255,92,0,0.20) 0 1px, rgba(255,214,128,0.10) 1px 2px, rgba(32,180,255,0.18) 2px 3px, rgba(0,0,0,0.0) 3px 4px)',
  ].join(',');
  overlay.style.backgroundSize = [
    '100% 100%',
    '100% 3px',
    `${config.tileSize}px ${config.tileSize}px`,
  ].join(', ');
  overlay.style.backgroundPosition = [
    `0 ${driftY * -0.2}px`,
    `0 ${driftY}px`,
    '0 0',
  ].join(', ');
}

function applyGlowStyle(glow, config, flickerStrength) {
  applyBaseLayerStyles(glow, 3);
  glow.style.display = config.crtEnabled ? 'block' : 'none';
  glow.style.mixBlendMode = 'screen';
  glow.style.opacity = String(config.overlayGlow * (0.86 + flickerStrength * 0.14));
  glow.style.backgroundImage = [
    'radial-gradient(circle at 50% 50%, rgba(255,180,84,0.12) 0%, rgba(255,150,48,0.06) 24%, rgba(0,0,0,0) 62%)',
    'radial-gradient(circle at 50% 8%, rgba(120,200,255,0.07) 0%, rgba(0,0,0,0) 36%)',
    'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0) 18%, rgba(0,0,0,0) 82%, rgba(255,180,80,0.04))',
  ].join(',');
}

function drawTintedGhost(ctx, source, x, y, width, height, shiftX, hueRotate) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.16;
  ctx.filter = `brightness(1.05) contrast(1.25) saturate(3.8) sepia(1) hue-rotate(${hueRotate}deg)`;
  ctx.drawImage(source, x + shiftX, y, width, height);
  ctx.restore();
}

function drawCurvedScreen(ctx, source, width, height, config, flicker) {
  const slices = 180;
  const sliceHeight = height / slices;
  const barrel = config.crtBarrel;
  const brightness = config.exposure * flicker;
  const chromaticShift = Math.max(0.75, config.crtChromatic * width * 0.22);

  ctx.save();
  ctx.filter = `brightness(${brightness}) contrast(${config.contrast})`;

  for (let index = 0; index < slices; index++) {
    const srcY = index * sliceHeight;
    const normalizedY = (srcY + sliceHeight * 0.5) / height * 2 - 1;
    const pinch = normalizedY * normalizedY * barrel * 2.4;
    const destWidth = width * (1 - pinch * 0.82);
    const destX = (width - destWidth) * 0.5;
    const bowY = srcY + Math.sign(normalizedY) * pinch * height * 0.08;

    ctx.drawImage(
      source,
      0,
      srcY,
      width,
      sliceHeight + 1,
      destX,
      bowY,
      destWidth,
      sliceHeight + 1
    );
  }

  ctx.restore();

  if (config.crtChromatic <= 0) return;

  for (let index = 0; index < slices; index++) {
    const srcY = index * sliceHeight;
    const normalizedY = (srcY + sliceHeight * 0.5) / height * 2 - 1;
    const pinch = normalizedY * normalizedY * barrel * 2.4;
    const destWidth = width * (1 - pinch * 0.82);
    const destX = (width - destWidth) * 0.5;
    const bowY = srcY + Math.sign(normalizedY) * pinch * height * 0.08;
    const edgeBoost = 1 + Math.abs(normalizedY) * 0.9;
    const offset = chromaticShift * edgeBoost;

    drawTintedGhost(
      ctx,
      source,
      destX,
      bowY,
      destWidth,
      sliceHeight + 1,
      offset,
      -18
    );
    drawTintedGhost(
      ctx,
      source,
      destX,
      bowY,
      destWidth,
      sliceHeight + 1,
      -offset,
      188
    );
  }
}

function applyWhiteBalance(ctx, width, height, whiteBalance) {
  if (whiteBalance === 0) return;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  if (whiteBalance > 0) {
    ctx.fillStyle = `rgba(255, 116, 64, ${whiteBalance * 0.08})`;
  } else {
    ctx.fillStyle = `rgba(72, 132, 255, ${Math.abs(whiteBalance) * 0.08})`;
  }
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawScanlines(ctx, width, height, amount) {
  if (amount <= 0) return;

  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${amount * 0.22})`;
  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 2);
  }

  ctx.fillStyle = `rgba(255, 255, 255, ${amount * 0.02})`;
  for (let y = 1; y < height; y += 12) {
    ctx.fillRect(0, y, width, 1);
  }
  ctx.restore();
}

function drawBand(ctx, width, height, timeSeconds, speed) {
  if (speed <= 0) return;

  const bandHeight = Math.max(40, height * 0.18);
  const travel = height + bandHeight * 2;
  const bandY = ((timeSeconds * speed * height * 0.9) % travel) - bandHeight;
  const gradient = ctx.createLinearGradient(0, bandY, 0, bandY + bandHeight);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(0.35, 'rgba(52, 148, 255, 0.035)');
  gradient.addColorStop(0.5, 'rgba(255, 246, 196, 0.075)');
  gradient.addColorStop(0.7, 'rgba(255, 96, 48, 0.035)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, bandY, width, bandHeight);
  ctx.restore();
}

function drawVignette(ctx, width, height, amount) {
  if (amount <= 0) return;

  const radius = Math.max(width, height) * 0.52;
  const gradient = ctx.createRadialGradient(
    width * 0.5,
    height * 0.5,
    radius * 0.2,
    width * 0.5,
    height * 0.5,
    radius
  );

  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(0.62, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, `rgba(0, 0, 0, ${clamp(amount * 0.18, 0, 0.7)})`);

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

export function createCRTEffect({ displayCanvas, overlayContainer, dpr, config = {} }) {
  const sceneCanvas = document.createElement('canvas');
  const sceneCtx = sceneCanvas.getContext('2d', { alpha: false });
  const displayCtx = displayCanvas.getContext('2d', { alpha: false });
  const overlay = ensureLayer(overlayContainer, 'crt-tile-overlay');
  const glow = ensureLayer(overlayContainer, 'crt-glow-overlay');

  displayCtx.imageSmoothingEnabled = true;
  sceneCtx.imageSmoothingEnabled = false;

  function resize(width, height) {
    displayCanvas.width = Math.floor(width * dpr);
    displayCanvas.height = Math.floor(height * dpr);
    sceneCanvas.width = Math.floor(width * dpr);
    sceneCanvas.height = Math.floor(height * dpr);

    displayCanvas.style.width = `${width}px`;
    displayCanvas.style.height = `${height}px`;

    sceneCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sceneCtx.imageSmoothingEnabled = false;
    displayCtx.setTransform(1, 0, 0, 1, 0, 0);
    displayCtx.imageSmoothingEnabled = true;
  }

  function syncDom(nextConfig, timeSeconds = 0) {
    const merged = { ...defaults, ...nextConfig };
    const flickerStrength = merged.crtEnabled
      ? (Math.sin(timeSeconds * 48) * 0.5 + 0.5) * merged.crtFlicker
      : 0;

    if (merged.tileImageSrc) {
      const driftY = Math.round(timeSeconds * 10);

      applyBaseLayerStyles(overlay, 4);
      if (!merged.overlayEnabled) {
        overlay.style.display = 'none';
      } else {
        overlay.style.display = 'block';
        overlay.style.opacity = String(merged.tileOpacity);
        overlay.style.mixBlendMode = merged.tileBlend;
        overlay.style.filter = `contrast(${merged.tileContrast})`;
        overlay.style.backgroundImage = [
          'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.00) 24%, rgba(255,255,255,0.04) 49%, rgba(255,255,255,0.00) 76%, rgba(255,255,255,0.02))',
          "repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0 1px, rgba(0,0,0,0.0) 1px 3px)",
          `url("${merged.tileImageSrc}")`,
        ].join(',');
        overlay.style.backgroundSize = [
          '100% 100%',
          '100% 3px',
          `${merged.tileSize}px ${merged.tileSize}px`,
        ].join(', ');
        overlay.style.backgroundPosition = [
          `0 ${driftY * -0.2}px`,
          `0 ${driftY}px`,
          '0 0',
        ].join(', ');
      }
    } else {
      applyOverlayStyle(overlay, merged, timeSeconds);
    }

    applyGlowStyle(glow, merged, flickerStrength);
  }

  function render(timeMs, nextConfig = config) {
    const merged = { ...defaults, ...nextConfig };
    const timeSeconds = timeMs * 0.001;
    const flicker = merged.crtEnabled
      ? (1 - merged.crtFlicker) + merged.crtFlicker * (Math.sin(timeSeconds * 48) * 0.5 + 0.5)
      : 1;

    syncDom(merged, timeSeconds);

    const width = displayCanvas.width;
    const height = displayCanvas.height;

    displayCtx.save();
    displayCtx.clearRect(0, 0, width, height);
    displayCtx.fillStyle = '#000';
    displayCtx.fillRect(0, 0, width, height);

    if (merged.crtEnabled) {
      drawCurvedScreen(displayCtx, sceneCanvas, width, height, merged, flicker);
    } else {
      displayCtx.filter = `brightness(${merged.exposure * flicker}) contrast(${merged.contrast})`;
      displayCtx.drawImage(sceneCanvas, 0, 0, width, height);
    }

    applyWhiteBalance(displayCtx, width, height, merged.whiteBalance);

    if (merged.crtEnabled) {
      drawBand(displayCtx, width, height, timeSeconds, merged.crtBandSpeed);
      drawScanlines(displayCtx, width, height, merged.crtScanline);
      drawVignette(displayCtx, width, height, merged.crtVignette);
    }

    displayCtx.restore();
  }

  return {
    sceneCanvas,
    sceneCtx,
    resize,
    render,
    syncDom,
  };
}
