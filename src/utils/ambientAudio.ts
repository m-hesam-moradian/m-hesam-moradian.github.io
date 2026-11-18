/**
 * Tranquil Interstellar-inspired procedural Web Audio soundscape:
 * Light, soothing felt-piano ostinato (A–E -> B–E -> C–E -> D–E) at a calm pace
 * with spacious rests, breathing pure-sine cathedral organ chords, and gentle stereo echo.
 */
class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private padGain: GainNode | null = null;
  private delayBus: GainNode | null = null;
  private padFilter: BiquadFilterNode | null = null;
  private lfoOsc: OscillatorNode | null = null;
  private seqTimer: number | null = null;
  private enabled = false;
  private userMuted = false;
  private stepIndex = 0;
  private pulseIndex = 0;

  private subVoice: OscillatorNode | null = null;
  private chordVoices: { osc: OscillatorNode; gain: GainNode }[] = [];

  // Warm, peaceful Interstellar cosmic progression (Fmaj7 -> C/G -> Am7 -> Em7)
  private readonly chords: { sub: number; notes: number[] }[] = [
    { sub: 87.31, notes: [174.61, 220.0, 261.63, 329.63] },  // Bar 1: Fmaj7
    { sub: 98.0, notes: [196.0, 261.63, 293.66, 329.63] },   // Bar 2: C/G
    { sub: 110.0, notes: [220.0, 261.63, 329.63, 392.0] },   // Bar 3: Am7
    { sub: 82.41, notes: [164.81, 246.94, 293.66, 392.0] },  // Bar 4: Em7
  ];

  // Slow, spacious 48-step Interstellar felt-piano motif (560ms per step with natural breathing rests)
  private readonly ostinatoNotes: (number | null)[] = [
    // Bar 1 (Fmaj7): Gentle rising A4 -> E5 reflection
    440.0, 659.25, 440.0, 659.25, 440.0, 659.25,
    440.0, 659.25, 392.0, null, 440.0, null,
    // Bar 2 (C/G): Calm harmonic lift B4 -> E5
    493.88, 659.25, 493.88, 659.25, 493.88, 659.25,
    493.88, 659.25, 440.0, null, 392.0, null,
    // Bar 3 (Am7): Soaring C5 -> E5 -> D5 weightless apex
    523.25, 659.25, 523.25, 659.25, 523.25, 659.25,
    587.33, 659.25, 523.25, null, 493.88, null,
    // Bar 4 (Em7): Peaceful resolution with open stillness
    440.0, 659.25, 392.0, 659.25, 329.63, 523.25,
    392.0, null, 329.63, null, null, null,
  ];

  // Soft C-major / A-minor felt-bell UI chime notes
  private readonly uiNotes = [440.0, 523.25, 659.25, 783.99];

  public isEnabled(): boolean {
    return this.enabled;
  }

  public isUserMuted(): boolean {
    return this.userMuted;
  }

  public toggle(): boolean {
    if (this.enabled) {
      this.userMuted = true;
      this.stop();
      return false;
    }
    this.userMuted = false;
    this.start(true);
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

    // Airy, light cathedral dual-tap stereo reverb bus
    if (!this.delayBus) {
      const dryGain = this.ctx.createGain();
      dryGain.gain.setValueAtTime(0.58, now);

      const delayA = this.ctx.createDelay(2.0);
      delayA.delayTime.setValueAtTime(0.56, now);

      const delayB = this.ctx.createDelay(2.0);
      delayB.delayTime.setValueAtTime(0.84, now);

      const feedback = this.ctx.createGain();
      feedback.gain.setValueAtTime(0.32, now);

      const echoFilter = this.ctx.createBiquadFilter();
      echoFilter.type = 'lowpass';
      echoFilter.frequency.setValueAtTime(860, now);

      const wetGain = this.ctx.createGain();
      wetGain.gain.setValueAtTime(0.42, now);

      this.delayBus = this.ctx.createGain();
      this.delayBus.gain.setValueAtTime(1.0, now);

      this.delayBus.connect(dryGain);
      dryGain.connect(this.masterGain);

      this.delayBus.connect(delayA);
      delayA.connect(echoFilter);
      echoFilter.connect(feedback);
      feedback.connect(delayB);
      delayB.connect(echoFilter);
      echoFilter.connect(wetGain);
      wetGain.connect(this.masterGain);
    }

    if (this.chordVoices.length === 0) {
      this.padFilter = this.ctx.createBiquadFilter();
      this.padFilter.type = 'lowpass';
      this.padFilter.frequency.setValueAtTime(320, now);
      this.padFilter.Q.setValueAtTime(0.5, now);

      this.padGain = this.ctx.createGain();
      this.padGain.gain.setValueAtTime(0.16, now);

      this.padFilter.connect(this.padGain);
      this.padGain.connect(this.delayBus);

      // Slow cosmic breath LFO (~20s cycle)
      this.lfoOsc = this.ctx.createOscillator();
      this.lfoOsc.type = 'sine';
      this.lfoOsc.frequency.setValueAtTime(0.05, now);
      const lfoDepth = this.ctx.createGain();
      lfoDepth.gain.setValueAtTime(95, now);
      this.lfoOsc.connect(lfoDepth);
      lfoDepth.connect(this.padFilter.frequency);
      this.lfoOsc.start(now);

      // Feather-light warm sine cello root (no heavy sub rumble)
      this.subVoice = this.ctx.createOscillator();
      this.subVoice.type = 'sine';
      this.subVoice.frequency.setValueAtTime(this.chords[0].sub, now);
      const subGain = this.ctx.createGain();
      subGain.gain.setValueAtTime(0.1, now);
      this.subVoice.connect(subGain);
      subGain.connect(this.masterGain);
      this.subVoice.start(now);

      // Pure-sine serene cathedral organ pad voices (zero buzz/stress)
      const levels = [0.22, 0.18, 0.14, 0.1];
      const detunes = [-2.5, 2.5, -3.5, 3.5];
      this.chords[0].notes.forEach((freq, i) => {
        if (!this.ctx || !this.padFilter) return;
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime(detunes[i] ?? 0, now);

        const vGain = this.ctx.createGain();
        vGain.gain.setValueAtTime(levels[i] ?? 0.12, now);
        osc.connect(vGain);
        vGain.connect(this.padFilter);
        osc.start(now);
        this.chordVoices.push({ osc, gain: vGain });
      });
    }
  }

  private triggerFeltPianoNote(freq: number, accent: boolean) {
    if (!this.ctx || !this.delayBus || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    const oscFundamental = this.ctx.createOscillator();
    const oscWarmth = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const env = this.ctx.createGain();
    const warmthGain = this.ctx.createGain();

    // Pure acoustic felt-piano character: velvety sine body + tiny muted triangle warmth
    oscFundamental.type = 'sine';
    oscFundamental.frequency.setValueAtTime(freq, now);

    oscWarmth.type = 'triangle';
    oscWarmth.frequency.setValueAtTime(freq, now);
    oscWarmth.detune.setValueAtTime(2.5, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(accent ? 920 : 720, now);
    filter.frequency.exponentialRampToValueAtTime(280, now + 1.2);
    filter.Q.setValueAtTime(0.45, now);

    const peak = accent ? 0.068 : 0.044;
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(peak, now + 0.032);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 1.45);

    warmthGain.gain.setValueAtTime(0.18, now);

    oscFundamental.connect(filter);
    oscWarmth.connect(warmthGain);
    warmthGain.connect(filter);
    filter.connect(env);
    env.connect(this.delayBus);

    oscFundamental.start(now);
    oscWarmth.start(now);
    oscFundamental.stop(now + 1.6);
    oscWarmth.stop(now + 1.6);
  }

  private transitionChord(chordIdx: number) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const chord = this.chords[chordIdx % this.chords.length];
    const now = this.ctx.currentTime;

    if (this.subVoice) {
      this.subVoice.frequency.cancelScheduledValues(now);
      this.subVoice.frequency.setValueAtTime(this.subVoice.frequency.value, now);
      this.subVoice.frequency.exponentialRampToValueAtTime(chord.sub, now + 1.2);
    }

    this.chordVoices.forEach((v, i) => {
      const target = chord.notes[i];
      if (!target) return;
      v.osc.frequency.cancelScheduledValues(now);
      v.osc.frequency.setValueAtTime(v.osc.frequency.value, now);
      v.osc.frequency.exponentialRampToValueAtTime(target, now + 1.8);
    });
  }

  private startMelodySequencer() {
    if (this.seqTimer !== null) {
      window.clearInterval(this.seqTimer);
    }

    const runStep = () => {
      if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
      const step = this.stepIndex % this.ostinatoNotes.length;

      if (step % 12 === 0) {
        this.transitionChord(Math.floor(step / 12));
      }

      const pianoNote = this.ostinatoNotes[step];
      if (pianoNote !== null) {
        const isDownbeat = step % 6 === 0;
        this.triggerFeltPianoNote(pianoNote, isDownbeat);
      }

      this.stepIndex += 1;
    };

    runStep();
    this.seqTimer = window.setInterval(runStep, 560);
  }

  public start(withGreeting = false) {
    if (this.userMuted) return;
    try {
      this.ensureGraph();
      if (!this.ctx || !this.masterGain) return;
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
      // Very soft, whisper-light ambient master level
      this.masterGain.gain.exponentialRampToValueAtTime(0.042, now + 2.4);
      this.enabled = true;
      this.startMelodySequencer();
      if (withGreeting) {
        this.playPulse();
      }
    } catch {
      this.enabled = false;
    }
  }

  /**
   * Resumes AudioContext cleanly on the visitor's first gesture if autoplay started suspended.
   */
  public resumeFromGesture() {
    if (this.userMuted) return;
    try {
      if (!this.ctx) {
        this.start(false);
        return;
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume().then(() => {
          if (!this.userMuted) {
            if (!this.enabled) {
              this.start(false);
            } else {
              this.startMelodySequencer();
            }
          }
        });
      } else if (!this.enabled) {
        this.start(false);
      }
    } catch {
      // Ignore browser policy errors
    }
  }

  public stop() {
    if (this.seqTimer !== null) {
      window.clearInterval(this.seqTimer);
      this.seqTimer = null;
    }
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    }
    this.enabled = false;
  }

  /**
   * Gentle soft felt-bell cue for UI button clicks & chapter switches.
   */
  public playPulse() {
    if (!this.enabled || !this.ctx || !this.delayBus || this.ctx.state !== 'running') return;
    try {
      const now = this.ctx.currentTime;
      const baseFreq = this.uiNotes[this.pulseIndex % this.uiNotes.length];
      this.pulseIndex += 1;

      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);

      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(0.022, now + 0.032);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);

      osc.connect(env);
      env.connect(this.delayBus);

      osc.start(now);
      osc.stop(now + 0.65);
    } catch {
      // Ignore audio scheduling errors
    }
  }

  public dispose() {
    this.stop();
    if (this.subVoice) {
      try {
        this.subVoice.stop();
      } catch {
        // ignore
      }
      this.subVoice = null;
    }
    this.chordVoices.forEach((v) => {
      try {
        v.osc.stop();
      } catch {
        // ignore
      }
    });
    this.chordVoices = [];
    if (this.lfoOsc) {
      try {
        this.lfoOsc.stop();
      } catch {
        // ignore
      }
      this.lfoOsc = null;
    }
    this.padFilter = null;
    this.padGain = null;
    this.delayBus = null;
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}

export const ambientAudio = new AmbientAudioEngine();
