import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import express from 'express';
import seed from './seed-data.json' with { type: 'json' };
import { answerLocally, limitSentences, projectNarration, resolveTarget } from './avatar-knowledge.js';

// Answer from the seed file rather than whatever is in the local database.
vi.mock('./db.js', () => ({ getSiteData: () => seed }));

const { LANGUAGES, createAvatarRouter, parseNavigationTag } = await import('./avatar.js');

describe('supported languages', () => {
  it('offers exactly English, Arabic and French', () => {
    expect(LANGUAGES.map((lang) => lang.code)).toEqual(['en', 'ar', 'fr']);
  });
});

describe('answerLocally', () => {
  const ask = (question) => answerLocally(question, seed).text;
  const goes = (question) => answerLocally(question, seed).target;

  it('introduces the owner on a greeting', () => {
    expect(ask('Hello!')).toContain('Ashraf Kandil');
  });

  it('gives contact details', () => {
    expect(ask('How can I contact him?')).toContain(seed.profile.email);
  });

  it('answers location questions', () => {
    expect(ask('Where is Ashraf based?')).toContain('San Francisco');
  });

  it('treats "where did he work" as an experience question', () => {
    expect(ask('Where did Ashraf work before?')).toContain('RBC Capital Markets');
  });

  it('confirms a known skill with where it is used', () => {
    const answer = ask('Does he know Django?');
    expect(answer).toMatch(/^Yes, Django/);
    expect(answer).toContain('E-Commerce Platform');
  });

  it('matches special-character tech names as whole words', () => {
    expect(ask('any C++ experience?')).toMatch(/^Yes, C\+\+/);
  });

  it('narrates a project mentioned by a loose name', () => {
    expect(ask('Tell me about the chatbot')).toMatch(/^AI-Powered Chatbot Platform:/);
  });

  it('lists projects for a generic question', () => {
    expect(ask('What projects has Ashraf built?')).toContain('Featured projects include');
  });

  it('falls back to a helpful hint', () => {
    expect(ask('What is the meaning of life?')).toContain('projects, experience, skills');
  });

  it('already fits in two sentences, so nothing gets cut off', () => {
    for (const question of ['hi', 'who is he?', 'skills?', 'experience', 'projects', 'contact', 'the chatbot', 'Java?']) {
      const answer = ask(question);
      expect(limitSentences(answer)).toBe(answer);
    }
  });
});

describe('navigation targets', () => {
  const goes = (question) => answerLocally(question, seed).target;

  it('points each kind of answer at its section', () => {
    expect(goes('Tell me about the chatbot')).toBe('projects/chatbot-platform');
    expect(goes('What projects has he built?')).toBe('projects');
    expect(goes('How can I contact him?')).toBe('contact');
    expect(goes('What is his experience?')).toBe('experience');
    expect(goes('What did he do at SunGard?')).toBe('experience/sungard');
    expect(goes('Does he know Django?')).toBe('skills');
    expect(goes('What are his skills?')).toBe('skills');
    expect(goes('Who is Ashraf?')).toBe('about');
  });

  it('does not navigate for greetings or unknown questions', () => {
    expect(goes('hello')).toBeNull();
    expect(goes('What is the meaning of life?')).toBeNull();
  });

  it('only shows a skill in the skills list when it is listed there', () => {
    // Suricata appears only in a project, not in the skills section.
    expect(goes('Does he know Suricata?')).toBe('projects/security-monitor');
  });

  it('resolves keys to a view and element id, rejecting unknown ones', () => {
    expect(resolveTarget('projects/Bedrock', seed)).toEqual({ view: 'projects', anchor: 'project-Bedrock' });
    expect(resolveTarget('skills', seed)).toEqual({ view: 'about', anchor: 'skills' });
    expect(resolveTarget('contact', seed)).toEqual({ view: 'contact' });
    expect(resolveTarget('projects/nope', seed)).toBeNull();
    expect(resolveTarget(null, seed)).toBeNull();
  });

  it('parses and strips the LLM navigation tag', () => {
    expect(parseNavigationTag('Ashraf built an ERP. [[go:projects/erp-system]]')).toEqual({
      text: 'Ashraf built an ERP.',
      target: 'projects/erp-system',
    });
    expect(parseNavigationTag('No tag here.')).toEqual({ text: 'No tag here.', target: null });
  });
});

describe('helpers', () => {
  it('limitSentences keeps the first sentences', () => {
    expect(limitSentences('One.  Two! Three? Four.')).toBe('One. Two!');
  });

  it('limitSentences does not split on abbreviations', () => {
    expect(limitSentences('Works at Acme Inc. (2020). Likes Go. Plays chess.')).toBe('Works at Acme Inc. (2020). Likes Go.');
  });

  it('projectNarration names the project and its tech', () => {
    const narration = projectNarration(seed.projects[0]);
    expect(narration.startsWith(`${seed.projects[0].title}:`)).toBe(true);
    expect(narration).toContain(seed.projects[0].tech[0]);
  });
});

describe('avatar router (no Gemini or translator configured)', () => {
  let server;
  let base;

  beforeAll(async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
    delete process.env.LIBRETRANSLATE_URL;
    const app = express();
    app.use(express.json());
    app.use('/api/avatar', createAvatarRouter());
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    base = `http://127.0.0.1:${server.address().port}/api/avatar`;
  });

  afterAll(() => server?.close());

  const post = (path, body) =>
    fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('offers only English', async () => {
    const config = await (await fetch(`${base}/config`)).json();
    expect(config).toMatchObject({ llm: false, translation: false });
    expect(config.languages.map((lang) => lang.code)).toEqual(['en']);
  });

  it('answers locally with where to navigate', async () => {
    const response = await post('/query', { question: 'Tell me about the analytics dashboard', lang: 'en' });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      source: 'local',
      lang: 'en',
      target: { view: 'projects', anchor: 'project-analytics-dashboard' },
    });
  });

  it('falls back to English when a language cannot be translated', async () => {
    const body = await (await post('/query', { question: 'skills?', lang: 'fr' })).json();
    expect(body.lang).toBe('en');
  });

  it('rejects empty and oversized questions', async () => {
    expect((await post('/query', { question: '   ' })).status).toBe(400);
    expect((await post('/query', { question: 'x'.repeat(501) })).status).toBe(400);
  });

  it('rejects malformed audio clips', async () => {
    const response = await post('/query', {
      question: '',
      audio: { mimeType: 'audio/mp3', data: 'A'.repeat(200) },
    });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/WAV/);
  });

  it('explains that voice questions need a Gemini key', async () => {
    const response = await post('/query', { audio: { mimeType: 'audio/wav', data: 'A'.repeat(200) } });
    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatch(/GEMINI_API_KEY/);
  });
});
