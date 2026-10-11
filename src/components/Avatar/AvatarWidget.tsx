import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { Profile } from '../../types';
import type { ViewId } from '../../hooks/useActiveView';
import {
  FALLBACK_CONFIG,
  askAvatar,
  fetchAvatarConfig,
  translateText,
  type AvatarConfig,
  type SiteTarget,
} from './api';
import { onNarrationRequest } from './avatarBus';
import { createRecognizer, isSttSupported, isTtsSupported, speak, stopSpeaking, type Recognizer } from './speech';
import './Avatar.css';

interface Message {
  id: number;
  role: 'assistant' | 'user';
  text: string;
  /** Language code of `text`, used for the speech voice and the `lang` attribute. */
  lang: string;
}

interface AvatarWidgetProps {
  profile: Pick<Profile, 'name' | 'image'>;
  /** The view currently shown, so answers can tell whether the visitor moved on. */
  view?: ViewId;
  /** Opens a view; answers use it to show the part of the site they are about. */
  onNavigate?: (view: ViewId) => void;
}

/** Remembers "Hide assistant" for the rest of the visit only. */
const HIDDEN_KEY = 'avatar:hidden';

function readHidden(): boolean {
  try {
    return sessionStorage.getItem(HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
}

function writeHidden(hidden: boolean): void {
  try {
    if (hidden) sessionStorage.setItem(HIDDEN_KEY, '1');
    else sessionStorage.removeItem(HIDDEN_KEY);
  } catch {
    // Storage blocked: the choice simply lasts until the next page load.
  }
}

const RTL_LANGUAGES = new Set(['ar']);

const SPOTLIGHT_CLASS = 'avatar-spotlight';
const SPOTLIGHT_MS = 2500;
/** A collapsed answer stays on screen this long (plus reading time) after it is spoken. */
const BUBBLE_BASE_MS = 6000;
const BUBBLE_MS_PER_CHAR = 50;
/** How long to wait for a freshly opened view to render the anchor element. */
const ANCHOR_WAIT_MS = 1500;
/** Length of the intro flight from screen center to the corner (matches the CSS). */
const INTRO_MS = 2600;

/**
 * Scroll the element with id `anchor` into view and highlight it briefly.
 *
 * The element may not exist yet (its view is still rendering), so poll for it.
 * Once found, scroll on a short delay: opening a view resets its scroll
 * position in an effect, which would otherwise undo this scroll.
 */
function spotlight(anchor: string): void {
  const deadline = performance.now() + ANCHOR_WAIT_MS;
  const find = () => {
    const element = document.getElementById(anchor);
    if (!element) {
      if (performance.now() < deadline) requestAnimationFrame(find);
      return;
    }
    window.setTimeout(() => {
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      // Centering an element taller than the screen would hide its heading.
      const tall = element.getBoundingClientRect().height > window.innerHeight * 0.6;
      element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: tall ? 'start' : 'center' });
      element.classList.add(SPOTLIGHT_CLASS);
      window.setTimeout(() => element.classList.remove(SPOTLIGHT_CLASS), SPOTLIGHT_MS);
    }, 100);
  };
  requestAnimationFrame(find);
}

function greetingFor(name: string): string {
  const first = name.split(' ')[0];
  return `Hi! I'm the virtual assistant for ${name}. Ask me about ${first}'s projects, experience, skills, or how to get in touch.`;
}

/**
 * Floating talking avatar, bottom-right of every view.
 *
 * Audio is strictly opt-in: nothing is spoken until the visitor presses Play
 * (or a project's Listen button), and Mute stops it again.
 */
export default function AvatarWidget({ profile, view, onNavigate }: AvatarWidgetProps) {
  const first = profile.name.split(' ')[0];
  const greeting = greetingFor(profile.name);

  const [hidden, setHidden] = useState(readHidden);
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<AvatarConfig>(FALLBACK_CONFIG);
  const [lang, setLang] = useState('en');
  const [messages, setMessages] = useState<Message[]>(() => [
    { id: 0, role: 'assistant', text: greeting, lang: 'en' },
  ]);
  const [audioOn, setAudioOn] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [pending, setPending] = useState(false);
  const [listening, setListening] = useState(false);
  const [input, setInput] = useState('');
  // The latest answer, shown beside the launcher after the panel collapses.
  const [bubble, setBubble] = useState<{ text: string; lang: string } | null>(null);
  // Intro: the avatar flies in from the center of the screen on first paint.
  const [intro, setIntro] = useState(true);

  const nextId = useRef(1);
  // Async replies arrive after renders; they must see the current audio choice.
  const audioOnRef = useRef(false);
  const recognizerRef = useRef<Recognizer | null>(null);
  const focusInputOnOpen = useRef(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  // Read after an await, so it must reflect the latest render, not the one that asked.
  const viewRef = useRef(view);
  viewRef.current = view;

  const tts = isTtsSupported();
  const stt = isSttSupported();

  useEffect(() => {
    let active = true;
    fetchAvatarConfig()
      .then((loaded) => {
        if (active) setConfig(loaded);
      })
      .catch(() => {
        // Keep the English-only fallback; the avatar still answers locally.
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () => () => {
      stopSpeaking();
      recognizerRef.current?.abort();
    },
    []
  );

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, pending]);

  // Play the center-to-corner entrance once, then drop the intro styling so the
  // launcher keeps its normal idle float and hover effects.
  useEffect(() => {
    if (!intro) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setIntro(false), reduceMotion ? 0 : INTRO_MS);
    return () => window.clearTimeout(timer);
  }, [intro]);

  // Keep the bubble up while its answer is being spoken, then give time to read it.
  useEffect(() => {
    if (!bubble || speaking) return;
    const timer = window.setTimeout(
      () => setBubble(null),
      BUBBLE_BASE_MS + bubble.text.length * BUBBLE_MS_PER_CHAR
    );
    return () => window.clearTimeout(timer);
  }, [bubble, speaking]);

  useEffect(() => {
    if (open && focusInputOnOpen.current) {
      focusInputOnOpen.current = false;
      inputRef.current?.focus();
    }
  }, [open]);

  const localeFor = useCallback(
    (code: string) => config.languages.find((language) => language.code === code)?.speech ?? 'en-US',
    [config]
  );

  const say = useCallback(
    (text: string, code: string) => {
      speak(text, localeFor(code), {
        onStart: () => setSpeaking(true),
        onEnd: () => setSpeaking(false),
      });
    },
    [localeFor]
  );

  const setAudio = useCallback((on: boolean) => {
    audioOnRef.current = on;
    setAudioOn(on);
    if (!on) {
      stopSpeaking();
      setSpeaking(false);
    }
  }, []);

  const addMessage = useCallback(
    (role: Message['role'], text: string, code: string, { voice = audioOnRef.current } = {}) => {
      const id = nextId.current++;
      setMessages((current) => [...current, { id, role, text, lang: code }]);
      if (role === 'assistant' && voice) say(text, code);
    },
    [say]
  );

  const showTarget = useCallback(
    (target: SiteTarget) => {
      // Re-opening the current view would reset its scroll; only anchors need to move.
      if (target.view !== viewRef.current) onNavigate?.(target.view);
      if (target.anchor) spotlight(target.anchor);
    },
    [onNavigate]
  );

  /**
   * Get the panel out of the way so the visitor sees the section it just
   * opened. Speech keeps going; the answer stays readable in the bubble.
   */
  const minimize = useCallback((text: string, code: string) => {
    // Focus would otherwise fall back to <body> when the panel unmounts.
    const hadFocus = panelRef.current?.contains(document.activeElement) ?? false;
    setOpen(false);
    setBubble({ text, lang: code });
    if (hadFocus) launcherRef.current?.focus();
  }, []);

  const ask = useCallback(
    async (question: string) => {
      const text = question.trim();
      if (!text || pending) return;
      setInput('');
      addMessage('user', text, lang);
      setPending(true);
      const askedFrom = viewRef.current;
      try {
        const reply = await askAvatar(text, lang);
        addMessage('assistant', reply.text, reply.lang);
        // If the visitor opened another view while waiting, don't pull them away.
        if (reply.target && viewRef.current === askedFrom) {
          showTarget(reply.target);
          minimize(reply.text, reply.lang);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Something went wrong.';
        addMessage('assistant', `Sorry, I couldn't answer that: ${message}`, 'en', { voice: false });
      } finally {
        setPending(false);
      }
    },
    [addMessage, lang, minimize, pending, showTarget]
  );

  // Project cards ask for narration through the bus. Pressing Listen is an
  // explicit request for audio, so it switches the voice on.
  useEffect(
    () =>
      onNarrationRequest(async (text) => {
        writeHidden(false);
        setHidden(false);
        setBubble(null);
        setOpen(true);
        setAudio(true);
        const localized = await translateText(text, lang).catch(() => ({ text, lang: 'en' }));
        addMessage('assistant', localized.text, localized.lang);
      }),
    [addMessage, lang, setAudio]
  );

  const toggleAudio = () => {
    if (audioOn) {
      setAudio(false);
      return;
    }
    setAudio(true);
    const last = [...messages].reverse().find((message) => message.role === 'assistant');
    if (last) say(last.text, last.lang);
  };

  const changeLanguage = async (code: string) => {
    setLang(code);
    stopSpeaking();
    const localized = await translateText(greeting, code).catch(() => ({ text: greeting, lang: 'en' }));
    addMessage('assistant', localized.text, localized.lang);
  };

  const toggleListening = () => {
    if (recognizerRef.current) {
      recognizerRef.current.abort();
      return;
    }
    const recognizer = createRecognizer(localeFor(lang));
    if (!recognizer) return;
    stopSpeaking();
    recognizer.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript) void ask(transcript);
    };
    recognizer.onerror = (event) => {
      if (event.error === 'aborted') return;
      const text =
        event.error === 'not-allowed'
          ? 'Microphone access is blocked. You can type your question instead.'
          : "Sorry, I didn't catch that. Please try again or type your question.";
      addMessage('assistant', text, 'en', { voice: false });
    };
    recognizer.onend = () => {
      recognizerRef.current = null;
      setListening(false);
    };
    recognizerRef.current = recognizer;
    setListening(true);
    recognizer.start();
  };

  const closePanel = () => {
    setOpen(false);
    stopSpeaking();
    setSpeaking(false);
    recognizerRef.current?.abort();
    launcherRef.current?.focus();
  };

  const openPanel = () => {
    focusInputOnOpen.current = true;
    setBubble(null);
    setOpen(true);
  };

  const toggleOpen = () => {
    if (open) closePanel();
    else openPanel();
  };

  const hide = () => {
    closePanel();
    writeHidden(true);
    setHidden(true);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void ask(input);
  };

  if (hidden) return null;

  const quickQuestions = [
    { label: `About ${first}`, question: `Who is ${first}?` },
    { label: 'Projects', question: `What projects has ${first} built?` },
    { label: 'Experience', question: `What is ${first}'s experience?` },
    { label: 'Contact', question: `How can I contact ${first}?` },
  ];

  const status = listening
    ? 'Listening…'
    : pending
      ? 'Thinking…'
      : speaking
        ? 'Speaking…'
        : audioOn
          ? 'Voice on'
          : 'Voice off';

  return (
    <div className={`avatar-widget${open ? ' is-open' : ''}${intro ? ' is-intro' : ''}`}>
      {intro && (
        <div className="avatar-intro-balloon">AI assistance</div>
      )}
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          className="avatar-panel"
          role="dialog"
          aria-label={`${first}'s virtual assistant`}
          onKeyDown={(event) => {
            if (event.key === 'Escape') closePanel();
          }}
        >
          <header className="avatar-panel-header">
            <div className="avatar-panel-title">
              <strong>{first}'s assistant</strong>
              <span className="avatar-status">{status}</span>
            </div>
            <div className="avatar-panel-actions">
              {tts && (
                <button
                  type="button"
                  className="avatar-icon-btn"
                  onClick={toggleAudio}
                  aria-pressed={audioOn}
                  aria-label={audioOn ? 'Mute voice' : 'Play voice'}
                  title={audioOn ? 'Mute' : 'Play'}
                >
                  <i className={audioOn ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-play'} aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                className="avatar-icon-btn"
                onClick={closePanel}
                aria-label="Close assistant"
                title="Close"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>
          </header>

          {config.languages.length > 1 && (
            <label className="avatar-lang">
              <span>Language</span>
              <select value={lang} onChange={(event) => void changeLanguage(event.target.value)}>
                {config.languages.map((language) => (
                  <option key={language.code} value={language.code} lang={language.code}>
                    {language.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="avatar-log" ref={logRef} aria-live="polite" aria-busy={pending}>
            {messages.map((message) => (
              <p
                key={message.id}
                className={`avatar-msg avatar-msg-${message.role}`}
                lang={message.lang}
                dir={RTL_LANGUAGES.has(message.lang) ? 'rtl' : undefined}
              >
                {message.text}
              </p>
            ))}
            {pending && (
              <p className="avatar-msg avatar-msg-assistant avatar-typing">
                <span className="visually-hidden">Thinking…</span>
                <span aria-hidden="true" />
                <span aria-hidden="true" />
                <span aria-hidden="true" />
              </p>
            )}
          </div>

          <div className="avatar-quick">
            {quickQuestions.map((quick) => (
              <button key={quick.label} type="button" onClick={() => void ask(quick.question)} disabled={pending}>
                {quick.label}
              </button>
            ))}
          </div>

          <form className="avatar-form" onSubmit={submit}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={`Ask about ${first}…`}
              aria-label="Your question"
              maxLength={500}
              dir="auto"
            />
            {stt && (
              <button
                type="button"
                className={`avatar-icon-btn${listening ? ' is-listening' : ''}`}
                onClick={toggleListening}
                aria-pressed={listening}
                aria-label={listening ? 'Stop listening' : 'Ask by voice'}
                title={listening ? 'Stop listening' : 'Ask by voice'}
              >
                <i className="fa-solid fa-microphone" aria-hidden="true" />
              </button>
            )}
            <button
              type="submit"
              className="avatar-icon-btn avatar-send"
              disabled={pending || !input.trim()}
              aria-label="Send question"
              title="Send"
            >
              <i className="fa-solid fa-paper-plane" aria-hidden="true" />
            </button>
          </form>

          <button type="button" className="avatar-hide" onClick={hide}>
            Hide assistant for this visit
          </button>
        </div>
      )}

      {!open && bubble && (
        <div className="avatar-bubble" role="status">
          <button
            type="button"
            className="avatar-bubble-text"
            onClick={openPanel}
            title="Open the chat"
            lang={bubble.lang}
            dir={RTL_LANGUAGES.has(bubble.lang) ? 'rtl' : undefined}
          >
            {bubble.text}
          </button>
          <button
            type="button"
            className="avatar-bubble-close"
            onClick={() => setBubble(null)}
            aria-label="Dismiss answer"
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>
      )}

      <button
        ref={launcherRef}
        type="button"
        className={`avatar-launcher${speaking ? ' is-speaking' : ''}`}
        onClick={toggleOpen}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? `Close ${first}'s assistant` : `Open ${first}'s assistant`}
      >
        <img src={profile.image} alt="" width={64} height={64} />
        <span className="avatar-wave" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>
    </div>
  );
}
