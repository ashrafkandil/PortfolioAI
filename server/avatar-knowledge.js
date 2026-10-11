/**
 * Everything the avatar knows comes from the same site data the pages render,
 * so its answers cannot drift from what the portfolio actually says.
 *
 * `answerLocally` is the zero-cost path: plain keyword matching, no network,
 * no API key. It is what visitors get when no LLM is configured and what the
 * server falls back to when the LLM call fails.
 */

/** The technical plan caps spoken answers at two sentences. */
export const MAX_SENTENCES = 2;

/** A period after these does not end a sentence ("Tech Solutions Inc. (2020)"). */
const ABBREVIATION = /\b(inc|corp|ltd|llc|co|mr|mrs|ms|dr|st|jr|sr|vs|etc|e\.g|i\.e)\.$/i;

export function limitSentences(text, max = MAX_SENTENCES) {
  const clean = text.replace(/\s+/g, ' ').trim();
  const sentences = [];
  let start = 0;
  // Arabic uses "؟" as its question mark.
  for (const match of clean.matchAll(/[.!?؟]+["')\]]*(?=\s|$)/g)) {
    const end = match.index + match[0].length;
    const sentence = clean.slice(start, end).trim();
    if (end < clean.length && ABBREVIATION.test(sentence)) continue;
    sentences.push(sentence);
    start = end;
    if (sentences.length === max) return sentences.join(' ');
  }
  const rest = clean.slice(start).trim();
  if (rest) sentences.push(rest);
  return sentences.slice(0, max).join(' ');
}

/** "Acme Inc. | City, ST" -> "Acme Inc." */
function employer(company) {
  return company.split('|')[0].trim();
}

function listPhrase(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whole-word match that also works for names like "C++" and "Node.js". */
function mentions(question, term) {
  return new RegExp(`(?<![\\w])${escapeRegExp(term.toLowerCase())}(?![\\w])`).test(question);
}

function hasAny(question, words) {
  return words.some((word) => mentions(question, word));
}

/** Spoken summary of one project; also used for the per-card narration. */
export function projectNarration(project) {
  const tech = project.tech.slice(0, 3);
  const built = tech.length ? ` Built with ${listPhrase(tech)}.` : '';
  return `${project.title}: ${limitSentences(project.description, 1)}${built}`;
}

/** Every technology the site mentions, mapped to where it appears. */
function techIndex(data) {
  const index = new Map();
  const add = (name, where) => {
    const key = name.toLowerCase();
    if (!index.has(key)) index.set(key, { name, categories: [], projects: [] });
    const entry = index.get(key);
    if (where.category && !entry.categories.includes(where.category)) entry.categories.push(where.category);
    if (where.project && !entry.projects.includes(where.project)) entry.projects.push(where.project);
  };
  for (const category of data.about.skills) {
    for (const skill of category.skills) add(skill, { category: category.title });
  }
  for (const project of data.projects) {
    for (const tech of project.tech) add(tech, { project: project.title });
  }
  for (const job of data.experience) {
    for (const tech of job.tech) add(tech, {});
  }
  return index;
}

/** Significant words of a project title, for loose matches like "the chatbot". */
const TITLE_STOPWORDS = new Set(['system', 'platform', 'app', 'the', 'and', 'real-time', 'mobile', 'dashboard']);

function findProject(question, projects) {
  const exact = projects.find((project) => question.includes(project.title.toLowerCase()));
  if (exact) return exact;
  return projects.find((project) =>
    project.title
      .toLowerCase()
      .split(/[\s&]+/)
      .filter((word) => word.length > 3 && !TITLE_STOPWORDS.has(word))
      .some((word) => mentions(question, word) || mentions(question, word.replace(/-powered$/, '')))
  );
}

export function introduction(data) {
  const { name, role, shortBio } = data.profile;
  return `Hi, I'm the virtual assistant for ${name}, a ${role}. ${limitSentences(shortBio, 1)}`;
}

export function answerLocally(rawQuestion, data) {
  const question = rawQuestion.toLowerCase().trim();
  const { profile, about, experience, projects } = data;
  const first = profile.name.split(' ')[0];

  if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(question) && question.length < 25) {
    return introduction(data);
  }

  const project = findProject(question, projects);
  if (project) return projectNarration(project);

  if (hasAny(question, ['email', 'contact', 'reach', 'hire', 'phone', 'call', 'touch', 'message'])) {
    const phone = profile.phone ? ` or call ${profile.phone}` : '';
    return `You can email ${first} at ${profile.email}${phone}. There's also a message form on the Contact page.`;
  }

  // "Where did he work?" is about employers, not the city.
  const aboutWork = hasAny(question, ['work', 'worked', 'working', 'company', 'companies', 'job']);
  if (!aboutWork && hasAny(question, ['where', 'location', 'located', 'based', 'live', 'city', 'relocate'])) {
    return `${first} is based in ${profile.location}.`;
  }

  const index = techIndex(data);
  const tech = [...index.values()].find((entry) => mentions(question, entry.name));
  if (tech) {
    const parts = [];
    if (tech.categories.length) parts.push(`listed under ${listPhrase(tech.categories)}`);
    if (tech.projects.length) parts.push(`used in ${listPhrase(tech.projects.slice(0, 3))}`);
    const detail = parts.length ? `: it's ${parts.join(' and ')}` : '';
    return `Yes, ${tech.name} is part of ${first}'s toolkit${detail}.`;
  }

  if (hasAny(question, ['experience', 'job', 'jobs', 'worked', 'working', 'career', 'company', 'companies', 'current', 'currently', 'years', 'role', 'employer']) || (aboutWork && mentions(question, 'where'))) {
    const [current, ...previous] = experience;
    if (!current) return `${first} is a ${profile.role}.`;
    const before = previous.slice(0, 2).map((job) => employer(job.company));
    const earlier = before.length ? ` Before that, ${first} worked at ${listPhrase(before)}.` : '';
    return `${first} is currently a ${current.title} at ${employer(current.company)} (${current.period}).${earlier}`;
  }

  if (hasAny(question, ['skill', 'skills', 'stack', 'tech', 'technology', 'technologies', 'language', 'languages', 'framework', 'frameworks', 'tools'])) {
    const summary = about.skills.map((category) => `${category.title.toLowerCase()} like ${listPhrase(category.skills.slice(0, 3))}`);
    return `${first} works with ${listPhrase(summary)}.`;
  }

  if (hasAny(question, ['project', 'projects', 'built', 'build', 'portfolio', 'work', 'made'])) {
    const titles = projects.slice(0, 3).map((p) => p.title);
    return `Featured projects include ${listPhrase(titles)}. Ask me about any of them for details.`;
  }

  if (hasAny(question, ['who', 'about', 'yourself', 'background', 'bio', 'introduce'])) {
    return introduction(data);
  }

  return `I can tell you about ${first}'s projects, experience, skills, or how to get in touch. Try asking about one of those!`;
}

/** Compact, factual brief handed to the LLM as its only source of truth. */
export function buildContext(data) {
  const { profile, about, experience, projects } = data;
  const lines = [
    `Name: ${profile.name}`,
    `Role: ${profile.role}`,
    `Tagline: ${profile.tagline}`,
    `Location: ${profile.location}`,
    `Email: ${profile.email}`,
    `Bio: ${about.bio.join(' ')}`,
    `Skills: ${about.skills.map((c) => `${c.title}: ${c.skills.join(', ')}`).join('; ')}`,
    'Experience:',
    ...experience.map(
      (job) => `- ${job.title} at ${job.company} (${job.period}). ${job.duties.slice(0, 2).join(' ')}`
    ),
    'Projects:',
    ...projects.map((p) => `- ${p.title}: ${p.description} Tech: ${p.tech.join(', ')}.`),
  ];
  return lines.join('\n');
}
