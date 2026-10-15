/**
 * Records the visitor's voice in the browser and hands back a small 16 kHz WAV clip.
 *
 * Speech-to-text is deliberately NOT done with the Web Speech API's
 * SpeechRecognition: that service only exists in Chromium and leans on Google's
 * speech servers. Instead the clip is posted to /api/avatar/query, where Google
 * Gemini transcribes and answers it in one call (the same approach as
 * CrazyCakesAI), so voice works in Chrome, Edge, Safari and Firefox.
 *
 * Recording stops automatically once the visitor pauses after speaking.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { VoiceClip } from './api';

export type { VoiceClip };
export type VoiceError = 'denied' | 'no-mic' | 'unsupported' | 'no-speech';

const TARGET_RATE = 16_000;
const MAX_MS = 20_000;
const SILENCE_MS = 1_300;
const NO_SPEECH_MS = 8_000;
const MIN_SPEECH_MS = 250;

interface Session {
  stream: MediaStream;
  context: AudioContext;
  source: MediaStreamAudioSourceNode;
  processor: ScriptProcessorNode;
  chunks: Float32Array[];
  startedAt: number;
  speechMs: number;
  lastVoiceAt: number;
  noiseFloor: number;
}

interface Callbacks {
  onClip: (clip: VoiceClip) => void;
  onError: (error: VoiceError) => void;
}

function audioContextCtor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  );
}

export function isVoiceSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.isSecureContext) &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    audioContextCtor() !== undefined
  );
}

/** 16-bit PCM WAV, base64-encoded — the shape /api/avatar/query expects. */
function encodeWav(chunks: Float32Array[], inputRate: number): string {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const merged = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  const ratio = inputRate / TARGET_RATE;
  const outLength = Math.floor(length / ratio);
  const buffer = new ArrayBuffer(44 + outLength * 2);
  const view = new DataView(buffer);
  const writeText = (position: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(position + index, text.charCodeAt(index));
    }
  };
  writeText(0, 'RIFF');
  view.setUint32(4, 36 + outLength * 2, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, TARGET_RATE, true);
  view.setUint32(28, TARGET_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, outLength * 2, true);

  for (let index = 0; index < outLength; index += 1) {
    const start = Math.floor(index * ratio);
    const end = Math.max(start + 1, Math.min(length, Math.floor((index + 1) * ratio)));
    let sum = 0;
    for (let cursor = start; cursor < end; cursor += 1) sum += merged[cursor] ?? 0;
    const sample = Math.max(-1, Math.min(1, sum / (end - start)));
    view.setInt16(44 + index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

/**
 * Start/stop voice capture. The clip arrives through `onClip` (auto-sent after
 * a pause, or on `stop()`); `cancel()` throws the recording away. Errors
 * (blocked mic, no mic, silence...) surface through `onError`.
 */
export function useVoiceRecorder(callbacks: Callbacks) {
  const [recording, setRecording] = useState(false);
  const sessionRef = useRef<Session | null>(null);
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  const finish = useCallback((send: boolean) => {
    const session = sessionRef.current;
    if (!session) return;
    sessionRef.current = null;
    session.processor.onaudioprocess = null;
    session.processor.disconnect();
    session.source.disconnect();
    session.stream.getTracks().forEach((track) => track.stop());
    void session.context.close().catch(() => undefined);
    setRecording(false);
    if (!send) return;
    if (session.speechMs < MIN_SPEECH_MS) {
      callbacksRef.current.onError('no-speech');
      return;
    }
    callbacksRef.current.onClip({
      mimeType: 'audio/wav',
      data: encodeWav(session.chunks, session.context.sampleRate),
    });
  }, []);

  const start = useCallback(async () => {
    if (sessionRef.current) return;
    const Ctor = audioContextCtor();
    if (!isVoiceSupported() || !Ctor) {
      callbacksRef.current.onError('unsupported');
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      callbacksRef.current.onError(
        name === 'NotFoundError' || name === 'OverconstrainedError' ? 'no-mic' : 'denied'
      );
      return;
    }

    const context = new Ctor();
    await context.resume().catch(() => undefined);
    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4096, 1, 1);
    const session: Session = {
      stream,
      context,
      source,
      processor,
      chunks: [],
      startedAt: performance.now(),
      speechMs: 0,
      lastVoiceAt: 0,
      noiseFloor: 0.004,
    };

    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      session.chunks.push(new Float32Array(input));
      let sum = 0;
      for (let index = 0; index < input.length; index += 1) {
        const sample = input[index] ?? 0;
        sum += sample * sample;
      }
      const rms = Math.sqrt(sum / Math.max(1, input.length));
      const now = performance.now();
      const threshold = Math.max(0.012, session.noiseFloor * 3);
      if (rms > threshold) {
        session.speechMs += (input.length / context.sampleRate) * 1000;
        session.lastVoiceAt = now;
      } else {
        session.noiseFloor = session.noiseFloor * 0.95 + rms * 0.05;
      }

      const total = now - session.startedAt;
      const spoke = session.speechMs >= MIN_SPEECH_MS;
      if (total > MAX_MS || (spoke && now - session.lastVoiceAt > SILENCE_MS)) finish(true);
      else if (!spoke && total > NO_SPEECH_MS) finish(true);
    };

    source.connect(processor);
    processor.connect(context.destination);
    sessionRef.current = session;
    setRecording(true);
  }, [finish]);

  const stop = useCallback(() => finish(true), [finish]);
  const cancel = useCallback(() => finish(false), [finish]);

  useEffect(() => () => finish(false), [finish]);

  return { recording, start, stop, cancel };
}

