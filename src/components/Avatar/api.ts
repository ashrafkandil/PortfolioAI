import type { ViewId } from '../../hooks/useActiveView';

export interface AvatarLanguage {
  code: string;
  label: string;
  /** BCP 47 locale handed to speech synthesis/recognition, e.g. "en-US". */
  speech: string;
}

export interface AvatarConfig {
  languages: AvatarLanguage[];
  llm: boolean;
  translation: boolean;
}

/** Text plus the language it actually came back in (the server may fall back to English). */
export interface LocalizedText {
  text: string;
  lang: string;
}

export const FALLBACK_CONFIG: AvatarConfig = {
  languages: [{ code: 'en', label: 'English', speech: 'en-US' }],
  llm: false,
  translation: false,
};

async function post<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed (HTTP ${response.status})`);
  }
  return payload as T;
}

export async function fetchAvatarConfig(): Promise<AvatarConfig> {
  const response = await fetch('/api/avatar/config');
  if (!response.ok) throw new Error(`Failed to load avatar config (HTTP ${response.status})`);
  return response.json() as Promise<AvatarConfig>;
}

/** Where on the site an answer is about: a view, optionally an element id inside it. */
export interface SiteTarget {
  view: ViewId;
  anchor?: string;
}

export interface AvatarReply extends LocalizedText {
  target: SiteTarget | null;
}

export async function askAvatar(question: string, lang: string): Promise<AvatarReply> {
  const reply = await post<{ answer: string; lang: string; target?: SiteTarget | null }>('/api/avatar/query', {
    question,
    lang,
  });
  return { text: reply.answer, lang: reply.lang, target: reply.target ?? null };
}

export async function translateText(text: string, lang: string): Promise<LocalizedText> {
  if (lang === 'en') return { text, lang };
  return post<LocalizedText>('/api/avatar/translate', { text, lang });
}
