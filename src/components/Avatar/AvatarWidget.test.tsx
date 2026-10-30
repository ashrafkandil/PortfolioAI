// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AvatarWidget from './AvatarWidget';
import { requestNarration } from './avatarBus';
import { applyPronunciation, pickVoice } from './speech';

const profile = { name: 'Ashraf Kandil', image: 'images/Me_1.png' };

class FakeUtterance {
  text: string;
  lang = '';
  voice: unknown = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

const speechSynthesisMock = {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: () => [{ lang: 'en-US', default: true, localService: true, name: 'Test' }],
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

const spokenTexts = () => speechSynthesisMock.speak.mock.calls.map(([utterance]) => utterance.text);

/** Lets a test hold a query in flight; resolved by default. */
let queryGate: Promise<void> = Promise.resolve();

function mockFetch() {
  return vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/avatar/config') {
      return Response.json({
        languages: [{ code: 'en', label: 'English', speech: 'en-US' }],
        llm: false,
        translation: false,
      });
    }
    if (url === '/api/avatar/query') {
      const { question } = JSON.parse(String(init?.body));
      const target = /projects/i.test(question) ? { view: 'projects', anchor: 'project-x' } : null;
      await queryGate;
      return Response.json({ answer: `Answer to: ${question}`, source: 'local', lang: 'en', target });
    }
    return new Response('{}', { status: 404 });
  });
}

beforeEach(() => {
  vi.stubGlobal('speechSynthesis', speechSynthesisMock);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  vi.stubGlobal('fetch', mockFetch());
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const openPanel = () => fireEvent.click(screen.getByRole('button', { name: "Open Ashraf's assistant" }));

describe('AvatarWidget', () => {
  it('uses the alternate portrait only for the avatar launcher', () => {
    const { container } = render(<AvatarWidget profile={profile} />);

    expect(container.querySelector('.avatar-launcher img')?.getAttribute('src')).toBe('/images/Me_2.png');
    expect(container.querySelector('.avatar-launcher img')?.getAttribute('src')).not.toBe(profile.image);
  });

  it('starts collapsed and opens with a greeting', () => {
    render(<AvatarWidget profile={profile} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    openPanel();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/virtual assistant for Ashraf Kandil/)).toBeTruthy();
  });

  it('stays silent until Play is pressed', () => {
    render(<AvatarWidget profile={profile} />);
    openPanel();
    expect(speechSynthesisMock.speak).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Play voice' }));
    expect(spokenTexts()).toEqual([expect.stringContaining('virtual assistant')]);
    expect(screen.getByRole('button', { name: 'Mute voice' })).toBeTruthy();
  });

  it('sends a typed question and shows the answer', async () => {
    render(<AvatarWidget profile={profile} />);
    openPanel();
    fireEvent.change(screen.getByRole('textbox', { name: 'Your question' }), {
      target: { value: 'Where is he based?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }));

    expect(await screen.findByText('Answer to: Where is he based?')).toBeTruthy();
    // Voice is still off, so the answer is only shown.
    expect(speechSynthesisMock.speak).not.toHaveBeenCalled();
  });

  it('speaks answers once voice is on', async () => {
    render(<AvatarWidget profile={profile} />);
    openPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Play voice' }));
    fireEvent.click(screen.getByRole('button', { name: 'Contact' }));

    await waitFor(() => expect(spokenTexts()).toContain('Answer to: How can I contact Ashraf?'));
  });

  it('navigates to and highlights the part of the site an answer is about', async () => {
    const card = document.createElement('article');
    card.id = 'project-x';
    card.scrollIntoView = vi.fn();
    document.body.appendChild(card);
    const onNavigate = vi.fn();
    render(<AvatarWidget profile={profile} view="home" onNavigate={onNavigate} />);
    openPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Projects' }));

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('projects'));
    await waitFor(() => expect(card.scrollIntoView).toHaveBeenCalled());
    expect(card.classList.contains('avatar-spotlight')).toBe(true);
    card.remove();
  });

  it('collapses to a speech bubble after navigating, so the section is visible', async () => {
    const onNavigate = vi.fn();
    render(<AvatarWidget profile={profile} view="home" onNavigate={onNavigate} />);
    openPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Projects' }));

    const bubble = await screen.findByRole('status');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(bubble.textContent).toContain('Answer to: What projects');
    // Focus was inside the panel, so it moves to the launcher instead of <body>.
    expect(document.activeElement?.getAttribute('aria-label')).toBe("Open Ashraf's assistant");

    // Clicking the bubble reopens the chat with the full history.
    fireEvent.click(screen.getByRole('button', { name: /Answer to: What projects/ }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Answer to: What projects has Ashraf built?')).toBeTruthy();
  });

  it('lets the visitor dismiss the bubble', async () => {
    render(<AvatarWidget profile={profile} view="home" onNavigate={vi.fn()} />);
    openPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Projects' }));
    await screen.findByRole('status');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss answer' }));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('keeps the panel open when an answer has nowhere to go', async () => {
    render(<AvatarWidget profile={profile} view="home" onNavigate={vi.fn()} />);
    openPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Contact' }));
    await screen.findByText(/Answer to: How can I contact/);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('does not navigate when the answer has no target', async () => {
    const onNavigate = vi.fn();
    render(<AvatarWidget profile={profile} view="home" onNavigate={onNavigate} />);
    openPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Contact' }));
    await screen.findByText(/Answer to: How can I contact/);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('leaves the visitor alone if they moved on while the answer was in flight', async () => {
    let release = () => {};
    queryGate = new Promise((resolve) => {
      release = resolve;
    });
    const onNavigate = vi.fn();
    const { rerender } = render(<AvatarWidget profile={profile} view="home" onNavigate={onNavigate} />);
    openPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Projects' }));

    // The visitor opens Experience themselves before the reply lands.
    rerender(<AvatarWidget profile={profile} view="experience" onNavigate={onNavigate} />);
    await act(async () => release());

    await screen.findByText(/Answer to: What projects/);
    expect(onNavigate).not.toHaveBeenCalled();
    queryGate = Promise.resolve();
  });

  it('closes with the close button and with Escape', () => {
    render(<AvatarWidget profile={profile} />);
    openPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Close assistant' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    openPanel();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('can be hidden for the rest of the visit', () => {
    const { unmount } = render(<AvatarWidget profile={profile} />);
    openPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Hide assistant for this visit' }));
    expect(screen.queryByRole('button', { name: /assistant/ })).toBeNull();

    unmount();
    render(<AvatarWidget profile={profile} />);
    expect(screen.queryByRole('button', { name: /assistant/ })).toBeNull();
  });

  it('narrates project text on request', async () => {
    render(<AvatarWidget profile={profile} />);
    await act(async () => requestNarration('Project X. It does things.'));

    expect(screen.getByText('Project X. It does things.')).toBeTruthy();
    expect(spokenTexts()).toContain('Project X. It does things.');
  });
});

describe('applyPronunciation', () => {
  it('respells the last name so TTS says the long "ee"', () => {
    expect(applyPronunciation('Ashraf Kandil built this')).toBe('Ashraf Kan-Deel built this');
  });

  it('matches case-insensitively without touching other words', () => {
    expect(applyPronunciation('kandil, Kandil, and kandils')).toBe('Kan-Deel, Kan-Deel, and kandils');
  });
});

describe('pickVoice', () => {
  const voice = (lang: string, extra: Partial<SpeechSynthesisVoice> = {}) =>
    ({ lang, default: false, localService: false, name: lang, ...extra }) as SpeechSynthesisVoice;

  it('prefers an exact locale, then the same language', () => {
    const voices = [voice('en-GB'), voice('ar-EG'), voice('en-US')];
    expect(pickVoice(voices, 'en-US')?.lang).toBe('en-US');
    expect(pickVoice(voices, 'ar-SA')?.lang).toBe('ar-EG');
    expect(pickVoice(voices, 'de-DE')).toBeNull();
  });

  it('handles underscore-style locales from some Android browsers', () => {
    expect(pickVoice([voice('es_ES')], 'es-ES')?.lang).toBe('es_ES');
  });
});
