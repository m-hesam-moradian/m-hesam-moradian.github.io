import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { DETAILED_CHAMBERS } from '../data/portfolioSections';
import { RESUME_DATA } from '../data/resume';
import {
  buildDriftChamber,
  buildIrisChamber,
  buildPedestalChamber,
  buildResearchChamber,
  buildSummitChamber,
  buildVolcanicHorizonTerrain,
  createRng,
  PedestalMode,
} from './detailedChambers';
import {
  createBasaltPBRTextures,
  createBinaryBlockchainBlockTextures,
  createNeutralGlowTexture,
  createPedestalCircuitTexture,
  createPureCyanGlowTexture,
} from './proceduralTextures';

interface ObsidianCyanSceneProps {
  scrollProgress: number;
  pedestalMode: PedestalMode;
  cameraResetNonce: number;
  onTelemetryUpdate?: (
    chamberIdx: number,
    warpFlash: number,
    teleportFlash: number,
    isOrbiting: boolean
  ) => void;
}

// Pre-allocated scratch math helpers (Zero GC inside render loop)
const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _vC = new THREE.Vector3();
const _vD = new THREE.Vector3();
const _vMid = new THREE.Vector3();
const _coreWorld = new THREE.Vector3(0, -24, -12);
const _summitCenter = new THREE.Vector3(0, 1.75, 0);
const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3();
const _dummy = new THREE.Object3D();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function getResponsiveFov(aspect: number): number {
  if (aspect < 1) {
    return THREE.MathUtils.clamp(50 / Math.pow(Math.max(aspect, 0.35), 0.45), 50, 74);
  }
  return 48;
}

type ChamberStage = 'summit' | 'iris' | 'research' | 'pedestal';

function sampleDetailedFlight(
  progress: number,
  rideCurve: THREE.CatmullRomCurve3,
  lastNeuronWorld: THREE.Vector3,
  coreWorld: THREE.Vector3,
  isMobileLayout: boolean,
  outPos: THREE.Vector3,
  outTarget: THREE.Vector3
): {
  chamberIdx: number;
  chamberStage: ChamberStage;
  warpIntensity: number;
  teleportFlash: number;
  portalFlyProgress: number;
  researchDiveProgress: number;
  summitExplodeProgress: number;
  neuralRevealProgress: number;
  neuralPauseFactor: number;
  enterNeuronProgress: number;
  horizontalWarp: boolean;
  nearPlane: number;
  farPlane: number;
  frontWallFade: number;
} {
  const p = THREE.MathUtils.clamp(progress, 0, 1);

  let chamberIdx = 0;
  let minDiff = Infinity;
  for (let i = 0; i < DETAILED_CHAMBERS.length; i++) {
    const d = Math.abs(p - DETAILED_CHAMBERS[i].scrollAt);
    if (d < minDiff) {
      minDiff = d;
      chamberIdx = i;
    }
  }

  let warpIntensity = 0;
  let portalFlyProgress = 0;
  let researchDiveProgress = 0;
  const inReturnSky = p >= 0.968;
  const summitExplodeProgress = inReturnSky ? 0 : THREE.MathUtils.smoothstep(p, 0.0, 0.1);
  const frontWallFade = inReturnSky ? 0 : THREE.MathUtils.smoothstep(p, 0.022, 0.105);
  const neuralRevealProgress = inReturnSky ? 0 : THREE.MathUtils.smoothstep(p, 0.022, 0.102);

  // Smoothly pause neural simulation while About Me card is displayed [0.160 .. 0.245]
  const pauseIn = THREE.MathUtils.smoothstep(p, 0.16, 0.185);
  const pauseOut = THREE.MathUtils.smoothstep(p, 0.222, 0.248);
  const neuralPauseFactor = pauseIn * (1 - pauseOut);

  // Flash 1: Last Neuron nucleus -> CH.03 Iris (center 0.355)
  let neuronTeleportFlash = 0;
  if (p >= 0.333 && p <= 0.377) {
    neuronTeleportFlash =
      p < 0.355
        ? THREE.MathUtils.smoothstep(p, 0.333, 0.355)
        : 1 - THREE.MathUtils.smoothstep(p, 0.355, 0.377);
  }

  // Flash 2: Iris Singularity -> CH.04 Research Codex (center 0.615)
  let irisTeleportFlash = 0;
  if (p >= 0.593 && p <= 0.637) {
    irisTeleportFlash =
      p < 0.615
        ? THREE.MathUtils.smoothstep(p, 0.593, 0.615)
        : 1 - THREE.MathUtils.smoothstep(p, 0.615, 0.637);
  }

  // Flash 3: Research Codex -> CH.05 Contact Pedestal (center 0.845)
  let researchTeleportFlash = 0;
  if (p >= 0.825 && p <= 0.865) {
    researchTeleportFlash =
      p < 0.845
        ? THREE.MathUtils.smoothstep(p, 0.825, 0.845)
        : 1 - THREE.MathUtils.smoothstep(p, 0.845, 0.865);
  }

  // Flash 4: CH.05 Overhead Halo -> Stage 1 Sky Return (center 0.968)
  let skyTeleportFlash = 0;
  if (p >= 0.952 && p <= 0.984) {
    skyTeleportFlash =
      p < 0.968
        ? THREE.MathUtils.smoothstep(p, 0.952, 0.968)
        : 1 - THREE.MathUtils.smoothstep(p, 0.968, 0.984);
  }

  // Segment 1: CH.01 Genesis Blocks (0.00) -> Explode & enter inside Chosen Block (0.105)
  if (p <= 0.105) {
    const u = p / 0.105;
    const eased = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;

    if (isMobileLayout) {
      _vA.set(-12.8, -0.45, 10.4);
      _vB.set(0.0, 1.74, 0.68);
      _vC.set(0.0, 1.75, 0.0);
      _vD.set(0.0, 1.75, 0.0);
    } else {
      _vA.set(...DETAILED_CHAMBERS[0].camPos);
      _vB.set(...DETAILED_CHAMBERS[1].camPos);
      _vC.set(...DETAILED_CHAMBERS[0].camTarget);
      _vD.set(...DETAILED_CHAMBERS[1].camTarget);
    }
    outPos.lerpVectors(_vA, _vB, eased);
    outTarget.lerpVectors(_vC, _vD, eased);

    warpIntensity = Math.sin(THREE.MathUtils.clamp((u - 0.14) / 0.48, 0, 1) * Math.PI) * 0.36;
    const microBlend = THREE.MathUtils.smoothstep(u, 0.55, 0.95);
    return {
      chamberIdx: 0,
      chamberStage: 'summit',
      warpIntensity,
      teleportFlash: 0,
      portalFlyProgress: 0,
      researchDiveProgress: 0,
      summitExplodeProgress,
      neuralRevealProgress,
      neuralPauseFactor: 0,
      enterNeuronProgress: 0,
      horizontalWarp: true,
      nearPlane: THREE.MathUtils.lerp(0.1, 0.004, microBlend),
      farPlane: THREE.MathUtils.lerp(180, 42, microBlend),
      frontWallFade,
    };
  }

  // Segment 2A: Unobstructed Live Neural Network Viewing Hold (0.105 -> 0.155)
  if (p <= 0.155) {
    const u = (p - 0.105) / 0.05;
    const eased = u * u * (3 - 2 * u);
    if (isMobileLayout) {
      _vA.set(0.0, 1.74, 0.68);
      _vB.set(0.0, 1.72, 0.64);
    } else {
      _vA.set(...DETAILED_CHAMBERS[1].camPos);
      _vB.set(0, 1.76, 0.45);
    }
    outPos.lerpVectors(_vA, _vB, eased);
    outTarget.set(0, 1.75, 0);

    return {
      chamberIdx: 1,
      chamberStage: 'summit',
      warpIntensity: 0,
      teleportFlash: 0,
      portalFlyProgress: 0,
      researchDiveProgress: 0,
      summitExplodeProgress: 1,
      neuralRevealProgress: 1,
      neuralPauseFactor,
      enterNeuronProgress: 0,
      horizontalWarp: true,
      nearPlane: 0.004,
      farPlane: 42,
      frontWallFade: 1,
    };
  }

  // Segment 2B: Sweep into About Me framing + card hold (0.155 -> 0.24)
  if (p <= 0.24) {
    const u = (p - 0.155) / 0.085;
    const orbitIn = THREE.MathUtils.smoothstep(u, 0.0, 0.24);
    if (isMobileLayout) {
      _vA.set(0.0, 1.72, 0.64);
      _vB.set(0.0, 1.64, 0.66);
      _vD.set(0.0, 1.52, 0.0);
    } else {
      _vA.set(0, 1.76, 0.45);
      _vB.set(-0.19, 1.8, 0.3);
      _vD.set(0.14, 1.74, 0.04);
    }
    outPos.lerpVectors(_vA, _vB, orbitIn);

    _vC.set(0, 1.75, 0);
    outTarget.lerpVectors(_vC, _vD, orbitIn);

    return {
      chamberIdx: 1,
      chamberStage: 'summit',
      warpIntensity: 0,
      teleportFlash: 0,
      portalFlyProgress: 0,
      researchDiveProgress: 0,
      summitExplodeProgress: 1,
      neuralRevealProgress: 1,
      neuralPauseFactor,
      enterNeuronProgress: 0,
      horizontalWarp: true,
      nearPlane: 0.004,
      farPlane: 40,
      frontWallFade: 1,
    };
  }

  // Segment 2C: Unhurried Neural Spline Ride inside Chosen Block -> Neuron Portal (0.24 -> 0.355)
  if (p < 0.355) {
    const u = THREE.MathUtils.clamp((p - 0.24) / (0.355 - 0.24), 0, 1);
    const rideT = u * u * (3 - 2 * u);
    const clampedT = THREE.MathUtils.clamp(rideT, 0, 1);
    rideCurve.getPointAt(clampedT, outPos);

    if (isMobileLayout && u < 0.28) {
      const mobileEntryBlend = THREE.MathUtils.smoothstep(u, 0.0, 0.28);
      _vA.set(0.0, 1.64, 0.66);
      outPos.lerpVectors(_vA, outPos, mobileEntryBlend);
    }

    if (clampedT < 0.88) {
      rideCurve.getPointAt(Math.min(1, clampedT + 0.08), _vD);
    } else {
      const endBlend = (clampedT - 0.88) / 0.12;
      rideCurve.getPointAt(1.0, _vC);
      _vA.copy(lastNeuronWorld).add(_vB.set(0.045, 0, 0));
      _vD.lerpVectors(_vC, _vA, endBlend);
    }

    const lookPan = THREE.MathUtils.smoothstep(u, 0.0, 0.26);
    if (isMobileLayout) {
      _vC.set(0.0, 1.52, 0.0);
    } else {
      _vC.set(0.14, 1.74, 0.04);
    }
    outTarget.lerpVectors(_vC, _vD, lookPan);

    const nearEase = THREE.MathUtils.smoothstep(u, 0.05, 0.35);
    return {
      chamberIdx: 1,
      chamberStage: 'summit',
      warpIntensity: 0,
      teleportFlash: neuronTeleportFlash,
      portalFlyProgress: 0,
      researchDiveProgress: 0,
      summitExplodeProgress: 1,
      neuralRevealProgress: 1,
      neuralPauseFactor: 0,
      enterNeuronProgress: u,
      horizontalWarp: true,
      nearPlane: THREE.MathUtils.lerp(0.004, 0.0005, nearEase),
      farPlane: THREE.MathUtils.lerp(40, 16, nearEase),
      frontWallFade: 1,
    };
  }

  // Segment 3A: Emerge & glide smoothly onto CH.03 Iris Reactor (0.355 -> 0.455)
  if (p <= DETAILED_CHAMBERS[2].scrollAt) {
    const u = (p - 0.355) / (DETAILED_CHAMBERS[2].scrollAt - 0.355);
    const eased = 1 - Math.pow(1 - u, 2.6);
    if (isMobileLayout) {
      _vA.set(0.0, -15.0, 10.0);
      _vB.set(0.0, -17.6, 9.8);
      _vC.set(0.0, -32.6, -12.0);
      _vD.set(0.0, -34.0, -12.0);
    } else {
      _vA.set(-4.2, -17.9, 1.4);
      _vB.set(...DETAILED_CHAMBERS[2].camPos);
      _vC.set(-4.0, -24.0, -12.0);
      _vD.set(...DETAILED_CHAMBERS[2].camTarget);
    }
    outPos.lerpVectors(_vA, _vB, eased);
    outTarget.lerpVectors(_vC, _vD, eased);

    return {
      chamberIdx: 2,
      chamberStage: 'iris',
      warpIntensity: 0,
      teleportFlash: neuronTeleportFlash,
      portalFlyProgress: 0,
      researchDiveProgress: 0,
      summitExplodeProgress: 1,
      neuralRevealProgress: 0,
      neuralPauseFactor: 0,
      enterNeuronProgress: 1,
      horizontalWarp: false,
      nearPlane: 0.1,
      farPlane: 180,
      frontWallFade: 1,
    };
  }

  // Segment 3B: Hold framing CH.03 Reactor while Experience card displays (0.455 -> 0.525)
  if (p < 0.525) {
    const t = (p - 0.455) / (0.525 - 0.455);
    const eased = t * t * (3 - 2 * t);
    portalFlyProgress = eased * 0.08;

    if (isMobileLayout) {
      _vA.set(0.0, -17.6, 9.8);
      _vB.set(0.0, -17.9, 9.2);
      _vC.set(0.0, -34.0, -12.0);
      _vD.set(0.0, -33.6, -12.0);
    } else {
      _vA.set(...DETAILED_CHAMBERS[2].camPos);
      _vB.set(-4.05, -21.6, -0.9);
      _vC.set(...DETAILED_CHAMBERS[2].camTarget);
      _vD.set(-3.85, -24.0, -12.0);
    }
    outPos.lerpVectors(_vA, _vB, eased);
    outTarget.lerpVectors(_vC, _vD, eased);

    return {
      chamberIdx: 2,
      chamberStage: 'iris',
      warpIntensity: 0,
      teleportFlash: 0,
      portalFlyProgress,
      researchDiveProgress: 0,
      summitExplodeProgress: 1,
      neuralRevealProgress: 0,
      neuralPauseFactor: 0,
      enterNeuronProgress: 1,
      horizontalWarp: false,
      nearPlane: 0.1,
      farPlane: 180,
      frontWallFade: 1,
    };
  }

  // Segment 3C: Slow, smooth aperture dive into Quantum Gyroscope core -> Flash 2 (0.525 -> 0.615)
  if (p < 0.615) {
    const t = (p - 0.525) / (0.615 - 0.525);
    const eased = t * t * (3 - 2 * t);
    const inv = 1 - eased;
    portalFlyProgress = 0.08 + eased * 0.92;

    if (isMobileLayout) {
      _vA.set(0.0, -17.9, 9.2);
      _vMid.set(coreWorld.x, coreWorld.y + 0.5, coreWorld.z + 4.0);
      _vC.set(0.0, -33.6, -12.0);
    } else {
      _vA.set(-4.05, -21.6, -0.9);
      _vMid.set(coreWorld.x - 1.2, coreWorld.y + 0.65, coreWorld.z + 3.6);
      _vC.set(-3.85, -24.0, -12.0);
    }
    _vB.copy(coreWorld);

    outPos
      .set(0, 0, 0)
      .addScaledVector(_vA, inv * inv)
      .addScaledVector(_vMid, 2 * inv * eased)
      .addScaledVector(_vB, eased * eased);

    const lookBlend = THREE.MathUtils.smoothstep(t, 0.0, 0.48);
    outTarget.lerpVectors(_vC, coreWorld, lookBlend);

    return {
      chamberIdx: t < 0.65 ? 2 : 3,
      chamberStage: 'iris',
      warpIntensity: 0,
      teleportFlash: irisTeleportFlash,
      portalFlyProgress,
      researchDiveProgress: 0,
      summitExplodeProgress: 1,
      neuralRevealProgress: 0,
      neuralPauseFactor: 0,
      enterNeuronProgress: 1,
      horizontalWarp: false,
      nearPlane: 0.05,
      farPlane: 180,
      frontWallFade: 1,
    };
  }

  // Segment 4A: Emerge & glide smoothly onto CH.04 Quantum Knowledge (y=-48, z=-12) (0.615 -> 0.705)
  if (p <= DETAILED_CHAMBERS[3].scrollAt) {
    const u = (p - 0.615) / (DETAILED_CHAMBERS[3].scrollAt - 0.615);
    const eased = 1 - Math.pow(1 - u, 2.6);
    if (isMobileLayout) {
      _vA.set(0.0, -44.2, -1.6);
      _vB.set(0.0, -45.6, -2.4);
      _vC.set(0.0, -48.4, -12.0);
      _vD.set(0.0, -48.6, -12.0);
    } else {
      _vA.set(0.0, -46.2, -2.5);
      _vB.set(...DETAILED_CHAMBERS[3].camPos); // [0.0, -47.2, -3.1] -> Centered Quantum States stage
      _vC.set(0.0, -48.0, -12.0);
      _vD.set(...DETAILED_CHAMBERS[3].camTarget); // [0.0, -48.0, -12.0]
    }
    outPos.lerpVectors(_vA, _vB, eased);
    outTarget.lerpVectors(_vC, _vD, eased);

    return {
      chamberIdx: 3,
      chamberStage: 'research',
      warpIntensity: 0,
      teleportFlash: irisTeleportFlash,
      portalFlyProgress: 1,
      researchDiveProgress: 0,
      summitExplodeProgress: 1,
      neuralRevealProgress: 0,
      neuralPauseFactor: 0,
      enterNeuronProgress: 1,
      horizontalWarp: false,
      nearPlane: 0.1,
      farPlane: 180,
      frontWallFade: 1,
    };
  }

  // Segment 4B: Hold CH.04 Quantum Knowledge framed cleanly while interactive HUD shows (0.705 -> 0.77)
  if (p < 0.77) {
    const t = (p - 0.705) / (0.77 - 0.705);
    const eased = t * t * (3 - 2 * t);
    researchDiveProgress = eased * 0.08;

    if (isMobileLayout) {
      _vA.set(0.0, -45.6, -2.4);
      _vB.set(0.0, -45.75, -2.7);
      _vC.set(0.0, -48.6, -12.0);
      _vD.set(0.0, -48.55, -12.0);
    } else {
      _vA.set(...DETAILED_CHAMBERS[3].camPos);
      _vB.set(0.0, -47.25, -3.4);
      _vC.set(...DETAILED_CHAMBERS[3].camTarget);
      _vD.set(0.0, -48.0, -12.0);
    }
    outPos.lerpVectors(_vA, _vB, eased);
    outTarget.lerpVectors(_vC, _vD, eased);

    return {
      chamberIdx: 3,
      chamberStage: 'research',
      warpIntensity: 0,
      teleportFlash: 0,
      portalFlyProgress: 1,
      researchDiveProgress,
      summitExplodeProgress: 1,
      neuralRevealProgress: 0,
      neuralPauseFactor: 0,
      enterNeuronProgress: 1,
      horizontalWarp: false,
      nearPlane: 0.1,
      farPlane: 180,
      frontWallFade: 1,
    };
  }

  // Segment 4C: Smooth plunge through Quantum Knowledge emitter portal into CH.05 Contact Pedestal -> Flash 3 (0.77 -> 0.845)
  if (p < 0.845) {
    const t = (p - 0.77) / (0.845 - 0.77);
    const eased = t * t * (3 - 2 * t);
    const inv = 1 - eased;
    researchDiveProgress = 0.08 + eased * 0.92;

    if (isMobileLayout) {
      _vA.set(0.0, -45.75, -2.7);
      _vMid.set(0.0, -47.1, -7.8);
      _vC.set(0.0, -48.55, -12.0);
    } else {
      _vA.set(0.0, -47.25, -3.4);
      _vMid.set(0.0, -47.6, -8.4);
      _vC.set(0.0, -48.0, -12.0);
    }
    _vB.set(0.0, -47.85, -12.0);
    outPos
      .set(0, 0, 0)
      .addScaledVector(_vA, inv * inv)
      .addScaledVector(_vMid, 2 * inv * eased)
      .addScaledVector(_vB, eased * eased);

    _vD.set(0.0, -49.2, -12.0);
    outTarget.lerpVectors(_vC, _vD, THREE.MathUtils.smoothstep(t, 0.0, 0.58));

    return {
      chamberIdx: t < 0.65 ? 3 : 4,
      chamberStage: 'research',
      warpIntensity: Math.sin(t * Math.PI) * 0.28,
      teleportFlash: researchTeleportFlash,
      portalFlyProgress: 1,
      researchDiveProgress,
      summitExplodeProgress: 1,
      neuralRevealProgress: 0,
      neuralPauseFactor: 0,
      enterNeuronProgress: 1,
      horizontalWarp: false,
      nearPlane: 0.06,
      farPlane: 180,
      frontWallFade: 1,
    };
  }

  // Segment 5A: Emerge smoothly onto & dwell at CH.05 Contact Pedestal (y=-76, z=-12) (0.845 -> 0.94)
  if (p <= 0.94) {
    const enterT = THREE.MathUtils.clamp((p - 0.845) / (0.905 - 0.845), 0, 1);
    const eased = 1 - Math.pow(1 - enterT, 2.8);

    if (isMobileLayout) {
      _vA.set(0.0, -71.2, -0.5);
      _vB.set(0.0, -72.3, 1.4);
      _vC.set(0.0, -78.0, -12.0);
      _vD.set(0.0, -79.4, -12.0);
    } else {
      _vA.set(1.3, -72.9, -5.6);
      _vB.set(...DETAILED_CHAMBERS[4].camPos); // [2.75, -73.95, -3.5]
      _vC.set(1.2, -75.3, -12.0);
      _vD.set(...DETAILED_CHAMBERS[4].camTarget); // [2.6, -75.35, -12.0]
    }
    outPos.lerpVectors(_vA, _vB, eased);
    outTarget.lerpVectors(_vC, _vD, eased);

    return {
      chamberIdx: 4,
      chamberStage: 'pedestal',
      warpIntensity: 0,
      teleportFlash: researchTeleportFlash,
      portalFlyProgress: 1,
      researchDiveProgress: 1,
      summitExplodeProgress: 1,
      neuralRevealProgress: 0,
      neuralPauseFactor: 0,
      enterNeuronProgress: 1,
      horizontalWarp: false,
      nearPlane: 0.1,
      farPlane: 180,
      frontWallFade: 1,
    };
  }

  // Segment 5B: Rise upward through CH.05 overhead Cyan Halo Portal (y=-73.05, z=-12) (0.94 -> 0.968)
  if (p < 0.968) {
    const t = (p - 0.94) / (0.968 - 0.94);
    const eased = t * t * (3 - 2 * t);
    const inv = 1 - eased;

    if (isMobileLayout) {
      _vA.set(0.0, -72.3, 1.4);
      _vMid.set(0.0, -72.6, -7.2);
      _vC.set(0.0, -79.4, -12.0);
    } else {
      _vA.set(...DETAILED_CHAMBERS[4].camPos);
      _vMid.set(1.2, -73.6, -9.2);
      _vC.set(...DETAILED_CHAMBERS[4].camTarget);
    }
    _vB.set(0.0, -71.2, -12.0); // straight through overhead Halo Ring at y = -73.05, z = -12
    outPos
      .set(0, 0, 0)
      .addScaledVector(_vA, inv * inv)
      .addScaledVector(_vMid, 2 * inv * eased)
      .addScaledVector(_vB, eased * eased);

    _vD.set(0.0, -66.0, -12.0);
    outTarget.lerpVectors(_vC, _vD, THREE.MathUtils.smoothstep(t, 0.08, 0.72));

    return {
      chamberIdx: 4,
      chamberStage: 'pedestal',
      warpIntensity: Math.sin(t * Math.PI) * 0.44,
      teleportFlash: skyTeleportFlash,
      portalFlyProgress: 1,
      researchDiveProgress: 1,
      summitExplodeProgress: 1,
      neuralRevealProgress: 0,
      neuralPauseFactor: 0,
      enterNeuronProgress: 1,
      horizontalWarp: false,
      nearPlane: 0.1,
      farPlane: 180,
      frontWallFade: 1,
    };
  }

  // Segment 5C (Loop Return): Teleport into high starry sky & descend cleanly onto Stage 1 CH.01 (0.968 -> 1.00)
  const t = THREE.MathUtils.clamp((p - 0.968) / (0.995 - 0.968), 0, 1);
  const eased = 1 - Math.pow(1 - t, 3);

  _vA.set(0.0, 22.5, 25.0);
  if (isMobileLayout) {
    _vB.set(-12.8, -0.45, 10.4);
    _vD.set(0.0, 1.75, 0.0);
  } else {
    _vB.set(...DETAILED_CHAMBERS[0].camPos);
    _vD.set(...DETAILED_CHAMBERS[0].camTarget);
  }
  outPos.lerpVectors(_vA, _vB, eased);

  _vC.set(0.0, 2.8, 0.0);
  outTarget.lerpVectors(_vC, _vD, eased);

  return {
    chamberIdx: 0,
    chamberStage: 'summit',
    warpIntensity: Math.sin(THREE.MathUtils.clamp((1 - t) * 0.85, 0, 1) * Math.PI) * 0.22,
    teleportFlash: skyTeleportFlash,
    portalFlyProgress: 0,
    researchDiveProgress: 0,
    summitExplodeProgress: 0,
    neuralRevealProgress: 0,
    neuralPauseFactor: 0,
    enterNeuronProgress: 0,
    horizontalWarp: true,
    nearPlane: 0.1,
    farPlane: 180,
    frontWallFade: 0,
  };
}

export const ObsidianCyanScene: React.FC<ObsidianCyanSceneProps> = ({
  scrollProgress,
  pedestalMode,
  cameraResetNonce,
  onTelemetryUpdate,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState(false);

  const scrollRef = useRef(scrollProgress);
  const pedestalModeRef = useRef<PedestalMode>(pedestalMode);
  const userOrbitingRef = useRef(false);
  const orbitScrollAnchorRef = useRef(scrollProgress);
  const isMobileRef = useRef(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const telemetryCbRef = useRef(onTelemetryUpdate);

  useEffect(() => {
    telemetryCbRef.current = onTelemetryUpdate;
  }, [onTelemetryUpdate]);

  useEffect(() => {
    scrollRef.current = scrollProgress;
    if (userOrbitingRef.current && Math.abs(scrollProgress - orbitScrollAnchorRef.current) > 0.03) {
      userOrbitingRef.current = false;
    }
  }, [scrollProgress]);

  useEffect(() => {
    pedestalModeRef.current = pedestalMode;
  }, [pedestalMode]);

  useEffect(() => {
    if (cameraResetNonce > 0) {
      userOrbitingRef.current = false;
    }
  }, [cameraResetNonce]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setWebglError(true);
      return;
    }

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    isMobileRef.current = width < 768;

    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.94;

    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.cursor = 'grab';

    // Deep Graphite Environment (#121417) + lighter atmospheric fog so volcanic ridge silhouettes show clearly
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x121417);
    scene.fog = new THREE.FogExp2(0x121417, 0.0115);

    // Studio Reflection Map for crisp metallic basalt & clear quartz bevels
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.42;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      getResponsiveFov(width / Math.max(1, height)),
      width / Math.max(1, height),
      0.1,
      180
    );
    if (isMobileRef.current) {
      camera.position.set(-12.8, -0.45, 10.4);
    } else {
      camera.position.set(...DETAILED_CHAMBERS[0].camPos);
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.055;
    controls.enableZoom = false; // Page scroll drives chamber transitions cleanly
    controls.enablePan = false;
    controls.rotateSpeed = 0.65;
    if (isMobileRef.current) {
      controls.target.set(0.0, 1.75, 0.0);
    } else {
      controls.target.set(...DETAILED_CHAMBERS[0].camTarget);
    }

    // Allow native vertical touch swipes to scroll the page while preserving mouse drag orbit
    renderer.domElement.style.touchAction = 'pan-y';

    controls.addEventListener('start', () => {
      userOrbitingRef.current = true;
      orbitScrollAnchorRef.current = scrollRef.current;
    });

    // Pure Cyan + Crisp White Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x00ffff, 0x1a2028, 0.65);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.92);
    keyLight.position.set(16, 22, 18);
    scene.add(keyLight);

    const cyanRim = new THREE.DirectionalLight(0x00ffff, 1.35);
    cyanRim.position.set(-12, -4, -18);
    scene.add(cyanRim);

    const horizonRim = new THREE.DirectionalLight(0xd8ffff, 0.78);
    horizonRim.position.set(0, 7, -62);
    scene.add(horizonRim);

    // High, far, side-angled Sun Light positioned on the camera side to sculpt rock & chain textures
    const cameraSunLight = new THREE.DirectionalLight(0xf6f9ff, 1.24);
    cameraSunLight.position.set(22, 28, 26);
    scene.add(cameraSunLight);
    scene.add(cameraSunLight.target);

    // Cyan box-cluster bounce light spilling onto basalt columns and surrounding volcanic ground
    const boxGlowLight = new THREE.PointLight(0x00ffff, 6.8, 19, 1.4);
    boxGlowLight.position.set(0, 1.4, 0);
    scene.add(boxGlowLight);

    // Procedural PBR & Holographic Textures
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const glowTex = createPureCyanGlowTexture();
    const neutralGlowTex = createNeutralGlowTexture();
    const basaltMaps = createBasaltPBRTextures(maxAniso, 1, 2.6);
    const terrainBasaltMaps = createBasaltPBRTextures(maxAniso, 16, 16);
    const circuitTex = createPedestalCircuitTexture(maxAniso);
    const binaryTexA = createBinaryBlockchainBlockTextures(maxAniso, 1);
    const binaryTexB = createBinaryBlockchainBlockTextures(maxAniso, 2);

    // -------------------------------------------------------------------------
    // Build Sculpted Mars/Volcanic Horizon Terrain & All 4 Chambers
    // -------------------------------------------------------------------------
    const volcanicTerrain = buildVolcanicHorizonTerrain(terrainBasaltMaps);
    scene.add(volcanicTerrain.root);

    const summitChamber = buildSummitChamber(basaltMaps, glowTex, binaryTexA, binaryTexB);
    scene.add(summitChamber.root);

    // Neural Network lives physically INSIDE the Chosen 0/1 Block via chosenAnchor!
    const driftChamber = buildDriftChamber(glowTex);
    summitChamber.chosenAnchor.add(driftChamber.root);

    // Transform local neuron ride waypoints into a unified sweeping CatmullRomCurve3 starting right at the hold pose
    const worldWaypoints = driftChamber.rideWaypoints.map(
      (lp) => new THREE.Vector3(lp.x * 0.026, 1.75 + lp.y * 0.026, lp.z * 0.026)
    );
    const firstNeuronWorld = worldWaypoints[0];
    const lastNeuronWorld = worldWaypoints[worldWaypoints.length - 1];
    const rideCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-0.19, 1.8, 0.3),
        new THREE.Vector3(
          firstNeuronWorld.x - 0.045,
          firstNeuronWorld.y + 0.015,
          firstNeuronWorld.z + 0.14
        ),
        ...worldWaypoints,
      ],
      false,
      'centripetal',
      0.45
    );

    const irisChamber = buildIrisChamber(
      -24,
      -12,
      basaltMaps.map,
      glowTex,
      neutralGlowTex,
      RESUME_DATA.keySkills
    );
    scene.add(irisChamber.root);

    const researchChamber = buildResearchChamber(-48, -12, glowTex);
    scene.add(researchChamber.root);

    const pedestalChamber = buildPedestalChamber(-76, -12, circuitTex, glowTex);
    scene.add(pedestalChamber.root);

    // -------------------------------------------------------------------------
    // Hyperspace Warp Streak Tunnel & Drifting Atmospheric Motes
    // -------------------------------------------------------------------------
    const rng = createRng(8088);
    const streakCount = 130;
    const streakGeo = new THREE.CylinderGeometry(0.016, 0.016, 1.8, 6);
    const streakMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const warpStreaks = new THREE.InstancedMesh(streakGeo, streakMat, streakCount);
    warpStreaks.frustumCulled = false;
    warpStreaks.visible = false;

    const streakData = Array.from({ length: streakCount }, () => {
      const a = rng() * Math.PI * 2;
      const r = 1.6 + rng() * 5.6;
      return {
        radialX: Math.cos(a) * r,
        radialY: Math.sin(a) * r,
        offset: rng() * 24,
        speed: 14 + rng() * 18,
      };
    });
    scene.add(warpStreaks);

    // Lower-chamber drifting dust motes strictly below ground level (y: -14 down to -104)
    const moteCount = 480;
    const moteGeo = new THREE.BufferGeometry();
    const motePos = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      motePos[i * 3] = (rng() - 0.5) * 76;
      motePos[i * 3 + 1] = -14 - rng() * 90;
      motePos[i * 3 + 2] = 36 - rng() * 88;
    }
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
    const moteMat = new THREE.PointsMaterial({
      color: 0xffffff,
      map: neutralGlowTex,
      size: 0.14,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const motes = new THREE.Points(moteGeo, moteMat);
    scene.add(motes);

    // Dedicated Celestial Night Sky Starfield placed strictly above volcanic mountain rim (never on ground)
    const skyStarCount = 320;
    const skyStarGeo = new THREE.BufferGeometry();
    const skyStarPos = new Float32Array(skyStarCount * 3);
    for (let i = 0; i < skyStarCount; i++) {
      const r = 84 + rng() * 52;
      const theta = rng() * Math.PI * 2;
      const cosPhi = 0.24 + rng() * 0.76; // Elevation >= ~14° -> y >= +20 above mountain peaks
      const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));
      skyStarPos[i * 3] = r * sinPhi * Math.cos(theta);
      skyStarPos[i * 3 + 1] = r * cosPhi;
      skyStarPos[i * 3 + 2] = r * sinPhi * Math.sin(theta);
    }
    skyStarGeo.setAttribute('position', new THREE.BufferAttribute(skyStarPos, 3));
    const skyStarMat = new THREE.PointsMaterial({
      color: 0xe8faff,
      map: neutralGlowTex,
      size: 0.92,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const skyStars = new THREE.Points(skyStarGeo, skyStarMat);
    scene.add(skyStars);

    // Hardware-GPU MSAA EffectComposer so spheres, synapses, rings & basalt edges render silky smooth
    let composer: EffectComposer | null = null;
    let msaaTarget: THREE.WebGLRenderTarget | null = null;
    if (!isSoftwareGl) {
      const pr = renderer.getPixelRatio();
      msaaTarget = new THREE.WebGLRenderTarget(
        Math.max(1, Math.floor(width * pr)),
        Math.max(1, Math.floor(height * pr)),
        {
          type: THREE.HalfFloatType,
          samples: renderer.capabilities.isWebGL2 ? 4 : 0,
        }
      );
      composer = new EffectComposer(renderer, msaaTarget);
      composer.setPixelRatio(pr);
      composer.setSize(width, height);
      composer.addPass(new RenderPass(scene, camera));
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.13,
        0.2,
        0.93
      );
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());
      renderer.compile(scene, camera);
    }

    // -------------------------------------------------------------------------
    // Pointer Parallax & Resize Listeners
    // -------------------------------------------------------------------------
    const pointerTarget = new THREE.Vector2(0, 0);
    const pointerSmooth = new THREE.Vector2(0, 0);
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointerTarget.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerTarget.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onCapturePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        controls.enabled = false;
      } else {
        controls.enabled = true;
        renderer.domElement.style.cursor = 'grabbing';
      }
    };

    const onPointerUp = () => {
      renderer.domElement.style.cursor = 'grab';
    };

    const onPointerLeave = () => {
      pointerTarget.set(0, 0);
      renderer.domElement.style.cursor = 'grab';
    };

    const onResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      const aspect = w / Math.max(1, h);
      isMobileRef.current = w < 768;
      camera.aspect = aspect;
      camera.fov = getResponsiveFov(aspect);
      camera.updateProjectionMatrix();
      const pr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2);
      renderer.setSize(w, h);
      renderer.setPixelRatio(pr);
      composer?.setPixelRatio(pr);
      composer?.setSize(w, h);
    };

    const onContextLost = (e: Event) => {
      e.preventDefault();
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onCapturePointerDown, { capture: true });
    window.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    window.addEventListener('resize', onResize);

    // -------------------------------------------------------------------------
    // Main Animation Loop
    // -------------------------------------------------------------------------
    let frameId = 0;
    let disposed = false;
    let lastChamberIdx = -1;
    let lastWarp = -1;
    let lastTeleportFlash = -1;
    let lastOrbit = false;
    let prevStage: ChamberStage =
      scrollRef.current >= 0.845 && scrollRef.current < 0.968
        ? 'pedestal'
        : scrollRef.current >= 0.615 && scrollRef.current < 0.845
          ? 'research'
          : scrollRef.current >= 0.355 && scrollRef.current < 0.615
            ? 'iris'
            : 'summit';
    let smoothScroll = scrollRef.current;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;

      const delta = Math.min(clock.getDelta(), 0.08);
      const elapsed = clock.elapsedTime;

      // Damped scroll interpolation + instant wrap handoff only when looping bottom -> top
      const wrappedToStart = smoothScroll > 0.9 && scrollRef.current < 0.08;
      if (wrappedToStart) {
        smoothScroll = scrollRef.current;
      } else {
        smoothScroll = THREE.MathUtils.damp(smoothScroll, scrollRef.current, 3.1, delta);
      }

      const pAlpha = 1 - Math.exp(-6.5 * delta);
      pointerSmooth.x = THREE.MathUtils.lerp(pointerSmooth.x, pointerTarget.x, pAlpha);
      pointerSmooth.y = THREE.MathUtils.lerp(pointerSmooth.y, pointerTarget.y, pAlpha);

      irisChamber.getCoreWorldPosition(_coreWorld);

      const {
        chamberIdx,
        chamberStage,
        warpIntensity,
        teleportFlash,
        portalFlyProgress,
        researchDiveProgress,
        summitExplodeProgress,
        neuralRevealProgress,
        neuralPauseFactor,
        enterNeuronProgress,
        horizontalWarp,
        nearPlane,
        farPlane,
        frontWallFade,
      } = sampleDetailedFlight(
        smoothScroll,
        rideCurve,
        lastNeuronWorld,
        _coreWorld,
        isMobileRef.current,
        _camGoalPos,
        _camGoalTarget
      );

      if (
        chamberIdx !== lastChamberIdx ||
        Math.abs(warpIntensity - lastWarp) > 0.02 ||
        Math.abs(teleportFlash - lastTeleportFlash) > 0.015 ||
        userOrbitingRef.current !== lastOrbit
      ) {
        lastChamberIdx = chamberIdx;
        lastWarp = warpIntensity;
        lastTeleportFlash = teleportFlash;
        lastOrbit = userOrbitingRef.current;
        telemetryCbRef.current?.(
          chamberIdx,
          warpIntensity,
          teleportFlash,
          userOrbitingRef.current
        );
      }

      const crossedTeleport = chamberStage !== prevStage;
      prevStage = chamberStage;

      if (crossedTeleport) {
        camera.near = nearPlane;
        camera.far = farPlane;
        camera.updateProjectionMatrix();
        camera.position.copy(_camGoalPos);
        controls.target.copy(_camGoalTarget);
        userOrbitingRef.current = false;
      } else {
        const nextNear = THREE.MathUtils.damp(camera.near, nearPlane, 8, delta);
        const nextFar = THREE.MathUtils.damp(camera.far, farPlane, 8, delta);
        if (Math.abs(nextNear - camera.near) > 0.0001 || Math.abs(nextFar - camera.far) > 0.1) {
          camera.near = nextNear;
          camera.far = nextFar;
          camera.updateProjectionMatrix();
        }

        if (!userOrbitingRef.current) {
          const camDist = _camGoalPos.distanceTo(_camGoalTarget);
          const parallaxScale =
            enterNeuronProgress > 0.05 ||
            portalFlyProgress > 0.12 ||
            researchDiveProgress > 0.12
              ? 0
              : Math.min(1.0, camDist * 0.09);
          _camGoalPos.x += pointerSmooth.x * 0.72 * parallaxScale;
          _camGoalPos.y += pointerSmooth.y * 0.42 * parallaxScale;

          const damp = enterNeuronProgress > 0.05 ? 3.8 : 3.4;
          camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, damp, delta);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, damp, delta);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, damp, delta);

          controls.target.x = THREE.MathUtils.damp(controls.target.x, _camGoalTarget.x, damp, delta);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, _camGoalTarget.y, damp, delta);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, _camGoalTarget.z, damp, delta);
        }
      }

      controls.update();

      // Position Sunlight near the camera side, higher like a sun, and a bit far & sideways to sculpt textures
      _vA.subVectors(camera.position, controls.target);
      if (_vA.lengthSq() < 0.001) _vA.set(0, 2, 12);
      _vA.normalize();
      _vB.crossVectors(camera.up, _vA);
      if (_vB.lengthSq() > 0.0001) _vB.normalize();
      cameraSunLight.target.position.copy(controls.target);
      cameraSunLight.position
        .copy(controls.target)
        .addScaledVector(_vA, 24)
        .addScaledVector(_vB, -22)
        .addScaledVector(camera.up, 28);
      cameraSunLight.target.updateMatrixWorld();

      // Clean visibility separation across portals (only hide terrain once inside Chosen Block interior)
      const isSummit = chamberStage === 'summit';
      const insideChosenBlock =
        isSummit && neuralRevealProgress > 0.92 && camera.position.distanceTo(_summitCenter) < 0.95;
      volcanicTerrain.root.visible = isSummit && !insideChosenBlock;
      summitChamber.root.visible = isSummit;
      if (summitChamber.root.visible) {
        summitChamber.update(
          elapsed,
          pointerSmooth.x,
          pointerSmooth.y,
          summitExplodeProgress,
          frontWallFade
        );
        driftChamber.update(
          delta,
          pointerSmooth.x,
          pointerSmooth.y,
          neuralRevealProgress,
          neuralPauseFactor,
          enterNeuronProgress
        );
      }

      irisChamber.root.visible = chamberStage === 'iris';
      if (irisChamber.root.visible) {
        irisChamber.update(elapsed, pointerSmooth.x, pointerSmooth.y, portalFlyProgress);
      }

      researchChamber.root.visible = chamberStage === 'research';
      if (researchChamber.root.visible) {
        researchChamber.update(
          elapsed,
          pointerSmooth.x,
          pointerSmooth.y,
          researchDiveProgress,
          reducedMotionQuery.matches
        );
      }

      pedestalChamber.root.visible = chamberStage === 'pedestal';
      if (pedestalChamber.root.visible) {
        pedestalChamber.update(
          elapsed,
          delta,
          pedestalModeRef.current,
          pointerSmooth.x,
          pointerSmooth.y
        );
      }

      boxGlowLight.intensity =
        isSummit && !insideChosenBlock ? 6.8 * (1 - summitExplodeProgress * 0.65) : 0;

      skyStars.visible = isSummit && !insideChosenBlock;
      if (skyStars.visible) {
        skyStarMat.opacity = 0.82 + Math.sin(elapsed * 1.45) * 0.12;
        skyStars.rotation.y = elapsed * 0.004;
      }
      motes.visible = !isSummit || smoothScroll >= 0.968;

      // Animate Hyperspace Warp Streaks (Z-tunnel for CH.01->02, Y-shaft for CH.03->04)
      warpStreaks.visible = warpIntensity > 0.02;
      if (warpStreaks.visible) {
        streakMat.opacity = warpIntensity * 0.88;
        const stretch = 0.4 + warpIntensity * 3.8;
        for (let i = 0; i < streakCount; i++) {
          const s = streakData[i];
          const travel = ((elapsed * s.speed + s.offset) % 24) - 12;
          if (horizontalWarp) {
            _dummy.position.set(
              camera.position.x + s.radialX,
              camera.position.y + s.radialY,
              camera.position.z + travel - 8
            );
            _dummy.rotation.set(Math.PI / 2, 0, 0);
          } else {
            _dummy.position.set(
              camera.position.x + s.radialX,
              camera.position.y + travel - 4,
              camera.position.z + s.radialY
            );
            _dummy.rotation.set(0, 0, 0);
          }
          _dummy.scale.set(1, stretch, 1);
          _dummy.updateMatrix();
          warpStreaks.setMatrixAt(i, _dummy.matrix);
        }
        warpStreaks.instanceMatrix.needsUpdate = true;
      }

      motes.rotation.y = Math.sin(elapsed * 0.06) * 0.025;

      if (composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);

      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onCapturePointerDown, { capture: true });
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      window.removeEventListener('resize', onResize);

      controls.dispose();
      composer?.dispose();
      msaaTarget?.dispose();
      envTarget.dispose();
      glowTex.dispose();
      neutralGlowTex.dispose();
      basaltMaps.map.dispose();
      basaltMaps.bumpMap.dispose();
      basaltMaps.roughnessMap.dispose();
      terrainBasaltMaps.map.dispose();
      terrainBasaltMaps.bumpMap.dispose();
      terrainBasaltMaps.roughnessMap.dispose();
      circuitTex.dispose();
      binaryTexA.map.dispose();
      binaryTexA.emissiveMap.dispose();
      binaryTexB.map.dispose();
      binaryTexB.emissiveMap.dispose();
      volcanicTerrain.dispose();
      summitChamber.dispose();
      driftChamber.dispose();
      irisChamber.dispose();
      researchChamber.dispose();
      pedestalChamber.dispose();
      streakGeo.dispose();
      streakMat.dispose();
      moteGeo.dispose();
      moteMat.dispose();
      skyStarGeo.dispose();
      skyStarMat.dispose();
      renderer.dispose();

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (webglError) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#121417] text-[#FFFFFF]">
        <p className="font-mono-hud text-xs text-[#00FFFF]">
          WEBGL CONTEXT UNAVAILABLE // HARDWARE ACCELERATION REQUIRED
        </p>
      </div>
    );
  }

  return <div ref={mountRef} className="fixed inset-0 z-0 touch-pan-y" />;
};
