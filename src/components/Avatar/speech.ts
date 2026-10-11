/**
 * Thin wrappers over the browser-native Web Speech API: text-to-speech is
 * supported almost everywhere, speech-to-text only in Chromium and Safari.
 * Both are feature-detected so the avatar degrades to text when missing.
 */

/**
 * Pronunciation dictionary for words that TTS engines commonly mispronounce.
 *
 * The Web Speech API has no training or voice-cloning step, so the only lever
 * we get is respelling: we swap a word for a phonetic spelling the engine's
 * own letter-to-sound rules will read the way we want. This is how you "teach"
 * the avatar a name - add an entry below and the replacement is applied to
 * every spoken line before synthesis.
 *
 * Keys are matched as whole words, case-insensitively (so one entry covers
 * both "Kandil" and "kandil"). Values are the phonetic respelling. Use hyphens
 * to force syllable breaks and doubled vowels to lengthen a sound.
 */
export const PRONUNCIATION_DICTIONARY: Record<string, string> = {
  // "Kandil" (قنديل) is Arabic for "lamp" and is said "kan-DEEL", NOT "kan-dill".
  // Respell so the engine stresses the long "ee" on the second syllable.
  'Kandil': 'Kan-Deel',
  // Add more as needed, e.g.:
  // 'Ashraf': 'Ash-raf',
};

/**
 * Apply pronunciation corrections to text before sending to TTS.
 * Replaces known words with their phonetic equivalents.
 */
export function applyPronunciation(text: string): string {
  let result = text;
  for (const [word, phonetic] of Object.entries(PRONUNCIATION_DICTIONARY)) {
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
export function speak(text: string, locale: string, { onStart, onEnd }: SpeakHandlers = {}): void {
  if (!isTtsSupported()) {
    onEnd?.();
    return;
  }
  // Apply pronunciation corrections before speaking
  const correctedText = applyPronunciation(text);
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

/** The subset of the (still prefixed in some browsers) SpeechRecognition API we use. */
export interface Recognizer {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  abort(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type RecognizerConstructor = new () => Recognizer;

function recognizerClass(): RecognizerConstructor | null {
  if (typeof window === 'undefined') return null;
  const scope = window as unknown as {
    SpeechRecognition?: RecognizerConstructor;
    webkitSpeechRecognition?: RecognizerConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export function isSttSupported(): boolean {
  return recognizerClass() !== null;
}

export function createRecognizer(locale: string): Recognizer | null {
  const Recognition = recognizerClass();
  if (!Recognition) return null;
  const recognizer = new Recognition();
  recognizer.lang = locale;
  recognizer.interimResults = false;
  recognizer.maxAlternatives = 1;
  return recognizer;
}
