# Youth Gamification — Design Spec

Badges, streak milestones, and an optional mascot for younger naturalists — built entirely
on the existing `localStorage` framework, styled to match the app's minimalist design, and
gated behind a single toggle for users who don't want it.

---

## 1. Feasibility: Yes, localStorage is a great fit

The key insight is that **almost every badge is *derivable* from data the app already
stores**. Nothing new needs to be tracked per-card or per-session — badges are computed
from existing keys:

| Existing key | What it holds | Badges it powers |
|---|---|---|
| `nn_card_states` | Per-species SM-2 state (which species have been studied, repetitions) | All category-mastery badges (Herpetologist, Ornithologist, …) |
| `nn_progress` | `totalReviewed`, `streakDays`, `lastStudyDate` | Streak + effort badges |
| `nn_study_locations` | Places studied, per-location species/category counts | Explorer badges |

The only *new* persistent state is:

| New key | Shape | Size |
|---|---|---|
| `nn_badges` | `Record<BadgeId, number>` — badge id → `earnedAt` timestamp | < 1 KB (≈30 badges × ~30 bytes) |
| `nn_gamification` | `boolean` (default `true`) | ~20 bytes |
| `nn_progress.longestStreak` | one new field on the existing object | ~20 bytes |

For scale: `nn_card_states` already stores ~120 bytes per studied species (tens of KB for
heavy users). Gamification adds **under 2 KB total**, far below the ~5 MB localStorage
quota. No new framework, no backend, no accounts. Everything goes through the existing
`getStorage`/`setStorage` helpers in `web/src/lib/storage.ts` (which already handle the
`nn_` prefix, SSR guards, and JSON errors).

**Why store `earnedAt` at all if badges are derivable?** Two reasons: (1) a "New badge!"
celebration must fire exactly once, so we need to know what was already earned; (2) badges
must never be *revoked*. Learned counts can drop when the user switches study locations
(counts are filtered against the current species list), so once earned, a badge is
persisted and kept forever.

---

## 2. Design principles (keeping it minimalist)

1. **Badges are quiet by default.** They live in one collapsible card on the Growth page,
   using the exact visual language already in the app: white card, `rounded-xl`,
   `border-stone-200`, `shadow-sm`, small stone-toned text, green accents.
2. **Never interrupt studying.** No mid-session pop-ups, toasts, or sounds. New badges are
   revealed only on the existing "Nicely Nurtured!" session-complete screen, which is
   already the app's celebration moment (it already has the falling-fern animation).
3. **Emoji as iconography.** The app already uses emoji for categories (🌲 🐦 🦎 🐸) —
   badges reuse the same approach. No new image assets, no icon library, nothing to load.
4. **Unearned = visible but muted.** Unearned badges render grayscale/low-opacity with a
   thin progress ring, mirroring how the category grid dims unstudied categories
   (`opacity-60`). Kids see what's next; adults see a tidy grid, not a nag.
5. **One toggle kills all of it.** Identical pattern to the existing `🍂 Animations On/Off`
   footer pill on the home page.

---

## 3. The badge system

### 3.1 Architecture

New module `web/src/lib/badges.ts`, mirroring the structure of `srs.ts` and
`location-tracker.ts`: a declarative list of badge definitions plus a pure evaluation
function.

```ts
// types.ts additions
export type BadgeTier = 1 | 2 | 3; // Sprout → Sapling → Old-Growth

export interface BadgeDef {
  id: string;                 // e.g. "herpetologist-2"
  name: string;               // "Herpetologist"
  icon: string;               // "🦎"
  description: string;        // "Learn 15 reptiles & amphibians"
  /** Returns current progress toward the badge, e.g. { current: 9, target: 15 } */
  progress: (ctx: BadgeContext) => { current: number; target: number };
}

export interface BadgeContext {
  cardStates: Record<string, CardState>;   // from getAllCardStates()
  speciesCategory: Map<number, Category>;  // built once from the loaded species list
  progress: UserProgress;                  // from getUserProgress()
  studyLocations: StudyLocation[];         // from getStudyLocations()
}
```

```ts
// badges.ts core API
export function getEarnedBadges(): Record<string, number>;       // nn_badges
export function evaluateBadges(ctx: BadgeContext): BadgeDef[];   // returns NEWLY earned, persists earnedAt
export function getBadgeProgress(def: BadgeDef, ctx: BadgeContext): { current, target, earnedAt? };
```

**Evaluation points** (both cheap — a single pass over card states):

- After each `rateCard()` call is *not* needed. Evaluate once at **session complete** in
  `study/page.tsx` (the only place celebrations can show) and lazily when the Growth page
  renders (so the grid is always current).
- Evaluation **always runs**, even when the toggle is off — it's pure derivation plus a
  tiny write. That way a user who turns gamification off for a month and back on finds
  every badge they earned in the meantime waiting for them (with accurate dates suppressed
  celebrations, no lost progress).

**Category counting rule:** badges count **absolute studied species per category across
all time** (i.e., entries in `nn_card_states`, mapped to category via the species data),
*not* percentages of the currently loaded location list. This keeps badges stable when
users switch study locations. Species IDs are iNaturalist taxon IDs, so they're globally
unique — a Carolina Wren studied at Green River Preserve and one studied in Ohio are the
same species, counted once. One nuance: card states only store `speciesId`, so category
lookup uses the current species list; species studied at a *previous* location may not
resolve. Fix: when a species can't be resolved, fall back to a small
`nn_species_categories` memo (`Record<speciesId, Category>`) appended on each
`rateCard()` — ~15 bytes per studied species, still trivial.

### 3.2 The badge catalog (~30 badges)

**Naturalist specialty badges** — the heart of the system, and where the
"herpetologist badge" lives. Each specialty has three tiers named for forest growth
(on-brand for a nature app, no gold/silver/bronze video-game feel):

| Specialty | Icon | Counts | Tier thresholds (species learned) |
|---|---|---|---|
| Herpetologist | 🦎 | reptiles + amphibians | 5 / 15 / 30 |
| Ornithologist | 🐦 | birds | 10 / 30 / 60 |
| Botanist | 🌸 | plants | 10 / 30 / 60 |
| Dendrologist | 🌲 | trees | 10 / 30 / 60 |
| Mycologist | 🍄 | fungi | 5 / 15 / 30 |
| Entomologist | 🦋 | insects | 5 / 15 / 30 |
| Mammalogist | 🦌 | mammals | 5 / 10 / 20 |

Tier display: **Sprout 🌱 → Sapling 🌿 → Old-Growth 🌳** shown as a small suffix chip on
the badge ("Herpetologist · Sapling"). Thresholds are tuned to the app's per-category
fetch sizes (reptiles/amphibians cap at ~20 each per location, so 5/15/30 is achievable
but the top tier rewards studying more than one location — a nice hidden incentive to
explore).

Note: Herpetologist spans two app categories (reptile + amphibian), which is
taxonomically correct — herpetology covers both. The `BadgeDef.progress` closure makes
multi-category badges trivial.

**Streak badges** — from `nn_progress`:

| Badge | Icon | Rule |
|---|---|---|
| First Steps | 👣 | Study 2 days in a row |
| Week in the Woods | 🏕️ | 7-day streak |
| Field Season | 📅 | 30-day streak |

Requires adding `longestStreak` to the `Progress` object in `srs.ts` (one line in
`updateProgress()`), since `streakDays` resets on a missed day and streak badges must not
un-earn. Migration is automatic: `longestStreak = max(longestStreak ?? streakDays, streakDays)`.

**Effort badges** — from `totalReviewed`:

| Badge | Icon | Rule |
|---|---|---|
| Curious Neighbor | 🔍 | 50 cards reviewed |
| Dedicated Naturalist | 📖 | 250 cards reviewed |
| Field Guide Author | ✒️ | 1,000 cards reviewed |

**Explorer badges** — from `nn_study_locations`:

| Badge | Icon | Rule |
|---|---|---|
| Trailhead | 🥾 | Study at 2 different places |
| Wayfarer | 🗺️ | Study at 5 different places |

**Meta badge:**

| Badge | Icon | Rule |
|---|---|---|
| Naturalist | 🌍 | Earn tier 1 in every specialty |

### 3.3 UI surfaces

**Growth page — `BadgeShelf` component** (new, `web/src/components/BadgeShelf.tsx`),
inserted between `ProgressDashboard` and the map:

```
┌─ Field Notes ────────────────────────────┐
│  🦎  🐦  🌸  🌲  🍄  🦋  🦌   👣 🏕️ …    │   ← 5–6 per row, earned in color,
│  Herpetologist · Sapling                  │     unearned grayscale + progress ring
│  9 of 15 reptiles & amphibians            │   ← tap a badge → one-line detail below
└───────────────────────────────────────────┘     the grid (no modal needed)
```

- Header row: `Field Notes` (small, `text-sm font-semibold text-stone-700` — same as
  "Neighbors You Know") with earned count on the right (`text-xs text-stone-500`, "6 of 31").
- Earned badge: full-color emoji in a `bg-green-50 border-green-200` circle.
- Unearned: `grayscale opacity-50` emoji in a `border-stone-200` circle with an SVG
  progress ring (stroke `green-600`, same hue as existing progress bars).
- Tapping a badge shows a single line of detail beneath the grid (name, tier, rule,
  progress, earned date). No modal — keeps it flat and calm.

**Session complete — badge reveal.** On the "Nicely Nurtured!" screen, if
`evaluateBadges()` returned newly earned badges, render one extra card above the buttons:

```
┌───────────────────────────────────────────┐
│           🦎  Badge earned!               │
│      Herpetologist · Sprout               │
│   You've learned 5 reptiles & amphibians  │
└───────────────────────────────────────────┘
```

Same white/rounded/stone card style; the existing `FallingLeaves` animation is the only
motion. Multiple badges stack as rows in the same card.

**Streak visibility.** The streak already shows on `ProgressDashboard`. With gamification
on, the session-complete screen also gets one quiet line: `🔥 4-day streak` (or `🌱 Start
a streak — come back tomorrow!` on day 1). That single line is the entire streak UX — no
guilt mechanics, no "streak freeze" upsells.

---

## 4. The toggle

Mirrors the existing animations toggle exactly (`page.tsx` footer):

```tsx
<button onClick={...}>🏆 Badges {gamification ? "On" : "Off"}</button>
```

- Key: `nn_gamification`, default **`true`** (youth are the primary audience; opting out
  is one tap on a pill that sits right next to the animations toggle).
- Also rendered in the Growth page footer, since that's where users encounter badges.
- **When off:** `BadgeShelf` is not rendered, session-complete badge reveals and streak
  line are suppressed, mascot (Phase 2) is hidden. The pre-existing streak/total line in
  `ProgressDashboard` stays — it predates gamification and is part of the minimalist
  baseline.
- **When toggled back on:** everything earned in the interim appears (evaluation never
  stopped), so the toggle is fully reversible with zero data loss.

---

## 5. Phase 2 — Mascot (optional, separable)

A mascot fits the brand best as a **salamander** — the southern Blue Ridge is the
salamander capital of the world, and it winks at the herpetologist badge. Working name:
**"Newt"** (rendered as 🦎 or a single small inline SVG, ~2 KB, no asset pipeline).

Kept deliberately tiny to protect the minimalist feel:

- Appears in exactly two places, both already "soft" moments:
  1. **Session complete** — small mascot + one rotating encouragement line ("Newt says:
     the Hellbender can grow to 2 feet!"). Lines are a static string array; fun facts can
     be sampled from the already-loaded species `keyFacts`, which keeps content fresh with
     zero new data.
  2. **Empty states** (e.g., Growth page with nothing studied) — replaces the plain
     "No species loaded" text with mascot + friendly prompt.
- No idle animation, no speech-bubble chrome beyond a `bg-stone-50` rounded box, never on
  the study card itself.
- Gated by the same single `nn_gamification` toggle (not a second toggle — one switch,
  one mental model).

---

## 6. Implementation plan

**Phase 1 (badges + toggle):**

1. `types.ts` — add `BadgeDef`, `BadgeTier`, `EarnedBadges`; add `longestStreak` to progress types.
2. `srs.ts` — one-line `longestStreak` maintenance in `updateProgress()`; export a
   `getStudiedCategoryCounts()` helper (single pass over card states).
3. `lib/badges.ts` — badge catalog + `evaluateBadges()` + `nn_species_categories` memo (~150 lines).
4. `components/BadgeShelf.tsx` — grid + tap-for-detail (~120 lines).
5. `progress/page.tsx` — render `BadgeShelf`; add toggle pill to footer.
6. `study/page.tsx` — call `evaluateBadges()` on session complete; render reveal card + streak line.
7. `page.tsx` — add `🏆 Badges` pill next to the animations pill.

**Phase 2 (mascot):** `components/Mascot.tsx` + wiring into the two surfaces above.

**Phase 3 (ideas, not committed):** badge line in the existing `ShareButton` share text
("I just earned the Herpetologist badge on Naturalist Nurturer 🦎"); a printable "field
notebook" of earned badges for camp use.

**Testing notes:** badge evaluation is pure (context in, badges out), so it's unit-testable
without touching localStorage; UI can be verified by seeding `nn_card_states` in devtools.

---

## 7. Risks & edge cases

- **Cleared browser data / new device loses badges** — identical to the app's existing
  constraint for all progress; no new risk introduced. (A future export/import of `nn_*`
  keys would solve this app-wide.)
- **Species→category resolution for past locations** — handled by the
  `nn_species_categories` memo (§3.1).
- **Clock changes / timezone travel** affect streaks — already true of the existing streak
  counter; badges use `longestStreak` so a glitch can only delay, never revoke.
- **Badge inflation** — the catalog is intentionally capped (~30). New badges should earn
  their place; the grid must never scroll on a phone by more than ~2 rows.
