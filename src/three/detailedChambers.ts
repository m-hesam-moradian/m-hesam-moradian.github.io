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
export function buildVolcanicHorizonTerrain(
  basaltTerrainMaps?: PBRSurfaceMaps,
  lowDetail = false
): {
  root: THREE.Group;
  dispose: () => void;
} {
  const root = new THREE.Group();
  root.position.set(0, -2.5, 0);

  const segs = lowDetail ? 64 : 112;
  const terrainGeo = new THREE.PlaneGeometry(140, 140, segs, segs);
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
  binaryTexB: BinaryTexPair,
  lowDetail = false
) {
  const root = new THREE.Group();
  root.position.set(0, 0, 0);

  const disposables: { dispose: () => void }[] = [];
  const rng = createRng(1001);

  // 1. Stepped Columnar Hexagonal Basalt Plinth with Volcanic Rock PBR Relief & Chamfered Caps
  const basaltCount = lowDetail ? 34 : 46;
  const hexGeo = new THREE.CylinderGeometry(0.45, 0.49, 3.6, 6, lowDetail ? 2 : 4);
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
  const chainLinkGeo = new THREE.TubeGeometry(linkCurve, lowDetail ? 16 : 28, 0.02, lowDetail ? 5 : 8, true);

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
export function buildDriftChamber(glowTex: THREE.CanvasTexture, lowDetail = false) {
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

  // 1. Translucent Obsidian-Glass Spherical Neuron Somas + Inner Nucleus + Smooth Halo Rings
  const somaGeo = new THREE.SphereGeometry(0.35, lowDetail ? 18 : 36, lowDetail ? 14 : 28);
  const somaMat = lowDetail
    ? new THREE.MeshStandardMaterial({
        color: 0x051118,
        emissive: new THREE.Color(0x00ffff),
        emissiveIntensity: 0.18,
        roughness: 0.12,
        metalness: 0.22,
        envMapIntensity: 0.9,
        transparent: true,
        opacity: 0.64,
        depthWrite: false,
      })
    : new THREE.MeshPhysicalMaterial({
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

  const nucleusGeo = new THREE.SphereGeometry(0.11, lowDetail ? 10 : 20, lowDetail ? 8 : 16);
  const nucleusMat = new THREE.MeshBasicMaterial({
    color: 0xb8ffff,
    transparent: true,
    opacity: 0.94,
  });
  const nucleusInstanced = new THREE.InstancedMesh(nucleusGeo, nucleusMat, neurons.length);
  nucleusInstanced.frustumCulled = false;
  root.add(nucleusInstanced);

  const ringGeo = new THREE.TorusGeometry(0.43, 0.015, lowDetail ? 8 : 14, lowDetail ? 32 : 56);
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

  const heroOuterGeo = new THREE.SphereGeometry(0.68, lowDetail ? 22 : 40, lowDetail ? 16 : 32);
  const heroOuterMat = lowDetail
    ? new THREE.MeshStandardMaterial({
        color: 0x06161e,
        emissive: new THREE.Color(0x00ffff),
        emissiveIntensity: 0.18,
        roughness: 0.12,
        metalness: 0.24,
        envMapIntensity: 0.9,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    : new THREE.MeshPhysicalMaterial({
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

  const heroRingAGeo = new THREE.TorusGeometry(0.76, 0.013, lowDetail ? 8 : 14, lowDetail ? 36 : 64);
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
  keySkills: ResumeKeySkill[],
  lowDetail = false
) {
  const root = new THREE.Group();
  root.position.set(0, yPos, zPos);

  const disposables: { dispose: () => void }[] = [];
  const rng = createRng(3303);

  // Subtle deep-space starfield well outside the gravitational shadow
  const starCount = lowDetail ? 140 : 260;
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
    color: 0x9effff,
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
      float a = 0.54;
      for (int i = 0; i < ${lowDetail ? 2 : 4}; i++) {
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
  const horizonGeo = new THREE.SphereGeometry(horizonRadius, lowDetail ? 36 : 64, lowDetail ? 28 : 64);
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
  const haloGeo = new THREE.RingGeometry(1.065, 3.85, lowDetail ? 96 : 220, lowDetail ? 16 : 64);
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

        // Dark Obsidian-Cyan -> Electric #00FFFF Cyan -> Incandescent Cyan-White
        vec3 deepCyan = vec3(0.0, 0.24, 0.24);
        vec3 midCyan = vec3(0.0, 0.8, 0.8);
        vec3 electricCyan = vec3(0.0, 1.0, 1.0);
        vec3 pureWhite = vec3(0.88, 1.0, 1.0);

        float intensity = clamp(
          gas * archEnvelope * 1.05 * doppler +
          photonCorona * 0.72 * doppler +
          photonBand * 1.25 * photonDoppler,
          0.0,
          1.25
        );

        vec3 col = mix(deepCyan, midCyan, smoothstep(0.04, 0.34, intensity));
        col = mix(col, electricCyan, smoothstep(0.32, 0.74, intensity));
        col = mix(col, pureWhite, smoothstep(0.76, 1.12, intensity));

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
  const diskGeo = new THREE.RingGeometry(1.07, 7.6, lowDetail ? 96 : 220, lowDetail ? 20 : 72);
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

        vec3 obsidianDust = vec3(0.006, 0.044, 0.046);
        vec3 deepCyan = vec3(0.0, 0.34, 0.34);
        vec3 brightCyan = vec3(0.0, 0.88, 0.88);
        vec3 electricCyan = vec3(0.0, 1.0, 1.0);
        vec3 pureWhite = vec3(0.9, 1.0, 1.0);

        float lum = clamp(
          coreHeat * (0.78 + 0.45 * wisp) * doppler +
          midPlasma * 0.68 * doppler +
          wisp * 0.22 * (1.0 - smoothstep(2.5, 6.8, r)),
          0.0,
          1.2
        );

        vec3 col = mix(obsidianDust, deepCyan, smoothstep(0.02, 0.22, lum));
        col = mix(col, brightCyan, smoothstep(0.2, 0.52, lum));
        col = mix(col, electricCyan, smoothstep(0.5, 0.82, lum));
        col = mix(col, pureWhite, smoothstep(0.84, 1.12, lum));

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
  const coronaGeo = new THREE.RingGeometry(1.08, 3.15, lowDetail ? 80 : 180, lowDetail ? 10 : 32);
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

        vec3 col = mix(vec3(0.0, 1.0, 1.0), vec3(0.88, 1.0, 1.0), smoothstep(0.35, 0.92, rim * (0.7 + turb * 0.5)));
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
 * CH.04 // KNOWLEDGE (QUANTUM KNOWLEDGE FIELD):
 * Deep scientific quantum environment with animated GPU wave-interference terrain,
 * reflective dark obsidian floor, holographic quantum containment & interference platform
 * (zero solid plinth), entanglement filaments, and two dual-morphing quantum entities:
 * - Selected (Observed / Positioned): Collapses smoothly onto the center platform as a
 *   sharply focused, detailed Photon / Atom (Fresnel glass core with hexagonal quantum
 *   micro-pattern, geodesic/octahedral lattice, precision reticle ring, 4 elliptical orbits,
 *   haloed sub-spheres & tapered particle comet wakes).
 * - Unselected (Unobserved / Superposition): Decoheres smoothly into the upper-left background
 *   with soft bokeh depth blur, multi-position ghost superposition echoes, live-deforming
 *   energy filaments, shifting geometric constellation & drifting mist lobes.
 */
export function buildResearchChamber(
  yPos: number,
  zPos: number,
  glowTex: THREE.CanvasTexture,
  lowDetail = false
) {
  const root = new THREE.Group();
  root.position.set(0, yPos, zPos);

  const disposables: { dispose: () => void }[] = [];
  const rng = createRng(4404);

  // 3-slot directional carousel:
  // Active entity sits centered on the quantum platform (PRIMARY_POS);
  // 02 rests on the RIGHT when 01 is active; selecting 02 swipes both LEFT (01 -> LEFT_POS, 02 -> PRIMARY_POS);
  // selecting 01 swipes both RIGHT (01 -> PRIMARY_POS, 02 -> RIGHT_POS).
  const PRIMARY_POS = new THREE.Vector3(-0.35, 0.24, 1.05);
  const LEFT_POS = new THREE.Vector3(-4.25, 1.05, -2.45);
  const RIGHT_POS = new THREE.Vector3(3.45, 1.88, -2.55);
  const floorLevelY = -2.22;

  // =========================================================================
  // 1. IMMERSIVE QUANTUM ENVIRONMENT (Particles, Curved Wave Circle, Platform & Bridges)
  // =========================================================================

  // A. Multi-depth ambient quantum dust particles
  const ambientCount = lowDetail ? 200 : 420;
  const ambientPos = new Float32Array(ambientCount * 3);
  for (let i = 0; i < ambientCount; i++) {
    const r = 3.5 + rng() * 16.5;
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    ambientPos[i * 3] = r * Math.sin(phi) * Math.cos(theta) * 1.28;
    ambientPos[i * 3 + 1] = r * Math.cos(phi) * 0.62 + 0.45;
    ambientPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 2.2;
  }
  const ambientGeo = new THREE.BufferGeometry();
  ambientGeo.setAttribute('position', new THREE.BufferAttribute(ambientPos, 3));
  const ambientMat = new THREE.PointsMaterial({
    color: 0xa8f8ff,
    map: glowTex,
    size: 0.06,
    transparent: true,
    opacity: 0.34,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const ambientDust = new THREE.Points(ambientGeo, ambientMat);
  root.add(ambientDust);
  disposables.push(ambientGeo, ambientMat);

  // B. Swirling distant probability wave trails (clean sky waves without bokeh blobs or halo rings)
  const bgGroup = new THREE.Group();
  root.add(bgGroup);
  const bgTrailMats: THREE.LineBasicMaterial[] = [];
  for (let w = 0; w < 4; w++) {
    const pts: THREE.Vector3[] = [];
    const segs = 72;
    const yBase = -0.5 + w * 0.72;
    const zDepth = -6.2 - w * 1.2;
    for (let s = 0; s <= segs; s++) {
      const u = s / segs;
      const x = (u - 0.5) * 19.0;
      const y = yBase + Math.sin(u * Math.PI * (2 + w * 0.45) + w) * (0.85 + w * 0.14);
      const z = zDepth + Math.cos(u * Math.PI * 2 + w * 1.2) * 1.0;
      pts.push(new THREE.Vector3(x, y, z));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: w % 2 === 0 ? 0x00ffff : 0x6ce8ff,
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    bgGroup.add(new THREE.Line(geo, mat));
    bgTrailMats.push(mat);
    disposables.push(geo, mat);
  }

  // C. Curved Circular Infinite-Horizon Quantum Probability Wave Field (No flat square, no stones)
  const waveCols = lowDetail ? 38 : 68;
  const waveRows = lowDetail ? 38 : 68;
  const waveRadius = 19.5;
  const wavePlaneGeo = new THREE.PlaneGeometry(waveRadius * 2, waveRadius * 2, waveCols, waveRows);
  wavePlaneGeo.rotateX(-Math.PI / 2);

  // Trim square grid cleanly to a circular disc geometry before wireframe extraction
  const srcPos = wavePlaneGeo.attributes.position;
  const srcIndex = wavePlaneGeo.index;
  const keptIndices: number[] = [];
  if (srcIndex) {
    const rMaxSq = waveRadius * waveRadius;
    for (let i = 0; i < srcIndex.count; i += 3) {
      const a = srcIndex.getX(i);
      const b = srcIndex.getX(i + 1);
      const c = srcIndex.getX(i + 2);
      const cx = (srcPos.getX(a) + srcPos.getX(b) + srcPos.getX(c)) / 3;
      const cz = (srcPos.getZ(a) + srcPos.getZ(b) + srcPos.getZ(c)) / 3;
      if (cx * cx + cz * cz <= rMaxSq) {
        keptIndices.push(a, b, c);
      }
    }
    wavePlaneGeo.setIndex(keptIndices);
  }
  const waveWireGeo = new THREE.WireframeGeometry(wavePlaneGeo);
  wavePlaneGeo.dispose();

  const waveShaderMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0.54 },
    },
    vertexShader: `
      uniform float uTime;
      varying float vCrest;
      varying float vFade;

      void main() {
        vec3 pos = position;
        float r = length(pos.xz);
        float angle = atan(pos.z, pos.x);
        float flatten = smoothstep(1.85, 5.1, r);

        // Flowing quantum interference waves + subtle radial harmonics
        float standing =
          sin(pos.x * 0.54 + pos.z * 0.34 + uTime * 0.44) * 0.36 +
          cos(pos.x * 0.84 - pos.z * 0.58 - uTime * 0.34) * 0.22 +
          sin(r * 1.35 - uTime * 1.05 + cos(angle * 3.0) * 0.45) * 0.16;

        // Bend the circular ground upward toward a curved infinite quantum horizon
        float horizonBend = pow(max(0.0, r - 4.8) * 0.082, 1.55) * 1.85;
        float waveHeight = max(-0.04, (standing + 0.22) * flatten) + horizonBend;

        pos.y = waveHeight;
        vCrest = clamp((standing + 0.28) * 0.95 + horizonBend * 0.28, 0.08, 1.0);
        // Seamless radial fade inside the circle so no outer boundary is ever visible
        vFade = (1.0 - smoothstep(7.2, 19.0, r)) * smoothstep(1.25, 2.35, r);

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying float vCrest;
      varying float vFade;

      void main() {
        vec3 deepCol = vec3(0.01, 0.08, 0.13);
        vec3 cyanCol = vec3(0.0, 0.94, 1.0);
        vec3 col = mix(deepCol, cyanCol, vCrest * 0.86);
        float alpha = vFade * (0.2 + vCrest * 0.58) * uOpacity;
        if (alpha < 0.008) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const waveMesh = new THREE.LineSegments(waveWireGeo, waveShaderMat);
  waveMesh.position.set(PRIMARY_POS.x, floorLevelY, PRIMARY_POS.z);
  root.add(waveMesh);
  disposables.push(waveWireGeo, waveShaderMat);

  // D. Pure Holographic Quantum Emitter & Interference Platform beneath PRIMARY_POS
  const platformGroup = new THREE.Group();
  platformGroup.position.set(PRIMARY_POS.x, floorLevelY + 0.01, PRIMARY_POS.z);
  root.add(platformGroup);

  // 1) Animated GPU Quantum Interference Wave Disc
  const quantumDiscGeo = new THREE.PlaneGeometry(7.2, 7.2);
  quantumDiscGeo.rotateX(-Math.PI / 2);
  const quantumDiscMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1.0 },
    },
    vertexShader: `
      varying vec2 vLocalUv;
      void main() {
        vLocalUv = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      varying vec2 vLocalUv;

      void main() {
        float r = length(vLocalUv);
        if (r > 1.0) discard;

        float angle = atan(vLocalUv.y, vLocalUv.x);
        float coreGlow = exp(-r * 4.6) * 0.22;

        // Concentric outward standing probability interference waves
        float waveA = pow(0.5 + 0.5 * sin(r * 24.0 - uTime * 2.1), 5.0);
        float harmonic = 0.5 + 0.5 * cos(angle * 6.0 + uTime * 0.55 - r * 8.0);
        float ringEnvelope = smoothstep(0.08, 0.25, r) * (1.0 - smoothstep(0.65, 1.0, r));

        // Precision azimuthal quantum calibration ticks near outer perimeter
        float tickZone = smoothstep(0.54, 0.56, r) * (1.0 - smoothstep(0.61, 0.63, r));
        float ticks = step(0.88, abs(cos(angle * 24.0 - uTime * 0.15))) * tickZone * 0.36;

        // Sharp inner containment ring harmonic
        float innerRing = exp(-pow((r - 0.36) * 26.0, 2.0)) * 0.44;
        float midRing = exp(-pow((r - 0.58) * 22.0, 2.0)) * 0.3;

        float intensity =
          coreGlow +
          waveA * harmonic * ringEnvelope * 0.32 +
          innerRing +
          midRing +
          ticks;

        vec3 col = mix(vec3(0.0, 0.84, 0.96), vec3(0.75, 0.98, 1.0), clamp(coreGlow * 0.7 + innerRing * 0.45, 0.0, 1.0));
        float alpha = clamp(intensity, 0.0, 0.82) * (1.0 - smoothstep(0.82, 1.0, r)) * uOpacity;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const quantumDiscMesh = new THREE.Mesh(quantumDiscGeo, quantumDiscMat);
  quantumDiscMesh.position.y = 0.025;
  platformGroup.add(quantumDiscMesh);
  disposables.push(quantumDiscGeo, quantumDiscMat);

  // 2) Elevated Stepped Concentric Holographic Rings + Segmented Energy Containment Arcs
  const platformRings: THREE.Mesh[] = [];
  const platformRingMats: THREE.MeshBasicMaterial[] = [];
  [
    { r: 0.62, y: 0.035, op: 0.78, col: 0xd8ffff },
    { r: 1.05, y: 0.065, op: 0.62, col: 0x00ffff },
    { r: 1.48, y: 0.095, op: 0.48, col: 0x00ffff },
    { r: 1.92, y: 0.045, op: 0.34, col: 0x70f8ff },
  ].forEach((cfg) => {
    const rg = new THREE.RingGeometry(cfg.r - 0.022, cfg.r, 96);
    rg.rotateX(-Math.PI / 2);
    const rm = new THREE.MeshBasicMaterial({
      color: cfg.col,
      transparent: true,
      opacity: cfg.op,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const rmMesh = new THREE.Mesh(rg, rm);
    rmMesh.position.y = cfg.y;
    platformGroup.add(rmMesh);
    platformRings.push(rmMesh);
    platformRingMats.push(rm);
    disposables.push(rg, rm);
  });

  const containmentArcs: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; speed: number }[] = [];
  [
    { r: 0.86, y: 0.12, arc: Math.PI * 0.58, speed: 0.32 },
    { r: 1.28, y: 0.18, arc: Math.PI * 0.44, speed: -0.24 },
    { r: 1.7, y: 0.09, arc: Math.PI * 0.36, speed: 0.18 },
  ].forEach((cfg, idx) => {
    const ag = new THREE.TorusGeometry(cfg.r, 0.011, 8, 64, cfg.arc);
    ag.rotateX(Math.PI / 2);
    const am = new THREE.MeshBasicMaterial({
      color: idx === 0 ? 0xd8ffff : 0x00ffff,
      transparent: true,
      opacity: 0.62 - idx * 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let copy = 0; copy < 2; copy++) {
      const m = new THREE.Mesh(ag, am);
      m.position.y = cfg.y;
      m.rotation.y = copy * Math.PI + idx * 0.7;
      platformGroup.add(m);
      containmentArcs.push({ mesh: m, mat: am, speed: cfg.speed });
    }
    disposables.push(ag, am);
  });

  // 3) Delicate Ascending Quantum Energy Flux Sparks from the emitter platform
  const fluxCount = 96;
  const fluxSeed = new Float32Array(fluxCount * 3);
  const fluxPos = new Float32Array(fluxCount * 3);
  for (let i = 0; i < fluxCount; i++) {
    fluxSeed[i * 3] = rng(); // phase
    fluxSeed[i * 3 + 1] = 0.24 + rng() * 1.2; // radius
    fluxSeed[i * 3 + 2] = 0.35 + rng() * 0.65; // speed factor
    fluxPos[i * 3] = 0;
    fluxPos[i * 3 + 1] = 0;
    fluxPos[i * 3 + 2] = 0;
  }
  const fluxGeo = new THREE.BufferGeometry();
  fluxGeo.setAttribute('position', new THREE.BufferAttribute(fluxPos, 3));
  fluxGeo.setAttribute('aSeed', new THREE.BufferAttribute(fluxSeed, 3));
  const fluxMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.5) },
      uOpacity: { value: 1.0 },
    },
    vertexShader: `
      attribute vec3 aSeed;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vLife;

      void main() {
        float life = fract(aSeed.x + uTime * 0.14 * aSeed.z);
        vLife = life;
        float angle = aSeed.x * 6.28318 + uTime * 0.55 * aSeed.z + life * 2.2;
        float radius = aSeed.y * (1.0 - life * 0.62);
        vec3 pos = vec3(
          cos(angle) * radius,
          0.08 + life * 2.55,
          sin(angle) * radius
        );
        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPos;
        gl_PointSize = (0.24 + (1.0 - life) * 0.22) * uPixelRatio * (105.0 / max(1.0, -mvPos.z));
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying float vLife;

      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv) * 2.0;
        if (d > 1.0) discard;
        float glow = pow(1.0 - d, 2.8);
        float fade = smoothstep(0.0, 0.18, vLife) * (1.0 - smoothstep(0.62, 1.0, vLife));
        gl_FragColor = vec4(vec3(0.25, 0.94, 1.0), glow * fade * 0.34 * uOpacity);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const fluxPoints = new THREE.Points(fluxGeo, fluxMat);
  platformGroup.add(fluxPoints);
  disposables.push(fluxGeo, fluxMat);

  // Fine vertical phase-lock tether beam from emitter focal center into the focused state
  const beamGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.04, 0),
    new THREE.Vector3(0, 1.72, 0),
  ]);
  const beamMat = new THREE.LineBasicMaterial({
    color: 0x72f6ff,
    transparent: true,
    opacity: 0.15,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  platformGroup.add(new THREE.Line(beamGeo, beamMat));
  disposables.push(beamGeo, beamMat);

  // E. Quantum Entanglement Bridges & Traveling Phase Sparks for Left (01 <-> Center) and Right (Center <-> 02)
  const createSideBridges = (farPos: THREE.Vector3, count: number) => {
    const curves: THREE.CatmullRomCurve3[] = [];
    const mats: THREE.LineBasicMaterial[] = [];
    for (let b = 0; b < count; b++) {
      const sign = b === 0 ? 1 : -1;
      const midA = PRIMARY_POS.clone().lerp(farPos, 0.34);
      const midB = PRIMARY_POS.clone().lerp(farPos, 0.68);
      midA.y += sign * 0.38 + 0.16;
      midB.y -= sign * 0.34 - 0.22;
      midA.z += sign * 0.45;
      midB.z -= sign * 0.42;
      const curve = new THREE.CatmullRomCurve3([PRIMARY_POS.clone(), midA, midB, farPos.clone()]);
      curves.push(curve);
      const pts = curve.getPoints(56);
      const bGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const bMat = new THREE.LineBasicMaterial({
        color: b === 0 ? 0x9efaff : 0x00ffff,
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      root.add(new THREE.Line(bGeo, bMat));
      mats.push(bMat);
      disposables.push(bGeo, bMat);
    }

    const sCount = 24;
    const sArr = new Float32Array(sCount * 3);
    const sGeo = new THREE.BufferGeometry();
    const sAttr = new THREE.BufferAttribute(sArr, 3);
    sAttr.setUsage(THREE.DynamicDrawUsage);
    sGeo.setAttribute('position', sAttr);
    const sMat = new THREE.PointsMaterial({
      color: 0xb8fbff,
      map: glowTex,
      size: 0.085,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sPoints = new THREE.Points(sGeo, sMat);
    root.add(sPoints);
    disposables.push(sGeo, sMat);
    const sMeta = Array.from({ length: sCount }, (_, i) => ({
      curveIdx: i % curves.length,
      speed: (i % 2 === 0 ? 1 : -1) * (0.09 + rng() * 0.14),
      offset: rng(),
    }));
    return { curves, mats, sCount, sAttr, sMat, sPoints, sMeta };
  };

  const leftBridges = createSideBridges(LEFT_POS, 2);
  const rightBridges = createSideBridges(RIGHT_POS, 2);
  const _bridgeTmp = new THREE.Vector3();

  // =========================================================================
  // 2. DUAL-MORPHING QUANTUM STATE BUILDER (Focused Photon <-> Superposition)
  // =========================================================================
  const cOrbCyan = new THREE.Color(0x00ffff);
  const cOrbIce = new THREE.Color(0xe0ffff);
  const cDeep = new THREE.Color(0x0b7b9e);
  const cAqua = new THREE.Color(0x38ffe8);
  const cTmp = new THREE.Color();

  const ORBIT_BANK_A = [
    { rx: 1.56, rz: 0.68, rot: [0.32, 0.18, 0.56], speed: 0.72, phase: 0.4 },
    { rx: 1.56, rz: 0.68, rot: [0.32, 0.18, -0.56], speed: -0.66, phase: 2.3 },
    { rx: 1.54, rz: 0.66, rot: [0.28, 0.25, 1.54], speed: 0.58, phase: 4.1 },
    { rx: 1.72, rz: 0.74, rot: [1.34, 0.12, 0.08], speed: 0.48, phase: 1.2 },
  ];
  const ORBIT_BANK_B = [
    { rx: 1.58, rz: 0.68, rot: [0.42, -0.22, 0.48], speed: -0.7, phase: 0.9 },
    { rx: 1.58, rz: 0.68, rot: [-0.36, 0.24, -0.62], speed: 0.64, phase: 2.7 },
    { rx: 1.52, rz: 0.66, rot: [0.24, -0.28, 1.48], speed: 0.56, phase: 4.4 },
    { rx: 1.7, rz: 0.72, rot: [1.28, -0.18, -0.14], speed: -0.5, phase: 1.6 },
  ];

  const subGeo = new THREE.SphereGeometry(0.068, 16, 16);
  const subRingGeo = new THREE.RingGeometry(0.084, 0.098, 28);
  disposables.push(subGeo, subRingGeo);

  const createQuantumEntity = (variant: 0 | 1) => {
    const unfocusedPos = variant === 0 ? LEFT_POS : RIGHT_POS;
    const entityGroup = new THREE.Group();
    entityGroup.position.copy(variant === 0 ? PRIMARY_POS : RIGHT_POS);
    root.add(entityGroup);

    // Raycast Hit Sphere
    const hitGeo = new THREE.SphereGeometry(1.72, 16, 16);
    const hitMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,
    });
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.userData.quantumStateIndex = variant;
    entityGroup.add(hitMesh);
    disposables.push(hitGeo, hitMat);

    const orbitCfgs = variant === 0 ? ORBIT_BANK_A : ORBIT_BANK_B;
    const accentHex = variant === 0 ? 0x00ffff : 0x30f7ff;

    // -----------------------------------------------------------------------
    // A) Morphing Particle Cloud (Superposition Chaos <-> Positioned Orbits)
    // -----------------------------------------------------------------------
    const pCount = lowDetail ? 1050 : 2400;
    const pChaos = new Float32Array(pCount * 3);
    const pOrbit = new Float32Array(pCount * 3);
    const pColor = new Float32Array(pCount * 3);
    const pSize = new Float32Array(pCount);
    const pSeed = new Float32Array(pCount * 3);

    const tmpEuler = new THREE.Euler();
    const tmpVec = new THREE.Vector3();

    for (let i = 0; i < pCount; i++) {
      // 1. Unobserved Superposition Position (multi-lobe irregular quantum uncertainty)
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(2 * rng() - 1);
      const lobe =
        0.72 +
        0.42 * Math.sin(theta * 2.0 + phi * 3.0 + variant * 1.4) +
        0.26 * Math.cos(theta * 5.0 - phi * 2.0);
      const radiusBias = i < 480 ? 0.22 + rng() * 0.64 : 0.64 + rng() * 0.74;
      const rad = Math.max(0.14, lobe * radiusBias);

      pChaos[i * 3] = rad * Math.sin(phi) * Math.cos(theta) * 1.18;
      pChaos[i * 3 + 1] = rad * Math.cos(phi) * 0.94;
      pChaos[i * 3 + 2] = rad * Math.sin(phi) * Math.sin(theta);

      // 2. Focused / Positioned Photon Coordinate (75% dusted on the 4 ellipses, 25% inner photon corona)
      if (i < Math.floor(pCount * 0.75)) {
        const orb = orbitCfgs[i % orbitCfgs.length];
        const ang = rng() * Math.PI * 2;
        const spreadR = (rng() - 0.5) * 0.13;
        const spreadY = (rng() - 0.5) * 0.08;
        tmpVec.set(
          Math.cos(ang) * (orb.rx + spreadR),
          spreadY,
          Math.sin(ang) * (orb.rz + spreadR * 0.6)
        );
        tmpEuler.set(orb.rot[0], orb.rot[1], orb.rot[2]);
        tmpVec.applyEuler(tmpEuler);
        pOrbit[i * 3] = tmpVec.x;
        pOrbit[i * 3 + 1] = tmpVec.y;
        pOrbit[i * 3 + 2] = tmpVec.z;
      } else {
        const cr = 0.48 + rng() * 0.28;
        const ct = rng() * Math.PI * 2;
        const cp = Math.acos(2 * rng() - 1);
        pOrbit[i * 3] = cr * Math.sin(cp) * Math.cos(ct);
        pOrbit[i * 3 + 1] = cr * Math.cos(cp);
        pOrbit[i * 3 + 2] = cr * Math.sin(cp) * Math.sin(ct);
      }

      const k = rng();
      cTmp
        .copy(cDeep)
        .lerp(variant === 0 ? cOrbCyan : cAqua, 0.35 + k * 0.65)
        .lerp(cOrbIce, k * k * 0.52);
      pColor[i * 3] = cTmp.r;
      pColor[i * 3 + 1] = cTmp.g;
      pColor[i * 3 + 2] = cTmp.b;

      pSize[i] = 0.048 + rng() * 0.068;
      pSeed[i * 3] = rng();
      pSeed[i * 3 + 1] = rng();
      pSeed[i * 3 + 2] = rng();
    }

    const morphGeo = new THREE.BufferGeometry();
    morphGeo.setAttribute('position', new THREE.BufferAttribute(pChaos, 3));
    morphGeo.setAttribute('aOrbitPos', new THREE.BufferAttribute(pOrbit, 3));
    morphGeo.setAttribute('aColor', new THREE.BufferAttribute(pColor, 3));
    morphGeo.setAttribute('aSize', new THREE.BufferAttribute(pSize, 1));
    morphGeo.setAttribute('aSeed', new THREE.BufferAttribute(pSeed, 3));

    const morphMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uFocus: { value: variant === 0 ? 1.0 : 0.0 },
        uCollapse: { value: variant === 0 ? 1.0 : 0.0 },
        uHover: { value: 0.0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.5) },
        uOpacity: { value: 1.0 },
      },
      vertexShader: `
        attribute vec3 aOrbitPos;
        attribute float aSize;
        attribute vec3 aSeed;
        attribute vec3 aColor;
        uniform float uTime;
        uniform float uFocus;
        uniform float uCollapse;
        uniform float uPixelRatio;
        varying vec3 vColor;
        varying float vFocus;

        void main() {
          vColor = aColor;
          vFocus = uFocus;

          // 1) Superposition chaotic wave advection + dual-state split echo
          vec3 chaos = position;
          float instability = 1.0 - uCollapse * 0.85;
          float pulse = 1.0 + 0.16 * sin(uTime * 0.72 + aSeed.x * 6.2831) * instability;
          chaos *= pulse;
          chaos.x += sin(uTime * (0.72 + aSeed.y * 0.55) + chaos.y * 2.1 + aSeed.z * 6.28) * 0.26 * instability;
          chaos.y += cos(uTime * (0.64 + aSeed.z * 0.48) + chaos.z * 2.2 + aSeed.x * 6.28) * 0.23 * instability;
          chaos.z += sin(uTime * (0.76 + aSeed.x * 0.52) + chaos.x * 1.9 + aSeed.y * 6.28) * 0.24 * instability;

          // Subtle superposition spatial offset between two quantum phase lobes
          float lobeShift = (step(0.5, aSeed.z) - 0.5) * 0.48 * (1.0 - uCollapse);
          chaos.x += lobeShift * cos(uTime * 0.45 + aSeed.x);
          chaos.y += lobeShift * 0.45 * sin(uTime * 0.52 + aSeed.y);

          // 2) Focused / Positioned photon state with delicate luminous shimmer
          vec3 orbit = aOrbitPos + normalize(aOrbitPos + vec3(0.0001)) * sin(uTime * 1.5 + aSeed.x * 6.283) * 0.016;

          vec3 pos = mix(chaos, orbit, uCollapse);

          // Mid-transition dispersion swirl so focused-to-superposition morph reads unmistakably
          float transSwirl = sin(uCollapse * 3.14159);
          float swirlAng = transSwirl * (1.4 + aSeed.y * 1.8) * (aSeed.z > 0.5 ? 1.0 : -1.0);
          float cs = cos(swirlAng);
          float sn = sin(swirlAng);
          pos.xz = mat2(cs, -sn, sn, cs) * pos.xz;
          pos += normalize(pos + vec3(0.0001)) * transSwirl * (0.28 + aSeed.x * 0.34);

          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPos;
          float blurExpand = mix(1.58, 0.86, uFocus);
          gl_PointSize = aSize * uPixelRatio * blurExpand * (265.0 / max(1.0, -mvPos.z));
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        uniform float uHover;
        varying vec3 vColor;
        varying float vFocus;

        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv) * 2.0;
          if (d > 1.0) discard;

          float sharpCore = smoothstep(1.0, 0.04, d);
          float focusPower = mix(1.25, 3.35, vFocus);
          float radial = pow(max(0.0, 1.0 - d), focusPower);
          float alpha = radial * mix(0.38 + uHover * 0.26, 0.96, vFocus) * uOpacity;
          vec3 col = vColor * mix(0.68 + uHover * 0.28, 1.25, vFocus);
          col += vec3(0.85, 1.0, 1.0) * sharpCore * 0.36 * vFocus;

          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const morphPoints = new THREE.Points(morphGeo, morphMat);
    entityGroup.add(morphPoints);
    disposables.push(morphGeo, morphMat);

    // -----------------------------------------------------------------------
    // B) Unified Quantum Photon Core (Same Entity in Superposition <-> Focused)
    // -----------------------------------------------------------------------
    const coreGroup = new THREE.Group();
    entityGroup.add(coreGroup);

    // Translucent outer glass sphere: wide soft blur when unfocused -> crisp Fresnel crystal when focused
    const glassGeo = new THREE.SphereGeometry(0.49, 36, 36);
    const glassMat = new THREE.ShaderMaterial({
      uniforms: {
        uFocus: { value: variant === 0 ? 1.0 : 0.0 },
        uTime: { value: 0 },
        uTint: { value: new THREE.Color(accentHex) },
      },
      vertexShader: `
        varying vec3 vNormalV;
        varying vec3 vViewDir;
        varying vec3 vLocalPos;
        void main() {
          vLocalPos = position;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vNormalV = normalize(normalMatrix * normal);
          vViewDir = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform float uFocus;
        uniform float uTime;
        uniform vec3 uTint;
        varying vec3 vNormalV;
        varying vec3 vViewDir;
        varying vec3 vLocalPos;

        void main() {
          float ndotv = clamp(dot(normalize(vNormalV), normalize(vViewDir)), 0.0, 1.0);
          float fresnelPower = mix(1.1, 2.5, uFocus);
          float fresnel = pow(1.0 - ndotv, fresnelPower);
          float innerGlow = pow(ndotv, 1.8) * mix(0.14, 0.28, uFocus);

          float wavePattern =
            sin(vLocalPos.x * 22.0 + uTime * 1.4) *
            sin(vLocalPos.y * 22.0 - uTime * 1.1) *
            sin(vLocalPos.z * 22.0 + uTime * 0.9);
          float microLattice = smoothstep(0.35, 0.9, abs(wavePattern)) * 0.16 * uFocus;

          vec3 col = mix(uTint, vec3(0.88, 1.0, 1.0), (fresnel * 0.72 + microLattice) * uFocus);
          float alpha = (fresnel * mix(0.28, 0.92, uFocus) + innerGlow + microLattice + 0.04);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    coreGroup.add(glassMesh);
    disposables.push(glassGeo, glassMat);

    // Inner precision lattice geometry (expands & softens in superposition -> locks tight in focus)
    const innerBase =
      variant === 0 ? new THREE.IcosahedronGeometry(0.465, 2) : new THREE.OctahedronGeometry(0.465, 2);
    const innerWire = new THREE.WireframeGeometry(innerBase);
    innerBase.dispose();
    const innerWireMat = new THREE.LineBasicMaterial({
      color: variant === 0 ? 0x72f9ff : 0x5effec,
      transparent: true,
      opacity: 0.46,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const innerLatticeMesh = new THREE.LineSegments(innerWire, innerWireMat);
    coreGroup.add(innerLatticeMesh);
    disposables.push(innerWire, innerWireMat);

    // Equatorial reticle ring (expands/tilts in superposition -> snaps crisp around core when focused)
    const eqReticleGeo = new THREE.RingGeometry(0.56, 0.576, 72);
    eqReticleGeo.rotateX(Math.PI / 2);
    const eqReticleMat = new THREE.MeshBasicMaterial({
      color: 0xb8fbff,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const eqReticleMesh = new THREE.Mesh(eqReticleGeo, eqReticleMat);
    eqReticleMesh.rotation.set(0.28, 0.0, variant === 0 ? 0.18 : -0.22);
    coreGroup.add(eqReticleMesh);
    disposables.push(eqReticleGeo, eqReticleMat);

    // Bright photon nucleus + subtle aura sprite
    const nucleusGeo = new THREE.SphereGeometry(0.155, 24, 24);
    const nucleusMat = new THREE.MeshBasicMaterial({
      color: 0xecffff,
      transparent: true,
      opacity: 0.92,
    });
    const nucleusMesh = new THREE.Mesh(nucleusGeo, nucleusMat);
    coreGroup.add(nucleusMesh);
    disposables.push(nucleusGeo, nucleusMat);

    const auraMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: accentHex,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const auraSprite = new THREE.Sprite(auraMat);
    auraSprite.scale.set(1.5, 1.5, 1);
    coreGroup.add(auraSprite);
    disposables.push(auraMat);

    // 3 Superposition Core Echoes that physically split apart when unfocused and converge into nucleus on focus
    const ghostGeo = new THREE.SphereGeometry(0.32, 18, 18);
    disposables.push(ghostGeo);
    const ghostEchoes: {
      mesh: THREE.Mesh;
      mat: THREE.MeshBasicMaterial;
      base: THREE.Vector3;
      phase: number;
    }[] = [];
    for (let g = 0; g < 3; g++) {
      const mat = new THREE.MeshBasicMaterial({
        color: g === 0 ? 0x00ffff : 0x72f8ff,
        wireframe: g === 1,
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const m = new THREE.Mesh(ghostGeo, mat);
      const angle = (g / 3) * Math.PI * 2 + variant * 1.1;
      const base = new THREE.Vector3(
        Math.cos(angle) * 0.52,
        Math.sin(angle * 1.3) * 0.34,
        Math.sin(angle) * 0.38
      );
      m.position.copy(base);
      m.scale.setScalar(0.68 + g * 0.12);
      coreGroup.add(m);
      disposables.push(mat);
      ghostEchoes.push({ mesh: m, mat, base, phase: rng() * Math.PI * 2 });
    }

    // -----------------------------------------------------------------------
    // C) Unified Dynamic Orbital Paths + Satellites (Morph Wave <-> Crisp Ellipses)
    // -----------------------------------------------------------------------
    const orbitSegs = lowDetail ? 52 : 96;
    const orbits: {
      group: THREE.Group;
      baseRot: [number, number, number];
      trackAttr: THREE.BufferAttribute;
      trackMat: THREE.LineBasicMaterial;
      outerAttr: THREE.BufferAttribute;
      outerMat: THREE.LineBasicMaterial;
      satGroup: THREE.Group;
      satGlassMat: THREE.MeshBasicMaterial;
      satRingMesh: THREE.Mesh;
      satRingMat: THREE.MeshBasicMaterial;
      sparkSpr: THREE.Sprite;
      sparkMat: THREE.SpriteMaterial;
      tailAttr: THREE.BufferAttribute;
      tailMat: THREE.PointsMaterial;
      rx: number;
      rz: number;
      speed: number;
      phase: number;
    }[] = [];

    orbitCfgs.forEach((cfg) => {
      const og = new THREE.Group();
      og.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
      entityGroup.add(og);

      const trackArr = new Float32Array(orbitSegs * 3);
      const trackGeo = new THREE.BufferGeometry();
      const trackAttr = new THREE.BufferAttribute(trackArr, 3);
      trackAttr.setUsage(THREE.DynamicDrawUsage);
      trackGeo.setAttribute('position', trackAttr);
      const trackMat = new THREE.LineBasicMaterial({
        color: variant === 0 ? 0xa6fbff : 0x80fff2,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      og.add(new THREE.LineLoop(trackGeo, trackMat));
      disposables.push(trackGeo, trackMat);

      const outerArr = new Float32Array(orbitSegs * 3);
      const outerGeo = new THREE.BufferGeometry();
      const outerAttr = new THREE.BufferAttribute(outerArr, 3);
      outerAttr.setUsage(THREE.DynamicDrawUsage);
      outerGeo.setAttribute('position', outerAttr);
      const outerMat = new THREE.LineBasicMaterial({
        color: accentHex,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      og.add(new THREE.LineLoop(outerGeo, outerMat));
      disposables.push(outerGeo, outerMat);

      // Orbiting Electron Sub-Sphere + Micro Halo Ring + Spark + Comet Tail
      const satGroup = new THREE.Group();
      const satGlassMat = new THREE.MeshBasicMaterial({
        color: 0x0a2e3e,
        transparent: true,
        opacity: 0.76,
      });
      satGroup.add(new THREE.Mesh(subGeo, satGlassMat));

      const satRingMat = new THREE.MeshBasicMaterial({
        color: 0xb8fcff,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const satRingMesh = new THREE.Mesh(subRingGeo, satRingMat);
      satRingMesh.rotation.x = Math.PI * 0.38;
      satGroup.add(satRingMesh);

      const sparkMat = new THREE.SpriteMaterial({
        map: glowTex,
        color: 0xe6ffff,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sparkSpr = new THREE.Sprite(sparkMat);
      sparkSpr.scale.set(0.32, 0.32, 1);
      satGroup.add(sparkSpr);
      og.add(satGroup);
      disposables.push(satGlassMat, satRingMat, sparkMat);

      const tailLen = 20;
      const tailArr = new Float32Array(tailLen * 3);
      const tailGeo = new THREE.BufferGeometry();
      const tailAttr = new THREE.BufferAttribute(tailArr, 3);
      tailAttr.setUsage(THREE.DynamicDrawUsage);
      tailGeo.setAttribute('position', tailAttr);
      const tailMat = new THREE.PointsMaterial({
        color: 0x8ef9ff,
        map: glowTex,
        size: 0.064,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      og.add(new THREE.Points(tailGeo, tailMat));
      disposables.push(tailGeo, tailMat);

      orbits.push({
        group: og,
        baseRot: [cfg.rot[0], cfg.rot[1], cfg.rot[2]],
        trackAttr,
        trackMat,
        outerAttr,
        outerMat,
        satGroup,
        satGlassMat,
        satRingMesh,
        satRingMat,
        sparkSpr,
        sparkMat,
        tailAttr,
        tailMat,
        rx: cfg.rx,
        rz: cfg.rz,
        speed: cfg.speed,
        phase: cfg.phase,
      });
    });

    // -----------------------------------------------------------------------
    // D) Subtle Quantum Uncertainty Web & Atmospheric Mist (only active while unfocused)
    // -----------------------------------------------------------------------
    const superGroup = new THREE.Group();
    entityGroup.add(superGroup);

    const nodeCount = 16;
    const nodeAnchors = Array.from({ length: nodeCount }, () => ({
      base: new THREE.Vector3(
        (rng() - 0.5) * 2.1,
        (rng() - 0.5) * 1.8,
        (rng() - 0.5) * 1.85
      ),
      freq: 0.55 + rng() * 0.85,
      amp: 0.16 + rng() * 0.24,
      phase: rng() * Math.PI * 2,
    }));
    const nodeLivePts = Array.from({ length: nodeCount }, () => new THREE.Vector3());
    const edgePairs: [number, number][] = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        if (nodeAnchors[i].base.distanceTo(nodeAnchors[j].base) < 1.38 && rng() > 0.35) {
          edgePairs.push([i, j]);
        }
      }
    }
    const segArr = new Float32Array(edgePairs.length * 6);
    const segGeo = new THREE.BufferGeometry();
    const segAttr = new THREE.BufferAttribute(segArr, 3);
    segAttr.setUsage(THREE.DynamicDrawUsage);
    segGeo.setAttribute('position', segAttr);
    const segMat = new THREE.LineBasicMaterial({
      color: accentHex,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    superGroup.add(new THREE.LineSegments(segGeo, segMat));
    disposables.push(segGeo, segMat);

    const nodeSprGeo = new THREE.BufferGeometry();
    const nodeSprArr = new Float32Array(nodeCount * 3);
    const nodeSprAttr = new THREE.BufferAttribute(nodeSprArr, 3);
    nodeSprAttr.setUsage(THREE.DynamicDrawUsage);
    nodeSprGeo.setAttribute('position', nodeSprAttr);
    const nodeSprMat = new THREE.PointsMaterial({
      color: 0xd8ffff,
      map: glowTex,
      size: 0.13,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    superGroup.add(new THREE.Points(nodeSprGeo, nodeSprMat));
    disposables.push(nodeSprGeo, nodeSprMat);

    const mistLobes: {
      sprite: THREE.Sprite;
      mat: THREE.SpriteMaterial;
      base: THREE.Vector3;
      speed: number;
      phase: number;
    }[] = [];
    for (let m = 0; m < 5; m++) {
      const mat = new THREE.SpriteMaterial({
        map: glowTex,
        color: m % 2 === 0 ? 0x00c8e8 : 0x45e8ff,
        transparent: true,
        opacity: 0.055,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      const base = new THREE.Vector3(
        (rng() - 0.5) * 1.15,
        (rng() - 0.5) * 0.95,
        (rng() - 0.5) * 0.85
      );
      sprite.position.copy(base);
      const sc = 1.25 + rng() * 0.75;
      sprite.scale.set(sc, sc, 1);
      superGroup.add(sprite);
      disposables.push(mat);
      mistLobes.push({ sprite, mat, base, speed: 0.45 + rng() * 0.5, phase: rng() * Math.PI * 2 });
    }

    return {
      variant,
      hitMesh,
      updateEntity: (
        animTime: number,
        focusMix: number,
        hoverMix: number,
        diveProgress: number,
        parallaxX: number,
        parallaxY: number,
        diveExpand: number,
        reducedMotion: boolean
      ) => {
        const collapse = THREE.MathUtils.smoothstep(focusMix, 0.08, 0.96);
        const chaosMix = 1.0 - collapse;
        const superpose = 1.0 - THREE.MathUtils.smoothstep(focusMix, 0.04, 0.85);

        const floatY = reducedMotion
          ? 0
          : Math.sin(animTime * (0.9 + variant * 0.15) + variant * 1.7) * 0.055;

        // Clean directional carousel translation:
        // Entity 0: LEFT_POS (focus=0) <-> PRIMARY_POS (focus=1)
        // Entity 1: RIGHT_POS (focus=0) <-> PRIMARY_POS (focus=1)
        const depthArc = Math.sin(focusMix * Math.PI);
        entityGroup.position.lerpVectors(unfocusedPos, PRIMARY_POS, focusMix);
        entityGroup.position.z += depthArc * 0.45;
        entityGroup.position.y += floatY + depthArc * 0.12 + parallaxY * 0.45;
        entityGroup.position.x += parallaxX * (0.35 + 0.65 * focusMix);
        if (diveProgress > 0.05) {
          entityGroup.position.z += diveProgress * 2.2;
          entityGroup.position.x *= diveExpand;
        }

        const scale =
          THREE.MathUtils.lerp(0.72, 1.06, focusMix) *
          (1 + hoverMix * 0.14) *
          (1 + diveProgress * 0.42);
        entityGroup.scale.setScalar(scale);

        const alpha = THREE.MathUtils.lerp(0.56 + hoverMix * 0.28, 1.0, focusMix);

        // 1) Update Morphing Particle Cloud (Misty Uncertainty <-> Sharp Orbit Crystal)
        morphMat.uniforms.uTime.value = animTime;
        morphMat.uniforms.uFocus.value = focusMix;
        morphMat.uniforms.uCollapse.value = collapse;
        morphMat.uniforms.uHover.value = hoverMix;
        morphMat.uniforms.uOpacity.value = alpha;

        // 2) Update Unified Core (Blur/Echoes converge inward -> Sharp Photon Shell)
        glassMat.uniforms.uFocus.value = collapse;
        glassMat.uniforms.uTime.value = animTime;
        glassMesh.scale.setScalar(1.0 + chaosMix * 0.24);

        innerLatticeMesh.rotation.y = animTime * (variant === 0 ? 0.14 : -0.16);
        innerLatticeMesh.rotation.x = animTime * 0.09 + chaosMix * Math.sin(animTime * 0.6) * 0.18;
        innerLatticeMesh.scale.setScalar(1.0 + chaosMix * 0.34);
        innerWireMat.opacity = THREE.MathUtils.lerp(0.18, 0.46, collapse) * alpha;

        eqReticleMesh.rotation.z = animTime * 0.22;
        eqReticleMesh.scale.setScalar(1.0 + chaosMix * 0.32);
        eqReticleMat.opacity = THREE.MathUtils.lerp(0.14, 0.42, collapse) * alpha;

        const corePulse = reducedMotion ? 1 : 1 + Math.sin(animTime * 2.1 + variant) * 0.06;
        nucleusMesh.scale.setScalar(corePulse * (0.72 + collapse * 0.28));
        nucleusMat.opacity = THREE.MathUtils.lerp(0.36, 0.92, collapse) * alpha;
        auraMat.opacity = THREE.MathUtils.lerp(0.16, 0.25, collapse) * alpha;
        auraSprite.scale.setScalar(THREE.MathUtils.lerp(1.9, 1.48, collapse));

        // 3 Ghost Echoes physically converge from split uncertainty positions into center (0,0,0)
        ghostEchoes.forEach((ge, gIdx) => {
          const drift = chaosMix;
          ge.mesh.visible = drift > 0.015;
          if (ge.mesh.visible) {
            ge.mesh.position.set(
              (ge.base.x + Math.sin(animTime * 0.68 + ge.phase) * 0.22) * drift,
              (ge.base.y + Math.cos(animTime * 0.6 + ge.phase) * 0.18) * drift,
              (ge.base.z + Math.sin(animTime * 0.52 - ge.phase) * 0.18) * drift
            );
            ge.mesh.rotation.y = animTime * (0.25 + gIdx * 0.1);
            ge.mesh.scale.setScalar((0.68 + gIdx * 0.12) * (0.35 + drift * 0.65));
            ge.mat.opacity = (0.1 + 0.05 * Math.sin(animTime * 1.1 + ge.phase)) * drift * alpha;
          }
        });

        // 3) Update the EXACT SAME 4 Orbits & Satellites (Wavy/Expanded in Superposition -> Crisp Locked in Focus)
        orbits.forEach((orb, idx) => {
          orb.group.rotation.set(
            orb.baseRot[0] + Math.sin(animTime * 0.62 + idx * 1.3) * 0.22 * chaosMix,
            orb.baseRot[1] + Math.cos(animTime * 0.54 + idx * 1.1) * 0.24 * chaosMix,
            orb.baseRot[2] + Math.sin(animTime * 0.48 - idx) * 0.16 * chaosMix
          );

          const rScale = 1.0 + chaosMix * 0.24;
          const waveFreq = 3 + (idx % 2);
          const waveYFreq = 2 + idx;
          const tArr = orb.trackAttr.array as Float32Array;
          const oArr = orb.outerAttr.array as Float32Array;

          for (let s = 0; s < orbitSegs; s++) {
            const a = (s / orbitSegs) * Math.PI * 2;
            const ca = Math.cos(a);
            const sa = Math.sin(a);
            const wRad =
              chaosMix > 0.002
                ? Math.sin(a * waveFreq + animTime * 1.15 + orb.phase) * 0.26 * chaosMix
                : 0;
            const wY =
              chaosMix > 0.002
                ? (Math.sin(a * waveYFreq - animTime * 1.35 + orb.phase) * 0.3 +
                    Math.cos(a * 5.0 + animTime * 0.85) * 0.12) *
                  chaosMix
                : 0;

            const vx = ca * (orb.rx * rScale + wRad);
            const vy = wY;
            const vz = sa * (orb.rz * rScale + wRad * 0.85);
            tArr[s * 3] = vx;
            tArr[s * 3 + 1] = vy;
            tArr[s * 3 + 2] = vz;

            oArr[s * 3] = vx * 1.018;
            oArr[s * 3 + 1] = vy * 1.018;
            oArr[s * 3 + 2] = vz * 1.018;
          }
          orb.trackAttr.needsUpdate = true;
          orb.outerAttr.needsUpdate = true;
          orb.trackMat.opacity = THREE.MathUtils.lerp(0.28, 0.74, collapse) * alpha;
          orb.outerMat.opacity = THREE.MathUtils.lerp(0.12, 0.28, collapse) * alpha;

          // Satellite rides along the exact morphed orbital path (blurred/jittered -> locked crisp)
          const ang =
            orb.phase +
            animTime * orb.speed +
            Math.sin(animTime * 1.9 + orb.phase) * 0.22 * chaosMix;
          const satWrad =
            chaosMix > 0.002
              ? Math.sin(ang * waveFreq + animTime * 1.15 + orb.phase) * 0.26 * chaosMix
              : 0;
          const satWy =
            chaosMix > 0.002
              ? (Math.sin(ang * waveYFreq - animTime * 1.35 + orb.phase) * 0.3 +
                  Math.cos(ang * 5.0 + animTime * 0.85) * 0.12) *
                chaosMix
              : 0;
          orb.satGroup.position.set(
            Math.cos(ang) * (orb.rx * rScale + satWrad),
            satWy,
            Math.sin(ang) * (orb.rz * rScale + satWrad * 0.85)
          );
          orb.satRingMesh.scale.setScalar(1.0 + chaosMix * 0.6);
          orb.sparkSpr.scale.setScalar(THREE.MathUtils.lerp(0.46, 0.32, collapse));
          orb.satGlassMat.opacity = THREE.MathUtils.lerp(0.32, 0.76, collapse) * alpha;
          orb.satRingMat.opacity = THREE.MathUtils.lerp(0.24, 0.72, collapse) * alpha;
          orb.sparkMat.opacity = THREE.MathUtils.lerp(0.42, 0.92, collapse) * alpha;

          const tailArr = orb.tailAttr.array as Float32Array;
          const dir = orb.speed >= 0 ? -1 : 1;
          for (let k = 0; k < 20; k++) {
            const ta = ang + dir * k * (0.04 + chaosMix * 0.025);
            const twRad =
              chaosMix > 0.002
                ? Math.sin(ta * waveFreq + animTime * 1.15 + orb.phase) * 0.26 * chaosMix
                : 0;
            const twY =
              chaosMix > 0.002
                ? (Math.sin(ta * waveYFreq - animTime * 1.35 + orb.phase) * 0.3 +
                    Math.cos(ta * 5.0 + animTime * 0.85) * 0.12) *
                  chaosMix
                : 0;
            tailArr[k * 3] = Math.cos(ta) * (orb.rx * rScale + twRad);
            tailArr[k * 3 + 1] = twY;
            tailArr[k * 3 + 2] = Math.sin(ta) * (orb.rz * rScale + twRad * 0.85);
          }
          orb.tailAttr.needsUpdate = true;
          orb.tailMat.opacity = THREE.MathUtils.lerp(0.32, 0.72, collapse) * alpha;
        });

        // 4) Update Subtle Superposition Constellation Web & Mist Aura
        superGroup.visible = superpose > 0.015;
        if (superGroup.visible) {
          const supAlpha = superpose * alpha;
          superGroup.scale.setScalar(0.9 + superpose * 0.16);

          const nArr = nodeSprAttr.array as Float32Array;
          for (let i = 0; i < nodeCount; i++) {
            const na = nodeAnchors[i];
            const lx = na.base.x + Math.sin(animTime * na.freq + na.phase) * na.amp;
            const ly = na.base.y + Math.cos(animTime * na.freq * 0.85 + na.phase * 1.3) * na.amp;
            const lz = na.base.z + Math.sin(animTime * na.freq * 1.15 - na.phase) * na.amp;
            nodeLivePts[i].set(lx, ly, lz);
            nArr[i * 3] = lx;
            nArr[i * 3 + 1] = ly;
            nArr[i * 3 + 2] = lz;
          }
          nodeSprAttr.needsUpdate = true;
          nodeSprMat.opacity = 0.46 * supAlpha;

          const sArr = segAttr.array as Float32Array;
          for (let e = 0; e < edgePairs.length; e++) {
            const [aIdx, bIdx] = edgePairs[e];
            const pa = nodeLivePts[aIdx];
            const pb = nodeLivePts[bIdx];
            sArr[e * 6] = pa.x;
            sArr[e * 6 + 1] = pa.y;
            sArr[e * 6 + 2] = pa.z;
            sArr[e * 6 + 3] = pb.x;
            sArr[e * 6 + 4] = pb.y;
            sArr[e * 6 + 5] = pb.z;
          }
          segAttr.needsUpdate = true;
          segMat.opacity = (0.18 + 0.12 * Math.sin(animTime * 1.35 + variant)) * supAlpha;

          mistLobes.forEach((lobe) => {
            lobe.sprite.position.set(
              lobe.base.x + Math.sin(animTime * lobe.speed + lobe.phase) * 0.28,
              lobe.base.y + Math.cos(animTime * lobe.speed * 0.8 + lobe.phase) * 0.24,
              lobe.base.z + Math.sin(animTime * lobe.speed * 0.6 - lobe.phase) * 0.2
            );
            lobe.mat.opacity = (0.065 + 0.03 * Math.sin(animTime * 0.9 + lobe.phase)) * supAlpha;
          });
        }
      },
    };
  };

  const quantumEntities = [createQuantumEntity(0), createQuantumEntity(1)];

  // Single synchronized carousel coordinate (0 = 01 centered & 02 right, 1 = 01 left & 02 centered)
  let prevElapsed = 0;
  let carouselLin = 0.0;
  let hoverMixA = 0.0;
  let hoverMixB = 0.0;

  return {
    root,
    getPickTargets: () => quantumEntities.map((e) => e.hitMesh) as THREE.Object3D[],
    update: (
      elapsed: number,
      pointerX: number,
      pointerY: number,
      diveProgress: number,
      activeState: number = 0,
      hoveredState: number | null = null,
      reducedMotion = false
    ) => {
      const dt = Math.min(0.08, Math.max(0.001, elapsed - prevElapsed));
      prevElapsed = elapsed;

      const animTime = reducedMotion ? elapsed * 0.12 : elapsed;
      const stepRate = reducedMotion ? 10 : 0.92;

      const isZeroSelected = activeState !== 1;
      const targetCarousel = isZeroSelected ? 0 : 1;

      carouselLin =
        carouselLin < targetCarousel
          ? Math.min(targetCarousel, carouselLin + dt * stepRate)
          : Math.max(targetCarousel, carouselLin - dt * stepRate);

      const slideT = carouselLin * carouselLin * (3 - 2 * carouselLin);
      const focusMixA = 1.0 - slideT;
      const focusMixB = slideT;

      hoverMixA = THREE.MathUtils.damp(hoverMixA, hoveredState === 0 && !isZeroSelected ? 1 : 0, 7.5, dt);
      hoverMixB = THREE.MathUtils.damp(hoverMixB, hoveredState === 1 && isZeroSelected ? 1 : 0, 7.5, dt);

      const parallaxX = reducedMotion ? 0 : pointerX * 0.14 * (1 - diveProgress * 0.75);
      const parallaxY = reducedMotion ? 0 : pointerY * 0.08 * (1 - diveProgress * 0.75);
      const diveExpand = 1 + diveProgress * 0.72;

      // 1. Update Quantum Environment & Holographic Platform
      ambientDust.rotation.y = animTime * 0.022 + parallaxX * 0.04;
      ambientDust.rotation.x = parallaxY * 0.025;
      bgTrailMats.forEach((m, idx) => {
        m.opacity = 0.055 + Math.sin(animTime * 0.4 + idx) * 0.015;
      });

      waveShaderMat.uniforms.uTime.value = animTime;
      waveShaderMat.uniforms.uOpacity.value = 0.54 * (1 - diveProgress * 0.55);

      platformGroup.scale.setScalar(1 + diveProgress * 0.78);
      const platformVis = 1 - diveProgress * 0.55;
      quantumDiscMat.uniforms.uTime.value = animTime;
      quantumDiscMat.uniforms.uOpacity.value = platformVis;
      fluxMat.uniforms.uTime.value = animTime;
      fluxMat.uniforms.uOpacity.value = platformVis;
      beamMat.opacity = 0.15 * platformVis;

      platformRings.forEach((ring, idx) => {
        ring.rotation.y = animTime * (0.08 + idx * 0.03) * (idx % 2 === 0 ? 1 : -1);
        platformRingMats[idx].opacity = (0.52 - idx * 0.1) * platformVis;
      });
      containmentArcs.forEach((arc, idx) => {
        arc.mesh.rotation.y += dt * arc.speed * (reducedMotion ? 0.15 : 1);
        arc.mat.opacity = (0.42 - (idx % 3) * 0.08) * platformVis;
      });

      // Entanglement bridges & traveling quantum sparks for active left/right side
      const updateSideBridge = (
        bridge: typeof leftBridges,
        weight: number,
        phaseOffset: number
      ) => {
        const w = THREE.MathUtils.clamp(weight, 0, 1);
        bridge.mats.forEach((bm, idx) => {
          bm.opacity = (0.11 + 0.05 * Math.sin(animTime * 1.1 + idx * 1.4 + phaseOffset)) * w * platformVis;
        });
        bridge.sPoints.visible = w > 0.02;
        if (bridge.sPoints.visible) {
          const spArr = bridge.sAttr.array as Float32Array;
          for (let i = 0; i < bridge.sCount; i++) {
            const sm = bridge.sMeta[i];
            const u = ((sm.offset + animTime * sm.speed) % 1 + 1) % 1;
            bridge.curves[sm.curveIdx].getPointAt(u, _bridgeTmp);
            spArr[i * 3] = _bridgeTmp.x;
            spArr[i * 3 + 1] = _bridgeTmp.y;
            spArr[i * 3 + 2] = _bridgeTmp.z;
          }
          bridge.sAttr.needsUpdate = true;
          bridge.sMat.opacity = 0.62 * w * platformVis;
        }
      };

      updateSideBridge(leftBridges, slideT, 0);
      updateSideBridge(rightBridges, 1.0 - slideT, 1.7);

      // 2. Update Both Quantum Entities (Directional 3-Slot Carousel: Left <-> Center <-> Right)
      quantumEntities[0].updateEntity(
        animTime,
        focusMixA,
        hoverMixA,
        diveProgress,
        parallaxX,
        parallaxY,
        diveExpand,
        reducedMotion
      );
      quantumEntities[1].updateEntity(
        animTime,
        focusMixB,
        hoverMixB,
        diveProgress,
        parallaxX,
        parallaxY,
        diveExpand,
        reducedMotion
      );
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
  glowTex: THREE.CanvasTexture,
  lowDetail = false
) {
  const root = new THREE.Group();
  root.position.set(0, yPos, zPos);
  const disposables: { dispose: () => void }[] = [];

  const platformGroup = new THREE.Group();
  platformGroup.position.set(0, -1.75, 0);
  root.add(platformGroup);

  const topDiscGeo = new THREE.CylinderGeometry(3.85, 3.95, 0.14, lowDetail ? 36 : 64);
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

  // --- Morphing Particle Cloud Sculptures ---
  const P_COUNT = lowDetail ? 1050 : 2400;
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
