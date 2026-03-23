# Evolv

Personal growth companion app — track goals, journal your journey, and watch yourself grow. Built as a PWA with native mobile support via Capacitor.

**Tagline:** Small steps, lasting change

## Tech Stack

- **Framework:** Next.js 16 (App Router) with React 19, TypeScript (strict mode)
- **Styling:** Tailwind CSS 4 with PostCSS + CSS custom properties for theming
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
│   ├── settings/page.tsx         # Settings: name, theme, focus areas, export, reset
│   ├── privacy/page.tsx          # Privacy policy (Evolv branded)
│   └── terms/page.tsx            # Terms of service (Evolv branded)
├── components/
│   ├── AppShell.tsx              # App wrapper: loading skeleton → onboarding gate → main app with BottomNav + offline banner
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

Optional in `.env.local`:
- `STATIC_EXPORT` — Set to `true` for Capacitor mobile builds

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
5 levels with emoji and color mapping:
- great (#40916c) — used in mood calendar, distribution charts
- good (#74c69d)
- okay (#e9c46a)
- low (#e09f5a)
- rough (#c1574e)

## Focus Areas (8 categories)

| ID | Label | Emoji |
|----|-------|-------|
| spiritual | Spiritual Growth | pray |
| health | Health & Fitness | heart |
| mindfulness | Mindfulness | brain |
| career | Career & Skills | briefcase |
| relationships | Relationships | users |
| education | Education | book |
| habits | Daily Habits | check-circle |
| finance | Financial Goals | wallet |

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
- `AppShell` component wraps all pages: loading skeleton → onboarding check → main app with BottomNav
- Bottom tab navigation: Home (`/`), Goals (`/goals`), Journal (`/journal`), Progress (`/progress`)
- Settings (`/settings`) accessible from home page header gear icon, has back button
- Offline banner auto-appears when network is lost, auto-hides when restored
- All pages are client components ("use client") for localStorage access

### Onboarding Flow
- 4 steps: Welcome → Name → Focus Areas → Ready
- Stores `evolv_onboarded`, `evolv_user_name`, `evolv_focus_areas` to localStorage
- Gates the main app — user must complete onboarding to see dashboard
- Progress dots indicator, back/continue navigation
- Input focus management, Enter key support

### Goals Feature
- **Create:** title (required), description (optional), focus area picker, target date, step/milestone builder with inline add/remove
- **List view:** active goals with progress bars and step counts, completed section with strikethrough and check icon
- **Detail view:** metadata badges (focus area, completion status), description, dates, step checklist with toggle, mark complete/incomplete, delete with confirmation
- **Progress calculation:** percentage = completed steps / total steps (or 100% if marked complete with no steps)

### Journal Feature
- **Create:** 5-mood picker with emoji buttons (visual selection), free-text content (5000 char limit with counter), optional focus area tags
- **List view:** entries grouped by month, mood emoji + truncated text preview (120 chars)
- **Detail view:** full content with pre-wrap formatting, mood display, date, focus area tags, delete with confirmation
- **Sorting:** newest entries first

### Progress Dashboard
- **Overview stats:** 3-card row — goals completed, total journal entries, consecutive day streak
- **Goal progress:** overall percentage bar + per-active-goal breakdown bars with labels
- **This week mood:** 7-day row (Sun–Sat) with mood-colored circles, today highlighted with border
- **Mood calendar:** monthly grid, prev/next month navigation, color-coded by mood, today highlighted, legend with all 5 mood levels
- **Mood distribution:** horizontal bar chart with count and percentage for each mood
- **Focus area breakdown:** top 5 areas ranked by usage across goals + journal entries
- **Milestones:** trophy list of all completed goals
- **Empty state:** friendly message when no data exists

### Settings Page
- **Profile:** edit name
- **Theme:** light/dark/system toggle buttons
- **Focus areas:** chip-based multi-select
- **Data export:** download all data as JSON file (goals + journal + settings)
- **Legal:** links to privacy policy and terms of service
- **Danger zone:** reset all data with confirmation dialog
- **Version display:** footer with app version

### Home Dashboard
- Time-aware greeting (morning/afternoon/evening) with user name
- Live stats row: active goals, completed goals, journal entries this week
- Quick action cards with dynamic subtitles reflecting actual data counts
- Rotating daily motivational quotes (7 quotes, one per day)
- Settings gear icon in header

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
- CSP headers: self-only scripts/styles/connect, Google Fonts allowed
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- No external API connections required (fully client-side)

## Design System

### Colors (Light Mode)
- Background: #faf8f5 (warm off-white)
- Background secondary: #f2eeea
- Cards: #ffffff
- Primary: #2d6a4f (forest green)
- Primary light: #40916c
- Accent: #b5838d (dusty rose)
- Secondary: #7c5e3c (warm brown)
- Text: #1a1a2e
- Text dim: #6b6b80
- Text muted: #9a9ab0
- Danger: #c1574e
- Warning: #e9c46a
- Success: #40916c

### Colors (Dark Mode)
- Background: #0f1419 (deep navy)
- Background secondary: #1a2028
- Cards: #1e2530
- Primary: #74c69d (mint green)
- Primary light: #95d5b2
- Accent: #d4a5ad (light rose)
- Secondary: #c4a882 (warm gold)
- Text: #e8e4df
- Danger: #e07a70

### CSS Variables
All colors are CSS custom properties on `:root` (light) and `[data-theme="dark"]`. Key variables:
`--bg`, `--bg-secondary`, `--bg-card`, `--text`, `--text-secondary`, `--text-dim`, `--text-muted`, `--primary`, `--primary-light`, `--primary-lighter`, `--primary-glow`, `--accent`, `--secondary`, `--surface-border`, `--success`, `--warning`, `--danger`, `--shadow-sm/md/lg`, `--radius-sm/md/lg/xl`, `--font-sans`, `--font-display`, `--nav-height`

### Component Classes
- `.card` — bordered, rounded (16px), shadow, hover effect
- `.card-interactive` — adds active scale-down effect
- `.btn` / `.btn-primary` / `.btn-secondary` / `.btn-ghost` — button variants with hover/active states
- `.focus-chip` / `.focus-chip.selected` — selectable tag chips with border highlight
- `.bottom-nav` / `.nav-item` / `.nav-item.active` — fixed bottom navigation with icon + label
- `.page-shell` — full-height flex container
- `.page-content` — scrollable content area with bottom nav padding
- `.onboarding-screen` — centered full-screen layout
- `.onboarding-dots` / `.onboarding-dot.active` — progress indicator with expanding active dot
- `.glass` — glassmorphism background (theme-aware)
- `.font-display` — serif display font
- `.gradient-text` — primary gradient text fill
- `.sr-only` — screen reader only

### Animations
- `fade-in`, `fade-in-up`, `fade-in-scale`, `slide-in-right`, `slide-in-left`
- `.stagger-children` — auto-stagger child animations (60ms intervals, up to 5 children)
- `pulse-soft`, `shimmer`, `breathe` — subtle ambient animations
- Reduced motion: all animations disabled via `prefers-reduced-motion`
- High contrast: enhanced colors via `prefers-contrast: high`

## Code Conventions

- Path alias: `@/*` maps to `./src/*`
- TypeScript strict mode enabled
- Mobile-first responsive design
- Accessibility: reduced motion, ARIA labels, 44px min touch targets, focus-visible outlines
- Safe area insets for notched devices (`env(safe-area-inset-*)`)
- High contrast media query support
- All data operations go through `src/lib/storage.ts`
- IDs generated via `generateId()` in `src/lib/models.ts`
- No external runtime dependencies beyond React/Next.js/Capacitor
- Inline SVG icons (no icon library dependency)
- CSS-in-JS via inline styles for component-specific styling, CSS classes for shared patterns
