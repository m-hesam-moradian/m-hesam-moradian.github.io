import * as THREE from 'three';

/**
 * Pure Electric Cyan (#00FFFF) radial glow sprite texture (R=0, G=255, B=255 — zero green/blue drift).
 */
export function createPureCyanGlowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;

  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.16, 'rgba(0, 255, 255, 0.95)');
  grad.addColorStop(0.42, 'rgba(0, 255, 255, 0.30)');
  grad.addColorStop(1.0, 'rgba(0, 255, 255, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * High-DPI 1024x1024 procedural Pedestal Circuit & Telemetry Dial Texture for Chamber 04.
 * Strictly dark graphite (#14171D), brushed steel (#8A929A), and pure cyan (#00FFFF).
 */
export function createPedestalCircuitTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const c = size / 2;

  // Base dark graphite metallic plate
  const baseGrad = ctx.createRadialGradient(c, c, 30, c, c, c);
  baseGrad.addColorStop(0.0, '#1e2229');
  baseGrad.addColorStop(0.55, '#15181e');
  baseGrad.addColorStop(1.0, '#101216');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, size, size);

  // Concentric technical rings
  const ringRadii = [120, 190, 265, 330, 395, 455, 488];
  ringRadii.forEach((r, idx) => {
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.lineWidth = idx % 2 === 0 ? 1.5 : 1;
    ctx.strokeStyle =
      idx === 2 || idx === 5 ? 'rgba(0, 255, 255, 0.55)' : 'rgba(138, 146, 154, 0.25)';
    ctx.stroke();
  });

  // Segmented bright pure cyan circuit arcs
  const arcConfigs = [
    { r: 298, start: 0.2, end: 1.35, width: 3 },
    { r: 298, start: 2.1, end: 3.4, width: 3 },
    { r: 298, start: 4.1, end: 5.5, width: 3 },
    { r: 424, start: 0.7, end: 1.9, width: 2.5 },
    { r: 424, start: 3.1, end: 4.4, width: 2.5 },
    { r: 424, start: 5.0, end: 5.9, width: 2.5 },
  ];
  arcConfigs.forEach((arc) => {
    ctx.beginPath();
    ctx.arc(c, c, arc.r, arc.start, arc.end);
    ctx.lineWidth = arc.width;
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.85)';
    ctx.stroke();
  });

  // Radial precision degree tick marks around outer perimeter
  for (let i = 0; i < 120; i++) {
    const angle = (i / 120) * Math.PI * 2;
    const isMajor = i % 10 === 0;
    const rInner = isMajor ? 456 : 468;
    const rOuter = 484;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(angle) * rInner, c + Math.sin(angle) * rInner);
    ctx.lineTo(c + Math.cos(angle) * rOuter, c + Math.sin(angle) * rOuter);
    ctx.lineWidth = isMajor ? 2 : 1;
    ctx.strokeStyle = isMajor ? 'rgba(0, 255, 255, 0.85)' : 'rgba(138, 146, 154, 0.35)';
    ctx.stroke();
  }

  // Orthogonal & diagonal circuit bus traces
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * 124, c + Math.sin(a) * 124);
    ctx.lineTo(c + Math.cos(a) * 392, c + Math.sin(a) * 392);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(0, 255, 255, 0.32)' : 'rgba(138, 146, 154, 0.2)';
    ctx.stroke();

    // Small square terminal pad on trace
    const px = c + Math.cos(a) * 355;
    const py = c + Math.sin(a) * 355;
    ctx.fillStyle = '#00FFFF';
    ctx.fillRect(px - 3, py - 3, 6, 6);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAnisotropy || 4);
  tex.needsUpdate = true;
  return tex;
}

export interface PBRSurfaceMaps {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

/**
 * Procedural 512x512 Volcanic Columnar Basalt PBR Texture Set (map + bumpMap + roughnessMap).
 * Generates pitted stone porosity, vertical cooling striations, joint fractures, and subtle
 * obsidian mineral flecks so basalt plinth columns & terrain ridges have genuine rock relief.
 */
export function createBasaltPBRTextures(
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 2.6
): PBRSurfaceMaps {
  const size = 512;

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const aCtx = albedoCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;

  const aImg = aCtx.createImageData(size, size);
  const bImg = bCtx.createImageData(size, size);
  const rImg = rCtx.createImageData(size, size);

  // Fast seamless hash noise helpers (periodic in tile size so RepeatWrapping has zero seams)
  const hash2 = (ix: number, iy: number, seed: number): number => {
    const x = ((ix % 256) + 256) % 256;
    const y = ((iy % 256) + 256) % 256;
    let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };

  const smoothNoise = (u: number, v: number, freq: number, seed: number): number => {
    const fx = u * freq;
    const fy = v * freq;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const tx = fx - ix;
    const ty = fy - iy;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const n00 = hash2(ix % freq, iy % freq, seed);
    const n10 = hash2((ix + 1) % freq, iy % freq, seed);
    const n01 = hash2(ix % freq, (iy + 1) % freq, seed);
    const n11 = hash2((ix + 1) % freq, (iy + 1) % freq, seed);
    const nx0 = n00 + (n10 - n00) * sx;
    const nx1 = n01 + (n11 - n01) * sx;
    return nx0 + (nx1 - nx0) * sy;
  };

  for (let py = 0; py < size; py++) {
    const v = py / size;
    for (let px = 0; px < size; px++) {
      const u = px / size;

      // Multi-scale volcanic basalt grain + stretched vertical columnar cooling flutes
      const macro = smoothNoise(u, v, 8, 11);
      const verticalFlute = smoothNoise(u * 2.5, v * 0.5, 16, 23);
      const midGrain = smoothNoise(u, v, 32, 37);
      const finePores = smoothNoise(u, v, 96, 53);
      const microGrit = hash2(px, py, 71);

      // Pitted volcanic vesicles (tiny recessed rock pits)
      const pitRaw = smoothNoise(u, v, 48, 89);
      const pitMask = pitRaw < 0.22 ? (0.22 - pitRaw) / 0.22 : 0;

      // Subtle rock ridge stratification + height value
      const ridge =
        macro * 0.34 +
        verticalFlute * 0.26 +
        midGrain * 0.22 +
        finePores * 0.12 +
        microGrit * 0.06;
      const heightVal = Math.max(0, Math.min(1, ridge - pitMask * 0.42));

      // Dark volcanic basalt stone palette (deep charcoal-slate with slight mineral contrast)
      const baseLum = 18 + heightVal * 26 + (microGrit > 0.96 ? 12 : 0);
      const rCol = Math.round(baseLum * 0.94);
      const gCol = Math.round(baseLum * 1.01);
      const bCol = Math.round(baseLum * 1.09);

      const idx = (py * size + px) * 4;
      aImg.data[idx] = rCol;
      aImg.data[idx + 1] = gCol;
      aImg.data[idx + 2] = bCol;
      aImg.data[idx + 3] = 255;

      const bumpByte = Math.round(heightVal * 255);
      bImg.data[idx] = bumpByte;
      bImg.data[idx + 1] = bumpByte;
      bImg.data[idx + 2] = bumpByte;
      bImg.data[idx + 3] = 255;

      // Higher roughness in recessed pores/pits (~235), slightly lower on fractured ridges (~165)
      const roughVal = Math.max(
        130,
        Math.min(250, Math.round(238 - heightVal * 72 + pitMask * 35))
      );
      rImg.data[idx] = roughVal;
      rImg.data[idx + 1] = roughVal;
      rImg.data[idx + 2] = roughVal;
      rImg.data[idx + 3] = 255;
    }
  }

  aCtx.putImageData(aImg, 0, 0);
  bCtx.putImageData(bImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);

  // Subtle horizontal & diagonal natural cleavage fractures
  let seed = 42019;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 42; i++) {
    const x1 = rnd() * size;
    const y1 = rnd() * size;
    const len = 28 + rnd() * 90;
    const ang = (rnd() > 0.35 ? 0 : Math.PI * 0.48) + (rnd() - 0.5) * 0.28;
    const x2 = x1 + Math.cos(ang) * len;
    const y2 = y1 + Math.sin(ang) * len;

    aCtx.beginPath();
    aCtx.moveTo(x1, y1);
    aCtx.lineTo(x2, y2);
    aCtx.lineWidth = 1.1 + rnd() * 1.4;
    aCtx.strokeStyle = rnd() > 0.84 ? 'rgba(0, 215, 225, 0.09)' : 'rgba(6, 8, 11, 0.65)';
    aCtx.stroke();

    bCtx.beginPath();
    bCtx.moveTo(x1, y1);
    bCtx.lineTo(x2, y2);
    bCtx.lineWidth = 1.4 + rnd() * 1.5;
    bCtx.strokeStyle = 'rgba(20, 20, 20, 0.72)';
    bCtx.stroke();
  }

  const configureTex = (canvas: HTMLCanvasElement, isColor: boolean): THREE.CanvasTexture => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = Math.min(8, maxAnisotropy || 4);
    tex.needsUpdate = true;
    return tex;
  };

  return {
    map: configureTex(albedoCanvas, true),
    bumpMap: configureTex(bumpCanvas, false),
    roughnessMap: configureTex(roughCanvas, false),
  };
}

/**
 * Legacy helper kept compatible if single obsidian map is requested.
 */
export function createObsidianSurfaceTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const { map, bumpMap, roughnessMap } = createBasaltPBRTextures(maxAnisotropy, 1, 2);
  bumpMap.dispose();
  roughnessMap.dispose();
  return map;
}

/**
 * Procedural 512x512 Binary Blockchain Block Texture Pair (map + emissiveMap)
 * Matching Reference Image 1: dark graphite matrix cells populated with crisp 0 & 1 digits,
 * glowing pure cyan (#00FFFF) and bright white highlighted bits.
 */
export function createBinaryBlockchainBlockTextures(
  maxAnisotropy: number,
  seedOffset = 0
): {
  map: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
} {
  const size = 512;
  const cols = 10;
  const rows = 10;
  const cellW = size / cols;
  const cellH = size / rows;

  const mapCanvas = document.createElement('canvas');
  mapCanvas.width = size;
  mapCanvas.height = size;
  const mCtx = mapCanvas.getContext('2d')!;

  const emCanvas = document.createElement('canvas');
  emCanvas.width = size;
  emCanvas.height = size;
  const eCtx = emCanvas.getContext('2d')!;

  // Dark graphite block surface
  const bgGrad = mCtx.createLinearGradient(0, 0, size, size);
  bgGrad.addColorStop(0, '#10151b');
  bgGrad.addColorStop(0.5, '#151b22');
  bgGrad.addColorStop(1, '#0e1318');
  mCtx.fillStyle = bgGrad;
  mCtx.fillRect(0, 0, size, size);

  eCtx.fillStyle = '#000000';
  eCtx.fillRect(0, 0, size, size);

  let seed = 918273 + seedOffset * 4099;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // Matrix cell borders
  mCtx.strokeStyle = 'rgba(0, 255, 255, 0.22)';
  mCtx.lineWidth = 1.5;
  eCtx.strokeStyle = 'rgba(0, 255, 255, 0.16)';
  eCtx.lineWidth = 1.5;

  for (let i = 0; i <= cols; i++) {
    const x = i * cellW;
    mCtx.beginPath();
    mCtx.moveTo(x, 0);
    mCtx.lineTo(x, size);
    mCtx.stroke();

    eCtx.beginPath();
    eCtx.moveTo(x, 0);
    eCtx.lineTo(x, size);
    eCtx.stroke();
  }
  for (let j = 0; j <= rows; j++) {
    const y = j * cellH;
    mCtx.beginPath();
    mCtx.moveTo(0, y);
    mCtx.lineTo(size, y);
    mCtx.stroke();

    eCtx.beginPath();
    eCtx.moveTo(0, y);
    eCtx.lineTo(size, y);
    eCtx.stroke();
  }

  // Binary 0 & 1 glyphs with selective pure cyan / white hot bits
  mCtx.font = 'bold 31px "JetBrains Mono", ui-monospace, monospace';
  mCtx.textAlign = 'center';
  mCtx.textBaseline = 'middle';

  eCtx.font = 'bold 31px "JetBrains Mono", ui-monospace, monospace';
  eCtx.textAlign = 'center';
  eCtx.textBaseline = 'middle';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bit = rnd() > 0.48 ? '1' : '0';
      const intensity = rnd();
      const cx = c * cellW + cellW / 2;
      const cy = r * cellH + cellH / 2 + 2;

      if (intensity > 0.88) {
        // Hot blazing white-cyan bit
        mCtx.fillStyle = '#00FFFF';
        mCtx.fillRect(c * cellW + 2, r * cellH + 2, cellW - 4, cellH - 4);
        mCtx.fillStyle = '#121417';
        mCtx.fillText(bit, cx, cy);

        eCtx.fillStyle = 'rgba(0, 255, 255, 0.35)';
        eCtx.fillRect(c * cellW + 2, r * cellH + 2, cellW - 4, cellH - 4);
        eCtx.fillStyle = '#FFFFFF';
        eCtx.fillText(bit, cx, cy);
      } else if (intensity > 0.54) {
        // Crisp Pure Cyan bit
        mCtx.fillStyle = '#00FFFF';
        mCtx.fillText(bit, cx, cy);
        eCtx.fillStyle = '#00FFFF';
        eCtx.fillText(bit, cx, cy);
      } else {
        // Subtle recessed cyan-grey bit
        mCtx.fillStyle = 'rgba(0, 255, 255, 0.34)';
        mCtx.fillText(bit, cx, cy);
        eCtx.fillStyle = 'rgba(0, 255, 255, 0.16)';
        eCtx.fillText(bit, cx, cy);
      }
    }
  }

  // Crisp outer perimeter circuit rim
  mCtx.strokeStyle = 'rgba(0, 255, 255, 0.85)';
  mCtx.lineWidth = 6;
  mCtx.strokeRect(3, 3, size - 6, size - 6);

  eCtx.strokeStyle = '#00FFFF';
  eCtx.lineWidth = 4;
  eCtx.strokeRect(3, 3, size - 6, size - 6);

  const map = new THREE.CanvasTexture(mapCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = Math.min(8, maxAnisotropy || 4);
  map.needsUpdate = true;

  const emissiveMap = new THREE.CanvasTexture(emCanvas);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.anisotropy = Math.min(8, maxAnisotropy || 4);
  emissiveMap.needsUpdate = true;

  return { map, emissiveMap };
}

/**
 * Crisp transparent technical readout texture for 3D neural weights, biases, and activations
 * (e.g. "w = +0.94", "b = -0.12", "a = 0.91"). Auto-sizes canvas width so text never truncates.
 */
export function createNeuralMetricSpriteTexture(
  label: string,
  highlight = false
): { tex: THREE.CanvasTexture; aspect: number } {
  const height = 128;
  const measureCanvas = document.createElement('canvas');
  const mCtx = measureCanvas.getContext('2d')!;
  const font = '600 44px "JetBrains Mono", ui-monospace, monospace';
  mCtx.font = font;
  const textWidth = Math.ceil(mCtx.measureText(label).width);

  const width = Math.max(360, textWidth + 136);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, width, height);

  // Dark graphite backing with sharp hairline cyan border
  ctx.fillStyle = 'rgba(11, 15, 21, 0.88)';
  ctx.fillRect(14, 18, width - 28, height - 36);

  ctx.strokeStyle = highlight ? 'rgba(0, 255, 255, 0.92)' : 'rgba(0, 255, 255, 0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(14, 18, width - 28, height - 36);

  // Tiny square anchor dot on left edge
  ctx.fillStyle = '#00FFFF';
  ctx.fillRect(34, height / 2 - 7, 14, 14);

  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = highlight ? '#FFFFFF' : '#00FFFF';
  ctx.fillText(label, 68, height / 2 + 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return { tex, aspect: width / height };
}

/**
 * Neutral white radial halo texture so sprites tinted any color (orange, dark blue, amber, cyan)
 * render their true hue without cyan shift and with gentle soft falloff.
 */
export function createNeutralGlowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;

  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.24, 'rgba(255, 255, 255, 0.52)');
  grad.addColorStop(0.58, 'rgba(255, 255, 255, 0.14)');
  grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * High-contrast 3D skill label badge with solid dark obsidian backing so skill names stay
 * crisp and readable even when orbiting in front of bright black hole accretion filaments.
 */
export function createSkillPlanetLabelTexture(
  label: string,
  accentHex: string
): { tex: THREE.CanvasTexture; aspect: number } {
  const height = 128;
  const measureCanvas = document.createElement('canvas');
  const mCtx = measureCanvas.getContext('2d')!;
  const font = '700 46px "JetBrains Mono", ui-monospace, monospace';
  mCtx.font = font;
  const textWidth = Math.ceil(mCtx.measureText(label).width);

  const width = Math.max(330, textWidth + 138);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, width, height);

  const padX = 12;
  const padY = 14;
  const boxW = width - padX * 2;
  const boxH = height - padY * 2;
  const radius = 22;

  // Deep obsidian solid backing (97% opaque) so glowing disk strings behind never wash out text
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(padX, padY, boxW, boxH, radius);
  const bgGrad = ctx.createLinearGradient(0, padY, 0, padY + boxH);
  bgGrad.addColorStop(0, 'rgba(10, 14, 21, 0.98)');
  bgGrad.addColorStop(1, 'rgba(4, 7, 11, 0.98)');
  ctx.fillStyle = bgGrad;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 14;
  ctx.fill();
  ctx.restore();

  // Crisp colored perimeter stroke + subtle top highlight
  ctx.beginPath();
  ctx.roundRect(padX, padY, boxW, boxH, radius);
  ctx.strokeStyle = accentHex;
  ctx.globalAlpha = 0.92;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  ctx.globalAlpha = 1.0;

  // Glowing colored status node on left
  ctx.save();
  ctx.beginPath();
  ctx.arc(padX + 36, height / 2, 9, 0, Math.PI * 2);
  ctx.fillStyle = accentHex;
  ctx.shadowColor = accentHex;
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.restore();

  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(label, padX + 64, height / 2 + 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return { tex, aspect: width / height };
}


