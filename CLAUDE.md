# Evolv

Personal growth companion app — track goals, journal your journey, and watch yourself grow. Built as a PWA with native mobile support via Capacitor.

**Tagline:** Small steps, lasting change

## Tech Stack

- **Framework:** Next.js 16 (App Router) with React 19, TypeScript (strict mode)
- **Styling:** Tailwind CSS 4 with PostCSS + CSS custom properties for theming
- **AI:** Anthropic Claude SDK (Haiku 4.5) — planned for AI coaching/insights
- **Mobile:** Capacitor 8 (iOS & Android), app ID: `app.evolv`
- **Testing:** Vitest
- **Package Manager:** npm
- **Fonts:** Inter (sans), Source Serif 4 (display) via Google Fonts

## Commands

```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run build:static  # Static export for Capacitor (sets STATIC_EXPORT=true)
npm test              # Run tests (vitest run)
npm run test:watch    # Watch mode tests
npm run lint          # ESLint via next lint
npm run typecheck     # TypeScript type checking (tsc --noEmit)
npm run mobile:build  # Build static + capacitor sync
npm run cap:sync      # Sync Capacitor
```

## Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Home dashboard (greeting, stats, quick actions, daily quote)
│   ├── layout.tsx                # Root layout with AppShell, metadata, fonts
│   ├── globals.css               # Theme system (light/dark), animations, component styles
│   ├── goals/page.tsx            # Goals: create, list, detail, progress tracking
│   ├── journal/page.tsx          # Journal: create entries, mood, list, detail
│   ├── progress/page.tsx         # Progress: mood calendar, stats, streaks, focus breakdown
│   ├── settings/page.tsx         # Settings: name, theme, focus areas, reset
│   ├── privacy/page.tsx          # Privacy policy (static)
│   ├── terms/page.tsx            # Terms of service (static)
│   └── api/
│       ├── translate/route.ts    # Claude translation endpoint (legacy from LiveListen)
│       └── deepgram-token/route.ts # Deepgram token endpoint (legacy from LiveListen)
├── components/
│   ├── AppShell.tsx              # App wrapper: onboarding gate → main app with BottomNav
│   ├── BottomNav.tsx             # Bottom tab navigation (Home, Goals, Journal, Progress)
│   ├── ThemeProvider.tsx         # React context for light/dark/system theme
│   └── Onboarding.tsx            # 4-step onboarding: welcome → name → focus areas → ready
├── lib/
│   ├── constants.ts              # App name, storage keys, focus areas, nav items, types
│   ├── models.ts                 # Data models: Goal, GoalTask, JournalEntry, Mood, MOODS
│   └── storage.ts                # localStorage helpers: getItem, setItem, removeItem
public/
├── manifest.json                 # PWA manifest (Evolv branding, shortcuts)
├── sw.js                         # Service worker (network-first nav, stale-while-revalidate static)
└── *.png                         # App icons (192, 512, apple-touch, favicon)
```

## Environment Variables

Required in `.env.local` (see `.env.example`):
- `ANTHROPIC_API_KEY` - Claude API key for AI features

Optional:
- `STATIC_EXPORT` - Set to `true` for Capacitor mobile builds

## Data Models (src/lib/models.ts)

### Goal
```typescript
interface Goal {
  id: string;
  title: string;
  description: string;
  focusArea: FocusAreaId;        // one of 8 focus areas
  tasks: GoalTask[];             // breakable steps/milestones
  createdAt: string;             // ISO date
  targetDate: string;            // ISO date
  completed: boolean;
}

interface GoalTask {
  id: string;
  title: string;
  completed: boolean;
}
```

### Journal Entry
```typescript
interface JournalEntry {
  id: string;
  date: string;                  // ISO date (YYYY-MM-DD)
  content: string;               // free text, max 5000 chars
  mood: Mood;                    // "great" | "good" | "okay" | "low" | "rough"
  focusAreas: FocusAreaId[];     // optional tags
  createdAt: string;             // ISO datetime
}
```

### Mood
5 levels: great, good, okay, low, rough — each with emoji and color mapping used in calendar/charts.

## Focus Areas (8 categories)

1. Spiritual Growth
2. Health & Fitness
3. Mindfulness
4. Career & Skills
5. Relationships
6. Education
7. Daily Habits
8. Financial Goals

Selected during onboarding, editable in settings, used to tag goals and journal entries.

## Storage Keys (localStorage)

All prefixed with `evolv_`:
- `evolv_theme` — "light" | "dark" | "system"
- `evolv_onboarded` — boolean
- `evolv_user_name` — string
- `evolv_focus_areas` — FocusAreaId[]
- `evolv_goals` — Goal[]
- `evolv_journal` — JournalEntry[]
- `evolv_settings` — reserved for future use

## Key Architecture Decisions

### Theme System
- Light/dark/system modes via CSS custom properties
- `data-theme` attribute on `<html>` element
- ThemeProvider React context in `src/components/ThemeProvider.tsx`
- Listens to `prefers-color-scheme` media query for system mode
- Light default: warm off-white (#faf8f5), primary green (#2d6a4f)
- Dark mode: deep navy (#0f1419), mint green (#74c69d)

### App Shell & Routing
- `AppShell` component wraps all pages: checks onboarding → renders content + BottomNav
- Bottom tab navigation: Home (`/`), Goals (`/goals`), Journal (`/journal`), Progress (`/progress`)
- Settings (`/settings`) accessible from home page header gear icon, has back button
- All pages are client components ("use client") for localStorage access

### Onboarding Flow
- 4 steps: Welcome → Name → Focus Areas → Ready
- Stores `evolv_onboarded`, `evolv_user_name`, `evolv_focus_areas` to localStorage
- Gates the main app — user must complete onboarding to see dashboard
- Progress dots indicator, back/continue navigation

### Goals Feature
- Create: title, description, focus area, target date, step/milestone builder
- List view: active goals with progress bars, completed section with strikethrough
- Detail view: metadata, step checklist (toggle individually), mark complete, delete
- Progress: percentage based on completed steps out of total

### Journal Feature
- Create: 5-mood picker with emoji, free-text content (5000 char limit), optional focus area tags
- List view: entries grouped by month, mood emoji + text preview
- Detail view: full content with mood, date, focus area tags, delete
- Character counter on create form

### Progress Dashboard
- Overview stats: goals completed, journal entries total, journal streak (consecutive days)
- Goal progress: overall percentage bar + per-goal breakdown bars
- This week mood: 7-day row with mood-colored circles
- Mood calendar: monthly grid view, navigable months, color-coded by mood, today highlighted
- Mood distribution: horizontal bar chart showing percentage of each mood
- Focus area breakdown: top 5 areas ranked by usage across goals + journal
- Milestones: list of completed goals with trophy icon

### Storage
- All client-side via localStorage
- Helpers in `src/lib/storage.ts`: `getItem<T>`, `setItem<T>`, `removeItem`
- SSR-safe (returns fallback when `window` undefined)
- ID generation: `Date.now().toString(36) + Math.random().toString(36).slice(2, 7)`

### PWA
- Service worker: network-first for navigation, stale-while-revalidate for static assets
- Cache name: `evolv-v1`
- Manifest: standalone display, portrait orientation, shortcuts to Goals/Journal/Progress
- Theme color: #2d6a4f (green)

### Security
- CSP headers: self-only scripts/styles, Google Fonts allowed, Anthropic API connect
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

## Design System

### Colors (Light Mode)
- Background: #faf8f5 (warm off-white)
- Cards: #ffffff
- Primary: #2d6a4f (forest green)
- Accent: #b5838d (dusty rose)
- Secondary: #7c5e3c (warm brown)
- Text: #1a1a2e
- Danger: #c1574e

### Colors (Dark Mode)
- Background: #0f1419 (deep navy)
- Cards: #1e2530
- Primary: #74c69d (mint green)
- Accent: #d4a5ad (light rose)
- Secondary: #c4a882 (warm gold)
- Text: #e8e4df

### Components
- `.card` — bordered, rounded, shadow, hover effect
- `.btn-primary` / `.btn-secondary` / `.btn-ghost` — button variants
- `.focus-chip` / `.focus-chip.selected` — selectable tag chips
- `.bottom-nav` / `.nav-item` — fixed bottom navigation

### Animations
- `fade-in`, `fade-in-up`, `fade-in-scale`, `slide-in-right`, `slide-in-left`
- `.stagger-children` — auto-stagger child animations (60ms intervals)
- Reduced motion: all animations disabled via `prefers-reduced-motion`

## Code Conventions

- Path alias: `@/*` maps to `./src/*`
- TypeScript strict mode enabled
- Mobile-first responsive design
- Accessibility: reduced motion, ARIA labels, 44px touch targets, focus-visible outlines
- Safe area insets for notched devices
- High contrast media query support
- All data operations go through `src/lib/storage.ts`
- IDs generated via `generateId()` in `src/lib/models.ts`

## Legacy API Routes

The following routes exist from the original LiveListen app and are not currently used by Evolv:
- `src/app/api/translate/route.ts` — Claude streaming translation
- `src/app/api/deepgram-token/route.ts` — Deepgram token generation
- `src/app/privacy/page.tsx` — Privacy policy (LiveListen branded)
- `src/app/terms/page.tsx` — Terms of service (LiveListen branded)
