/**
 * Thin wrappers over the browser-native Web Speech API: text-to-speech is
 * supported almost everywhere, speech-to-text only in Chromium and Safari.
 * Both are feature-detected so the avatar degrades to text when missing.
 */

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
  window.speechSynthesis.cancel();
  const utter = (voices: SpeechSynthesisVoice[]) => {
    const utterance = new SpeechSynthesisUtterance(text);
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
