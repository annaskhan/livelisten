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

## FIXED ISSUES (Completed)

All critical and important bugs have been fixed as of commit 9e88583:

- [x] Deepgram API key exposure — now returns error, never exposes main key
- [x] CSP `unsafe-eval` removed
- [x] Capacitor lifecycle event listener leak — proper cleanup
- [x] Session save race condition — uses refs instead of nested setState
- [x] Silent recognition failure — retries 3x, then notifies user
- [x] ANTHROPIC_API_KEY validation — returns clear 503 error
- [x] Loading indicator during translation ("Translating...")
- [x] localStorage failure notification to user
- [x] Translation retry UI feedback ("Retrying 2/4...")
- [x] AudioContext memory leak — shared singleton
- [x] Rate limit map unbounded growth — auto-cleanup at 500/1000 entries
- [x] Fallback engine indication — "Browser" badge in header
- [x] Accumulated text context trimming — capped at 3000 chars
- [x] Deepgram improvements: 3s utterance end, keepalive, connection timeout, adaptive debounce for Arabic/Urdu

---

## REMAINING WORK (App Store Submission Gaps)

### Must Do
- Missing 1024x1024 app icon (App Store requirement)
- Missing PWA screenshots in manifest.json
- Privacy policy needs GDPR data retention specifics
- Terms of service needs jurisdiction/dispute resolution

### Should Do
- No crash reporting integration (Sentry or similar)
- No E2E tests (Playwright)
- `createScriptProcessor` is deprecated — should migrate to AudioWorklet

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
16. **Critical bug fixes + Deepgram hardening** (security, stability, UX, Deepgram keepalive/timeout/debounce)

## WORKING NOTES
- Vercel deploys automatically on push to branch
- PWA is functional but service worker is basic (static caching only)
- Capacitor config exists but native builds not yet tested end-to-end
- Tests exist but coverage is minimal (3 test files, 32 tests passing)
- All critical/important bugs are now fixed
- Next priority: app store submission gaps (icons, legal pages, crash reporting)
