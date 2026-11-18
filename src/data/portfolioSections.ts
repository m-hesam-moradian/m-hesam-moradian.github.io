export interface ChamberConfig {
  index: string;
  id: 'summit' | 'drift' | 'iris' | 'research' | 'pedestal';
  hudTitle: string;
  sectionTag: string;
  scrollAt: number;
  camPos: [number, number, number];
  camTarget: [number, number, number];
}

export const DETAILED_CHAMBERS: ChamberConfig[] = [
  {
    index: '01',
    id: 'summit',
    hudTitle: 'CH.01 // GENESIS',
    sectionTag: 'BLOCKCHAIN MONUMENT',
    scrollAt: 0.0,
    camPos: [-11.21, -0.35, 9.09],
    camTarget: [0.0, 1.85, 0.0],
  },
  {
    index: '02',
    id: 'drift',
    hudTitle: 'CH.02 // ABOUT ME',
    sectionTag: 'NEURAL CORE',
    scrollAt: 0.195,
    camPos: [0.0, 1.76, 0.52],
    camTarget: [0.0, 1.75, 0.0],
  },
  {
    index: '03',
    id: 'iris',
    hudTitle: 'CH.03 // EXPERIENCE',
    sectionTag: 'CAREER TIMELINE',
    scrollAt: 0.455,
    camPos: [-4.2, -21.2, -0.4],
    camTarget: [-4.0, -24.0, -12.0],
  },
  {
    index: '04',
    id: 'research',
    hudTitle: 'CH.04 // KNOWLEDGE',
    sectionTag: 'QUANTUM STATES // 02',
    scrollAt: 0.705,
    camPos: [0.0, -47.2, -3.1],
    camTarget: [0.0, -48.0, -12.0],
  },
  {
    index: '05',
    id: 'pedestal',
    hudTitle: 'CH.05 // CONTACT',
    sectionTag: 'DIRECT UPLINK',
    scrollAt: 0.905,
    camPos: [2.75, -73.95, -3.5],
    camTarget: [2.6, -75.35, -12.0],
  },
];
