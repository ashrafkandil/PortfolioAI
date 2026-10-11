import express from 'express';
import { getSiteData } from './db.js';
import { answerLocally, buildContext, limitSentences } from './avatar-knowledge.js';

/**
 * Talking-avatar API.
 *
 * Every external service is optional and configured through environment
 * variables (see .env.example). With nothing configured the avatar still works:
 * it answers in English from the site data via `answerLocally`.
 *
 *   AVATAR_LLM_MODEL       enables the LLM; any OpenAI-compatible chat API
 *   AVATAR_LLM_BASE_URL    defaults to OpenRouter (free ":free" models), or
 *                          e.g. http://localhost:11434/v1 for a local Ollama
 *   AVATAR_LLM_API_KEY     sent as a Bearer token when set
 *   LIBRETRANSLATE_URL     self-hosted LibreTranslate, e.g. http://localhost:5000
 *   LIBRETRANSLATE_API_KEY only needed for instances that require one
 */

export const LANGUAGES = [
  { code: 'en', label: 'English', name: 'English', speech: 'en-US' },
  { code: 'ar', label: 'العربية', name: 'Arabic', speech: 'ar-SA' },
  { code: 'es', label: 'Español', name: 'Spanish', speech: 'es-ES' },
  { code: 'fr', label: 'Français', name: 'French', speech: 'fr-FR' },
  { code: 'de', label: 'Deutsch', name: 'German', speech: 'de-DE' },
];

const MAX_QUESTION_LENGTH = 500;
const MAX_TRANSLATE_LENGTH = 1000;
const UPSTREAM_TIMEOUT_MS = 15_000;

/** Free tiers have small quotas; cap how fast one visitor can spend them. */
const RATE_LIMIT = { windowMs: 60_000, max: 20 };

function llmConfig() {
  const model = process.env.AVATAR_LLM_MODEL;
  if (!model) return null;
  return {
    model,
    baseUrl: (process.env.AVATAR_LLM_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/, ''),
    apiKey: process.env.AVATAR_LLM_API_KEY || '',
  };
}

function translatorConfig() {
  const url = process.env.LIBRETRANSLATE_URL;
  if (!url) return null;
  return { url: url.replace(/\/+$/, ''), apiKey: process.env.LIBRETRANSLATE_API_KEY || '' };
}

function languageName(code) {
  // Prompts name the language in English; `label` is what visitors see.
  return LANGUAGES.find((lang) => lang.code === code)?.name ?? 'English';
}

function normalizeLang(code) {
  return LANGUAGES.some((lang) => lang.code === code) ? code : 'en';
}

async function chat(messages, { maxTokens = 160 } = {}) {
  const config = llmConfig();
  const headers = { 'Content-Type': 'application/json' };
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: config.model, messages, max_tokens: maxTokens, temperature: 0.3 }),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`LLM HTTP ${response.status}`);
  const body = await response.json();
  const text = body.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('LLM returned an empty answer');
  return text;
}

async function askLlm(question, lang, data) {
  const system = [
    `You are the friendly voice assistant on ${data.profile.name}'s portfolio website.`,
    `Answer visitor questions about ${data.profile.name} using ONLY the facts below.`,
    'If the facts do not cover the question, say you do not know and suggest the Contact page.',
    `Reply in ${languageName(lang)}, in at most two short sentences, plain text with no markdown or lists.`,
    `Refer to ${data.profile.name.split(' ')[0]} by first name in the third person.`,
    '',
    buildContext(data),
  ].join('\n');
  return chat([
    { role: 'system', content: system },
    { role: 'user', content: question },
  ]);
}

/**
 * Translate with LibreTranslate when configured, otherwise with the LLM.
 * Returns null when neither is available or both fail.
 */
async function translate(text, target, source = 'en') {
  if (target === source) return text;
  const translator = translatorConfig();
  if (translator) {
    try {
      const response = await fetch(`${translator.url}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source,
          target,
          format: 'text',
          ...(translator.apiKey && { api_key: translator.apiKey }),
        }),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`LibreTranslate HTTP ${response.status}`);
      const body = await response.json();
      if (body.translatedText) return body.translatedText;
    } catch (error) {
      console.warn(`Avatar translation failed: ${error.message}`);
    }
  }
  if (llmConfig()) {
    try {
      return await chat(
        [
          {
            role: 'system',
            content: `Translate the user's text from ${languageName(source)} to ${languageName(target)}. Output only the translation.`,
          },
          { role: 'user', content: text },
        ],
        { maxTokens: 400 }
      );
    } catch (error) {
      console.warn(`Avatar LLM translation failed: ${error.message}`);
    }
  }
  return null;
}

function canTranslate() {
  return Boolean(translatorConfig() || llmConfig());
}

function rateLimiter() {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip ?? 'unknown';
    const entry = hits.get(key);
    if (!entry || now > entry.reset) {
      hits.set(key, { count: 1, reset: now + RATE_LIMIT.windowMs });
      // Drop expired entries now and then so the map cannot grow forever.
      if (hits.size > 1000) {
        for (const [ip, value] of hits) if (now > value.reset) hits.delete(ip);
      }
      next();
      return;
    }
    entry.count += 1;
    if (entry.count > RATE_LIMIT.max) {
      res.status(429).json({ error: 'Too many questions - please wait a minute.' });
      return;
    }
    next();
  };
}

export function createAvatarRouter() {
  const router = express.Router();
  const limit = rateLimiter();

  router.get('/config', (_req, res) => {
    // Without a translator or LLM only English can be answered, so only offer it.
    const languages = canTranslate() ? LANGUAGES : LANGUAGES.filter((lang) => lang.code === 'en');
    res.json({ languages, llm: Boolean(llmConfig()), translation: canTranslate() });
  });

  router.post('/query', limit, async (req, res) => {
    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    const lang = normalizeLang(req.body?.lang);
    if (!question) {
      res.status(400).json({ error: 'Please ask a question.' });
      return;
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      res.status(400).json({ error: `Questions are limited to ${MAX_QUESTION_LENGTH} characters.` });
      return;
    }
    const data = getSiteData();
    if (!data) {
      res.status(503).json({ error: 'Database is empty. Run: npm run seed' });
      return;
    }

    if (llmConfig()) {
      try {
        const answer = limitSentences(await askLlm(question, lang, data));
        res.json({ answer, source: 'llm', lang });
        return;
      } catch (error) {
        console.warn(`Avatar LLM failed, answering locally: ${error.message}`);
      }
    }

    // The local answerer only understands English: translate in, then back out.
    const english = lang === 'en' ? question : ((await translate(question, 'en', lang)) ?? question);
    const answer = answerLocally(english, data);
    const localized = lang === 'en' ? answer : await translate(answer, lang);
    res.json({ answer: localized ?? answer, source: 'local', lang: localized ? lang : 'en' });
  });

  router.post('/translate', limit, async (req, res) => {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const lang = normalizeLang(req.body?.lang);
    if (!text || text.length > MAX_TRANSLATE_LENGTH) {
      res.status(400).json({ error: `Text must be 1-${MAX_TRANSLATE_LENGTH} characters.` });
      return;
    }
    const translated = await translate(text, lang);
    res.json({ text: translated ?? text, lang: translated ? lang : 'en' });
  });

  return router;
}
