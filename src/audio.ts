let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let ambientGain: GainNode | null = null;
let started = false;
let muted = false;

function ensure(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
    ambientGain = ctx.createGain();
    ambientGain.gain.value = 0.35;
    ambientGain.connect(master);
  }
  return ctx;
}

function tone(
  frequency: number,
  duration: number,
  type: OscillatorType,
  gainValue: number,
  attack = 0.01,
): void {
  const audio = ensure();
  if (audio.state === "suspended") void audio.resume();
  if (!master || muted) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0, audio.currentTime);
  gain.gain.linearRampToValueAtTime(gainValue, audio.currentTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.0008, audio.currentTime + duration);
  osc.connect(gain);
  gain.connect(master);
  osc.start();
  osc.stop(audio.currentTime + duration + 0.05);
}

function startAmbient(): void {
  const audio = ensure();
  if (!ambientGain || started) return;
  started = true;

  const makePad = (freq: number, type: OscillatorType, detune: number) => {
    const osc = audio.createOscillator();
    const filter = audio.createBiquadFilter();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    filter.type = "lowpass";
    filter.frequency.value = 420;
    osc.connect(filter);
    filter.connect(ambientGain!);
    osc.start();
  };

  makePad(55, "sine", 0);
  makePad(82.4, "triangle", 8);
  makePad(110, "sine", -6);

  const noiseBuf = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.04;
  const noise = audio.createBufferSource();
  noise.buffer = noiseBuf;
  noise.loop = true;
  const noiseFilter = audio.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = 240;
  noise.connect(noiseFilter);
  noiseFilter.connect(ambientGain);
  noise.start();
}

export async function unlockAudio(): Promise<void> {
  const audio = ensure();
  if (audio.state === "suspended") await audio.resume();
  startAmbient();
}

export function setMuted(next: boolean): void {
  muted = next;
  if (master) master.gain.value = muted ? 0 : 0.22;
}

export function isMuted(): boolean {
  return muted;
}

export function playUiClick(): void {
  tone(640, 0.08, "sine", 0.07);
}

export function playSelect(): void {
  tone(420, 0.14, "triangle", 0.06);
  tone(840, 0.18, "sine", 0.04, 0.03);
}

export function playWhoosh(): void {
  tone(180, 0.28, "sawtooth", 0.03);
}
