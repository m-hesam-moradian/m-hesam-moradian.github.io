/**
 * Procedural Web Audio futuristic spatial ambient synthesizer & harmonic UI chimes
 * (zero external audio files / zero 404s).
 */
class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private padGain: GainNode | null = null;
  private chimeBus: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private lfoOsc: OscillatorNode | null = null;
  private padOscs: OscillatorNode[] = [];
  private enabled = false;
  private pulseIndex = 0;

  // A minor 9 futuristic harmonic palette (Hz)
  private readonly padNotes = [
    { freq: 55.0, type: 'sine' as OscillatorType, detune: 0, level: 0.42 }, // Sub A1
    { freq: 110.0, type: 'triangle' as OscillatorType, detune: -5, level: 0.22 }, // Warm A2 L
    { freq: 110.0, type: 'sawtooth' as OscillatorType, detune: 6, level: 0.14 }, // Warm A2 R
    { freq: 164.81, type: 'triangle' as OscillatorType, detune: 3, level: 0.16 }, // E3 Fifth
    { freq: 246.94, type: 'sine' as OscillatorType, detune: -4, level: 0.12 }, // B3 Ninth
    { freq: 329.63, type: 'sine' as OscillatorType, detune: 7, level: 0.08 }, // E4 Airy Shimmer
  ];

  // Crystalline futuristic pentatonic frequencies for chapter/button chimes
  private readonly chimeScale = [523.25, 659.25, 783.99, 987.77, 1174.66];

  public toggle(): boolean {
    if (this.enabled) {
      this.stop();
      return false;
    }
    this.start();
    return true;
  }

  private ensureGraph() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    const now = this.ctx.currentTime;

    if (!this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.0001, now);
      this.masterGain.connect(this.ctx.destination);
    }

    // Shared spatial stereo-style echo delay bus for cosmic depth
    if (!this.chimeBus) {
      const dryGain = this.ctx.createGain();
      dryGain.gain.setValueAtTime(0.75, now);

      const delayA = this.ctx.createDelay(1.0);
      delayA.delayTime.setValueAtTime(0.32, now);
      const feedback = this.ctx.createGain();
      feedback.gain.setValueAtTime(0.34, now);
      const echoFilter = this.ctx.createBiquadFilter();
      echoFilter.type = 'lowpass';
      echoFilter.frequency.setValueAtTime(1900, now);

      const wetGain = this.ctx.createGain();
      wetGain.gain.setValueAtTime(0.45, now);

      this.chimeBus = this.ctx.createGain();
      this.chimeBus.gain.setValueAtTime(1.0, now);

      this.chimeBus.connect(dryGain);
      dryGain.connect(this.masterGain);

      this.chimeBus.connect(delayA);
      delayA.connect(echoFilter);
      echoFilter.connect(feedback);
      feedback.connect(delayA);
      echoFilter.connect(wetGain);
      wetGain.connect(this.masterGain);
    }

    if (this.padOscs.length === 0) {
      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(420, now);
      this.filterNode.Q.setValueAtTime(1.8, now);

      this.padGain = this.ctx.createGain();
      this.padGain.gain.setValueAtTime(0.55, now);

      this.filterNode.connect(this.padGain);
      this.padGain.connect(this.chimeBus);

      // Slow breathing filter modulation LFO (evolves smoothly over 12s cycle)
      this.lfoOsc = this.ctx.createOscillator();
      this.lfoOsc.type = 'sine';
      this.lfoOsc.frequency.setValueAtTime(0.085, now);
      const lfoDepth = this.ctx.createGain();
      lfoDepth.gain.setValueAtTime(210, now);
      this.lfoOsc.connect(lfoDepth);
      lfoDepth.connect(this.filterNode.frequency);
      this.lfoOsc.start(now);

      this.padNotes.forEach((n) => {
        if (!this.ctx || !this.filterNode) return;
        const osc = this.ctx.createOscillator();
        osc.type = n.type;
        osc.frequency.setValueAtTime(n.freq, now);
        osc.detune.setValueAtTime(n.detune, now);

        const voiceGain = this.ctx.createGain();
        voiceGain.gain.setValueAtTime(n.level, now);

        osc.connect(voiceGain);
        voiceGain.connect(this.filterNode);
        osc.start(now);
        this.padOscs.push(osc);
      });
    }
  }

  public start() {
    try {
      this.ensureGraph();
      if (!this.ctx || !this.masterGain) return;
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
      this.masterGain.gain.exponentialRampToValueAtTime(0.11, now + 0.85);
      this.enabled = true;
      this.playPulse();
    } catch {
      this.enabled = false;
    }
  }

  public stop() {
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    }
    this.enabled = false;
  }

  /**
   * Crisp futuristic harmonic chime + subtle octave shimmer fed into spatial echo bus.
   */
  public playPulse() {
    if (!this.enabled || !this.ctx || !this.chimeBus) return;
    try {
      const now = this.ctx.currentTime;
      const baseFreq = this.chimeScale[this.pulseIndex % this.chimeScale.length];
      this.pulseIndex += 1;

      const oscMain = this.ctx.createOscillator();
      const oscHarm = this.ctx.createOscillator();
      const chimeFilter = this.ctx.createBiquadFilter();
      const env = this.ctx.createGain();

      oscMain.type = 'sine';
      oscMain.frequency.setValueAtTime(baseFreq * 0.96, now);
      oscMain.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.045);

      oscHarm.type = 'triangle';
      oscHarm.frequency.setValueAtTime(baseFreq * 1.5, now); // Shimmering fifth

      chimeFilter.type = 'bandpass';
      chimeFilter.frequency.setValueAtTime(baseFreq * 1.25, now);
      chimeFilter.Q.setValueAtTime(1.4, now);

      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(0.09, now + 0.015);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

      const harmGain = this.ctx.createGain();
      harmGain.gain.setValueAtTime(0.32, now);

      oscMain.connect(chimeFilter);
      oscHarm.connect(harmGain);
      harmGain.connect(chimeFilter);
      chimeFilter.connect(env);
      env.connect(this.chimeBus);

      oscMain.start(now);
      oscHarm.start(now);
      oscMain.stop(now + 0.36);
      oscHarm.stop(now + 0.36);
    } catch {
      // Ignore audio scheduling errors
    }
  }

  public dispose() {
    this.stop();
    this.padOscs.forEach((osc) => {
      try {
        osc.stop();
      } catch {
        // ignore
      }
    });
    this.padOscs = [];
    if (this.lfoOsc) {
      try {
        this.lfoOsc.stop();
      } catch {
        // ignore
      }
      this.lfoOsc = null;
    }
    this.filterNode = null;
    this.padGain = null;
    this.chimeBus = null;
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}

export const ambientAudio = new AmbientAudioEngine();
