/**
 * Thin wrappers over the browser-native Web Speech API for text-to-speech,
 * which is supported almost everywhere. Speech *input* is not done here: the
 * mic records a WAV clip (see voice.ts) and Google Gemini transcribes it on
 * the server, so voice works in every browser. TTS is feature-detected so the
 * avatar degrades to text when missing.
 */

export interface Pronunciation {
  word: string;
  phonetic: string;
}

/**
 * Apply pronunciation corrections to text before sending to TTS.
 * Replaces known words with their phonetic equivalents.
 */
export function applyPronunciation(text: string, pronunciations: Pronunciation[] = []): string {
  let result = text;
  for (const { word, phonetic } of pronunciations) {
    // Whole-word replacement (case-insensitive)
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    result = result.replace(regex, phonetic);
  }
  return result;
}

export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/**
 * Chrome fills the voice list asynchronously, so the first `getVoices()` call
 * is often empty. Wait briefly for `voiceschanged` instead of speaking with no
 * voice (which picks the browser default, usually the wrong language).
 */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length) return Promise.resolve(voices);
  return new Promise((resolve) => {
    const done = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', done);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', done);
    setTimeout(done, 1000);
  });
}

/** Exact locale first ("en-US"), then any voice for the language ("en-GB"). */
export function pickVoice(voices: SpeechSynthesisVoice[], locale: string): SpeechSynthesisVoice | null {
  const wanted = locale.toLowerCase().replace('_', '-');
  const language = wanted.split('-')[0];
  const normalized = (voice: SpeechSynthesisVoice) => voice.lang.toLowerCase().replace('_', '-');
  const exact = voices.filter((voice) => normalized(voice) === wanted);
  const sameLanguage = voices.filter((voice) => normalized(voice).split('-')[0] === language);
  const candidates = exact.length ? exact : sameLanguage;
  return candidates.find((voice) => voice.default) ?? candidates.find((voice) => voice.localService) ?? candidates[0] ?? null;
}

interface SpeakHandlers {
  onStart?: () => void;
  onEnd?: () => void;
}

/**
 * Speak `text`, interrupting anything already being said.
 *
 * When voices are already loaded this speaks synchronously: iOS Safari only
 * unlocks speech for an utterance started inside the click handler itself.
 */
export function speak(text: string, locale: string, { onStart, onEnd }: SpeakHandlers = {}, pronunciations: Pronunciation[] = []): void {
  if (!isTtsSupported()) {
    onEnd?.();
    return;
  }
  // Apply pronunciation corrections before speaking
  const correctedText = applyPronunciation(text, pronunciations);
  window.speechSynthesis.cancel();
  const utter = (voices: SpeechSynthesisVoice[]) => {
    const utterance = new SpeechSynthesisUtterance(correctedText);
    utterance.lang = locale;
    utterance.voice = pickVoice(voices, locale);
    utterance.onstart = () => onStart?.();
    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utterance);
  };
  const voices = window.speechSynthesis.getVoices();
  if (voices.length) utter(voices);
  else void loadVoices().then(utter);
}

export function stopSpeaking(): void {
  if (isTtsSupported()) window.speechSynthesis.cancel();
}

