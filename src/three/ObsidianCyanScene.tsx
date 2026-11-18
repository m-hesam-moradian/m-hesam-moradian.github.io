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
const _summitCenter = new THREE.Vector3(0, 1.55, 0);
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
  warpIntensity: number;
  teleportFlash: number;
  teleported: boolean;
  coreEntered: boolean;
  portalFlyProgress: number;
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
  const inReturnSky = p >= 0.945;
  const summitExplodeProgress = inReturnSky ? 0 : THREE.MathUtils.smoothstep(p, 0.0, 0.175);
  const frontWallFade = inReturnSky ? 0 : THREE.MathUtils.smoothstep(p, 0.035, 0.19);
  const neuralRevealProgress = inReturnSky ? 0 : THREE.MathUtils.smoothstep(p, 0.035, 0.185);

  // Smoothly pause neural simulation while About Me card is displayed [0.275 .. 0.41]
  const pauseIn = THREE.MathUtils.smoothstep(p, 0.275, 0.31);
  const pauseOut = THREE.MathUtils.smoothstep(p, 0.375, 0.41);
  const neuralPauseFactor = pauseIn * (1 - pauseOut);

  // Pure Cyan Teleport Flash 1 centered at p = 0.53 inside Last Neuron nucleus
  let neuronTeleportFlash = 0;
  if (p >= 0.51 && p <= 0.55) {
    neuronTeleportFlash =
      p < 0.53
        ? THREE.MathUtils.smoothstep(p, 0.51, 0.53)
        : 1 - THREE.MathUtils.smoothstep(p, 0.53, 0.55);
  }

  // Pure Cyan Teleport Flash 3 centered at p = 0.945 inside CH.04 overhead Halo Portal
  let skyTeleportFlash = 0;
  if (p >= 0.928 && p <= 0.968) {
    skyTeleportFlash =
      p < 0.945
        ? THREE.MathUtils.smoothstep(p, 0.928, 0.945)
        : 1 - THREE.MathUtils.smoothstep(p, 0.945, 0.968);
  }

  // Segment 1: CH.01 Genesis Blocks (0.00) -> Explode & enter inside Chosen Block (0.19)
  if (p <= 0.19) {
    const u = p / 0.19;
    const eased = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;

    if (isMobileLayout) {
      _vA.set(0.0, 2.9, 15.6);
      _vB.set(0.0, 1.54, 0.68);
      _vC.set(0.0, 1.15, 0.0);
      _vD.set(0.0, 1.55, 0.0);
    } else {
      _vA.set(...DETAILED_CHAMBERS[0].camPos); // (0, 2.35, 11.4)
      _vB.set(...DETAILED_CHAMBERS[1].camPos); // (0, 1.56, 0.52)
      _vC.set(...DETAILED_CHAMBERS[0].camTarget); // (0, 1.35, 0)
      _vD.set(...DETAILED_CHAMBERS[1].camTarget); // (0, 1.55, 0)
    }
    outPos.lerpVectors(_vA, _vB, eased);
    outTarget.lerpVectors(_vC, _vD, eased);

    warpIntensity = Math.sin(THREE.MathUtils.clamp((u - 0.14) / 0.48, 0, 1) * Math.PI) * 0.38;
    const microBlend = THREE.MathUtils.smoothstep(u, 0.55, 0.95);
    return {
      chamberIdx: 0,
      warpIntensity,
      teleportFlash: 0,
      teleported: false,
      coreEntered: false,
      portalFlyProgress,
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

  // Segment 2A: Unobstructed Live Neural Network Viewing Hold (0.19 -> 0.27)
  if (p <= 0.27) {
    const u = (p - 0.19) / 0.08;
    const eased = u * u * (3 - 2 * u);
    if (isMobileLayout) {
      _vA.set(0.0, 1.54, 0.68);
      _vB.set(0.0, 1.52, 0.64);
    } else {
      _vA.set(...DETAILED_CHAMBERS[1].camPos); // (0, 1.56, 0.52)
      _vB.set(0, 1.56, 0.45);
    }
    outPos.lerpVectors(_vA, _vB, eased);
    outTarget.set(0, 1.55, 0);

    return {
      chamberIdx: 1,
      warpIntensity: 0,
      teleportFlash: 0,
      teleported: false,
      coreEntered: false,
      portalFlyProgress: 0,
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

  // Segment 2B: Sweep into Left-Half (desktop) or Larger Upper-Stage (mobile) Pose + About Me Card (0.27 -> 0.41)
  if (p <= 0.41) {
    const u = (p - 0.27) / 0.14;
    const orbitIn = THREE.MathUtils.smoothstep(u, 0.0, 0.16);
    if (isMobileLayout) {
      _vA.set(0.0, 1.52, 0.64);
      _vB.set(0.0, 1.44, 0.66);
      _vD.set(0.0, 1.32, 0.0);
    } else {
      _vA.set(0, 1.56, 0.45);
      _vB.set(-0.19, 1.6, 0.3);
      _vD.set(0.14, 1.54, 0.04);
    }
    outPos.lerpVectors(_vA, _vB, orbitIn);

    _vC.set(0, 1.55, 0);
    outTarget.lerpVectors(_vC, _vD, orbitIn);

    return {
      chamberIdx: 1,
      warpIntensity: 0,
      teleportFlash: 0,
      teleported: false,
      coreEntered: false,
      portalFlyProgress: 0,
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

  // Segment 2C: Unified Sweeping Spline Glide -> First Neuron -> 3 Neurons -> Inside Last Neuron (0.41 -> 0.53)
  if (p < 0.53) {
    const u = THREE.MathUtils.clamp((p - 0.41) / (0.53 - 0.41), 0, 1);
    const rideT = u < 0.2 ? 0.5 * (u / 0.2) * u : u;
    const clampedT = THREE.MathUtils.clamp(rideT, 0, 1);
    rideCurve.getPointAt(clampedT, outPos);

    if (isMobileLayout && u < 0.28) {
      const mobileEntryBlend = THREE.MathUtils.smoothstep(u, 0.0, 0.28);
      _vA.set(0.0, 1.44, 0.66);
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
      _vC.set(0.0, 1.32, 0.0);
    } else {
      _vC.set(0.14, 1.54, 0.04);
    }
    outTarget.lerpVectors(_vC, _vD, lookPan);

    const nearEase = THREE.MathUtils.smoothstep(u, 0.05, 0.35);
    return {
      chamberIdx: 1,
      warpIntensity: 0,
      teleportFlash: neuronTeleportFlash,
      teleported: false,
      coreEntered: false,
      portalFlyProgress: 0,
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

  // Segment 2D: Teleported cleanly from Last Neuron to CH.03 Quantum Gyroscope Reactor (0.53 -> 0.64)
  if (p <= DETAILED_CHAMBERS[2].scrollAt) {
    const u = (p - 0.53) / (DETAILED_CHAMBERS[2].scrollAt - 0.53);
    const eased = 1 - Math.pow(1 - u, 2.5);
    if (isMobileLayout) {
      _vA.set(0.0, -15.0, 10.0);
      _vB.set(0.0, -17.6, 9.8);
      _vC.set(0.0, -32.6, -12.0);
      _vD.set(0.0, -34.0, -12.0);
    } else {
      _vA.set(-4.2, -17.9, 1.4);
      _vB.set(...DETAILED_CHAMBERS[2].camPos); // [-4.2, -21.2, -0.4] -> frames Reactor cleanly in RIGHT HALF
      _vC.set(-4.0, -24.0, -12.0);
      _vD.set(...DETAILED_CHAMBERS[2].camTarget);
    }
    outPos.lerpVectors(_vA, _vB, eased);
    outTarget.lerpVectors(_vC, _vD, eased);

    return {
      chamberIdx: 2,
      warpIntensity: 0,
      teleportFlash: neuronTeleportFlash,
      teleported: true,
      coreEntered: false,
      portalFlyProgress: 0,
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

  // Segment 3A: Hold framing CH.03 Quantum Reactor (RIGHT desktop / High-Upper mobile) while WORK card sits opposite (0.64 -> 0.725)
  if (p < 0.725) {
    const t = (p - 0.64) / (0.725 - 0.64);
    const eased = t * t * (3 - 2 * t);
    portalFlyProgress = eased * 0.08;

    if (isMobileLayout) {
      _vA.set(0.0, -17.6, 9.8);
      _vB.set(0.0, -17.9, 9.2);
      _vC.set(0.0, -34.0, -12.0);
      _vD.set(0.0, -33.6, -12.0);
    } else {
      _vA.set(...DETAILED_CHAMBERS[2].camPos); // [-4.2, -21.2, -0.4]
      _vB.set(-4.05, -21.6, -0.9);
      _vC.set(...DETAILED_CHAMBERS[2].camTarget); // [-4.0, -24.0, -12.0]
      _vD.set(-3.85, -24.0, -12.0);
    }
    outPos.lerpVectors(_vA, _vB, eased);
    outTarget.lerpVectors(_vC, _vD, eased);

    return {
      chamberIdx: 2,
      warpIntensity: 0,
      teleportFlash: 0,
      teleported: true,
      coreEntered: false,
      portalFlyProgress,
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

  // Segment 3B: Smooth aperture dive into the Quantum Gyroscope singularity core (0.725 -> 0.805)
  if (p < 0.805) {
    const t = (p - 0.725) / (0.805 - 0.725);
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

    const lookBlend = THREE.MathUtils.smoothstep(t, 0.0, 0.42);
    outTarget.lerpVectors(_vC, coreWorld, lookBlend);

    const portalFlash = THREE.MathUtils.smoothstep(p, 0.77, 0.805);

    return {
      chamberIdx: t < 0.65 ? 2 : 3,
      warpIntensity: 0,
      teleportFlash: portalFlash,
      teleported: true,
      coreEntered: false,
      portalFlyProgress,
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

  // Segment 4A: Emerge onto & dwell cleanly at CH.04 Contact Pedestal (LEFT desktop / High-Upper mobile) (0.805 -> 0.91)
  if (p <= 0.91) {
    const enterT = THREE.MathUtils.clamp((p - 0.805) / (0.86 - 0.805), 0, 1);
    const eased = 1 - Math.pow(1 - enterT, 3);

    if (isMobileLayout) {
      _vA.set(0.0, -47.2, -0.5);
      _vB.set(0.0, -48.3, 1.4);
      _vC.set(0.0, -54.0, -12.0);
      _vD.set(0.0, -55.4, -12.0);
    } else {
      _vA.set(1.3, -48.9, -5.6);
      _vB.set(...DETAILED_CHAMBERS[3].camPos); // [2.75, -49.95, -3.5] -> more direct & larger LEFT HALF framing
      _vC.set(1.2, -51.3, -12.0);
      _vD.set(...DETAILED_CHAMBERS[3].camTarget); // [2.6, -51.35, -12.0]
    }
    outPos.lerpVectors(_vA, _vB, eased);
    outTarget.lerpVectors(_vC, _vD, eased);

    const emergeFlash = 1 - THREE.MathUtils.smoothstep(p, 0.805, 0.835);

    return {
      chamberIdx: 3,
      warpIntensity: 0,
      teleportFlash: emergeFlash,
      teleported: true,
      coreEntered: true,
      portalFlyProgress: 1,
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

  // Segment 4B: Rise upward through CH.04 overhead Cyan Halo Portal (0.91 -> 0.945)
  if (p < 0.945) {
    const t = (p - 0.91) / (0.945 - 0.91);
    const eased = t * t * (3 - 2 * t);
    const inv = 1 - eased;

    if (isMobileLayout) {
      _vA.set(0.0, -48.3, 1.4);
      _vMid.set(0.0, -48.6, -7.2);
      _vC.set(0.0, -55.4, -12.0);
    } else {
      _vA.set(...DETAILED_CHAMBERS[3].camPos);
      _vMid.set(1.2, -49.6, -9.2);
      _vC.set(...DETAILED_CHAMBERS[3].camTarget);
    }
    _vB.set(0.0, -47.2, -12.0); // straight through overhead Halo Ring at y = -49.05, z = -12
    outPos
      .set(0, 0, 0)
      .addScaledVector(_vA, inv * inv)
      .addScaledVector(_vMid, 2 * inv * eased)
      .addScaledVector(_vB, eased * eased);

    _vD.set(0.0, -42.0, -12.0);
    outTarget.lerpVectors(_vC, _vD, THREE.MathUtils.smoothstep(t, 0.08, 0.72));

    return {
      chamberIdx: 3,
      warpIntensity: Math.sin(t * Math.PI) * 0.48,
      teleportFlash: skyTeleportFlash,
      teleported: true,
      coreEntered: true,
      portalFlyProgress: 1,
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

  // Segment 4C (Loop Return): Teleport into high starry sky & descend cleanly onto Stage 1 CH.01 (0.945 -> 1.00)
  const t = THREE.MathUtils.clamp((p - 0.945) / (0.994 - 0.945), 0, 1);
  const eased = 1 - Math.pow(1 - t, 3);

  _vA.set(0.0, 22.5, 25.0);
  if (isMobileLayout) {
    _vB.set(0.0, 2.9, 15.6);
    _vD.set(0.0, 1.15, 0.0);
  } else {
    _vB.set(...DETAILED_CHAMBERS[0].camPos); // Exact Stage 1 [0.0, 2.35, 11.4]
    _vD.set(...DETAILED_CHAMBERS[0].camTarget); // Exact Stage 1 [0.0, 1.35, 0.0]
  }
  outPos.lerpVectors(_vA, _vB, eased);

  _vC.set(0.0, 2.8, 0.0);
  outTarget.lerpVectors(_vC, _vD, eased);

  return {
    chamberIdx: 0,
    warpIntensity: Math.sin(THREE.MathUtils.clamp((1 - t) * 0.85, 0, 1) * Math.PI) * 0.22,
    teleportFlash: skyTeleportFlash,
    teleported: false,
    coreEntered: false,
    portalFlyProgress: 0,
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

    // Deep Graphite Environment (#121417) + subtle fog preserving sharp contrast
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x121417);
    scene.fog = new THREE.FogExp2(0x121417, 0.017);

    // Studio Reflection Map for crisp metallic basalt & clear quartz bevels (dialed low to prevent white glare)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.36;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      getResponsiveFov(width / Math.max(1, height)),
      width / Math.max(1, height),
      0.1,
      180
    );
    if (isMobileRef.current) {
      camera.position.set(0.0, 2.9, 15.6);
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
      controls.target.set(0.0, 1.15, 0.0);
    } else {
      controls.target.set(...DETAILED_CHAMBERS[0].camTarget);
    }

    // Allow native vertical touch swipes to scroll the page while preserving mouse drag orbit
    renderer.domElement.style.touchAction = 'pan-y';

    controls.addEventListener('start', () => {
      userOrbitingRef.current = true;
      orbitScrollAnchorRef.current = scrollRef.current;
    });

    // Pure Cyan + Crisp White Lighting Rig (zero blue or green-teal hues, calibrated against harsh glare)
    const hemiLight = new THREE.HemisphereLight(0x00ffff, 0x121417, 0.55);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
    keyLight.position.set(10, 18, 14);
    scene.add(keyLight);

    const cyanRim = new THREE.DirectionalLight(0x00ffff, 1.35);
    cyanRim.position.set(-12, -4, -18);
    scene.add(cyanRim);

    const horizonRim = new THREE.DirectionalLight(0xd8ffff, 0.75);
    horizonRim.position.set(0, 7, -62);
    scene.add(horizonRim);

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
      (lp) => new THREE.Vector3(lp.x * 0.026, 1.55 + lp.y * 0.026, lp.z * 0.026)
    );
    const firstNeuronWorld = worldWaypoints[0];
    const lastNeuronWorld = worldWaypoints[worldWaypoints.length - 1];
    const rideCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-0.19, 1.6, 0.3),
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

    const pedestalChamber = buildPedestalChamber(-52, -12, circuitTex, glowTex);
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

    const moteCount = 620;
    const moteGeo = new THREE.BufferGeometry();
    const motePos = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      motePos[i * 3] = (rng() - 0.5) * 84; // Covers x: -42 to +42 symmetrically
      motePos[i * 3 + 1] = 36 - rng() * 120; // Covers y: 36 down to -84 (sky return through CH.04)
      motePos[i * 3 + 2] = 42 - rng() * 96; // Covers z: 42 down to -54 (full 360 deg around all chambers)
    }
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
    const moteMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.065,
      transparent: true,
      opacity: 0.42,
    });
    const motes = new THREE.Points(moteGeo, moteMat);
    scene.add(motes);

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
        0.17,
        0.22,
        0.9
      );
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());
      renderer.compile(scene, camera);
    }

    // -------------------------------------------------------------------------
    // Pointer & Resize Listeners
    // -------------------------------------------------------------------------
    const pointerTarget = new THREE.Vector2(0, 0);
    const pointerSmooth = new THREE.Vector2(0, 0);

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
    let prevTeleported = scrollRef.current >= 0.53 && scrollRef.current < 0.945;
    let prevCoreEntered = scrollRef.current >= 0.805 && scrollRef.current < 0.945;
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
      const wrappedToStart = smoothScroll > 0.88 && scrollRef.current < 0.1;
      if (wrappedToStart) {
        smoothScroll = scrollRef.current;
      } else {
        smoothScroll = THREE.MathUtils.damp(smoothScroll, scrollRef.current, 4.2, delta);
      }

      const pAlpha = 1 - Math.exp(-6.5 * delta);
      pointerSmooth.x = THREE.MathUtils.lerp(pointerSmooth.x, pointerTarget.x, pAlpha);
      pointerSmooth.y = THREE.MathUtils.lerp(pointerSmooth.y, pointerTarget.y, pAlpha);

      irisChamber.getCoreWorldPosition(_coreWorld);

      const {
        chamberIdx,
        warpIntensity,
        teleportFlash,
        teleported,
        coreEntered,
        portalFlyProgress,
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

      const crossedTeleport = teleported !== prevTeleported || coreEntered !== prevCoreEntered;
      prevTeleported = teleported;
      prevCoreEntered = coreEntered;

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
            enterNeuronProgress > 0.05 || portalFlyProgress > 0.12
              ? 0
              : Math.min(1.0, camDist * 0.09);
          _camGoalPos.x += pointerSmooth.x * 0.72 * parallaxScale;
          _camGoalPos.y += pointerSmooth.y * 0.42 * parallaxScale;

          const damp = enterNeuronProgress > 0.05 ? 5.2 : 4.2;
          camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, damp, delta);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, damp, delta);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, damp, delta);

          controls.target.x = THREE.MathUtils.damp(controls.target.x, _camGoalTarget.x, damp, delta);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, _camGoalTarget.y, damp, delta);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, _camGoalTarget.z, damp, delta);
        }
      }

      controls.update();

      // Clean visibility separation across portals (only hide terrain once inside Chosen Block interior so 360° orbiting & explosion never lose background)
      const insideChosenBlock =
        neuralRevealProgress > 0.92 && camera.position.distanceTo(_summitCenter) < 0.95;
      volcanicTerrain.root.visible = !teleported && !insideChosenBlock;
      summitChamber.root.visible = !teleported;
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
      irisChamber.root.visible = teleported && !coreEntered;
      if (irisChamber.root.visible) {
        irisChamber.update(elapsed, pointerSmooth.x, pointerSmooth.y, portalFlyProgress);
      }
      pedestalChamber.root.visible = teleported && coreEntered;
      if (pedestalChamber.root.visible) {
        pedestalChamber.update(
          elapsed,
          delta,
          pedestalModeRef.current,
          pointerSmooth.x,
          pointerSmooth.y
        );
      }

      motes.visible = !insideChosenBlock || coreEntered || smoothScroll >= 0.945;

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
      pedestalChamber.dispose();
      streakGeo.dispose();
      streakMat.dispose();
      moteGeo.dispose();
      moteMat.dispose();
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
