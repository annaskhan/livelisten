# LiveListen — Project Memory

## What This Is
Real-time audio translation app. Captures live speech via Deepgram Nova-3 (with browser Web Speech API fallback), translates using Claude Haiku, and optionally speaks the result via Web Speech Synthesis. Built with Next.js 16 + TypeScript + Tailwind CSS + Capacitor for iOS/Android.

## Current Version
v1.1.0

## Tech Stack
- **Framework**: Next.js 16.1.6, React 19.2.4, TypeScript 5.9.3
- **Styling**: Tailwind CSS 4.2.1 + custom CSS (warm/glassmorphism theme)
- **Speech-to-Text**: Deepgram Nova-3 (primary) / Browser Web Speech API (fallback)
- **Translation**: Claude Haiku (claude-haiku-4-5-20251001) via Anthropic SDK
- **Text-to-Speech**: Browser Web Speech Synthesis API
- **Mobile**: Capacitor 8.2.0 (iOS + Android)
- **Testing**: Vitest 4.0.18
- **Fonts**: Source Serif 4, Inter, Amiri (Arabic)

## Supported Languages (10)
Arabic, English, French, Spanish, Urdu, Turkish, Malay, Indonesian, Bengali, Somali
- RTL support for Arabic and Urdu

## Deployment
- **Web**: Vercel (pushes to branch auto-deploy)
- **Mobile**: Capacitor static export (`npm run mobile:build`)
- **Branch**: `claude/review-livelisten-lteuc`

## Architecture
```
src/
├── app/
│   ├── page.tsx                  # Main app (655 lines) — all screens/states
│   ├── layout.tsx                # Root layout, metadata, fonts
│   ├── globals.css               # Full design system + animations
│   ├── api/translate/route.ts    # Translation endpoint (Claude API, streaming)
│   ├── api/deepgram-token/route.ts # Temporary scoped Deepgram keys
│   ├── privacy/page.tsx          # Privacy policy
│   └── terms/page.tsx            # Terms of service
├── components/
│   ├── SettingsModal.tsx          # Language, voice, engine settings
│   ├── HistoryModal.tsx           # Session history list
│   ├── SessionViewer.tsx          # View past session details
│   ├── OnboardingScreen.tsx       # First-time user onboarding
│   ├── PermissionGate.tsx         # Mic permission denied screen
│   └── ConsentBanner.tsx          # GDPR consent banner
├── hooks/
│   ├── useAudioVisualizer.ts      # Real-time frequency analysis
│   ├── useAppLifecycle.ts         # Visibility + Capacitor lifecycle
│   ├── useOnlineStatus.ts         # Online/offline detection
│   └── useReducedMotion.ts        # prefers-reduced-motion
├── lib/
│   ├── constants.ts               # Languages, keys, API_BASE_URL
│   └── sessions.ts                # localStorage session CRUD
└── __tests__/                     # Unit tests (translate, sessions, constants)
```

## Key Features
- Split-screen live transcript (original + translation)
- Audio visualizer with ambient orb effects
- Session auto-save to localStorage (max 50)
- PWA with service worker + installable
- Capacitor for native iOS/Android builds
- Voice output with language-aware voice selection
- Onboarding flow, consent banner, offline detection
- Reduced motion support, ARIA labels

## Environment Variables Required
```
ANTHROPIC_API_KEY=       # Claude API key for translation
DEEPGRAM_API_KEY=        # Deepgram API key for speech-to-text
NEXT_PUBLIC_API_BASE_URL= # Optional, defaults to "" (same origin)
```

---

## KNOWN ISSUES & BUGS (App Store Blockers)

### Critical — Must Fix Before Store Submission

1. **Deepgram API key exposure** (`api/deepgram-token/route.ts:51-52`)
   - Falls back to returning the MAIN API key if scoped key creation fails
   - Must return an error instead, never expose the primary key

2. **CSP includes `unsafe-eval`** (`next.config.ts:16`)
   - `script-src 'self' 'unsafe-inline' 'unsafe-eval'` — app stores flag this
   - Need to remove `unsafe-eval` (may require Next.js config changes)

3. **Capacitor lifecycle event listeners leak** (`useAppLifecycle.ts:32-33`)
   - `pause`/`resume` event listeners added but never removed in cleanup
   - Memory leak in native app environment

4. **Race condition saving sessions** (`page.tsx:341-361`)
   - Nested setState with 2000ms setTimeout — session may save wrong/incomplete data
   - Should use refs or a more reliable save mechanism

5. **Silent recognition failure** (`page.tsx:314`)
   - If `recognition.start()` throws in `onend`, UI shows "listening" but nothing transcribes
   - No recovery or user notification

6. **No ANTHROPIC_API_KEY validation** (`api/translate/route.ts`)
   - If env var missing, Anthropic SDK throws cryptic error
   - Should validate at startup and return clear 500 error

### Important — Should Fix

7. **No loading indicator during translation** — Empty panel while streaming, no visual feedback
8. **Silent localStorage failures** — Sessions can fail to save without user knowing
9. **Silent translation retries** — Retries 3x with no UI indication
10. **AudioContext memory leak** (`useAudioVisualizer.ts`) — New context per mount
11. **Rate limit maps grow unbounded** (both API routes) — Never cleaned up
12. **No fallback engine indication** — User doesn't know when Deepgram falls back to browser
13. **Accumulated text context grows unbounded** (`page.tsx:168`) — No trimming on client side

### App Store Submission Gaps
- Missing 1024x1024 app icon (App Store requirement)
- Missing PWA screenshots in manifest.json
- Privacy policy needs GDPR data retention specifics
- Terms of service needs jurisdiction/dispute resolution
- No crash reporting integration
- No E2E tests

### Nice-to-Have Improvements
- Language auto-detection
- Session search/filter in history
- Multiple export formats (PDF, JSON)
- Haptic feedback on record start/stop (native)
- Virtual scrolling for large session history
- User feedback mechanism for translation quality

---

## DEVELOPMENT HISTORY (Chronological)
1. Initial LiveListen app with basic recognition
2. Real-time recognition improvements + calmer voice
3. Streaming real-time translation + vibrant UI
4. Split-screen transcript view
5. Calming slate-blue palette
6. Switch to Haiku for faster translation
7. Real audio visualizer + ambient effects + smart interim translation
8. Deepgram Nova-3 integration for Arabic
9. Complete UI redesign (warm, welcoming typography)
10. Session storage (auto-save, browse, review)
11. Full PWA support (service worker, icons, installable)
12. App store readiness (security, accessibility, Capacitor, legal pages)
13. Context-agnostic translation (not just sermons)
14. Store-readiness (modular architecture, testing, accessibility, GDPR, icons)
15. Translation quality fix (strict prompt, religious context, prior context)

## WORKING NOTES
- Vercel deploys automatically on push to branch
- PWA is functional but service worker is basic (static caching only)
- Capacitor config exists but native builds not yet tested end-to-end
- Tests exist but coverage is minimal (3 test files)
- The app is currently focused on perfecting everything before app store submission
