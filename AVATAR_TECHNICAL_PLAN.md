 looking to implment # Technical Plan: Talking Avatar for Portfolio Site

## Overview
Add an interactive, voice‑enabled avatar to the landing page that can greet visitors, answer FAQs, and narrate project highlights. The solution will be **free** (using open‑source libraries and free tier services) and will respect user experience best practices (opt‑in audio, short clips, multilingual support).

## Architecture
1. **Frontend UI** – A small avatar widget anchored to the bottom‑right corner.
2. **Speech Synthesis** – Browser‑native Web Speech API (or free TTS like [ResponsiveVoice] if needed).
3. **LLM Backend** – Free hosted LLM (e.g., **OpenAI’s gpt‑3.5‑turbo** via Azure free tier or **Claude Instant** free tier) accessed through a lightweight Node/Express server.
4. **Voice Cloning (optional)** – Free open‑source voice cloning (e.g., **Coqui TTS**) deployed on a serverless function.
5. **Multilingual Translation** – Free translation API (e.g., **LibreTranslate** self‑hosted or public demo).

```
+-------------------+       +-------------------+       +-------------------+
|  Browser (React) | <---> |  Avatar Widget    | <---> |  Speech / TTS API |
+-------------------+       +-------------------+       +-------------------+
                               |
                               v
                         +-------------------+
                         |  LLM Backend API  |
                         +-------------------+
                               |
                               v
                         +-------------------+
                         |  Translation API |
                         +-------------------+
```

## Implementation Steps
1. **Create Avatar Component**
   - Use a lightweight React component (`AvatarWidget.jsx`).
   - Include a static PNG/SVG for the idle state and a short looping animation (GIF or CSS sprite).
   - Position with `position: fixed; bottom: 20px; right: 20px;`.
2. **Add Speech Interaction**
   - Implement a **Play** button that opens a speech bubble.
   - Use the **Web Speech API** for text‑to‑speech (TTS) and speech‑to‑text (STT) when supported.
   - Fallback to **ResponsiveVoice** if the native API is unavailable.
3. **Integrate LLM Backend**
   - Set up a minimal Express server (`server/avatar.js`).
   - Endpoint `POST /api/avatar/query` receives the user’s question and returns a concise answer (max 2 sentences).
   - Use free‑tier OpenAI key or other free LLM; keep prompts short to stay within quota.
4. **Multilingual Support**
   - Add a language selector in the avatar UI.
   - When a language is selected, forward the user query to **LibreTranslate** (self‑hosted Docker image) before sending to the LLM, and translate the answer back.
5. **Project Narration Feature**
   - For each project section, add a data attribute (`data-narration="..."`).
   - When the avatar is clicked, read the attribute via TTS.
6. **Accessibility & UX**
   - Avatar stays muted until the user clicks **Play**.
   - Provide a **Close** button to hide the avatar.
   - Ensure all interactive elements are keyboard‑focusable and have ARIA labels.
7. **Deploy**
   - Frontend changes go through the existing Vite/Next build.
   - Backend can be deployed as a serverless function on **Vercel** (free tier) or **Render**.
   - Dockerize the translation service and run locally during development.

## Tools & Libraries
- **React** – existing framework.
- **Web Speech API** – native TTS/STT.
- **Express** – lightweight backend.
- **OpenAI / Claude** – free LLM tier.
- **LibreTranslate** – free open‑source translation.
- **Coqui TTS** (optional) – free voice cloning.
- **Vite/Next** – existing build pipeline.
- **Docker** – for running LibreTranslate locally.

## Testing & Validation
- Unit tests for the avatar component (Jest + React Testing Library).
- End‑to‑end tests with Cypress to verify speech playback and LLM responses.
- Accessibility audit with axe‑core.
- Performance check: avatar should add < 200 KB bundle size.

## Timeline (Free‑Tier Development)
| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 1. UI & Speech Setup | 2 days | Avatar widget with play button & native TTS |
| 2. LLM Backend | 3 days | `/api/avatar/query` endpoint, free LLM integration |
| 3. Multilingual & Narration | 2 days | Language selector, project narration data attributes |
| 4. Testing & Accessibility | 1 day | Unit, e2e, and a11y tests |
| 5. Deploy & Docs | 1 day | Production deployment and README updates |

---

**Result:** A free, interactive avatar that greets visitors, answers questions, and narrates projects while remaining optional and lightweight.
