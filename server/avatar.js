import express from 'express';
import { getSiteData } from './db.js';
import { answerLocally, buildContext, limitSentences, resolveTarget, siteTargets } from './avatar-knowledge.js';

/**
 * Talking-avatar API.
 *
 * Every external service is optional and configured through environment
 * variables (see .env.example). With nothing configured the avatar still works:
 * it answers in English from the site data via `answerLocally`.
 *
 * The AI brain is Google Gemini (same stack as CrazyCakesAI): it answers text
 * questions, transcribes voice clips (the browser records a WAV and Gemini
 * hears it in one call - no Web Speech recognition service needed), and can
 * translate when LibreTranslate is not configured.
 *
 *   GEMINI_API_KEY       enables Gemini (free tier): answers, voice, translation
 *   GEMINI_MODEL         pin a model; otherwise a fallback chain is tried
 *   GEMINI_API_BASE_URL  override the Google endpoint (testing/proxies)
 *   LIBRETRANSLATE_URL     self-hosted LibreTranslate, e.g. http://localhost:5000
 *   LIBRETRANSLATE_API_KEY only needed for instances that require one
 */

// English, Arabic and French only: the avatar's supported answer languages.
export const LANGUAGES = [
  { code: 'en', label: 'English', name: 'English', speech: 'en-US' },
  { code: 'ar', label: 'العربية', name: 'Arabic', speech: 'ar-SA' },
  { code: 'fr', label: 'Français', name: 'French', speech: 'fr-FR' },
];

const MAX_QUESTION_LENGTH = 500;
const MAX_TRANSLATE_LENGTH = 1000;
const MAX_AUDIO_CHARS = 2_500_000;
const UPSTREAM_TIMEOUT_MS = 15_000;

/** Free tiers have small quotas; cap how fast one visitor can spend them. */
const RATE_LIMIT = { windowMs: 60_000, max: 20 };

/**
 * Tried in order. Google retires model versions over time, so we fall back automatically.
 * Lite first: they answer in under a second on the free tier; the full Flash models can
 * think for 30s+ which is too slow for a chat reply.
 */
const DEFAULT_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-3.8-flash',
];

/** Sent alongside the voice clip: Gemini transcribes and answers in one call. */
const VOICE_PROMPT =
  'This is a voice message from the visitor. Write exactly what they said in "heard" ' +
  '(in the language they spoke), then reply to it in "reply" with 1-3 short plain-text sentences. ' +
  'If it is silent or unclear, set "heard" to "" and kindly ask them to repeat.';

/** Flat JSON output: nested objects make small models loop, so every field is top-level. */
const VOICE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    heard: { type: 'STRING', description: 'Transcript of the voice message, empty when unclear' },
    reply: { type: 'STRING', description: 'The spoken reply; may end with a [[go:key]] navigation tag' },
  },
  required: ['heard', 'reply'],
  propertyOrdering: ['heard', 'reply'],
};

function geminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  return apiKey ? { apiKey } : null;
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

/** Returns the clip when well-formed, null when absent, or 'invalid' when malformed. */
function parseAudioClip(audio) {
  if (audio === undefined || audio === null) return null;
  const valid =
    audio.mimeType === 'audio/wav' &&
    typeof audio.data === 'string' &&
    audio.data.length >= 100 &&
    audio.data.length <= MAX_AUDIO_CHARS &&
    /^[A-Za-z0-9+/=]+$/.test(audio.data);
  return valid ? audio : 'invalid';
}

/** Remember which model worked so the next question starts there. */
let preferredModel;
const unavailableModels = new Set();

function modelChain() {
  const configured = [process.env.GEMINI_MODEL, ...DEFAULT_MODELS]
    .map((model) => model?.trim())
    .filter((model) => model);
  const models = [...new Set(configured)].filter((model) => !unavailableModels.has(model));
  if (preferredModel && models.includes(preferredModel)) {
    return [preferredModel, ...models.filter((model) => model !== preferredModel)];
  }
  return models.length ? models : [...new Set(configured)];
}

function isKeyProblem(status, message) {
  return status === 401 || status === 403 || (status === 400 && /api[ _]?key/i.test(message));
}

async function callGemini(model, payload) {
  const { apiKey } = geminiConfig();
  const base = (process.env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
  try {
    const response = await fetch(`${base}/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, status: response.status, message: data.error?.message || `HTTP ${response.status}` };
    }
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const text = parts
      .filter((part) => !part.thought)
      .map((part) => part.text ?? '')
      .join('')
      .trim();
    if (!text) {
      const blocked = data.promptFeedback?.blockReason;
      return {
        ok: false,
        status: response.status,
        message: blocked ? `Blocked: ${blocked}` : 'Gemini returned an empty answer',
      };
    }
    return { ok: true, text };
  } catch (error) {
    return { ok: false, status: 0, message: error.message };
  }
}

/**
 * Run `makePayload(model)` down the model chain until one answers.
 * Throws a visitor-friendly Error; `error.rateLimited` marks free-tier 429s.
 */
async function runGemini(makePayload) {
  const failures = [];
  let rateLimited = false;
  for (const model of modelChain()) {
    const result = await callGemini(model, makePayload(model));
    if (result.ok) {
      preferredModel = model;
      return result.text;
    }
    failures.push(`${model}: ${result.status} ${result.message.slice(0, 160)}`);
    console.warn(`[avatar] Gemini ${model} failed (${result.status}): ${result.message}`);
    if (isKeyProblem(result.status, result.message)) {
      throw new Error('Gemini rejected the API key. Check GEMINI_API_KEY in .env and restart the server.');
    }
    if (result.status === 404) unavailableModels.add(model);
    if (result.status === 429) rateLimited = true;
  }
  const error = new Error(
    rateLimited
      ? "I'm a little busy right now (free-tier limit). Please try again in a minute."
      : `Gemini failed: ${failures.join(' | ')}`
  );
  error.rateLimited = rateLimited;
  throw error;
}

/** Plain-text generation (answers, translations); `system` becomes the system instruction. */
function generateText(system, userText, { maxTokens = 160 } = {}) {
  return runGemini(() => ({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: maxTokens },
  }));
}

function askSystemPrompt(data, lang) {
  return [
    `You are the friendly voice assistant on ${data.profile.name}'s portfolio website.`,
    `Answer visitor questions about ${data.profile.name} using ONLY the facts below.`,
    'If the facts do not cover the question, say you do not know and suggest the Contact page.',
    `Reply in ${languageName(lang)}, in at most two short sentences, plain text with no markdown or lists.`,
    `Refer to ${data.profile.name.split(' ')[0]} by first name in the third person.`,
    'After the answer, add a tag naming the page section that best shows what you talked about,',
    `chosen from: ${[...siteTargets(data).keys()].join(', ')}, or none. Format: [[go:projects]]`,
    '',
    buildContext(data),
  ].join('\n');
}

async function askGemini(question, lang, data) {
  const raw = await generateText(askSystemPrompt(data, lang), question);
  return parseNavigationTag(raw);
}

/**
 * One voice call: Gemini transcribes the WAV clip ("heard") and answers it
 * ("reply"), so the browser never needs a speech-recognition service - the
 * same approach as CrazyCakesAI.
 */
async function askGeminiVoice(clip, lang, data) {
  const raw = await runGemini(() => ({
    systemInstruction: { parts: [{ text: askSystemPrompt(data, lang) }] },
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: clip.mimeType, data: clip.data } },
          { text: VOICE_PROMPT },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 600,
      responseMimeType: 'application/json',
      responseSchema: VOICE_SCHEMA,
    },
  }));
  let parsed;
  try {
    parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim());
  } catch {
    throw new Error('Gemini returned an unusable voice reply');
  }
  const reply = typeof parsed.reply === 'string' ? parsed.reply.trim() : '';
  if (!reply) throw new Error('Gemini returned an unusable voice reply');
  return {
    ...parseNavigationTag(reply),
    heard: typeof parsed.heard === 'string' ? parsed.heard.trim().slice(0, 500) : '',
  };
}

const NAVIGATION_TAG = /\[\[\s*go\s*:\s*([\w/-]+)\s*\]\]/i;

/** Split the LLM's "[[go:key]]" tag off its answer. */
export function parseNavigationTag(raw) {
  const match = raw.match(NAVIGATION_TAG);
  const text = raw.replace(new RegExp(NAVIGATION_TAG, 'gi'), '').trim();
  return { text, target: match ? match[1].toLowerCase() : null };
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
  if (geminiConfig()) {
    try {
      return await generateText(
        `Translate the user's text from ${languageName(source)} to ${languageName(target)}. Output only the translation.`,
        text,
        { maxTokens: 400 }
      );
    } catch (error) {
      console.warn(`Avatar Gemini translation failed: ${error.message}`);
    }
  }
  return null;
}

function canTranslate() {
  return Boolean(translatorConfig() || geminiConfig());
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
    // Without a translator or Gemini only English can be answered, so only offer it.
    const languages = canTranslate() ? LANGUAGES : LANGUAGES.filter((lang) => lang.code === 'en');
    res.json({ languages, llm: Boolean(geminiConfig()), translation: canTranslate() });
  });

  router.post('/query', limit, async (req, res) => {
    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    const lang = normalizeLang(req.body?.lang);
    const audio = parseAudioClip(req.body?.audio);
    if (audio === 'invalid') {
      res.status(400).json({ error: 'Audio must be a small base64 WAV clip.' });
      return;
    }
    if (!question && !audio) {
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

    // Voice: Gemini hears the clip, transcribes it and answers in one call.
    if (audio) {
      if (!geminiConfig()) {
        res.status(503).json({
          error: 'Voice questions need a free Google Gemini API key. Add GEMINI_API_KEY to .env and restart the server.',
        });
        return;
      }
      try {
        const reply = await askGeminiVoice(audio, lang, data);
        const target =
          reply.target === 'none'
            ? null
            : (resolveTarget(reply.target, data) ??
              resolveTarget(answerLocally(reply.heard || question, data).target, data));
        res.json({ answer: limitSentences(reply.text), heard: reply.heard, source: 'gemini', lang, target });
      } catch (error) {
        console.warn(`Avatar voice answer failed: ${error.message}`);
        res.status(error.rateLimited ? 429 : 502).json({ error: error.message });
      }
      return;
    }

    if (geminiConfig()) {
      try {
        const reply = await askGemini(question, lang, data);
        // Trust the Gemini tag only if it names a real section; otherwise route
        // the question the same way the local answerer would.
        const target =
          reply.target === 'none'
            ? null
            : (resolveTarget(reply.target, data) ?? resolveTarget(answerLocally(question, data).target, data));
        res.json({ answer: limitSentences(reply.text), source: 'gemini', lang, target });
        return;
      } catch (error) {
        console.warn(`Avatar Gemini failed, answering locally: ${error.message}`);
      }
    }

    // The local answerer only understands English: translate in, then back out.
    const english = lang === 'en' ? question : ((await translate(question, 'en', lang)) ?? question);
    const { text: answer, target } = answerLocally(english, data);
    const localized = lang === 'en' ? answer : await translate(answer, lang);
    res.json({
      answer: localized ?? answer,
      source: 'local',
      lang: localized ? lang : 'en',
      target: resolveTarget(target, data),
    });
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
