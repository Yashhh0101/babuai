/**
 * Real-time Audio Streamer & Playback Engine for Gemini Live
 * Handles 16kHz microphone capture, PCM encoding, 24kHz raw PCM progressive playback,
 * audio level visualization, and instant interruption support.
 */

// Helper to convert Float32Array to 16-bit PCM ArrayBuffer
function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const output = new DataView(new ArrayBuffer(input.length * 2));
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); // little-endian
  }
  return output.buffer;
}

// Convert ArrayBuffer to base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Decode base64 raw PCM into Float32Array
function base64ToFloat32(base64: string): Float32Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768.0;
  }
  return float32;
}

export class AudioStreamer {
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private nextPlayTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];

  private isMuted = false;
  private onAudioChunk: ((base64: string) => void) | null = null;
  private onInputLevel: ((level: number) => void) | null = null;
  private onOutputLevel: ((level: number) => void) | null = null;
  private analyser: AnalyserNode | null = null;

  constructor(options?: {
    onAudioChunk?: (base64: string) => void;
    onInputLevel?: (level: number) => void;
    onOutputLevel?: (level: number) => void;
  }) {
    if (options?.onAudioChunk) this.onAudioChunk = options.onAudioChunk;
    if (options?.onInputLevel) this.onInputLevel = options.onInputLevel;
    if (options?.onOutputLevel) this.onOutputLevel = options.onOutputLevel;
  }

  public setAudioChunkCallback(cb: (base64: string) => void) {
    this.onAudioChunk = cb;
  }

  public setInputLevelCallback(cb: (level: number) => void) {
    this.onInputLevel = cb;
  }

  public setOutputLevelCallback(cb: (level: number) => void) {
    this.onOutputLevel = cb;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // Start microphone capture (16kHz standard for Gemini Live)
  public async startRecording(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.inputAudioCtx = new AudioContextClass({ sampleRate: 16000 });

      if (this.inputAudioCtx.state === 'suspended') {
        await this.inputAudioCtx.resume();
      }

      this.sourceNode = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);
      // 2048 samples = ~128ms chunks at 16kHz
      this.processor = this.inputAudioCtx.createScriptProcessor(2048, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (this.isMuted) {
          if (this.onInputLevel) this.onInputLevel(0);
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);

        // Compute input RMS level (0.0 to 1.0)
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const normalized = Math.min(1, Math.max(0, rms * 5));
        if (this.onInputLevel) {
          this.onInputLevel(normalized);
        }

        // Convert to 16-bit PCM and send
        const pcmBuffer = floatTo16BitPCM(inputData);
        const base64Audio = arrayBufferToBase64(pcmBuffer);

        if (this.onAudioChunk) {
          this.onAudioChunk(base64Audio);
        }
      };

      this.sourceNode.connect(this.processor);
      this.processor.connect(this.inputAudioCtx.destination);
    } catch (err) {
      console.error('Microphone access denied or audio engine error:', err);
      throw err;
    }
  }

  // Initialize output context for Gemini playback (24kHz)
  private ensureOutputContext() {
    if (!this.outputAudioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.outputAudioCtx = new AudioContextClass({ sampleRate: 24000 });
      this.analyser = this.outputAudioCtx.createAnalyser();
      this.analyser.fftSize = 64;
    }
    if (this.outputAudioCtx.state === 'suspended') {
      this.outputAudioCtx.resume().catch(() => {});
    }
  }

  // Play incoming raw 24kHz PCM chunks progressively
  public playChunk(base64Chunk: string): void {
    try {
      this.ensureOutputContext();
      if (!this.outputAudioCtx) return;

      const floatData = base64ToFloat32(base64Chunk);
      if (floatData.length === 0) return;

      // Compute output amplitude for AI orb reactivity
      let sum = 0;
      for (let i = 0; i < floatData.length; i++) {
        sum += floatData[i] * floatData[i];
      }
      const rms = Math.sqrt(sum / floatData.length);
      const level = Math.min(1, Math.max(0, rms * 4));
      if (this.onOutputLevel) {
        this.onOutputLevel(level);
      }

      const audioBuffer = this.outputAudioCtx.createBuffer(1, floatData.length, 24000);
      audioBuffer.getChannelData(0).set(floatData);

      const source = this.outputAudioCtx.createBufferSource();
      source.buffer = audioBuffer;

      if (this.analyser) {
        source.connect(this.analyser);
        this.analyser.connect(this.outputAudioCtx.destination);
      } else {
        source.connect(this.outputAudioCtx.destination);
      }

      const currentTime = this.outputAudioCtx.currentTime;
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime;
      }

      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;

      this.activeSources.push(source);
      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) {
          this.activeSources.splice(idx, 1);
        }
        if (this.activeSources.length === 0 && this.onOutputLevel) {
          this.onOutputLevel(0);
        }
      };
    } catch (err) {
      console.warn('Error playing audio chunk:', err);
    }
  }

  // Interruption: instantly stop all queued audio playback
  public stopPlayback(): void {
    for (const source of this.activeSources) {
      try {
        source.stop(0);
        source.disconnect();
      } catch {
        // Source might have already finished
      }
    }
    this.activeSources = [];
    if (this.outputAudioCtx) {
      this.nextPlayTime = this.outputAudioCtx.currentTime;
    }
    if (this.onOutputLevel) {
      this.onOutputLevel(0);
    }
  }

  // Complete cleanup and mic release
  public stop(): void {
    this.stopPlayback();

    if (this.processor) {
      this.processor.onaudioprocess = null;
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.inputAudioCtx) {
      this.inputAudioCtx.close().catch(() => {});
      this.inputAudioCtx = null;
    }

    if (this.outputAudioCtx) {
      this.outputAudioCtx.close().catch(() => {});
      this.outputAudioCtx = null;
    }

    if (this.onInputLevel) this.onInputLevel(0);
    if (this.onOutputLevel) this.onOutputLevel(0);
  }
}
