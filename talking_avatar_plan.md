# Technical Plan for Adding a Talking Avatar to the Portfolio Site

## Overview
This plan outlines how to integrate a free, interactive talking avatar into the PortfolioAI website. The avatar will serve as a virtual guide, providing introductions, project summaries, and FAQ assistance without requiring paid services.

---

## 1. Choose an Avatar Rendering Library
| Option | Description | Free? |
|---|---|---|
| **Three.js + @pixiv/three-avatar** | Renders 3D avatars (e.g., ready‑made models from Ready Player Me). | ✅ |
| **Babylon.js** | Similar capabilities, good for WebGL performance. | ✅ |
| **Lottie / Bodymovin** | 2‑D animated vector avatars (lightweight). | ✅ |
| **Speech Synthesis API** | Browser‑native TTS for voice output (no external cost). | ✅ |

**Selected stack:** `Three.js` + `@readyplayerme/readyplayerme-sdk` for avatar loading + native Web Speech API for speech.

---

## 2. Project Structure Changes
```
src/
├─ components/
│   ├─ Avatar/
│   │   ├─ Avatar.tsx      # React component that loads and controls the avatar
│   │   ├─ avatarConfig.ts # Avatar model URL and default position
│   │   └─ speech.ts       # Wrapper around SpeechSynthesis
│   └─ ...
└─ pages/
    └─ index.tsx          # Add <Avatar/> at the bottom‑right corner
```

---

## 3. Implement the Avatar Component
1. **Install dependencies** (run once):
   ```bash
   npm i three @readyplayerme/readyplayerme-sdk
   ```
2. **Load the avatar** using the Ready Player Me SDK:
   ```tsx
   import { useEffect, useRef } from 'react';
   import * as THREE from 'three';
   import { loadAvatar } from '@readyplayerme/readyplayerme-sdk';

   const Avatar = () => {
     const containerRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
       const scene = new THREE.Scene();
       const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
       const renderer = new THREE.WebGLRenderer({ alpha: true });
       renderer.setSize(200, 200);
       containerRef.current?.appendChild(renderer.domElement);

       loadAvatar('https://models.readyplayer.me/your-model.glb', scene, { x: 0, y: 0, z: 0 })
         .then(() => {
           camera.position.set(0, 1.6, 2);
           const animate = () => {
             requestAnimationFrame(animate);
             renderer.render(scene, camera);
           };
           animate();
         })
         .catch(console.error);
     }, []);

     return <div ref={containerRef} style={{ position: 'fixed', bottom: '20px', right: '20px' }} />;
   };

   export default Avatar;
   ```
3. **Add simple interaction** – clicking the avatar opens a small chat bubble with preset options (intro, projects, contact).

---

## 4. Speech Synthesis Integration
Create `speech.ts`:
```ts
export const speak = (text: string, lang = 'en-US') => {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  // Choose a free voice that exists on most browsers
  const voices = window.speechSynthesis.getVoices();
  utter.voice = voices.find(v => v.lang === lang) || null;
  window.speechSynthesis.speak(utter);
};
```
Use this helper inside the avatar component when a user selects an option.

---

## 5. Interaction Flow
1. **Greeting** – on first click: `speak('Hi, I’m Alex. Want to see my design projects, read my resume, or get in touch?')`
2. **Buttons** – render three small buttons beneath the avatar: *Projects*, *Resume*, *Contact*.
3. **Project Narration** – when a project card is hovered, call `speak('This project solved X by using Y, resulting in Z')` for a 20‑second summary.
4. **FAQ** – a hidden text input can be toggled; on submit, send the query to a free LLM endpoint (e.g., **HuggingFace inference**). The response is spoken via `speak`.

---

## 6. Accessibility & Opt‑In
* Add a **Play** button before any speech starts.
* Provide a **Mute** toggle that calls `window.speechSynthesis.cancel()`.
* Ensure the avatar is keyboard‑focusable (`tabindex="0"`).
* Offer language selection – pass the chosen `lang` to `speak`.

---

## 7. Deployment Considerations
* Host the avatar GLB file on a static CDN (GitHub Pages, Cloudflare Workers) – free tier.
* Keep the WebGL canvas size small (≈200 × 200 px) to reduce load.
* Test on mobile – hide the avatar on very small screens or provide a floating button that expands the avatar.

---

## 8. Timeline
| Day | Task |
|-----|------|
| 1   | Install libs, scaffold `components/Avatar` folder |
| 2   | Implement basic Three.js avatar loading |
| 3   | Add speech helper and greeting interaction |
| 4   | Build UI for project/FAQ buttons, integrate optional LLM API |
| 5   | Polish accessibility, add language selector, test across browsers |
| 6   | Deploy and verify performance |

---

## 9. Future Enhancements
* Replace the TTS with a custom voice using free tools like **Coqui TTS** for a more personal tone.
* Add lip‑sync using `threejs-lipsync` to match speech.
* Animate avatar gestures (nod, wave) with simple keyframe animations.

---

**Result:** A lightweight, free‑of‑charge talking avatar that improves user engagement while staying within the portfolio’s existing tech stack.
