import * as THREE from 'three';
import { ResumeKeySkill } from '../data/resume';
import {
  createNeuralMetricSpriteTexture,
  createSkillPlanetLabelTexture,
  PBRSurfaceMaps,
} from './proceduralTextures';

export type PedestalMode = 'email' | 'phone' | 'github' | 'linkedin' | 'form';

export function createRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Shared Sculpted Mars/Volcanic Dark Mountain Landscape spanning CH.01 and CH.02
 */
export function buildVolcanicHorizonTerrain(basaltTerrainMaps?: PBRSurfaceMaps): {
  root: THREE.Group;
  dispose: () => void;
} {
  const root = new THREE.Group();
  root.position.set(0, -2.5, 0);

  const terrainGeo = new THREE.PlaneGeometry(140, 140, 112, 112);
  terrainGeo.rotateX(-Math.PI / 2);
  const pos = terrainGeo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);

    // Sculpt a 360-degree volcanic obsidian basin surrounding the CH.01 Monument cleanly from all orbit angles
    const distSummit = Math.hypot(x * 0.9, z * 0.9);
    const ringSlope = THREE.MathUtils.smoothstep(distSummit, 6.5, 22.0);
    const rimBoost = THREE.MathUtils.smoothstep(distSummit, 24.0, 56.0) * 5.8;

    const mountains =
      Math.abs(Math.sin(x * 0.16 + z * 0.09)) * 4.8 +
      Math.abs(Math.cos(x * 0.31 - z * 0.24)) * 2.2 +
      Math.sin(x * 0.72 + z * 0.61) * 0.75 +
      Math.cos(x * 1.3 - z * 1.1) * 0.28;

    pos.setY(i, (mountains + rimBoost) * ringSlope - 0.55);
  }
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0x313a45,
    map: basaltTerrainMaps?.map ?? null,
    bumpMap: basaltTerrainMaps?.bumpMap ?? null,
    bumpScale: 0.25,
    roughnessMap: basaltTerrainMaps?.roughnessMap ?? null,
    roughness: 0.8,
    metalness: 0.14,
    envMapIntensity: 0.32,
    flatShading: true,
  });
  root.add(new THREE.Mesh(terrainGeo, terrainMat));

  return {
    root,
    dispose: () => {
      terrainGeo.dispose();
      terrainMat.dispose();
    },
  };
}

export interface BinaryTexPair {
  map: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
}

/**
 * CH.01 // SUMMIT: Stepped Columnar Basalt Plinth + 28 Chained Binary (0 & 1) Blockchain Blocks.
 * Inside center ALSO contains a binary blockchain block (zero tendrils/strings!).
 * On scroll, the blocks slowly explode outward, randomly selecting one Chosen Block that locks center
 * and expands so the camera flies straight INSIDE it into CH.02!
 */
export function buildSummitChamber(
  basaltMaps: PBRSurfaceMaps,
  _glowTex: THREE.CanvasTexture,
  binaryTexA: BinaryTexPair,
  binaryTexB: BinaryTexPair
) {
  const root = new THREE.Group();
  root.position.set(0, 0, 0);

  const disposables: { dispose: () => void }[] = [];
  const rng = createRng(1001);

  // 1. Stepped Columnar Hexagonal Basalt Plinth with Volcanic Rock PBR Relief & Chamfered Caps
  const basaltCount = 46;
  const hexGeo = new THREE.CylinderGeometry(0.45, 0.49, 3.6, 6, 4);
  const capGeo = new THREE.CylinderGeometry(0.39, 0.452, 0.12, 6, 1);
  const hexMat = new THREE.MeshStandardMaterial({
    color: 0xa2b0bd,
    map: basaltMaps.map,
    bumpMap: basaltMaps.bumpMap,
    bumpScale: 0.115,
    roughnessMap: basaltMaps.roughnessMap,
    roughness: 0.74,
    metalness: 0.24,
    envMapIntensity: 0.34,
    flatShading: true,
  });
  const basaltCols = new THREE.InstancedMesh(hexGeo, hexMat, basaltCount);
  const basaltCaps = new THREE.InstancedMesh(capGeo, hexMat, basaltCount);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < basaltCount; i++) {
    const ring = i < 14 ? 0 : i < 30 ? 1 : 2;
    const segCount = ring === 0 ? 14 : 16;
    const angle = (i / segCount) * Math.PI * 2 + ring * 0.25;
    const rad =
      ring === 0 ? 0.95 + rng() * 0.65 : ring === 1 ? 1.85 + rng() * 0.7 : 2.85 + rng() * 0.85;
    const hScale = ring === 0 ? 0.8 : ring === 1 ? 0.62 + rng() * 0.18 : 0.44 + rng() * 0.22;
    const px = Math.cos(angle) * rad;
    const py = -2.5 + hScale * 1.1;
    const pz = Math.sin(angle) * rad;
    const rotY = rng() * Math.PI;
    const sxz = 0.88 + rng() * 0.35;

    dummy.position.set(px, py, pz);
    dummy.rotation.set(0, rotY, 0);
    dummy.scale.set(sxz, hScale, sxz);
    dummy.updateMatrix();
    basaltCols.setMatrixAt(i, dummy.matrix);

    // Chamfered stone crown resting flush atop each hexagonal pillar
    dummy.position.set(px, py + 1.8 * hScale + 0.055, pz);
    dummy.scale.set(sxz, 1.0, sxz);
    dummy.updateMatrix();
    basaltCaps.setMatrixAt(i, dummy.matrix);
  }
  basaltCols.instanceMatrix.needsUpdate = true;
  basaltCaps.instanceMatrix.needsUpdate = true;
  root.add(basaltCols, basaltCaps);
  disposables.push(hexGeo, capGeo, hexMat);

  // 2. Full 3x3x3 + Capstone Chained Binary Blockchain Cluster (NO strings/tendrils — inside is a block too!)
  const monumentGroup = new THREE.Group();
  monumentGroup.position.set(0, 1.75, 0);
  root.add(monumentGroup);

  const wireBoxGeo = new THREE.BoxGeometry(0.94, 0.94, 0.94);
  const wireEdgeGeo = new THREE.EdgesGeometry(wireBoxGeo);
  const wireEdgeMat = new THREE.LineBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.36,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const blockGeo = new THREE.BoxGeometry(0.76, 0.76, 0.76);
  const blockMatA = new THREE.MeshStandardMaterial({
    map: binaryTexA.map,
    emissive: new THREE.Color(0x00ffff),
    emissiveMap: binaryTexA.emissiveMap,
    emissiveIntensity: 0.29,
    roughness: 0.66,
    metalness: 0.16,
    envMapIntensity: 0.2,
  });
  const blockMatB = new THREE.MeshStandardMaterial({
    map: binaryTexB.map,
    emissive: new THREE.Color(0x00ffff),
    emissiveMap: binaryTexB.emissiveMap,
    emissiveIntensity: 0.29,
    roughness: 0.66,
    metalness: 0.16,
    envMapIntensity: 0.2,
  });

  // Dedicated interior/exterior materials for the randomly Chosen Target Block (NEVER scales huge!)
  const chosenOuterMat = new THREE.MeshStandardMaterial({
    map: binaryTexA.map,
    emissive: new THREE.Color(0x00ffff),
    emissiveMap: binaryTexA.emissiveMap,
    emissiveIntensity: 0.27,
    roughness: 0.66,
    metalness: 0.16,
    envMapIntensity: 0.2,
    side: THREE.FrontSide,
  });

  // Interior walls inside the Chosen Block: sleek DARK obsidian with subtle dim 0/1 grid (zero white glare!)
  const chosenInnerMat = new THREE.MeshStandardMaterial({
    color: 0x161f26,
    map: binaryTexA.map,
    emissive: new THREE.Color(0x00ffff),
    emissiveMap: binaryTexA.emissiveMap,
    emissiveIntensity: 0.065,
    roughness: 0.9,
    metalness: 0.05,
    envMapIntensity: 0.06,
    side: THREE.FrontSide,
  });

  // Dedicated front (+Z) 0/1 wall that gradually lowers opacity during scroll instead of snapping away
  const frontDoorMat = new THREE.MeshStandardMaterial({
    map: binaryTexA.map,
    emissive: new THREE.Color(0x00ffff),
    emissiveMap: binaryTexA.emissiveMap,
    emissiveIntensity: 0.27,
    roughness: 0.66,
    metalness: 0.16,
    envMapIntensity: 0.2,
    side: THREE.FrontSide,
    transparent: true,
    opacity: 1.0,
    depthWrite: true,
  });

  const outerFaceGeo = new THREE.PlaneGeometry(0.82, 0.82);
  const innerFaceGeo = new THREE.PlaneGeometry(0.812, 0.812);

  const chosenAnchor = new THREE.Group();
  chosenAnchor.scale.setScalar(0.026);
  let frontDoorMesh: THREE.Mesh | null = null;

  const chosenWireMat = new THREE.LineBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const heroFrameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.06, 1.06, 1.06));
  const heroFrameMat = new THREE.LineBasicMaterial({
    color: 0x9ef8ff,
    transparent: true,
    opacity: 0.62,
    blending: THREE.AdditiveBlending,
  });

  disposables.push(
    wireBoxGeo,
    wireEdgeGeo,
    wireEdgeMat,
    chosenWireMat,
    blockGeo,
    blockMatA,
    blockMatB,
    chosenOuterMat,
    chosenInnerMat,
    frontDoorMat,
    outerFaceGeo,
    innerFaceGeo,
    heroFrameGeo,
    heroFrameMat
  );

  interface BlockchainCell {
    group: THREE.Group;
    basePos: THREE.Vector3;
    livePos: THREE.Vector3;
    explodeDir: THREE.Vector3;
    rotSeed: THREE.Vector3;
    isChosen: boolean;
  }

  const cells: BlockchainCell[] = [];
  const slots: [number, number, number][] = [];

  for (let ix = -1; ix <= 1; ix++) {
    for (let iy = -1; iy <= 1; iy++) {
      for (let iz = -1; iz <= 1; iz++) {
        // Every slot including center (0,0,0) holds a genuine binary blockchain block!
        slots.push([ix, iy, iz]);
      }
    }
  }
  slots.push([0, 2, 0]); // Crown Capstone Block

  // Randomly select one front/center candidate block to lock onto and enter inside
  const frontCandidates: number[] = [];
  slots.forEach(([ix, iy, iz], idx) => {
    if (iz >= 0 && Math.abs(ix) <= 1 && iy >= 0 && iy <= 1) {
      frontCandidates.push(idx);
    }
  });
  const chosenSlotIdx =
    frontCandidates[Math.floor(Math.random() * frontCandidates.length)] ?? 13;

  slots.forEach(([ix, iy, iz], idx) => {
    const isChosen = idx === chosenSlotIdx;
    const cellGroup = new THREE.Group();
    const basePos = new THREE.Vector3(ix * 1.08, iy * 1.08, iz * 1.08);
    cellGroup.position.copy(basePos);

    if (isChosen) {
      cellGroup.add(new THREE.LineSegments(wireEdgeGeo, chosenWireMat));
      cellGroup.add(new THREE.LineSegments(heroFrameGeo, heroFrameMat));

      const half = 0.41;
      const inHalf = 0.406;
      // 5 Outer + 5 Inward-facing 0/1 walls (Back, Left, Right, Top, Bottom)
      const faceTransforms: [number, number, number, number, number, number][] = [
        [0, 0, -half, 0, Math.PI, 0], // Back outer
        [-half, 0, 0, 0, -Math.PI / 2, 0], // Left outer
        [half, 0, 0, 0, Math.PI / 2, 0], // Right outer
        [0, half, 0, -Math.PI / 2, 0, 0], // Top outer
        [0, -half, 0, Math.PI / 2, 0, 0], // Bottom outer
      ];
      faceTransforms.forEach(([px, py, pz, rx, ry, rz]) => {
        const outWall = new THREE.Mesh(outerFaceGeo, chosenOuterMat);
        outWall.position.set(px, py, pz);
        outWall.rotation.set(rx, ry, rz);
        cellGroup.add(outWall);
      });

      const innerTransforms: [number, number, number, number, number, number][] = [
        [0, 0, -inHalf, 0, 0, 0], // Back inner faces +Z toward camera
        [-inHalf, 0, 0, 0, Math.PI / 2, 0], // Left inner faces +X
        [inHalf, 0, 0, 0, -Math.PI / 2, 0], // Right inner faces -X
        [0, inHalf, 0, Math.PI / 2, 0, 0], // Top inner faces -Y
        [0, -inHalf, 0, -Math.PI / 2, 0, 0], // Bottom inner faces +Y
      ];
      innerTransforms.forEach(([px, py, pz, rx, ry, rz]) => {
        const inWall = new THREE.Mesh(innerFaceGeo, chosenInnerMat);
        inWall.position.set(px, py, pz);
        inWall.rotation.set(rx, ry, rz);
        cellGroup.add(inWall);
      });

      // Front (+Z) 0/1 opening wall that gradually fades opacity as camera shrinks inside
      frontDoorMesh = new THREE.Mesh(outerFaceGeo, frontDoorMat);
      frontDoorMesh.position.set(0, 0, half);
      frontDoorMesh.renderOrder = 10;
      cellGroup.add(frontDoorMesh);

      // Mount anchor inside the Chosen Block where the Neural Network physically lives!
      cellGroup.add(chosenAnchor);
    } else {
      cellGroup.add(new THREE.LineSegments(wireEdgeGeo, wireEdgeMat));
      const meshMat = idx % 2 === 0 ? blockMatA : blockMatB;
      const blockMesh = new THREE.Mesh(blockGeo, meshMat);
      cellGroup.add(blockMesh);
    }

    // Outward 3D radial direction for slow explosion
    const dir = new THREE.Vector3(
      ix === 0 ? (rng() - 0.5) * 1.4 : ix,
      iy === 0 ? (rng() - 0.5) * 1.2 : iy,
      iz === 0 ? (rng() - 0.5) * 1.2 : iz
    );
    if (dir.lengthSq() < 0.05) dir.set(0.6, 0.8, -0.4);
    dir.normalize();

    monumentGroup.add(cellGroup);
    cells.push({
      group: cellGroup,
      basePos,
      livePos: basePos.clone(),
      explodeDir: dir,
      rotSeed: new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5),
      isChosen,
    });
  });

  // 3D Interlocking Wireframe Cyan Chain Links (zero thin strings!) connecting adjacent blocks
  const chainPairs: [number, number][] = [];
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const d = cells[i].basePos.distanceTo(cells[j].basePos);
      if (d > 0.5 && d < 1.25) {
        chainPairs.push([i, j]);
      }
    }
  }

  // Build stadium/oval link curve along X axis (matching reference wireframe chain)
  const linkPts: THREE.Vector3[] = [];
  const halfStraight = 0.075;
  const arcRadius = 0.052;
  const arcSegs = 8;
  for (let s = 0; s <= arcSegs; s++) {
    const a = Math.PI / 2 - (s / arcSegs) * Math.PI;
    linkPts.push(new THREE.Vector3(halfStraight + Math.cos(a) * arcRadius, Math.sin(a) * arcRadius, 0));
  }
  for (let s = 0; s <= arcSegs; s++) {
    const a = -Math.PI / 2 - (s / arcSegs) * Math.PI;
    linkPts.push(new THREE.Vector3(-halfStraight + Math.cos(a) * arcRadius, Math.sin(a) * arcRadius, 0));
  }
  const linkCurve = new THREE.CatmullRomCurve3(linkPts, true, 'centripetal', 0.2);
  const chainLinkGeo = new THREE.TubeGeometry(linkCurve, 28, 0.02, 8, true);

  const chainCoreMat = new THREE.MeshStandardMaterial({
    color: 0x7c98a8,
    roughness: 0.78,
    metalness: 0.16,
    envMapIntensity: 0.2,
    transparent: true,
    opacity: 0.96,
  });
  const chainWireMat = new THREE.MeshBasicMaterial({
    color: 0x9cecf4,
    wireframe: true,
    transparent: true,
    opacity: 0.22,
    blending: THREE.NormalBlending,
    depthWrite: false,
  });

  const linksPerBond = 3; // Alternating 0° / 90° interlocking links per pair
  const totalChainLinks = chainPairs.length * linksPerBond;
  const chainCoreInstanced = new THREE.InstancedMesh(chainLinkGeo, chainCoreMat, totalChainLinks);
  const chainWireInstanced = new THREE.InstancedMesh(chainLinkGeo, chainWireMat, totalChainLinks);
  chainCoreInstanced.frustumCulled = false;
  chainWireInstanced.frustumCulled = false;
  monumentGroup.add(chainCoreInstanced, chainWireInstanced);
  disposables.push(chainLinkGeo, chainCoreMat, chainWireMat);

  // Orbiting satellite binary block on upper-left (gentle slow rotation)
  const satBlockGroup = new THREE.Group();
  const satMesh = new THREE.Mesh(blockGeo, blockMatA);
  satMesh.scale.setScalar(0.54);
  const satWire = new THREE.LineSegments(wireEdgeGeo, wireEdgeMat);
  satWire.scale.setScalar(0.54);
  satBlockGroup.add(satMesh, satWire);
  monumentGroup.add(satBlockGroup);

  const _vTarget = new THREE.Vector3();
  const _bondDir = new THREE.Vector3();
  const _bondMid = new THREE.Vector3();
  const _axisX = new THREE.Vector3(1, 0, 0);
  const _quatAlign = new THREE.Quaternion();
  const _quatTwist = new THREE.Quaternion();
  // Chosen Block glides gently to monument center (0, 0, 0) local = (0, 1.55, 0) world, KEEPING real 1.0x size!
  const _chosenCenter = new THREE.Vector3(0, 0, 0);

  return {
    root,
    chosenAnchor,
    update: (
      elapsed: number,
      pointerX: number,
      pointerY: number,
      explodeProgress: number,
      frontWallFade = 0
    ) => {
      const exp = THREE.MathUtils.clamp(explodeProgress, 0, 1);
      const doorFade = THREE.MathUtils.clamp(frontWallFade, 0, 1);
      const cursorBoost = Math.min(0.24, Math.hypot(pointerX, pointerY) * 0.18);
      const slowExplode = Math.pow(exp, 0.85) * 7.2 + cursorBoost;

      // Calm, slow architectural drift instead of fast spinning
      const rotScale = Math.max(0, 1 - exp * 1.65);
      monumentGroup.rotation.y = (elapsed * 0.022 + pointerX * 0.18) * rotScale;
      monumentGroup.rotation.x = pointerY * 0.08 * rotScale;

      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        if (c.isChosen) {
          c.livePos.lerpVectors(c.basePos, _chosenCenter, THREE.MathUtils.smoothstep(exp, 0.04, 0.45));
          c.group.position.copy(c.livePos);
          c.group.scale.setScalar(1.0);
          c.group.rotation.set(
            (1 - exp) * Math.sin(elapsed * 0.35) * 0.03,
            (1 - exp) * Math.cos(elapsed * 0.3) * 0.035,
            0
          );
        } else {
          _vTarget.copy(c.basePos).addScaledVector(c.explodeDir, slowExplode);
          _vTarget.y += Math.sin(elapsed * 0.7 + i * 0.35) * 0.025;
          c.livePos.copy(_vTarget);
          c.group.position.copy(_vTarget);
          c.group.scale.setScalar(1.0);
          c.group.rotation.set(
            c.rotSeed.x * slowExplode * 0.14,
            c.rotSeed.y * slowExplode * 0.14,
            c.rotSeed.z * slowExplode * 0.12
          );
        }
      }

      // Gradually lower front 0/1 wall opacity as user scrolls so neural net emerges cleanly between 0 & 1
      if (frontDoorMesh) {
        const op = Math.max(0, 1 - doorFade);
        frontDoorMat.opacity = op;
        frontDoorMat.depthWrite = doorFade < 0.02;
        frontDoorMat.emissiveIntensity = 0.27 * (1 - doorFade * 0.65);
        frontDoorMesh.visible = op > 0.01;
      }
      chosenWireMat.opacity = 0.36 * (1 - doorFade * 0.75);
      heroFrameMat.opacity = 0.55 * (1 - doorFade * 0.78);

      // Update interlocking 3D chains between adjacent blocks, fading gracefully during block explosion
      const chainFade = Math.max(0, 1 - exp * 1.45);
      chainWireMat.opacity = 0.22 * chainFade;
      chainCoreMat.opacity = 0.96 * chainFade;
      chainCoreInstanced.visible = chainFade > 0.02;
      chainWireInstanced.visible = chainFade > 0.02;

      if (chainFade > 0.02) {
        let linkIdx = 0;
        for (let p = 0; p < chainPairs.length; p++) {
          const [aIdx, bIdx] = chainPairs[p];
          const a = cells[aIdx].livePos;
          const b = cells[bIdx].livePos;
          _bondDir.subVectors(b, a);
          const dist = Math.max(0.001, _bondDir.length());
          _bondDir.divideScalar(dist);
          _bondMid.addVectors(a, b).multiplyScalar(0.5);
          _quatAlign.setFromUnitVectors(_axisX, _bondDir);

          const spacing = 0.155 + exp * 0.12;
          for (let k = 0; k < linksPerBond; k++) {
            const offset = (k - 1) * spacing;
            dummy.position.copy(_bondMid).addScaledVector(_bondDir, offset);
            _quatTwist.setFromAxisAngle(_axisX, (k % 2) * (Math.PI / 2));
            dummy.quaternion.copy(_quatAlign).multiply(_quatTwist);
            dummy.scale.set(1.0, 1.0, 1.0);
            dummy.updateMatrix();
            chainCoreInstanced.setMatrixAt(linkIdx, dummy.matrix);
            chainWireInstanced.setMatrixAt(linkIdx, dummy.matrix);
            linkIdx++;
          }
        }
        chainCoreInstanced.instanceMatrix.needsUpdate = true;
        chainWireInstanced.instanceMatrix.needsUpdate = true;
      }

      satBlockGroup.position.set(
        -3.25 + Math.cos(elapsed * 0.35) * 0.22 - exp * 3.0,
        1.48 + Math.sin(elapsed * 0.5) * 0.14 + exp * 1.4,
        0.55
      );
      satBlockGroup.rotation.y = elapsed * 0.14;
      satBlockGroup.rotation.x = Math.sin(elapsed * 0.25) * 0.15;
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

/**
 * CH.02 // NEURAL CORE (NESTED PHYSICALLY INSIDE THE CHOSEN 0/1 BLOCK!):
 * Mounted inside summitChamber.chosenAnchor at micro-scale 0.036 so the camera literally
 * shrinks INSIDE the real 0.82-unit Chosen Block to view the Round-Neuron Network inside it!
 */
export function buildDriftChamber(glowTex: THREE.CanvasTexture) {
  const root = new THREE.Group();
  root.position.set(0, 0, 0);

  const disposables: { dispose: () => void }[] = [];
  const rng = createRng(2026);

  interface RoundNeuron {
    orderedPos: THREE.Vector3;
    mixedPos: THREE.Vector3;
    livePos: THREE.Vector3;
    layer: number;
    activation: number;
    bias: number;
    isHero: boolean;
    phase: number;
  }

  const neurons: RoundNeuron[] = [];
  // 5-Layer Deep Neural Funnel: Input (8) -> Hidden 1 (6) -> Bottleneck Core (3) -> Hidden 2 (6) -> Output (8)
  const layerConfigs = [
    { x: -8.2, rows: 4, cols: 2, sz: 2.3, sy: 1.85 },
    { x: -4.1, rows: 3, cols: 2, sz: 1.9, sy: 1.75 },
    { x: 0.0, rows: 3, cols: 1, sz: 1.0, sy: 1.9 },
    { x: 4.1, rows: 3, cols: 2, sz: 1.9, sy: 1.75 },
    { x: 8.2, rows: 4, cols: 2, sz: 2.3, sy: 1.85 },
  ];

  let heroIdx = -1;
  const layerIndices: number[][] = [];

  layerConfigs.forEach((cfg, layerIdx) => {
    const indices: number[] = [];
    for (let r = 0; r < cfg.rows; r++) {
      for (let c = 0; c < cfg.cols; c++) {
        const y = (r - (cfg.rows - 1) / 2) * cfg.sy;
        const z = (c - (cfg.cols - 1) / 2) * cfg.sz;
        const orderedPos = new THREE.Vector3(cfg.x, y, z);

        const isHero = layerIdx === 2 && r === 1 && c === 0;
        if (isHero) heroIdx = neurons.length;

        const mixAngle = rng() * Math.PI * 2;
        const mixRad = isHero ? 0 : 2.2 + rng() * 4.8;
        const mixedPos = isHero
          ? new THREE.Vector3(0, 0, -1.2)
          : new THREE.Vector3(
              Math.cos(mixAngle) * mixRad + (rng() - 0.5) * 1.6,
              (rng() - 0.5) * 4.8,
              Math.sin(mixAngle) * mixRad * 0.65 - 1.0
            );

        indices.push(neurons.length);
        neurons.push({
          orderedPos,
          mixedPos,
          livePos: orderedPos.clone(),
          layer: layerIdx,
          activation: Number((0.62 + rng() * 0.36).toFixed(2)),
          bias: Number(((rng() - 0.45) * 0.35).toFixed(2)),
          isHero,
          phase: rng() * Math.PI * 2,
        });
      }
    }
    layerIndices.push(indices);
  });

  // 1. High-Res Translucent Obsidian-Glass Spherical Neuron Somas + Inner Nucleus + Smooth Halo Rings
  const somaGeo = new THREE.SphereGeometry(0.35, 36, 28);
  const somaMat = new THREE.MeshPhysicalMaterial({
    color: 0x051118,
    emissive: new THREE.Color(0x00ffff),
    emissiveIntensity: 0.12,
    roughness: 0.08,
    metalness: 0.18,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.15,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  });
  const somaInstanced = new THREE.InstancedMesh(somaGeo, somaMat, neurons.length);
  somaInstanced.frustumCulled = false;
  root.add(somaInstanced);

  const nucleusGeo = new THREE.SphereGeometry(0.11, 20, 16);
  const nucleusMat = new THREE.MeshBasicMaterial({
    color: 0xb8ffff,
    transparent: true,
    opacity: 0.94,
  });
  const nucleusInstanced = new THREE.InstancedMesh(nucleusGeo, nucleusMat, neurons.length);
  nucleusInstanced.frustumCulled = false;
  root.add(nucleusInstanced);

  const ringGeo = new THREE.TorusGeometry(0.43, 0.015, 14, 56);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.56,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const ringInstanced = new THREE.InstancedMesh(ringGeo, ringMat, neurons.length);
  ringInstanced.frustumCulled = false;
  root.add(ringInstanced);

  // Subtle Soft Pure Cyan aura behind every Round Neuron (kept low so neurons stay sharp)
  const auraPlaneGeo = new THREE.PlaneGeometry(1.12, 1.12);
  const auraPlaneMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    color: 0x00ffff,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const auraInstanced = new THREE.InstancedMesh(auraPlaneGeo, auraPlaneMat, neurons.length);
  auraInstanced.frustumCulled = false;
  root.add(auraInstanced);

  disposables.push(somaGeo, somaMat, nucleusGeo, nucleusMat, ringGeo, ringMat, auraPlaneGeo, auraPlaneMat);

  // 2. Hero Round Target Neuron Assembly (camera flies STRAIGHT INSIDE this round neuron!)
  const heroGroup = new THREE.Group();
  root.add(heroGroup);

  const heroOuterGeo = new THREE.SphereGeometry(0.68, 40, 32);
  const heroOuterMat = new THREE.MeshPhysicalMaterial({
    color: 0x06161e,
    emissive: new THREE.Color(0x00ffff),
    emissiveIntensity: 0.14,
    roughness: 0.1,
    metalness: 0.22,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.1,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const heroOuterSphere = new THREE.Mesh(heroOuterGeo, heroOuterMat);
  heroOuterSphere.renderOrder = 6;
  heroGroup.add(heroOuterSphere);

  const heroRingAGeo = new THREE.TorusGeometry(0.76, 0.013, 14, 64);
  const heroRingAMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
  });
  const heroRingA = new THREE.Mesh(heroRingAGeo, heroRingAMat);
  const heroRingB = new THREE.Mesh(heroRingAGeo, heroRingAMat);
  heroRingB.rotation.x = Math.PI / 2;
  const heroRingC = new THREE.Mesh(heroRingAGeo, heroRingAMat);
  heroRingC.rotation.y = Math.PI / 2;
  heroGroup.add(heroRingA, heroRingB, heroRingC);

  const heroCoreGeo = new THREE.SphereGeometry(0.15, 24, 18);
  const heroCoreMat = new THREE.MeshBasicMaterial({
    color: 0xb8ffff,
    transparent: true,
    opacity: 0.88,
  });
  heroGroup.add(new THREE.Mesh(heroCoreGeo, heroCoreMat));

  const heroGlowMat = new THREE.SpriteMaterial({
    map: glowTex,
    color: 0x00ffff,
    transparent: true,
    opacity: 0.34,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const heroGlow = new THREE.Sprite(heroGlowMat);
  heroGlow.scale.set(1.3, 1.3, 1);
  heroGroup.add(heroGlow);

  disposables.push(heroOuterGeo, heroOuterMat, heroRingAGeo, heroRingAMat, heroCoreGeo, heroCoreMat, heroGlowMat);

  // 3. Weighted Synaptic Paths (smooth 3D volumetric cylinders instead of aliased 1px WebGL lines!)
  interface Synapse {
    a: number;
    b: number;
    weight: number;
  }
  const synapses: Synapse[] = [];
  const adjNext: number[][] = Array.from({ length: neurons.length }, () => []);

  for (let l = 0; l < layerIndices.length - 1; l++) {
    const src = layerIndices[l];
    const dst = layerIndices[l + 1];
    src.forEach((a) => {
      dst.forEach((b) => {
        if (src.length <= 3 || dst.length <= 3 || rng() > 0.25) {
          const w = Number(((rng() > 0.22 ? 1 : -1) * (0.35 + rng() * 0.62)).toFixed(2));
          synapses.push({ a, b, weight: w });
          adjNext[a].push(b);
        }
      });
    });
  }

  const synGeo = new THREE.CylinderGeometry(0.015, 0.015, 1, 8, 1, true);
  const synMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.36,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const synInstanced = new THREE.InstancedMesh(synGeo, synMat, synapses.length);
  synInstanced.frustumCulled = false;
  root.add(synInstanced);
  disposables.push(synGeo, synMat);
  const _synDir = new THREE.Vector3();
  const _synMid = new THREE.Vector3();
  const _synUp = new THREE.Vector3(0, 1, 0);
  const _synQuat = new THREE.Quaternion();

  // 4. Visible Neural Weights, Biases, & Activation Number Sprites
  interface MetricSpriteLink {
    sprite: THREE.Sprite;
    a: number;
    b: number; // if b < 0, tracks neuron `a` offset above; otherwise midpoint between neuron a & b
    offsetY: number;
  }
  const metricSprites: MetricSpriteLink[] = [];

  const addSpriteLabel = (
    text: string,
    a: number,
    b: number,
    offsetY: number,
    heightScale: number,
    highlight = false
  ) => {
    const { tex, aspect } = createNeuralMetricSpriteTexture(text, highlight);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(heightScale * aspect, heightScale, 1);
    root.add(sprite);
    disposables.push(tex, mat);
    metricSprites.push({ sprite, a, b, offsetY });
  };

  // Layer headers & Neuron activation/bias readouts (never truncated, sleek micro size)
  addSpriteLabel('INPUT // x[0..7]', layerIndices[0][layerIndices[0].length - 1], -1, 1.05, 0.42, true);
  addSpriteLabel('HIDDEN L1 // ReLU', layerIndices[1][layerIndices[1].length - 1], -1, 1.0, 0.4);
  addSpriteLabel('NEURON_0x0A  a=0.96', heroIdx, -1, 1.05, 0.45, true);
  addSpriteLabel('b = +0.14 | σ(Σw·x)', heroIdx, -1, -1.0, 0.4);
  addSpriteLabel('HIDDEN L3 // ATTN', layerIndices[3][layerIndices[3].length - 1], -1, 1.0, 0.4);
  addSpriteLabel('OUTPUT // ŷ = 0.98', layerIndices[4][layerIndices[4].length - 1], -1, 1.05, 0.42, true);

  // Key synaptic weight numbers directly along highlighted filaments
  const sampleSynIndices = [
    2,
    Math.floor(synapses.length * 0.18),
    Math.floor(synapses.length * 0.34),
    Math.floor(synapses.length * 0.5),
    Math.floor(synapses.length * 0.68),
    Math.floor(synapses.length * 0.84),
  ];
  sampleSynIndices.forEach((sIdx, k) => {
    const syn = synapses[sIdx];
    if (!syn) return;
    const sign = syn.weight >= 0 ? '+' : '';
    addSpriteLabel(
      `w = ${sign}${syn.weight.toFixed(2)}`,
      syn.a,
      syn.b,
      k % 2 === 0 ? 0.18 : -0.18,
      0.34,
      syn.weight > 0.75
    );
  });

  // 5. Sparse Random End-to-End Neural Data Pulses (only 3 active at once, picking random routes all the way out!)
  const pickRandomRoute = (): number[] => {
    const inputs = layerIndices[0];
    let curr = inputs[Math.floor(Math.random() * inputs.length)];
    const route = [curr];
    for (let step = 0; step < 4; step++) {
      const nexts = adjNext[curr];
      if (!nexts || nexts.length === 0) break;
      curr = nexts[Math.floor(Math.random() * nexts.length)];
      route.push(curr);
    }
    return route.length === 5
      ? route
      : [
          inputs[0],
          layerIndices[1][0],
          layerIndices[2][0],
          layerIndices[3][0],
          layerIndices[4][0],
        ];
  };

  const energyCount = 3;
  const energyHeadGeo = new THREE.SphereGeometry(0.095, 10, 10);
  const energyHeadMat = new THREE.MeshBasicMaterial({
    color: 0xd8ffff,
    transparent: true,
    opacity: 0.92,
  });
  const energyHeads = new THREE.InstancedMesh(energyHeadGeo, energyHeadMat, energyCount);
  energyHeads.frustumCulled = false;
  root.add(energyHeads);

  const energyAuraGeo = new THREE.PlaneGeometry(0.48, 0.48);
  const energyAuraMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    color: 0x00ffff,
    transparent: true,
    opacity: 0.58,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const energyAuras = new THREE.InstancedMesh(energyAuraGeo, energyAuraMat, energyCount);
  energyAuras.frustumCulled = false;
  root.add(energyAuras);

  // Pick a clean, connected 4-neuron path from Layer 0 -> Layer 1 -> Layer 2 -> Layer 3/4 for the camera data-ride!
  const startNeuron = layerIndices[0][2] ?? layerIndices[0][0];
  const findConnectedNext = (curr: number, preferredLayerIdx: number): number => {
    const candidates = adjNext[curr];
    if (candidates && candidates.length > 0) {
      // Prefer a visually centered neuron so the ride stays smoothly inside the block volume
      let best = candidates[0];
      let bestDist = Infinity;
      for (const cIdx of candidates) {
        const d = Math.abs(neurons[cIdx].orderedPos.y) + Math.abs(neurons[cIdx].orderedPos.z) * 0.4;
        if (d < bestDist) {
          bestDist = d;
          best = cIdx;
        }
      }
      return best;
    }
    return layerIndices[preferredLayerIdx][0];
  };
  const hop1Neuron = findConnectedNext(startNeuron, 1);
  const hop2Neuron = heroIdx >= 0 && adjNext[hop1Neuron]?.includes(heroIdx) ? heroIdx : findConnectedNext(hop1Neuron, 2);
  const hop3Neuron = findConnectedNext(hop2Neuron, 3);
  const hop4Neuron = findConnectedNext(hop3Neuron, 4);
  const rideIndices = [startNeuron, hop1Neuron, hop2Neuron, hop3Neuron, hop4Neuron];
  const rideWaypoints = rideIndices.map((idx) => neurons[idx].orderedPos.clone());

  // Highlighted glowing data-ride trail line connecting the 4/5 ride neurons when camera becomes data
  const rideLineGeo = new THREE.BufferGeometry().setFromPoints(rideWaypoints);
  const rideLineMat = new THREE.LineBasicMaterial({
    color: 0xd8ffff,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const rideLine = new THREE.Line(rideLineGeo, rideLineMat);
  root.add(rideLine);
  disposables.push(rideLineGeo, rideLineMat);

  const energyMeta = [
    { route: pickRandomRoute(), speed: 0.085, offset: 0.05, prevCycle: 0 },
    { route: pickRandomRoute(), speed: 0.105, offset: 0.39, prevCycle: 0 },
    { route: pickRandomRoute(), speed: 0.075, offset: 0.72, prevCycle: 0 },
  ];

  disposables.push(energyHeadGeo, energyHeadMat, energyAuraGeo, energyAuraMat);

  const dummy = new THREE.Object3D();
  const _ePos = new THREE.Vector3();
  let neuralSimTime = 0;

  return {
    root,
    rideWaypoints,
    update: (
      delta: number,
      pointerX: number,
      pointerY: number,
      revealFactor: number,
      pauseFactor: number,
      enterNeuronFactor: number
    ) => {
      const reveal = THREE.MathUtils.clamp(revealFactor, 0, 1);
      root.visible = reveal > 0.01;
      if (!root.visible) return;

      const pause = THREE.MathUtils.clamp(pauseFactor, 0, 1);
      const enter = THREE.MathUtils.clamp(enterNeuronFactor, 0, 1);
      // Smoothly pause neural pulse & ring drift when the blurred About Me card is open
      neuralSimTime += delta * (1 - pause * 0.94);

      const tiltScale = (1 - enter * 0.92) * (1 - pause * 0.65);
      const sideScale = 1 - pause * 0.04;
      root.scale.setScalar((0.84 + reveal * 0.16) * sideScale);
      root.rotation.y = pointerX * 0.14 * tiltScale;
      root.rotation.x = pointerY * 0.08 * tiltScale;

      // Smooth fade-in across all neural parts (stays crisp beside the About Me card)
      const activeDim = 1 - pause * 0.08;
      somaMat.opacity = 0.62 * reveal * activeDim;
      nucleusMat.opacity = 0.94 * reveal * activeDim;
      ringMat.opacity = 0.56 * reveal * activeDim;
      auraPlaneMat.opacity = 0.2 * reveal * activeDim;
      energyHeadMat.opacity = 0.92 * reveal * (1 - pause * 0.25);
      energyAuraMat.opacity = 0.58 * reveal * (1 - pause * 0.25);
      rideLineMat.opacity = THREE.MathUtils.smoothstep(enter, 0.02, 0.22) * 0.72 * reveal;

      for (let i = 0; i < neurons.length; i++) {
        const n = neurons[i];
        // NEVER mix up neuron order — keep crisp 5-layer neural topology intact!
        n.livePos.copy(n.orderedPos);

        if (!n.isHero) {
          const swirlAmp = 0.032 * (1 - enter * 0.85);
          n.livePos.y += Math.sin(neuralSimTime * 0.65 + n.phase) * swirlAmp;
          n.livePos.z += Math.cos(neuralSimTime * 0.55 + n.phase) * swirlAmp * 0.65;

          const pulse = 1.0 + Math.sin(neuralSimTime * 1.4 + n.phase) * 0.08;
          dummy.position.copy(n.livePos);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.setScalar(1.0);
          dummy.updateMatrix();
          somaInstanced.setMatrixAt(i, dummy.matrix);

          dummy.scale.setScalar(pulse);
          dummy.updateMatrix();
          nucleusInstanced.setMatrixAt(i, dummy.matrix);

          dummy.rotation.set(neuralSimTime * 0.25 + n.phase, neuralSimTime * 0.2, n.phase);
          dummy.scale.setScalar(1.0);
          dummy.updateMatrix();
          ringInstanced.setMatrixAt(i, dummy.matrix);

          dummy.rotation.set(0, 0, 0);
          dummy.scale.setScalar(pulse);
          dummy.updateMatrix();
          auraInstanced.setMatrixAt(i, dummy.matrix);
        } else {
          dummy.position.copy(n.livePos);
          dummy.scale.setScalar(0.0001);
          dummy.updateMatrix();
          somaInstanced.setMatrixAt(i, dummy.matrix);
          nucleusInstanced.setMatrixAt(i, dummy.matrix);
          ringInstanced.setMatrixAt(i, dummy.matrix);
          auraInstanced.setMatrixAt(i, dummy.matrix);
        }
      }
      somaInstanced.instanceMatrix.needsUpdate = true;
      nucleusInstanced.instanceMatrix.needsUpdate = true;
      ringInstanced.instanceMatrix.needsUpdate = true;
      auraInstanced.instanceMatrix.needsUpdate = true;

      // Update Center Hero Round Neuron Assembly (stays aligned cleanly in its middle bottleneck slot)
      if (heroIdx >= 0) {
        heroGroup.position.copy(neurons[heroIdx].livePos);
        heroGroup.scale.setScalar(1.0);
        heroGroup.rotation.y = neuralSimTime * 0.2 + pointerX * 0.15 * tiltScale;

        heroRingA.rotation.z = neuralSimTime * 0.5;
        heroRingB.rotation.y = -neuralSimTime * 0.4;
        heroRingC.rotation.x = neuralSimTime * 0.34;
        heroOuterMat.opacity = 0.3 * reveal * activeDim;
        heroRingAMat.opacity = 0.65 * reveal * activeDim;
        heroCoreMat.opacity = 0.88 * reveal * activeDim;
        heroGlowMat.opacity = 0.34 * reveal * activeDim;
      }

      // Sync smooth 3D cylindrical synaptic filaments
      for (let s = 0; s < synapses.length; s++) {
        const syn = synapses[s];
        const a = neurons[syn.a].livePos;
        const b = neurons[syn.b].livePos;
        _synDir.subVectors(b, a);
        const len = Math.max(0.001, _synDir.length());
        _synDir.divideScalar(len);
        _synMid.addVectors(a, b).multiplyScalar(0.5);
        _synQuat.setFromUnitVectors(_synUp, _synDir);
        dummy.position.copy(_synMid);
        dummy.quaternion.copy(_synQuat);
        dummy.scale.set(1.0, len, 1.0);
        dummy.updateMatrix();
        synInstanced.setMatrixAt(s, dummy.matrix);
      }
      synInstanced.instanceMatrix.needsUpdate = true;
      synMat.opacity = Math.max(0, 0.34 - enter * 0.08) * reveal * activeDim;

      // Update floating weight & activation number sprites
      for (let m = 0; m < metricSprites.length; m++) {
        const item = metricSprites[m];
        const pA = neurons[item.a].livePos;
        if (item.b < 0) {
          item.sprite.position.set(pA.x, pA.y + item.offsetY, pA.z + 0.1);
        } else {
          const pB = neurons[item.b].livePos;
          item.sprite.position.set(
            (pA.x + pB.x) * 0.5,
            (pA.y + pB.y) * 0.5 + item.offsetY,
            (pA.z + pB.z) * 0.5 + 0.15
          );
        }
        (item.sprite.material as THREE.SpriteMaterial).opacity =
          Math.max(0, 0.9 - enter * 1.6) * reveal * (1 - pause * 0.2);
      }

      // Animate 3 independent random end-to-end data pulses (Layer 0 -> Layer 4), smoothly paused while reading
      for (let e = 0; e < energyMeta.length; e++) {
        const em = energyMeta[e];
        const progress = neuralSimTime * em.speed + em.offset;
        const cycle = Math.floor(progress);
        if (cycle !== em.prevCycle) {
          em.prevCycle = cycle;
          em.route = pickRandomRoute();
        }
        const totalU = (progress - cycle) * 4.0;
        const hopIdx = Math.min(3, Math.floor(totalU));
        const hopT = totalU - hopIdx;
        const nA = neurons[em.route[hopIdx]].livePos;
        const nB = neurons[em.route[hopIdx + 1]].livePos;
        _ePos.lerpVectors(nA, nB, hopT);

        dummy.position.copy(_ePos);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1.0 + Math.sin(hopT * Math.PI) * 0.22);
        dummy.updateMatrix();
        energyHeads.setMatrixAt(e, dummy.matrix);
        energyAuras.setMatrixAt(e, dummy.matrix);
      }
      energyHeads.instanceMatrix.needsUpdate = true;
      energyAuras.instanceMatrix.needsUpdate = true;
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

/**
 * CH.03 // EXPERIENCE: Photorealistic Cyan-Obsidian Black Hole Singularity.
 * - Pitch-black #000000 Event Horizon void (zero light escaping inside)
 * - Turbulent domain-warped 3D FBM plasma shaders (dark obsidian-cyan -> electric cyan -> incandescent white)
 * - Volumetric NormalBlending accretion disk (dark dusty foreground clouds + glowing inner core) + curved lensing halo + razor Einstein photon ring
 * - Untethered Key Skill nodes in unsynced, asymmetric 3D orbits that spiral and get pulled into the black hole on scroll
 */
export function buildIrisChamber(
  yPos: number,
  zPos: number,
  _obsidianTex: THREE.CanvasTexture,
  glowTex: THREE.CanvasTexture,
  _neutralGlowTex: THREE.CanvasTexture,
  keySkills: ResumeKeySkill[]
) {
  const root = new THREE.Group();
  root.position.set(0, yPos, zPos);

  const disposables: { dispose: () => void }[] = [];
  const rng = createRng(3303);

  // Subtle deep-space starfield well outside the gravitational shadow
  const starCount = 260;
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 9.5 + rng() * 18.0;
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi) * 0.78;
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xc8f6ff,
    size: 0.042,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  });
  root.add(new THREE.Points(starGeo, starMat));
  disposables.push(starGeo, starMat);

  // Shared GLSL 3D turbulent noise block (seam-free circular sampling via cos/sin + log(r))
  const GLSL_NOISE_3D = `
    float hash31(vec3 p) {
      p = fract(p * 0.1031);
      p += dot(p, p.yzx + 33.33);
      return fract((p.x + p.y) * p.z);
    }

    float noise3(vec3 x) {
      vec3 i = floor(x);
      vec3 f = fract(x);
      f = f * f * (3.0 - 2.0 * f);

      return mix(
        mix(
          mix(hash31(i + vec3(0.0, 0.0, 0.0)), hash31(i + vec3(1.0, 0.0, 0.0)), f.x),
          mix(hash31(i + vec3(0.0, 1.0, 0.0)), hash31(i + vec3(1.0, 1.0, 0.0)), f.x),
          f.y
        ),
        mix(
          mix(hash31(i + vec3(0.0, 0.0, 1.0)), hash31(i + vec3(1.0, 0.0, 1.0)), f.x),
          mix(hash31(i + vec3(0.0, 1.0, 1.0)), hash31(i + vec3(1.0, 1.0, 1.0)), f.x),
          f.y
        ),
        f.z
      );
    }

    float fbm3(vec3 p) {
      float v = 0.0;
      float a = 0.52;
      for (int i = 0; i < 4; i++) {
        v += a * noise3(p);
        p = p * 2.04 + vec3(17.1, 31.7, 13.3);
        a *= 0.5;
      }
      return v;
    }
  `;

  // Main Black Hole tilted cosmic frame
  const reactorGroup = new THREE.Group();
  reactorGroup.rotation.order = 'ZYX';
  reactorGroup.rotation.set(0.18, -0.14, 0.15);
  root.add(reactorGroup);

  const coreGroup = new THREE.Group();
  reactorGroup.add(coreGroup);

  // 1. Pure #000000 Event Horizon Void — zero light escapes inside
  const horizonRadius = 1.06;
  const horizonGeo = new THREE.SphereGeometry(horizonRadius, 64, 64);
  const horizonMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    depthWrite: true,
    depthTest: true,
    fog: false,
  });
  const eventHorizon = new THREE.Mesh(horizonGeo, horizonMat);
  eventHorizon.renderOrder = 1;
  coreGroup.add(eventHorizon);
  disposables.push(horizonGeo, horizonMat);

  // 2. Camera-aligned Gravitational Lensing Halo + Razor Einstein Photon Ring
  //    Flares smoothly outward near the equatorial plane like relativistic spacetime bending.
  const haloGeo = new THREE.RingGeometry(1.065, 3.85, 220, 64);
  const haloMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFly: { value: 0 },
    },
    vertexShader: `
      varying vec3 vLocalPos;
      void main() {
        vLocalPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uFly;
      varying vec3 vLocalPos;
      ${GLSL_NOISE_3D}

      void main() {
        float r = length(vLocalPos.xy);
        float ang = atan(vLocalPos.y, vLocalPos.x);
        vec2 dir = vec2(cos(ang), sin(ang));

        // Relativistic bell/saddle flare along sides into the accretion equator
        float eqPinch = pow(1.0 - abs(dir.y), 2.15);
        float flareScale = 1.0 + 0.52 * eqPinch;
        float rw = 1.065 + (r - 1.065) / flareScale;

        // 1) Crisp asymmetric Einstein photon ring hugging outside the #000000 void
        float photonBand = exp(-pow((r - 1.118) / 0.009, 2.0));
        float photonCorona = exp(-pow((r - 1.19) / 0.11, 2.0));

        // 2) Sheared turbulent gaseous plasma clouds bent smoothly around the sphere
        float shear = 4.6 / pow(max(rw, 1.0), 0.85);
        float flow1 = ang + shear - uTime * (0.28 + uFly * 0.55);
        float flow2 = ang + shear * 0.65 - uTime * (0.16 + uFly * 0.35);

        float warp = fbm3(vec3(cos(ang) * 2.1, sin(ang) * 2.1, rw * 2.4 - uTime * 0.08));
        float turbA = fbm3(vec3(cos(flow1) * 1.9, sin(flow1) * 1.9, (rw + warp * 0.24) * 5.2));
        float turbB = fbm3(vec3(cos(flow2) * 3.4, sin(flow2) * 3.4, (rw - warp * 0.18) * 9.5));
        float gas = clamp(turbA * 0.64 + turbB * 0.36, 0.0, 1.0);
        gas = smoothstep(0.20, 0.86, gas);

        // Smooth radial envelope with soft outer fade
        float archIn = smoothstep(1.13, 1.24, r);
        float archOut = pow(1.0 - smoothstep(1.38, 2.85, rw), 2.15);
        float archEnvelope = archIn * archOut;

        // Relativistic Doppler beaming (left/approaching rim brighter icy-white, right deeper cyan)
        float doppler = 0.56 + 0.64 * smoothstep(0.85, -0.85, dir.x);
        float photonDoppler = 0.38 + 0.85 * smoothstep(0.95, -0.75, dir.x);

        // Dark Abyssal Cyan -> Electric Cyan -> Ice White
        vec3 deepCyan = vec3(0.02, 0.16, 0.28);
        vec3 midCyan = vec3(0.08, 0.64, 0.88);
        vec3 iceCyan = vec3(0.55, 0.94, 1.0);
        vec3 pureWhite = vec3(1.0, 1.0, 1.0);

        float intensity = clamp(
          gas * archEnvelope * 1.05 * doppler +
          photonCorona * 0.72 * doppler +
          photonBand * 1.25 * photonDoppler,
          0.0,
          1.25
        );

        vec3 col = mix(deepCyan, midCyan, smoothstep(0.04, 0.36, intensity));
        col = mix(col, iceCyan, smoothstep(0.34, 0.72, intensity));
        col = mix(col, pureWhite, smoothstep(0.70, 1.08, intensity));

        float alpha = clamp(
          photonBand * 0.96 * photonDoppler +
          (gas * 0.82 + 0.18) * archEnvelope * doppler * 0.92 +
          photonCorona * 0.58 * doppler,
          0.0,
          0.98
        );
        alpha *= (1.0 - uFly * 0.22);
        if (alpha < 0.004) discard;

        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const haloMesh = new THREE.Mesh(haloGeo, haloMat);
  haloMesh.renderOrder = 2;

  // Keep halo facing camera while matching accretion equator tilt (zero GC inside render loop)
  const _hWorld = new THREE.Vector3();
  const _hFwd = new THREE.Vector3();
  const _hDiskUp = new THREE.Vector3();
  const _hRight = new THREE.Vector3();
  const _hTrueUp = new THREE.Vector3();
  const _hMat = new THREE.Matrix4();
  const _hWorldQuat = new THREE.Quaternion();
  const _hParentQuat = new THREE.Quaternion();
  haloMesh.onBeforeRender = (_renderer, _scene, cam) => {
    coreGroup.getWorldPosition(_hWorld);
    coreGroup.getWorldQuaternion(_hParentQuat);
    _hFwd.subVectors(cam.position, _hWorld).normalize();
    _hDiskUp.set(0, 1, 0).applyQuaternion(_hParentQuat).normalize();
    _hRight.crossVectors(_hDiskUp, _hFwd);
    if (_hRight.lengthSq() < 0.0001) {
      _hRight.set(1, 0, 0);
    } else {
      _hRight.normalize();
    }
    _hTrueUp.crossVectors(_hFwd, _hRight).normalize();
    _hMat.makeBasis(_hRight, _hTrueUp, _hFwd);
    _hWorldQuat.setFromRotationMatrix(_hMat);
    haloMesh.quaternion.copy(_hParentQuat).invert().multiply(_hWorldQuat);
    haloMesh.updateMatrixWorld();
  };

  coreGroup.add(haloMesh);
  disposables.push(haloGeo, haloMat);

  // 3. Tilted 3D Volumetric Turbulent Accretion Disk (NormalBlending: dark outer dust clouds + bright cyan-white inner core)
  const diskGeo = new THREE.RingGeometry(1.07, 7.6, 220, 72);
  diskGeo.rotateX(-Math.PI / 2);

  const diskMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFly: { value: 0 },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uFly;
      varying vec3 vLocalPos;
      void main() {
        vec3 pos = position;
        float r = length(pos.xz);
        float ang = atan(pos.z, pos.x);
        // Subtle organic vertical gas thickness wave
        pos.y += sin(ang * 2.0 + r * 1.15 - uTime * 0.45) * 0.032 * smoothstep(1.3, 5.2, r);
        pos *= 1.0 + uFly * 0.48;
        vLocalPos = pos;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uFly;
      varying vec3 vLocalPos;
      ${GLSL_NOISE_3D}

      void main() {
        float r = length(vLocalPos.xz);
        float ang = atan(vLocalPos.z, vLocalPos.x);

        // Differential Keplerian rotation + domain-warped turbulent gas clouds (no uniform stripes)
        float kepler = 4.9 / pow(max(r, 1.0), 0.85);
        float flowA = ang + kepler - uTime * (0.34 / pow(max(r, 1.0), 0.78)) * (1.0 + uFly * 1.4);
        float flowB = ang + kepler * 0.58 - uTime * (0.20 / pow(max(r, 1.0), 0.7)) * (1.0 + uFly * 1.1);

        float warp = fbm3(vec3(cos(ang) * 1.8, sin(ang) * 1.8, log(max(r, 1.02)) * 3.2 - uTime * 0.06));
        float cloudMain = fbm3(vec3(cos(flowA) * 2.0, sin(flowA) * 2.0, (log(max(r, 1.02)) + warp * 0.22) * 5.8));
        float cloudFine = fbm3(vec3(cos(flowB) * 3.8, sin(flowB) * 3.8, (log(max(r, 1.02)) - warp * 0.16) * 11.2));
        float wisp = clamp(cloudMain * 0.65 + cloudFine * 0.35, 0.0, 1.0);

        float innerEdge = smoothstep(1.07, 1.20, r);
        float outerFade = pow(1.0 - smoothstep(2.2, 7.5, r), 1.65);

        // Hot incandescent inner photon collar dropping smoothly into turbulent cyan & dark outer dust
        float coreHeat = exp(-pow((r - 1.24) / 0.52, 2.0));
        float midPlasma = smoothstep(0.32, 0.78, wisp) * (1.0 - smoothstep(1.8, 6.2, r));
        float dustDensity = smoothstep(0.18, 0.72, cloudMain) * smoothstep(1.25, 2.6, r);

        // Doppler brightness shift across approaching vs receding side
        float doppler = 0.58 + 0.56 * smoothstep(4.0, -4.0, vLocalPos.x);

        vec3 obsidianDust = vec3(0.014, 0.032, 0.062);
        vec3 deepCyan = vec3(0.03, 0.22, 0.38);
        vec3 brightCyan = vec3(0.08, 0.72, 0.94);
        vec3 iceCyan = vec3(0.58, 0.95, 1.0);
        vec3 pureWhite = vec3(1.0, 1.0, 1.0);

        float lum = clamp(
          coreHeat * (0.78 + 0.45 * wisp) * doppler +
          midPlasma * 0.68 * doppler +
          wisp * 0.22 * (1.0 - smoothstep(2.5, 6.8, r)),
          0.0,
          1.2
        );

        vec3 col = mix(obsidianDust, deepCyan, smoothstep(0.02, 0.24, lum));
        col = mix(col, brightCyan, smoothstep(0.22, 0.55, lum));
        col = mix(col, iceCyan, smoothstep(0.54, 0.82, lum));
        col = mix(col, pureWhite, smoothstep(0.80, 1.08, lum));

        // High opacity in both dark dusty clouds and bright inner plasma so front disk visibly shadows rear halo
        float alpha = clamp(
          (coreHeat * 0.96 + midPlasma * 0.72 + dustDensity * 0.88) * innerEdge * outerFade,
          0.0,
          0.96
        );
        if (alpha < 0.005) discard;

        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const diskMesh = new THREE.Mesh(diskGeo, diskMat);
  diskMesh.renderOrder = 3;
  reactorGroup.add(diskMesh);
  disposables.push(diskGeo, diskMat);

  // 4. Subtle Additive Inner Equatorial Corona (soft pure white -> cyan incandescent glow close to horizon)
  const coronaGeo = new THREE.RingGeometry(1.08, 3.15, 180, 32);
  coronaGeo.rotateX(-Math.PI / 2);
  const coronaMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFly: { value: 0 },
    },
    vertexShader: `
      uniform float uFly;
      varying vec3 vLocalPos;
      void main() {
        vec3 pos = position * (1.0 + uFly * 0.48);
        vLocalPos = pos;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uFly;
      varying vec3 vLocalPos;
      ${GLSL_NOISE_3D}

      void main() {
        float r = length(vLocalPos.xz);
        float ang = atan(vLocalPos.z, vLocalPos.x);
        float flow = ang + 3.2 / max(r, 1.0) - uTime * 0.36;
        float turb = fbm3(vec3(cos(flow) * 2.4, sin(flow) * 2.4, r * 3.8));

        float rim = exp(-pow((r - 1.24) / 0.42, 2.0));
        float innerCut = smoothstep(1.08, 1.18, r);
        float outerCut = 1.0 - smoothstep(1.6, 3.15, r);
        float doppler = 0.55 + 0.60 * smoothstep(2.6, -2.6, vLocalPos.x);

        vec3 col = mix(vec3(0.08, 0.72, 0.96), vec3(0.95, 0.99, 1.0), smoothstep(0.25, 0.85, rim * (0.7 + turb * 0.5)));
        float alpha = clamp(rim * (0.48 + turb * 0.52) * innerCut * outerCut * doppler * 0.65, 0.0, 0.78);
        if (alpha < 0.004) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
  coronaMesh.renderOrder = 4;
  reactorGroup.add(coronaMesh);
  disposables.push(coronaGeo, coronaMat);

  // 5. Untethered Key Skills — Unsynced, Unpatterned 3D Orbits Attracted Into the Black Hole on Scroll
  const effectiveSkills: ResumeKeySkill[] =
    keySkills.length > 0 ? keySkills : [{ name: 'SYSTEMS', color: '#00FFFF' }];

  const nodeGeo = new THREE.OctahedronGeometry(0.145, 0);
  const nodeWireGeo = new THREE.EdgesGeometry(nodeGeo);
  disposables.push(nodeGeo, nodeWireGeo);

  interface AttractedSkillNode {
    orbitGroup: THREE.Group;
    nodePivot: THREE.Group;
    nodeMesh: THREE.Mesh;
    haloSprite: THREE.Sprite;
    labelMat: THREE.SpriteMaterial;
    baseTiltX: number;
    baseTiltY: number;
    baseTiltZ: number;
    baseRadius: number;
    speed: number;
    phase: number;
    eccentricity: number;
    bobFreq: number;
    bobAmp: number;
    bobPhase: number;
    spinX: number;
    spinY: number;
    infallSwirl: number;
    infallThreshold: number;
  }

  // Jittered non-uniform radial/angular spread so skills never look like a rigid pattern or sync up
  const count = effectiveSkills.length;
  const sectorOrder = effectiveSkills.map((_, idx) => idx);
  for (let i = sectorOrder.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = sectorOrder[i];
    sectorOrder[i] = sectorOrder[j];
    sectorOrder[j] = tmp;
  }

  const skillNodes: AttractedSkillNode[] = [];

  effectiveSkills.forEach((skill, idx) => {
    // Non-patterned radii & scattered angular sectors (avoiding overlap without looking ordered)
    const sector = sectorOrder[idx];
    const baseRadius = count === 1 ? 3.2 : 2.55 + rng() * 1.45;
    const phase =
      ((sector + 0.18 + rng() * 0.64) / Math.max(1, count)) * Math.PI * 2;
    const speed = 0.09 + rng() * 0.21; // genuinely distinct unsynced orbital speeds
    const eccentricity = 0.76 + rng() * 0.36;

    // Distinct asymmetric 3D inclinations (each node on its own tilted plane, not flat system rings)
    const baseTiltX = (rng() - 0.5) * 0.88;
    const baseTiltY = rng() * Math.PI * 2;
    const baseTiltZ = (rng() - 0.5) * 0.82;

    const orbitGroup = new THREE.Group();
    orbitGroup.rotation.set(baseTiltX, baseTiltY, baseTiltZ);
    reactorGroup.add(orbitGroup);

    const nodePivot = new THREE.Group();
    orbitGroup.add(nodePivot);

    const accent = new THREE.Color(skill.color);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0x0b1018,
      emissive: accent,
      emissiveIntensity: 0.68,
      roughness: 0.22,
      metalness: 0.78,
    });
    const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
    const nodeEdgeMat = new THREE.LineBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.96,
    });
    nodeMesh.add(new THREE.LineSegments(nodeWireGeo, nodeEdgeMat));
    nodePivot.add(nodeMesh);
    disposables.push(nodeMat, nodeEdgeMat);

    // Subtle colored crystal halo
    const haloMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: accent,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const haloSprite = new THREE.Sprite(haloMat);
    haloSprite.scale.set(0.56, 0.56, 1);
    nodePivot.add(haloSprite);
    disposables.push(haloMat);

    // High-contrast dark-backed Key Skill label sprite (NO string tether to black hole)
    const { tex: labelTex, aspect } = createSkillPlanetLabelTexture(skill.name, skill.color);
    const labelMat = new THREE.SpriteMaterial({
      map: labelTex,
      transparent: true,
      opacity: 0.98,
      depthWrite: false,
      depthTest: true,
    });
    const labelSprite = new THREE.Sprite(labelMat);
    labelSprite.renderOrder = 12;
    const labelH = 0.33;
    labelSprite.scale.set(labelH * aspect, labelH, 1);
    labelSprite.position.set(0, 0.34, 0);
    nodePivot.add(labelSprite);
    disposables.push(labelTex, labelMat);

    skillNodes.push({
      orbitGroup,
      nodePivot,
      nodeMesh,
      haloSprite,
      labelMat,
      baseTiltX,
      baseTiltY,
      baseTiltZ,
      baseRadius,
      speed,
      phase,
      eccentricity,
      bobFreq: 0.45 + rng() * 0.95,
      bobAmp: 0.14 + rng() * 0.28,
      bobPhase: rng() * Math.PI * 2,
      spinX: 0.35 + rng() * 0.9,
      spinY: 0.55 + rng() * 1.1,
      infallSwirl: 2.6 + rng() * 3.1, // each skill spirals inward at its own rate on scroll
      infallThreshold: rng() * 0.14, // slightly staggered scroll response so they don't fall in sync
    });
  });

  const coreWorldPos = new THREE.Vector3(0, yPos, zPos);
  reactorGroup.updateMatrixWorld(true);
  coreGroup.getWorldPosition(coreWorldPos);

  return {
    root,
    getCoreWorldPosition: (out: THREE.Vector3) => out.copy(coreWorldPos),
    update: (elapsed: number, pointerX: number, pointerY: number, flyProgress: number) => {
      const tiltDamp = 1 - THREE.MathUtils.smoothstep(flyProgress, 0.18, 0.78);
      reactorGroup.rotation.x = 0.18 * tiltDamp + pointerY * 0.09 * tiltDamp;
      reactorGroup.rotation.y = -0.14 * tiltDamp + pointerX * 0.12 * tiltDamp;
      reactorGroup.rotation.z = 0.15 * tiltDamp;
      reactorGroup.updateMatrixWorld(true);
      coreGroup.getWorldPosition(coreWorldPos);

      haloMat.uniforms.uTime.value = elapsed;
      haloMat.uniforms.uFly.value = flyProgress;

      diskMat.uniforms.uTime.value = elapsed;
      diskMat.uniforms.uFly.value = flyProgress;

      coronaMat.uniforms.uTime.value = elapsed;
      coronaMat.uniforms.uFly.value = flyProgress;

      for (let i = 0; i < skillNodes.length; i++) {
        const sn = skillNodes[i];

        // Scroll-driven gravitational infall: skills break orbit & spiral into the Event Horizon
        const localInfall = THREE.MathUtils.smoothstep(
          flyProgress,
          0.02 + sn.infallThreshold,
          0.88 + sn.infallThreshold * 0.4
        );
        const pull = Math.pow(localInfall, 1.28);

        // Flatten inclination slightly toward singularity as gravity captures each skill
        const planeFlatten = 1.0 - pull * 0.65;
        sn.orbitGroup.rotation.set(
          sn.baseTiltX * planeFlatten,
          sn.baseTiltY,
          sn.baseTiltZ * planeFlatten
        );

        const curR = THREE.MathUtils.lerp(sn.baseRadius, horizonRadius * 0.65, pull);
        const ecc = THREE.MathUtils.lerp(sn.eccentricity, 1.0, pull);
        const angle = sn.phase + elapsed * sn.speed + pull * sn.infallSwirl;

        const nx = Math.cos(angle) * curR;
        const nz = Math.sin(angle) * curR * ecc;
        const ny = Math.sin(elapsed * sn.bobFreq + sn.bobPhase) * sn.bobAmp * (1.0 - pull * 0.9);

        sn.nodePivot.position.set(nx, ny, nz);

        // Shrink cleanly right as the skill crosses into the Event Horizon shadow
        const swallowScale = 1.0 - THREE.MathUtils.smoothstep(pull, 0.72, 0.98);
        sn.nodePivot.scale.setScalar(Math.max(0.001, swallowScale));

        sn.nodeMesh.rotation.y = elapsed * sn.spinY + sn.phase;
        sn.nodeMesh.rotation.x = elapsed * sn.spinX;

        const labelFade = 1.0 - THREE.MathUtils.smoothstep(pull, 0.45, 0.85);
        sn.labelMat.opacity = 0.98 * labelFade;
        sn.haloSprite.material.opacity = 0.48 * swallowScale;
      }
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

/**
 * CH.04 // RESEARCH ARCHIVE:
 * Obsidian Knowledge Codex & Holographic Manuscript Lattice with 3 suspended
 * research plates (2 Submitted + 1 Under Review) linked by citation vectors.
 */
export function buildResearchChamber(
  yPos: number,
  zPos: number,
  glowTex: THREE.CanvasTexture
) {
  const root = new THREE.Group();
  root.position.set(0, yPos, zPos);

  const disposables: { dispose: () => void }[] = [];
  const rng = createRng(4404);

  // Subtle ambient archival dust field
  const starCount = 190;
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 4.0 + rng() * 11.5;
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi) * 0.65;
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xa6f7ff,
    size: 0.04,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
  });
  root.add(new THREE.Points(starGeo, starMat));
  disposables.push(starGeo, starMat);

  const codexGroup = new THREE.Group();
  root.add(codexGroup);

  // Base octagonal obsidian plinth + exit portal ring
  const baseGeo = new THREE.CylinderGeometry(2.55, 2.95, 0.22, 8);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x151a21,
    roughness: 0.58,
    metalness: 0.44,
    envMapIntensity: 0.24,
  });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = -2.05;
  codexGroup.add(baseMesh);
  disposables.push(baseGeo, baseMat);

  const cyanRingMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.56,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  disposables.push(cyanRingMat);

  [1.35, 2.32].forEach((r) => {
    const rg = new THREE.RingGeometry(r - 0.03, r, 48);
    rg.rotateX(-Math.PI / 2);
    const rm = new THREE.Mesh(rg, cyanRingMat);
    rm.position.y = -1.92;
    codexGroup.add(rm);
    disposables.push(rg);
  });

  // Central Obsidian Knowledge Core + Dual Telemetry Scanner Halos
  const coreGroup = new THREE.Group();
  coreGroup.position.set(0, 0.15, 0);
  codexGroup.add(coreGroup);

  const coreGeo = new THREE.OctahedronGeometry(0.46, 0);
  const coreEdgeGeo = new THREE.EdgesGeometry(coreGeo);
  const coreMat = new THREE.MeshPhysicalMaterial({
    color: 0x0d1822,
    emissive: new THREE.Color(0x00ffff),
    emissiveIntensity: 0.18,
    roughness: 0.14,
    metalness: 0.38,
    transparent: true,
    opacity: 0.68,
  });
  const coreEdgeMat = new THREE.LineBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.85,
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  coreMesh.add(new THREE.LineSegments(coreEdgeGeo, coreEdgeMat));
  coreGroup.add(coreMesh);
  disposables.push(coreGeo, coreEdgeGeo, coreMat, coreEdgeMat);

  const auraMat = new THREE.SpriteMaterial({
    map: glowTex,
    color: 0x00ffff,
    transparent: true,
    opacity: 0.36,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const auraSprite = new THREE.Sprite(auraMat);
  auraSprite.scale.set(1.9, 1.9, 1);
  coreGroup.add(auraSprite);
  disposables.push(auraMat);

  const haloOuterGeo = new THREE.TorusGeometry(1.48, 0.022, 12, 64);
  const haloInnerGeo = new THREE.TorusGeometry(1.06, 0.018, 12, 64);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const haloOuter = new THREE.Mesh(haloOuterGeo, haloMat);
  haloOuter.rotation.set(0.55, 0.2, 0);
  const haloInner = new THREE.Mesh(haloInnerGeo, haloMat);
  haloInner.rotation.set(-0.48, 0.6, 0);
  coreGroup.add(haloOuter, haloInner);
  disposables.push(haloOuterGeo, haloInnerGeo, haloMat);

  // 3 Floating Research Manuscript Plates (Plates 0 & 1: Submitted, Plate 2: Under Review)
  const plateGeo = new THREE.BoxGeometry(1.12, 1.48, 0.045);
  const plateEdgeGeo = new THREE.EdgesGeometry(plateGeo);
  const lineBarGeo = new THREE.BoxGeometry(0.74, 0.042, 0.014);
  const beaconGeo = new THREE.OctahedronGeometry(0.085, 0);

  const plateGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x09131b,
    emissive: new THREE.Color(0x00ffff),
    emissiveIntensity: 0.06,
    roughness: 0.18,
    metalness: 0.25,
    transparent: true,
    opacity: 0.62,
  });
  const submittedEdgeMat = new THREE.LineBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.85,
  });
  const reviewEdgeMat = new THREE.LineBasicMaterial({
    color: 0xd8ffff,
    transparent: true,
    opacity: 0.88,
  });
  const submittedBarMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.68,
  });
  const reviewBarMat = new THREE.MeshBasicMaterial({
    color: 0xd8ffff,
    transparent: true,
    opacity: 0.72,
  });
  const tetherMat = new THREE.LineBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.26,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  disposables.push(
    plateGeo,
    plateEdgeGeo,
    lineBarGeo,
    beaconGeo,
    plateGlassMat,
    submittedEdgeMat,
    reviewEdgeMat,
    submittedBarMat,
    reviewBarMat,
    tetherMat
  );

  interface ManuscriptPlate {
    group: THREE.Group;
    beacon: THREE.Mesh;
    basePos: THREE.Vector3;
    baseRotY: number;
    phase: number;
    isReview: boolean;
  }

  const plateConfigs = [
    { x: -1.92, y: 0.34, z: 0.65, rotY: 0.42, isReview: false, phase: 0.0 },
    { x: 0.0, y: 0.68, z: -0.95, rotY: 0.0, isReview: false, phase: 2.1 },
    { x: 1.92, y: 0.28, z: 0.65, rotY: -0.42, isReview: true, phase: 4.2 },
  ];

  const plates: ManuscriptPlate[] = plateConfigs.map((cfg) => {
    const pGroup = new THREE.Group();
    pGroup.position.set(cfg.x, cfg.y, cfg.z);
    pGroup.rotation.y = cfg.rotY;

    const plateMesh = new THREE.Mesh(plateGeo, plateGlassMat);
    plateMesh.add(
      new THREE.LineSegments(plateEdgeGeo, cfg.isReview ? reviewEdgeMat : submittedEdgeMat)
    );
    pGroup.add(plateMesh);

    const barMat = cfg.isReview ? reviewBarMat : submittedBarMat;
    for (let r = 0; r < 6; r++) {
      const bar = new THREE.Mesh(lineBarGeo, barMat);
      const barScale = r === 0 ? 0.62 : r === 5 ? 0.54 : 0.94;
      bar.scale.x = barScale;
      bar.position.set(-(1 - barScale) * 0.36, 0.42 - r * 0.18, 0.03);
      pGroup.add(bar);
    }

    const beacon = new THREE.Mesh(beaconGeo, barMat);
    beacon.position.set(0.38, 0.55, 0.05);
    pGroup.add(beacon);

    codexGroup.add(pGroup);

    // Citation tether back to core
    const linkGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.15, 0),
      new THREE.Vector3(cfg.x, cfg.y, cfg.z),
    ]);
    codexGroup.add(new THREE.Line(linkGeo, tetherMat));
    disposables.push(linkGeo);

    return {
      group: pGroup,
      beacon,
      basePos: new THREE.Vector3(cfg.x, cfg.y, cfg.z),
      baseRotY: cfg.rotY,
      phase: cfg.phase,
      isReview: cfg.isReview,
    };
  });

  return {
    root,
    update: (elapsed: number, pointerX: number, pointerY: number, diveProgress: number) => {
      const damp = 1 - THREE.MathUtils.smoothstep(diveProgress, 0.1, 0.8);
      codexGroup.rotation.y = pointerX * 0.18 * damp + Math.sin(elapsed * 0.25) * 0.08 * damp;
      codexGroup.rotation.x = pointerY * 0.1 * damp;

      coreMesh.rotation.y = elapsed * 0.48;
      coreMesh.rotation.x = elapsed * 0.24;
      haloOuter.rotation.z = elapsed * 0.34;
      haloOuter.rotation.y = 0.2 + elapsed * 0.18;
      haloInner.rotation.z = -elapsed * 0.45;
      haloInner.scale.setScalar(1 + diveProgress * 0.75);
      haloOuter.scale.setScalar(1 + diveProgress * 0.95);

      auraSprite.scale.setScalar(1.85 + Math.sin(elapsed * 2.1) * 0.16 + diveProgress * 1.4);

      plates.forEach((p, idx) => {
        const hover = Math.sin(elapsed * 1.3 + p.phase) * 0.08;
        const spread = 1 + diveProgress * 0.55;
        p.group.position.set(p.basePos.x * spread, p.basePos.y + hover, p.basePos.z * spread);
        p.group.rotation.y = p.baseRotY + Math.sin(elapsed * 0.4 + idx) * 0.06;
        p.beacon.rotation.y = elapsed * (p.isReview ? 2.4 : 1.1);
        const pulseScale = p.isReview ? 1 + Math.sin(elapsed * 4.5) * 0.28 : 1;
        p.beacon.scale.setScalar(pulseScale);
      });
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

/**
 * CH.05 // THE PEDESTAL: Precision Machined Circuit Platform + 2,400-Particle & Wireframe Contact Emblems
 */
export function buildPedestalChamber(
  yPos: number,
  zPos: number,
  circuitTex: THREE.CanvasTexture,
  glowTex: THREE.CanvasTexture
) {
  const root = new THREE.Group();
  root.position.set(0, yPos, zPos);
  const disposables: { dispose: () => void }[] = [];

  const platformGroup = new THREE.Group();
  platformGroup.position.set(0, -1.75, 0);
  root.add(platformGroup);

  const topDiscGeo = new THREE.CylinderGeometry(3.85, 3.95, 0.14, 64);
  const topDiscMat = new THREE.MeshStandardMaterial({
    map: circuitTex,
    roughness: 0.68,
    metalness: 0.32,
    envMapIntensity: 0.24,
  });
  platformGroup.add(new THREE.Mesh(topDiscGeo, topDiscMat));
  disposables.push(topDiscGeo, topDiscMat);

  const baseGeo = new THREE.CylinderGeometry(4.2, 4.65, 0.36, 48);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x14171d,
    roughness: 0.7,
    metalness: 0.42,
    envMapIntensity: 0.26,
  });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = -0.24;
  platformGroup.add(baseMesh);
  disposables.push(baseGeo, baseMat);

  const trimCount = 16;
  const trimGeo = new THREE.BoxGeometry(0.55, 0.18, 0.28);
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x1d222b,
    roughness: 0.52,
    metalness: 0.52,
    envMapIntensity: 0.3,
  });
  const trims = new THREE.InstancedMesh(trimGeo, trimMat, trimCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < trimCount; i++) {
    const a = (i / trimCount) * Math.PI * 2;
    dummy.position.set(Math.cos(a) * 4.02, 0.04, Math.sin(a) * 4.02);
    dummy.rotation.set(0, -a + Math.PI / 2, 0);
    dummy.updateMatrix();
    trims.setMatrixAt(i, dummy.matrix);
  }
  trims.instanceMatrix.needsUpdate = true;
  platformGroup.add(trims);
  disposables.push(trimGeo, trimMat);

  const cyanRingMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.58,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  disposables.push(cyanRingMat);

  [1.45, 2.45, 3.62].forEach((r) => {
    const rg = new THREE.RingGeometry(r - 0.028, r, 64);
    rg.rotateX(-Math.PI / 2);
    disposables.push(rg);
    const rm = new THREE.Mesh(rg, cyanRingMat);
    rm.position.y = 0.08;
    platformGroup.add(rm);
  });

  const arcGroup = new THREE.Group();
  arcGroup.position.set(0, 0.45, 0);
  root.add(arcGroup);

  const arcGeo = new THREE.TorusGeometry(2.65, 0.024, 14, 64, Math.PI * 0.55);
  const arcMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  for (let i = 0; i < 3; i++) {
    const arc = new THREE.Mesh(arcGeo, arcMat);
    arc.rotation.x = Math.PI * 0.42;
    arc.rotation.z = (i * Math.PI * 2) / 3;
    arcGroup.add(arc);
  }
  disposables.push(arcGeo, arcMat);

  // Overhead Teleport Return Halo Gate (portal back to Stage 1 Sky)
  const topHaloGeo = new THREE.TorusGeometry(2.45, 0.03, 16, 96);
  topHaloGeo.rotateX(Math.PI / 2);
  const topHalo = new THREE.Mesh(topHaloGeo, cyanRingMat);
  topHalo.position.set(0, 2.95, 0);
  root.add(topHalo);
  disposables.push(topHaloGeo);

  const portalDiscGeo = new THREE.RingGeometry(1.65, 2.42, 64);
  portalDiscGeo.rotateX(Math.PI / 2);
  const portalDiscMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.14,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const portalDisc = new THREE.Mesh(portalDiscGeo, portalDiscMat);
  portalDisc.position.set(0, 2.95, 0);
  root.add(portalDisc);
  disposables.push(portalDiscGeo, portalDiscMat);

  // Inner Wireframe Contact Emblems Group
  const graphGroup = new THREE.Group();
  graphGroup.position.set(0, 0.72, 0);
  root.add(graphGroup);

  const makeWireMat = (color: number, initialOpacity = 0) => {
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: initialOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    disposables.push(mat);
    return mat;
  };

  // --- Emblem 1: EMAIL (3D Envelope + V-flap + Outer Orbital Halo) ---
  const emailGroup = new THREE.Group();
  const emailMat = makeWireMat(0x00ffff, 0.85);
  const emailBrightMat = makeWireMat(0xd8ffff, 0.9);
  const envBoxGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(2.3, 1.5, 0.24));
  emailGroup.add(new THREE.LineSegments(envBoxGeo, emailMat));
  const flapGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-1.15, 0.75, 0.125),
    new THREE.Vector3(0.0, -0.1, 0.125),
    new THREE.Vector3(1.15, 0.75, 0.125),
  ]);
  const flapBackGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-1.15, 0.75, -0.125),
    new THREE.Vector3(0.0, -0.1, -0.125),
    new THREE.Vector3(1.15, 0.75, -0.125),
  ]);
  const bottomFoldGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-1.15, -0.75, 0.125),
    new THREE.Vector3(-0.34, 0.16, 0.125),
  ]);
  const bottomFoldRGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(1.15, -0.75, 0.125),
    new THREE.Vector3(0.34, 0.16, 0.125),
  ]);
  emailGroup.add(
    new THREE.Line(flapGeo, emailBrightMat),
    new THREE.Line(flapBackGeo, emailMat),
    new THREE.Line(bottomFoldGeo, emailMat),
    new THREE.Line(bottomFoldRGeo, emailMat)
  );
  graphGroup.add(emailGroup);
  disposables.push(envBoxGeo, flapGeo, flapBackGeo, bottomFoldGeo, bottomFoldRGeo);

  // --- Emblem 2: GITHUB (3D Branching Commit DAG + Diamond Cage) ---
  const githubGroup = new THREE.Group();
  const githubMat = makeWireMat(0x00ffff, 0);
  const githubBrightMat = makeWireMat(0xd8ffff, 0);
  const ghOuterGeo = new THREE.EdgesGeometry(new THREE.OctahedronGeometry(1.55, 0));
  githubGroup.add(new THREE.LineSegments(ghOuterGeo, githubMat));
  const mainTrunkGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.42, -1.05, 0),
    new THREE.Vector3(-0.42, 1.05, 0),
  ]);
  const branchCurve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(-0.42, -0.45, 0),
    new THREE.Vector3(0.55, -0.3, 0.25),
    new THREE.Vector3(0.55, 0.45, -0.25),
    new THREE.Vector3(-0.42, 0.65, 0)
  );
  const branchGeo = new THREE.BufferGeometry().setFromPoints(branchCurve.getPoints(28));
  githubGroup.add(new THREE.Line(mainTrunkGeo, githubBrightMat), new THREE.Line(branchGeo, githubBrightMat));
  const commitNodeGeo = new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.18, 0));
  [
    new THREE.Vector3(-0.42, -0.95, 0),
    new THREE.Vector3(-0.42, -0.45, 0),
    new THREE.Vector3(0.32, 0.08, 0),
    new THREE.Vector3(-0.42, 0.65, 0),
    new THREE.Vector3(-0.42, 1.02, 0),
  ].forEach((pos) => {
    const m = new THREE.LineSegments(commitNodeGeo, githubBrightMat);
    m.position.copy(pos);
    githubGroup.add(m);
  });
  graphGroup.add(githubGroup);
  disposables.push(ghOuterGeo, mainTrunkGeo, branchGeo, commitNodeGeo);

  // --- Emblem 3: LINKEDIN (Architectural 3D "in" Monogram + Frame) ---
  const linkedinGroup = new THREE.Group();
  const liMat = makeWireMat(0x00ffff, 0);
  const liBrightMat = makeWireMat(0xd8ffff, 0);
  const liFrameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(2.15, 2.15, 0.26));
  linkedinGroup.add(new THREE.LineSegments(liFrameGeo, liMat));
  const iDotGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.24, 0.24, 0.24));
  const iDot = new THREE.LineSegments(iDotGeo, liBrightMat);
  iDot.position.set(-0.56, 0.54, 0);
  const iStemGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.24, 0.88, 0.22));
  const iStem = new THREE.LineSegments(iStemGeo, liBrightMat);
  iStem.position.set(-0.56, -0.18, 0);
  const nLeftGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.24, 0.92, 0.22));
  const nLeft = new THREE.LineSegments(nLeftGeo, liBrightMat);
  nLeft.position.set(0.0, -0.16, 0);
  const nRightGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.24, 0.68, 0.22));
  const nRight = new THREE.LineSegments(nRightGeo, liBrightMat);
  nRight.position.set(0.6, -0.28, 0);
  const nArchGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.84, 0.24, 0.22));
  const nArch = new THREE.LineSegments(nArchGeo, liBrightMat);
  nArch.position.set(0.3, 0.18, 0);
  linkedinGroup.add(iDot, iStem, nLeft, nRight, nArch);
  graphGroup.add(linkedinGroup);
  disposables.push(liFrameGeo, iDotGeo, iStemGeo, nLeftGeo, nRightGeo, nArchGeo);

  // --- Emblem 4: PHONE (3D Sculpted Handset Receiver + Outgoing Acoustic Wave Arcs) ---
  const phoneGroup = new THREE.Group();
  const phoneMat = makeWireMat(0x00ffff, 0);
  const phoneBrightMat = makeWireMat(0xd8ffff, 0);
  const handsetCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.78, 0.88, 0),
    new THREE.Vector3(-0.48, 0.24, 0.1),
    new THREE.Vector3(0.18, -0.42, 0.1),
    new THREE.Vector3(0.86, -0.76, 0),
  ]);
  const handsetTubeGeo = new THREE.EdgesGeometry(new THREE.TubeGeometry(handsetCurve, 24, 0.16, 8, false));
  phoneGroup.add(new THREE.LineSegments(handsetTubeGeo, phoneBrightMat));
  const earCupGeo = new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.28, 0.24, 0.28, 8));
  const topCup = new THREE.LineSegments(earCupGeo, phoneBrightMat);
  topCup.position.set(-0.76, 0.9, 0.12);
  topCup.rotation.set(0.2, 0, -0.55);
  const botCup = new THREE.LineSegments(earCupGeo, phoneBrightMat);
  botCup.position.set(0.86, -0.76, 0.12);
  botCup.rotation.set(0.2, 0, -0.95);
  phoneGroup.add(topCup, botCup);
  [0.52, 0.88, 1.24].forEach((r) => {
    const waveGeo = new THREE.EdgesGeometry(new THREE.TorusGeometry(r, 0.018, 6, 20, Math.PI * 0.52));
    const wave = new THREE.LineSegments(waveGeo, phoneMat);
    wave.position.set(0.12, 0.12, 0);
    wave.rotation.z = -0.15;
    phoneGroup.add(wave);
    disposables.push(waveGeo);
  });
  graphGroup.add(phoneGroup);
  disposables.push(handsetTubeGeo, earCupGeo);

  // --- Emblem 5: CONTACT FORM (3D Message Terminal Frame + Wave Spire) ---
  const formGroup = new THREE.Group();
  const formMat = makeWireMat(0x00ffff, 0);
  const formBrightMat = makeWireMat(0xd8ffff, 0);
  const terminalFrameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(2.1, 1.6, 0.22));
  formGroup.add(new THREE.LineSegments(terminalFrameGeo, formMat));
  [-0.36, 0.0, 0.36].forEach((yOffset, idx) => {
    const w = idx === 2 ? 0.95 : 1.48;
    const barGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.74, -yOffset, 0.12),
      new THREE.Vector3(-0.74 + w, -yOffset, 0.12),
    ]);
    formGroup.add(new THREE.Line(barGeo, idx === 0 ? formBrightMat : formMat));
    disposables.push(barGeo);
  });
  const sendConeGeo = new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.26, 0));
  const sendCone = new THREE.LineSegments(sendConeGeo, formBrightMat);
  sendCone.position.set(0.68, -0.38, 0.16);
  formGroup.add(sendCone);
  graphGroup.add(formGroup);
  disposables.push(terminalFrameGeo, sendConeGeo);

  // --- 2,400 Morphing Particle Cloud Sculptures ---
  const P_COUNT = 2400;
  const rng = createRng(9924);
  const emailArr = new Float32Array(P_COUNT * 3);
  const phoneArr = new Float32Array(P_COUNT * 3);
  const githubArr = new Float32Array(P_COUNT * 3);
  const linkedinArr = new Float32Array(P_COUNT * 3);
  const formArr = new Float32Array(P_COUNT * 3);
  const liveArr = new Float32Array(P_COUNT * 3);

  const sampleSeg = (
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    jitter = 0.04
  ): [number, number, number] => {
    const t = rng();
    return [
      ax + (bx - ax) * t + (rng() - 0.5) * jitter,
      ay + (by - ay) * t + (rng() - 0.5) * jitter,
      az + (bz - az) * t + (rng() - 0.5) * jitter,
    ];
  };

  const envSegments: [number, number, number, number, number, number][] = [
    [-1.15, 0.75, 0.12, 1.15, 0.75, 0.12],
    [1.15, 0.75, 0.12, 1.15, -0.75, 0.12],
    [1.15, -0.75, 0.12, -1.15, -0.75, 0.12],
    [-1.15, -0.75, 0.12, -1.15, 0.75, 0.12],
    [-1.15, 0.75, -0.12, 1.15, 0.75, -0.12],
    [1.15, 0.75, -0.12, 1.15, -0.75, -0.12],
    [1.15, -0.75, -0.12, -1.15, -0.75, -0.12],
    [-1.15, -0.75, -0.12, -1.15, 0.75, -0.12],
    [-1.15, 0.75, 0.12, 0.0, -0.12, 0.12],
    [1.15, 0.75, 0.12, 0.0, -0.12, 0.12],
    [-1.15, -0.75, 0.12, -0.34, 0.16, 0.12],
    [1.15, -0.75, 0.12, 0.34, 0.16, 0.12],
  ];

  const ghNodeCenters = [
    [-0.42, -0.95, 0],
    [-0.42, -0.45, 0],
    [0.32, 0.08, 0],
    [-0.42, 0.65, 0],
    [-0.42, 1.02, 0],
  ];
  const ghPosAttr = ghOuterGeo.attributes.position;
  const ghEdgeCount = ghPosAttr.count / 2;
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vLerp = new THREE.Vector3();

  for (let i = 0; i < P_COUNT; i++) {
    const u = i / P_COUNT;

    // 1. EMAIL: Envelope + outer orbital halo
    if (i < P_COUNT * 0.74) {
      const seg = envSegments[i % envSegments.length];
      const [px, py, pz] = sampleSeg(seg[0], seg[1], seg[2], seg[3], seg[4], seg[5], 0.07);
      emailArr[i * 3] = px;
      emailArr[i * 3 + 1] = py;
      emailArr[i * 3 + 2] = pz;
    } else {
      const a = u * Math.PI * 16;
      const r = 1.62 + (rng() - 0.5) * 0.12;
      emailArr[i * 3] = Math.cos(a) * r;
      emailArr[i * 3 + 1] = Math.sin(a) * 0.42 + (rng() - 0.5) * 0.08;
      emailArr[i * 3 + 2] = Math.sin(a) * r;
    }

    // 2. GITHUB: Branching DAG + Outer Diamond Cage
    if (i < P_COUNT * 0.48) {
      const sIdx = i % ghEdgeCount;
      vA.fromBufferAttribute(ghPosAttr, sIdx * 2);
      vB.fromBufferAttribute(ghPosAttr, sIdx * 2 + 1);
      vLerp.lerpVectors(vA, vB, rng());
      githubArr[i * 3] = vLerp.x + (rng() - 0.5) * 0.05;
      githubArr[i * 3 + 1] = vLerp.y + (rng() - 0.5) * 0.05;
      githubArr[i * 3 + 2] = vLerp.z + (rng() - 0.5) * 0.05;
    } else if (i < P_COUNT * 0.76) {
      const cPt = branchCurve.getPoint(rng());
      if (i % 2 === 0) {
        githubArr[i * 3] = -0.42 + (rng() - 0.5) * 0.07;
        githubArr[i * 3 + 1] = -1.05 + rng() * 2.1;
        githubArr[i * 3 + 2] = (rng() - 0.5) * 0.07;
      } else {
        githubArr[i * 3] = cPt.x + (rng() - 0.5) * 0.06;
        githubArr[i * 3 + 1] = cPt.y + (rng() - 0.5) * 0.06;
        githubArr[i * 3 + 2] = cPt.z + (rng() - 0.5) * 0.06;
      }
    } else {
      const center = ghNodeCenters[i % ghNodeCenters.length];
      const phi = rng() * Math.PI * 2;
      const cosT = rng() * 2 - 1;
      const sinT = Math.sqrt(Math.max(0, 1 - cosT * cosT));
      const r = 0.06 + rng() * 0.14;
      githubArr[i * 3] = center[0] + r * sinT * Math.cos(phi);
      githubArr[i * 3 + 1] = center[1] + r * cosT;
      githubArr[i * 3 + 2] = center[2] + r * sinT * Math.sin(phi);
    }

    // 3. LINKEDIN: Sculpted 3D "in" Monogram + Architectural Frame
    const zone = i % 10;
    if (zone < 3) {
      // Square outer frame
      const side = i % 4;
      const t = rng() * 2.15 - 1.075;
      const fx = side === 0 ? t : side === 1 ? 1.075 : side === 2 ? -t : -1.075;
      const fy = side === 0 ? 1.075 : side === 1 ? -t : side === 2 ? -1.075 : t;
      linkedinArr[i * 3] = fx + (rng() - 0.5) * 0.06;
      linkedinArr[i * 3 + 1] = fy + (rng() - 0.5) * 0.06;
      linkedinArr[i * 3 + 2] = (rng() - 0.5) * 0.24;
    } else if (zone === 3) {
      // 'i' dot
      linkedinArr[i * 3] = -0.56 + (rng() - 0.5) * 0.24;
      linkedinArr[i * 3 + 1] = 0.54 + (rng() - 0.5) * 0.24;
      linkedinArr[i * 3 + 2] = (rng() - 0.5) * 0.22;
    } else if (zone < 6) {
      // 'i' stem
      linkedinArr[i * 3] = -0.56 + (rng() - 0.5) * 0.22;
      linkedinArr[i * 3 + 1] = -0.62 + rng() * 0.88;
      linkedinArr[i * 3 + 2] = (rng() - 0.5) * 0.2;
    } else if (zone < 8) {
      // 'n' left stem
      linkedinArr[i * 3] = 0.0 + (rng() - 0.5) * 0.22;
      linkedinArr[i * 3 + 1] = -0.62 + rng() * 0.92;
      linkedinArr[i * 3 + 2] = (rng() - 0.5) * 0.2;
    } else {
      // 'n' arch & right leg
      if (i % 2 === 0) {
        linkedinArr[i * 3] = -0.1 + rng() * 0.82;
        linkedinArr[i * 3 + 1] = 0.18 + (rng() - 0.5) * 0.22;
      } else {
        linkedinArr[i * 3] = 0.6 + (rng() - 0.5) * 0.22;
        linkedinArr[i * 3 + 1] = -0.62 + rng() * 0.86;
      }
      linkedinArr[i * 3 + 2] = (rng() - 0.5) * 0.2;
    }

    // 4. PHONE: Curved Handset Receiver + Ear/Mouth Cups + Acoustic Signal Arcs
    if (i < P_COUNT * 0.5) {
      const hPt = handsetCurve.getPoint(rng());
      const a = rng() * Math.PI * 2;
      const rad = 0.08 + rng() * 0.1;
      phoneArr[i * 3] = hPt.x + Math.cos(a) * rad;
      phoneArr[i * 3 + 1] = hPt.y + Math.sin(a) * rad * 0.7;
      phoneArr[i * 3 + 2] = hPt.z + Math.sin(a) * rad;
    } else if (i < P_COUNT * 0.72) {
      const isTop = i % 2 === 0;
      const cx = isTop ? -0.76 : 0.86;
      const cy = isTop ? 0.9 : -0.76;
      const a = rng() * Math.PI * 2;
      const r = 0.14 + rng() * 0.15;
      phoneArr[i * 3] = cx + Math.cos(a) * r;
      phoneArr[i * 3 + 1] = cy + Math.sin(a) * r;
      phoneArr[i * 3 + 2] = 0.12 + (rng() - 0.5) * 0.24;
    } else {
      const wIdx = i % 3;
      const wr = 0.52 + wIdx * 0.36;
      const wa = -0.15 + rng() * (Math.PI * 0.52);
      phoneArr[i * 3] = 0.12 + Math.cos(wa) * wr + (rng() - 0.5) * 0.04;
      phoneArr[i * 3 + 1] = 0.12 + Math.sin(wa) * wr + (rng() - 0.5) * 0.04;
      phoneArr[i * 3 + 2] = (rng() - 0.5) * 0.08;
    }

    // 5. FORM: Message Terminal Tablet + Text Lines + Floating Send Diamond
    if (i < P_COUNT * 0.45) {
      const side = i % 4;
      const t = rng();
      const fx = side === 0 ? -1.05 + t * 2.1 : side === 1 ? 1.05 : side === 2 ? 1.05 - t * 2.1 : -1.05;
      const fy = side === 0 ? 0.8 : side === 1 ? 0.8 - t * 1.6 : side === 2 ? -0.8 : -0.8 + t * 1.6;
      formArr[i * 3] = fx + (rng() - 0.5) * 0.05;
      formArr[i * 3 + 1] = fy + (rng() - 0.5) * 0.05;
      formArr[i * 3 + 2] = (rng() - 0.5) * 0.22;
    } else if (i < P_COUNT * 0.84) {
      const lineIdx = i % 3;
      const maxW = lineIdx === 2 ? 0.95 : 1.48;
      formArr[i * 3] = -0.74 + rng() * maxW;
      formArr[i * 3 + 1] = (lineIdx - 1) * -0.36 + (rng() - 0.5) * 0.06;
      formArr[i * 3 + 2] = 0.12 + (rng() - 0.5) * 0.04;
    } else {
      const phi = rng() * Math.PI * 2;
      const cosT = rng() * 2 - 1;
      const sinT = Math.sqrt(Math.max(0, 1 - cosT * cosT));
      const r = 0.1 + rng() * 0.16;
      formArr[i * 3] = 0.68 + r * sinT * Math.cos(phi);
      formArr[i * 3 + 1] = -0.38 + r * cosT;
      formArr[i * 3 + 2] = 0.16 + r * sinT * Math.sin(phi);
    }

    liveArr[i * 3] = emailArr[i * 3];
    liveArr[i * 3 + 1] = emailArr[i * 3 + 1];
    liveArr[i * 3 + 2] = emailArr[i * 3 + 2];
  }

  const particleGeo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(liveArr, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  particleGeo.setAttribute('position', posAttr);

  const particleMat = new THREE.PointsMaterial({
    size: 0.078,
    map: glowTex,
    color: 0x00ffff,
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const particleCloud = new THREE.Points(particleGeo, particleMat);
  particleCloud.position.set(0, 0.72, 0);
  root.add(particleCloud);
  disposables.push(particleGeo, particleMat);

  return {
    root,
    update: (
      elapsed: number,
      delta: number,
      mode: PedestalMode,
      pointerX: number,
      pointerY: number
    ) => {
      const targetArr =
        mode === 'email'
          ? emailArr
          : mode === 'phone'
            ? phoneArr
            : mode === 'github'
              ? githubArr
              : mode === 'linkedin'
                ? linkedinArr
                : formArr;
      const lerpAlpha = 1 - Math.exp(-5.5 * delta);

      for (let i = 0; i < P_COUNT; i++) {
        const idx = i * 3;
        const tx = targetArr[idx];
        const ty = targetArr[idx + 1] + Math.sin(elapsed * 1.4 + i * 0.03) * 0.022;
        const tz = targetArr[idx + 2];
        liveArr[idx] = THREE.MathUtils.lerp(liveArr[idx], tx, lerpAlpha);
        liveArr[idx + 1] = THREE.MathUtils.lerp(liveArr[idx + 1], ty, lerpAlpha);
        liveArr[idx + 2] = THREE.MathUtils.lerp(liveArr[idx + 2], tz, lerpAlpha);
      }
      posAttr.needsUpdate = true;

      particleCloud.rotation.y = Math.sin(elapsed * 0.38) * 0.35 + pointerX * 0.42;
      particleCloud.rotation.x = pointerY * 0.18;
      graphGroup.rotation.copy(particleCloud.rotation);

      emailMat.opacity = THREE.MathUtils.damp(emailMat.opacity, mode === 'email' ? 0.72 : 0, 7, delta);
      emailBrightMat.opacity = THREE.MathUtils.damp(
        emailBrightMat.opacity,
        mode === 'email' ? 0.9 : 0,
        7,
        delta
      );
      emailGroup.visible = emailMat.opacity > 0.01;

      phoneMat.opacity = THREE.MathUtils.damp(phoneMat.opacity, mode === 'phone' ? 0.65 : 0, 7, delta);
      phoneBrightMat.opacity = THREE.MathUtils.damp(
        phoneBrightMat.opacity,
        mode === 'phone' ? 0.9 : 0,
        7,
        delta
      );
      phoneGroup.visible = phoneMat.opacity > 0.01;

      githubMat.opacity = THREE.MathUtils.damp(githubMat.opacity, mode === 'github' ? 0.55 : 0, 7, delta);
      githubBrightMat.opacity = THREE.MathUtils.damp(
        githubBrightMat.opacity,
        mode === 'github' ? 0.88 : 0,
        7,
        delta
      );
      githubGroup.visible = githubMat.opacity > 0.01;

      liMat.opacity = THREE.MathUtils.damp(liMat.opacity, mode === 'linkedin' ? 0.62 : 0, 7, delta);
      liBrightMat.opacity = THREE.MathUtils.damp(
        liBrightMat.opacity,
        mode === 'linkedin' ? 0.9 : 0,
        7,
        delta
      );
      linkedinGroup.visible = liMat.opacity > 0.01;

      formMat.opacity = THREE.MathUtils.damp(formMat.opacity, mode === 'form' ? 0.62 : 0, 7, delta);
      formBrightMat.opacity = THREE.MathUtils.damp(
        formBrightMat.opacity,
        mode === 'form' ? 0.9 : 0,
        7,
        delta
      );
      formGroup.visible = formMat.opacity > 0.01;

      arcGroup.rotation.y = -elapsed * 0.42;
      arcGroup.rotation.z = Math.sin(elapsed * 0.6) * 0.08;
      portalDiscMat.opacity = 0.12 + Math.sin(elapsed * 1.8) * 0.04;
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
