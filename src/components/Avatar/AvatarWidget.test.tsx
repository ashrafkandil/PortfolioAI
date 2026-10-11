// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AvatarWidget from './AvatarWidget';
import { requestNarration } from './avatarBus';
import { pickVoice } from './speech';

const profile = { name: 'Ashraf Kandil', image: 'images/avatar.svg' };

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
      return Response.json({ answer: `Answer to: ${question}`, source: 'local', lang: 'en' });
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
