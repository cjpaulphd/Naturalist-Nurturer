# Naturalist Nurturer — Design Spec & Build Plan

## 1. Concept

A web-based flashcard app for learning species identification at Green River Preserve and surrounding western NC Blue Ridge habitat. Users select a category (native plants, trees, birds), then drill flashcards ordered by local prevalence — most common species first. Cards test across multiple identifiers: photos, common names, scientific names, bird sounds, and key ecological facts.

---

## 2. Existing Landscape — Why Build Custom

| Option | Strengths | Gaps |
|--------|-----------|------|
| **Anki + iNaturalist script** | Spaced repetition algorithm, existing iNat-to-Anki Python scripts, "Ultimate Birds" deck | No GRP-specific curation, clunky setup, no sound integration, no prevalence ordering |
| **iNaturalist Seek app** | Real-time camera ID, great for field use | Not a study/drilling tool — reactive, not proactive learning |
| **Merlin (Cornell)** | Excellent bird ID + sounds | Birds only, no plants/trees, no flashcard mode |
| **PlantNet / PictureThis** | Photo-based plant ID | Field ID tools, not spaced repetition study |

**Bottom line:** Nothing combines GRP-localized species lists, prevalence-ranked flashcards, multi-modal identifiers (photo + sound + text), and spaced repetition in one tool. Worth building.

---

## 3. Data Architecture

### 3.1 Primary Sources (all free, no auth required for reads)

**iNaturalist API v1** — `https://api.inaturalist.org/v1/`
- **Species counts by location:** `/observations/species_counts` with bounding box params (`nelat`, `nelng`, `swlat`, `swlng`) or `place_id` for WNC
- **GRP bounding box:** approx `35.22, -82.65` (SW) to `35.28, -82.57` (NE) — expand to ~10mi radius for adequate sample size
- **Key params:** `iconic_taxa` (Plantae, Aves), `quality_grade=research`, `rank=species`, `per_page=200`
- **Returns:** taxon ID, common name, scientific name, observation count (= prevalence proxy), default photo URL, Wikipedia summary URL
- **Rate limit:** 100 requests/minute (generous for a build script; cache results as JSON)

**Xeno-canto API v3** — `https://xeno-canto.org/api/3/recordings`
- **Bird sounds:** Query by scientific name, filter by quality rating (A/B), location (North Carolina)
- **Returns:** Direct MP3 URLs, duration, recordist, quality rating
- **License:** CC-BY-NC 4.0 — fine for educational/non-commercial use, must attribute
- **Rate limit:** 1000 req/hour; cache aggressively

**iNaturalist taxon photos** — `/taxa/{id}` endpoint returns `taxon_photos` array with multiple CC-licensed images per species. Better variety than the single default photo.

### 3.2 Supplementary Sources

- **USDA PLANTS Database** — native/introduced status confirmation, range maps
- **Wikipedia/Wikidata** — key facts, habitat descriptions (accessible via iNat taxon `wikipedia_url`)
- **eBird frequency data** — more granular seasonal bird prevalence for Transylvania County (available via eBird API, requires free key)

### 3.3 Data Pipeline Strategy

**Recommended: Build-time data fetch + static JSON, not live API calls.**

Rationale: The species list for GRP doesn't change frequently. Fetching at build time and storing as static JSON files means the app loads instantly, works offline, and avoids API rate limits at runtime.

```
Pipeline:
1. fetch_species.py → queries iNaturalist API for top N species per category
2. fetch_photos.py  → pulls 3-5 CC-licensed photos per species
3. fetch_sounds.py  → pulls top-rated Xeno-canto recordings per bird species
4. fetch_facts.py   → pulls key facts from Wikipedia summaries
5. build_data.py    → merges into species_data.json with prevalence ranking
6. → Deploy as static assets with the web app
```

### 3.4 Data Schema (per species)

```json
{
  "id": "inat_47219",
  "category": "tree",
  "commonName": "Eastern White Pine",
  "scientificName": "Pinus strobus",
  "family": "Pinaceae",
  "observationCount": 342,
  "prevalenceRank": 1,
  "nativeStatus": "native",
  "photos": [
    { "url": "...", "attribution": "© user, CC-BY-NC", "context": "full tree" },
    { "url": "...", "attribution": "...", "context": "bark detail" },
    { "url": "...", "attribution": "...", "context": "leaf/needle" }
  ],
  "sounds": [],
  "keyFacts": [
    "Five needles per bundle (mnemonic: W-H-I-T-E has 5 letters)",
    "Tallest native conifer in eastern North America",
    "Soft, flexible needles 2-5 inches long"
  ],
  "habitat": "Moist, well-drained soils; coves and ridges",
  "bloomSeason": null,
  "identificationTips": "Look for 5-needle bundles and asymmetric crown shape"
}
```

---

## 4. Estimated Species Counts

Based on iNaturalist research-grade observations within ~10mi of GRP:

| Category | Est. Species | Priority Tier (learn first) |
|----------|-------------|---------------------------|
| Native trees | 60–80 | Top 30 by observation count |
| Native plants (wildflowers, ferns, shrubs) | 200–400 | Top 50 |
| Birds | 120–160 | Top 50 |

Starting with ~130 priority species across three categories is realistic for v1.

---

## 5. App Features

### 5.1 Core Flashcard Modes

**Mode 1: Photo → Name**
Show a species photo. User guesses common name and/or scientific name. Reveal answer with key facts.

**Mode 2: Name → Description**
Show common name. User recalls key identifying features, habitat, family. Reveal photo + facts.

**Mode 3: Sound → Name** (birds only)
Play a bird call/song. User guesses the species. Reveal photo + name + additional sounds.

**Mode 4: Mixed Quiz**
Random mode selection per card. Best for testing after initial learning.

### 5.2 Learning System

- **Prevalence ordering:** New cards introduced in order of local observation frequency — learn tulip poplar before Carolina silverbell
- **Spaced repetition:** SM-2 algorithm (same as Anki) — cards you miss come back sooner
- **Progress tracking:** Per-species mastery score, per-category completion percentage
- **Session control:** "Learn 10 new" / "Review due" / "Quick quiz (15 cards)"

### 5.3 Category & Filter Controls

- Select: Trees / Plants / Birds (or all)
- Filter: Native only (default on) / Include introduced
- Sort: By prevalence (default) / Alphabetical / Family grouping
- Season filter: "What's visible/blooming/singing now?" (stretch goal)

### 5.4 Reference Mode

Browse the full species list as a field guide — searchable, sortable, with all photos and facts. Not flashcard mode; just a reference.

---

## 6. Technical Architecture

### 6.1 Recommended Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | **Next.js (App Router)** or **Vite + React** | Fast, deployable to Vercel/Netlify, good PWA support |
| Styling | **Tailwind CSS** | Rapid prototyping, responsive by default |
| Data | **Static JSON** files | Pre-fetched at build time; no database needed for v1 |
| Audio | **HTML5 Audio API** | Native browser support for Xeno-canto MP3s |
| State | **localStorage** | Progress/scores persist across sessions |
| Hosting | **Vercel** (free tier) | Zero-config deployment from GitHub |
| PWA | **next-pwa** or **vite-plugin-pwa** | Offline support, installable on phone |

### 6.2 Why Not a Database?

For v1 with ~130 species and single-user progress tracking, localStorage is sufficient. If you later want multi-user, shared leaderboards, or GRP staff dashboards, add Supabase or similar.

### 6.3 Offline / PWA Priority

This should work in the field at GRP where cell signal is spotty. PWA with service worker caching of all species data, photos, and sounds is essential. Audio files are the largest asset — pre-cache the top 50 birds' primary calls (~2-5 MB total).

---

## 7. Key Design Decisions to Make

1. **Scope of "native plants"** — Include ferns? Mosses? Grasses? Recommend: wildflowers + shrubs + ferns for v1, skip grasses/mosses.

2. **Photo licensing** — iNaturalist photos are mostly CC-BY-NC. App must display attribution. Non-commercial use only unless you source your own photos.

3. **Key facts curation** — Auto-generated from Wikipedia will get you 70% there. The remaining 30% (mnemonics, GRP-specific context like "common along the Green River trail") requires manual curation. Consider a simple admin/edit mode or a CSV you can hand-edit.

4. **Bird sounds scope** — Songs vs. calls vs. alarm calls? Recommend: primary song + most common call for each species. Xeno-canto quality ratings (A/B) filter well.

5. **Multi-user?** — If this is just for you and Emma (and maybe GRP staff/campers), localStorage is fine. If you want it as a GRP program tool for campers, you'll want accounts eventually.

---

## 8. Claude Code Build Prompt

Below is a prompt you can paste directly into Claude Code to scaffold the project. It's designed to be run in stages.

---

### Stage 1: Data Pipeline

```
Build a Python data pipeline for the "Naturalist Nurturer" flashcard app.

CONTEXT: This app helps users learn species identification for Green River
Preserve in the Blue Ridge Mountains near Brevard, NC (approx center:
35.25, -82.61).

TASK: Create scripts in /scripts that:

1. fetch_species.py
   - Query iNaturalist API v1 /observations/species_counts
   - Bounding box: swlat=35.15, swlng=-82.75, nelat=35.35, nelng=-82.45
     (roughly 10mi radius around GRP)
   - Three runs: iconic_taxa=Plantae, iconic_taxa=Aves, then filter Plantae
     results into "trees" vs "plants" using taxon ancestry/rank data
   - quality_grade=research, rank=species
   - Get top 200 per category, sorted by observation count (descending)
   - Save raw responses as JSON in /data/raw/

2. fetch_photos.py
   - For each species from step 1, query /taxa/{taxon_id}
   - Extract up to 5 photos with CC licenses
   - Download photos to /data/photos/{taxon_id}/ at medium resolution
   - Record attribution info

3. fetch_sounds.py
   - For bird species only, query Xeno-canto API v3
   - Search by scientific name, filter quality A or B, location "North Carolina"
   - Download top 2 recordings per species as MP3 to /data/sounds/{taxon_id}/
   - Record attribution (CC-BY-NC required)

4. build_data.py
   - Merge all data into /data/species_data.json
   - Schema per species:
     {
       id, category ("tree"|"plant"|"bird"), commonName, scientificName,
       family, observationCount, prevalenceRank (within category),
       nativeStatus, photos: [{url, attribution, filename}],
       sounds: [{url, attribution, filename, duration}],
       keyFacts: [string], habitat, identificationTips
     }
   - For keyFacts: pull from iNat taxon wikipedia_summary field
   - Assign prevalenceRank 1-N within each category by observationCount desc

CONSTRAINTS:
- Respect API rate limits: max 60 req/min for iNat, 100 req/min for Xeno-canto
- Add delays between requests
- Use requests library, add proper User-Agent header
- Cache everything; don't re-fetch if files exist
- Print progress (species count, current species name)
- Handle API errors gracefully with retries
```

### Stage 2: Web App

```
Build the "Naturalist Nurturer" web app — a flashcard app for learning
species identification at Green River Preserve (western NC).

STACK: Next.js 14 (App Router), Tailwind CSS, TypeScript

DATA: The app reads from /public/data/species_data.json (pre-built static
file with ~130 species across three categories: trees, plants, birds).
Each species has: commonName, scientificName, category, prevalenceRank,
photos[], sounds[], keyFacts[], identificationTips.

PAGES/FEATURES:

1. HOME (/)
   - App title "Naturalist Nurturer" with a simple nature-themed design
   - Category selector: Trees / Plants / Birds / All
   - Session options:
     • "Learn New" — introduces cards in prevalence order
     • "Review" — shows due cards (spaced repetition)
     • "Quick Quiz" — 15 random cards, mixed modes
   - Progress dashboard: cards learned / total per category, streak counter

2. FLASHCARD VIEW (/study)
   - Card flip animation (front → back)
   - Front: depends on mode
     • Photo mode: show species photo, ask "What is this?"
     • Name mode: show common name, ask to recall features
     • Sound mode: play audio, ask "What bird is this?" (birds only)
   - Back: all info — common name, scientific name, family, photos (swipeable),
     key facts, identification tips, sound player (if bird)
   - Rating buttons: "Again" / "Hard" / "Good" / "Easy" (SM-2 intervals)
   - Progress bar showing position in session
   - "Skip" and "Mark for review" options

3. BROWSE (/browse)
   - Searchable, filterable species list (field guide mode)
   - Filter by category, search by name
   - Tap species for full detail card

4. SPACED REPETITION ENGINE (lib/srs.ts)
   - Implement SM-2 algorithm
   - Store card state in localStorage:
     { speciesId, easeFactor, interval, repetitions, nextReview, lastRating }
   - "Learn New" pulls next unlearned card by prevalenceRank
   - "Review" pulls cards where nextReview <= now

5. PWA SUPPORT
   - Service worker for offline use
   - Cache all JSON data, photos, and sounds
   - Installable on mobile

DESIGN:
- Mobile-first, clean and readable
- Nature-inspired color palette (forest greens, earth tones, cream backgrounds)
- Large tap targets for outdoor/field use
- Photo attribution displayed small but visible on each image
- Accessible: sufficient contrast, screen reader labels on images

CRITICAL:
- Photos are served from /public/data/photos/
- Sounds are served from /public/data/sounds/
- All photo/sound attributions must be displayed (CC license requirement)
- localStorage keys prefixed with "nn_" to avoid collisions
```

---

## 9. Development Phases

| Phase | Scope | Effort |
|-------|-------|--------|
| **1. Data pipeline** | Python scripts to fetch & build species_data.json | 1–2 sessions |
| **2. Core app** | Flashcard UI, photo mode, browse mode, SM-2 engine | 2–3 sessions |
| **3. Sound integration** | Bird sound playback, sound quiz mode | 1 session |
| **4. PWA + offline** | Service worker, caching, install prompt | 1 session |
| **5. Curation pass** | Review key facts, add GRP-specific tips, fix bad photos | Ongoing |
| **6. Stretch features** | Seasonal filters, eBird frequency integration, multi-user | Future |

---

## 10. Licensing & Attribution Notes

- **iNaturalist photos:** Mostly CC-BY-NC. Must display photographer name and license. Non-commercial use only.
- **Xeno-canto sounds:** CC-BY-NC 4.0. Must credit recordist name. Non-commercial use only.
- **iNaturalist API:** Free for non-commercial use. Must include User-Agent identifying your app. Don't exceed rate limits.
- **If GRP wants to use this as an official program tool:** All fine under educational/non-commercial use. If it ever becomes a commercial product, you'd need to re-source photos and sounds.
