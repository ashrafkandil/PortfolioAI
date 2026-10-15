# PortfolioAI
Portfolio With AI

## Talking avatar

A voice-enabled assistant sits bottom-right on every view. It greets visitors,
answers questions about the portfolio (max two sentences), and narrates project
cards via their **Listen** button. Audio is opt-in: nothing is spoken until the
visitor presses **Play** (or **Listen**).

- **Frontend:** `src/components/Avatar/` (widget, WAV voice recorder, Web Speech TTS helpers, API client)
- **Backend:** `server/avatar.js` (`/api/avatar/config`, `/query`, `/translate`)
  and `server/avatar-knowledge.js` (answers grounded in the site data)

The AI is **Google Gemini** (same stack as CrazyCakesAI): it answers typed
questions, and for voice the browser records a short WAV clip that Gemini
transcribes and answers in one call — no browser speech-recognition service,
so the mic works in Chrome, Edge, Safari and Firefox. Replies are spoken with
the browser's built-in voices (`speechSynthesis`).

It works with zero configuration: answers come from the site data, in English,
with no API keys or network calls. Optional upgrades go in `.env` (see
`.env.example`):

| Setting | Enables |
|---|---|
| `GEMINI_API_KEY` (+ optional `GEMINI_MODEL`) | Google Gemini free tier: AI answers, voice transcription/answers, and translation |
| `LIBRETRANSLATE_URL` | Arabic and French via self-hosted LibreTranslate |

Voice questions (mic button) need `GEMINI_API_KEY`. If Gemini fails or is
rate-limited on a typed question, the server falls back to the local answers.

```bash
npm test   # Vitest: answer logic, API routes, widget behaviour
```

## Data and the database

The site reads its content from a small SQLite database
(`server/data/portfolio.db` by default) on **every** request - the server queries
it live, so there is no build step in the loop and no cache to bust. The browser
refreshes the API data every five seconds (and when a background tab becomes
active again), so a committed edit made with any SQLite IDE appears without a
manual page reload.

The database is the **source of truth**; `server/seed-data.json` is only its
bootstrap data. `npm run seed` only fills an empty database and never tries to
sync an existing database back to the JSON file. Changes made in a database IDE
are retained and served live; they are not exported to `seed-data.json`.

| Task | Command |
|---|---|
| Fill an empty database from `seed-data.json` | `npm run seed` |
| Reset an existing database back to `seed-data.json` (**wipes data**) | `npm run seed:force` |
| Write a timestamped backup copy | `npm run db:backup` |
| Build and run the site locally | `npm run deploy:local` |

`npm run seed` is **non-destructive**: once the database has content it does
nothing, so it is safe to keep in setup or deploy scripts - it will only ever
populate a fresh, empty database and never overwrite live data. `seed:force` is
the only seed command that replaces content; back up first if you need to keep
the current database state.

**Point the database somewhere durable.** Set `DB_PATH` (see `.env.example`) to a
single absolute path shared by the server and your SQLite IDE. All tools must
open the same database file; editing a copied database will not change the
running site. WAL mode and a busy timeout let readers and a single writer
cooperate, but do not replace the database file while the server is running.
The server reads a consistent snapshot per API request and detects committed
changes on the next refresh. For example:

```bash
DB_PATH=/var/lib/portfolio/portfolio.db
```

Set `DB_PATH` in `.env` on Windows as well, using a full path such as
`DB_PATH=C:\Users\you\data\portfolio.db`. Content edited in the database is
durable; the JSON seed uses stable string IDs for records.

## Checks and local deployment

GitHub Actions runs the test suite and production build on pushes and pull
requests. It does not deploy the site: GitHub-hosted runners cannot deploy to
your local computer, and no hosted destination is configured.

For a local production-style run, use `npm run deploy:local`. It seeds only if
the database is empty, builds the frontend, and starts the Express server at
`http://localhost:3001` (or the port set in `.env`). Keep the server process
running to serve the built site. Before deploying to any remote environment,
choose a host and persistent database location; do not put the local SQLite
database or its backups in Git.
