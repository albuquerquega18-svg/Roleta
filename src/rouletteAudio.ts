/** Original synthesized percussion and fanfare; no external audio or network requests. */
export class RouletteAudio {
  private context: AudioContext | null = null;
  private output: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private voices = new Map<AudioScheduledSourceNode, () => void>();
  private request = 0;

  private async prepare(request: number) {
    if (!this.context) {
      this.context = new AudioContext();
      this.output = this.context.createGain();
      this.output.gain.value = 0.45;
      this.output.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') await this.context.resume();
    return request === this.request && this.context.state === 'running' ? this.context : null;
  }

  private track(source: AudioScheduledSourceNode, nodes: AudioNode[]) {
    const cleanup = () => {
      source.onended = null;
      source.disconnect();
      nodes.forEach(node => node.disconnect());
      this.voices.delete(source);
    };
    source.onended = cleanup;
    this.voices.set(source, cleanup);
  }

  private percussion(at: number, duration: number, volume: number, cutoff: number, filterType: BiquadFilterType = 'highpass') {
    const context = this.context!;
    if (!this.noise) {
      this.noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const samples = this.noise.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    }
    const source = context.createBufferSource();
    source.buffer = this.noise;
    const filter = context.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = cutoff;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(volume, at + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(filter).connect(envelope).connect(this.output!);
    this.track(source, [filter, envelope]);
    source.start(at);
    source.stop(at + duration);
  }

  private tone(at: number, frequency: number, duration: number, volume: number, drum = false) {
    const context = this.context!;
    const source = context.createOscillator();
    source.type = drum ? 'sine' : 'triangle';
    source.frequency.setValueAtTime(frequency, at);
    if (drum) source.frequency.exponentialRampToValueAtTime(frequency * 0.55, at + duration);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(volume, at + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(envelope).connect(this.output!);
    this.track(source, [envelope]);
    source.start(at);
    source.stop(at + duration);
  }

  async roll(durationMs: number) {
    this.stop();
    const request = this.request;
    try {
      const context = await this.prepare(request);
      if (!context) return;
      const start = context.currentTime;
      const duration = Math.max(0, durationMs / 1000);
      let beat = 0;
      for (let time = 0; time < duration; beat++) {
        const progress = time / duration;
        const remaining = duration - time;
        const accent = beat % 4 === 0 ? 1 : 0.7;
        this.percussion(start + time, Math.min(0.11, remaining), (0.16 + progress * 0.16) * accent, 800, 'lowpass');
        this.tone(start + time, 110, Math.min(0.13, remaining), 0.64 * accent, true);
        time += 0.09 - progress * 0.06;
      }
    } catch {
      // A blocked or unavailable audio device must not interrupt the draw.
      this.stop();
    }
  }

  async celebrate() {
    this.stop();
    const request = this.request;
    try {
      const context = await this.prepare(request);
      if (!context) return;
      const start = context.currentTime;
      for (const [offset, note, length] of [[0, 74, 0.16], [0.16, 78, 0.16], [0.32, 81, 0.18], [0.52, 86, 0.95]]) {
        this.tone(start + offset, 440 * 2 ** ((note - 69) / 12), length, 0.2);
      }
      for (const note of [50, 57, 66]) this.tone(start + 0.52, 440 * 2 ** ((note - 69) / 12), 1.1, 0.09);
      this.tone(start + 0.52, 100, 0.3, 0.3, true);
      this.percussion(start + 0.52, 1.1, 0.18, 5500);
    } catch { this.stop(); }
  }

  stop() {
    this.request++;
    for (const [source, cleanup] of this.voices) {
      try { source.stop(); } catch { /* The source may have already ended. */ }
      cleanup();
    }
  }

  dispose() {
    this.stop();
    if (this.context) void this.context.close().catch(() => {});
    this.context = null;
    this.output = null;
    this.noise = null;
  }
}
