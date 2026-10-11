# PortfolioAI
Portfolio With AI

## Talking avatar

A voice-enabled assistant sits bottom-right on every view. It greets visitors,
answers questions about the portfolio (max two sentences), and narrates project
cards via their **Listen** button. Audio is opt-in: nothing is spoken until the
visitor presses **Play** (or **Listen**).

- **Frontend:** `src/components/Avatar/` (widget, Web Speech TTS/STT helpers, API client)
- **Backend:** `server/avatar.js` (`/api/avatar/config`, `/query`, `/translate`)
  and `server/avatar-knowledge.js` (answers grounded in the site data)

It works with zero configuration: answers come from the site data, in English,
with no API keys or network calls. Optional upgrades go in `.env` (see
`.env.example`):

| Setting | Enables |
|---|---|
| `AVATAR_LLM_MODEL` (+ `AVATAR_LLM_BASE_URL`, `AVATAR_LLM_API_KEY`) | Free-form LLM answers via any OpenAI-compatible API: OpenRouter `:free` models, or a local Ollama |
| `LIBRETRANSLATE_URL` | Arabic/Spanish/French/German via self-hosted LibreTranslate |

If the LLM fails or is rate-limited, the server falls back to the local answers.

```bash
npm test   # Vitest: answer logic, API routes, widget behaviour
```
