# Naturalist Nurturer

**Know Your Neighbors. Learn the Species Where You Are.**

A mobile-first web app for learning species identification through flashcards, spaced repetition, and interactive quizzes. Built for naturalists at <a href="https://www.greenriverpreserve.org">Green River Preserve</a> and beyond.

## Features

### Location-Based Species Discovery
- **GPS detection** or **search by city/zip code** using OpenStreetMap geocoding
- Fetches real species data from iNaturalist for any location worldwide
- **Location disambiguator** for resolving multiple search results
- **Study Locations dropdown** with saved past locations for quick switching
- Defaults to **Green River Preserve** as the starting location for new users
- 24-hour location cache for offline use

### Study Modes
- **Photo ID** — Identify species from photos (default mode)
- **Name Recall** — Describe species from name prompts
- **Sound ID** — Identify birds by their calls (birds only)
- **Mixed Mode** — Random rotation of all modes

### Quiz Difficulty Levels
- **Flashcard** — Flip-to-reveal with self-rating
- **Multiple Choice** — Pick from 4 same-category options
- **Dropdown** — Select from all species in that category
- **Free Response** — Type the common or scientific name (with partial credit)

### Species Categories
- Trees, Plants, Birds, Fungi, Insects, Mammals, Reptiles, and Amphibians
- Category-filtered sessions with wrapping category selector

### Name Display Toggle
Choose how species names appear during quizzes:
- **Common** names only (e.g., "Carolina Wren")
- **Scientific** names only (e.g., *Thryothorus ludovicianus*)
- **Both** common and scientific names

### Taxonomy Chart
Visual Order > Family > Genus > Species hierarchy shown on every card back and in the field guide, with:
- Color-coded taxonomic levels
- Common name mappings at each level
- Related species shown at shared taxonomic ranks

### Spaced Repetition (SM-2)
- SuperMemo SM-2 algorithm tracks your learning
- Cards scheduled based on your self-rating
- **"Learn"** introduces new cards in prevalence order
- **"Revisit"** brings back cards due for review
- Per-category progress bars on session complete screen

### Study Experience
- Swipeable photo gallery with touch support on mobile and desktop
- **"Reveal"** button to flip cards, action buttons positioned above the card
- **"Nicely Nurtured!"** celebration heading with falling 🌿 fern animation on session complete
- Loading indicator with "This may take a minute..." message during taxonomy fetches
- Parallelized API calls for faster species loading
- Bird sounds loaded on-demand per card for optimized performance
- Graceful handling of species with missing photos

### Growth Tracking
- Progress dashboard with per-category stats
- **Location tracking map** showing where you've studied
- Streak counter and cards-learned totals
- Shareable progress with inviting share text

### Field Guide / Browse
- Searchable species list (by name, scientific name, family, order, or genus)
- Filter by category
- Sort by prevalence (with iNaturalist attribution), alphabetical, or family
- Detailed species profiles with taxonomy, photos, sounds, and identification tips
- Centered, consistent design across all views

### Welcome Experience
- Welcome popup for first-time visitors with app tagline and iNaturalist attribution
- **"Try It Out"** button loads Green River Preserve data for new users

## Species Data

Each species includes:
- Common and scientific names
- Full taxonomy: Order, Family, Genus
- Observation count and local prevalence rank (sourced from iNaturalist)
- Key facts, habitat, and identification tips
- Photos from [iNaturalist](https://www.inaturalist.org) (CC-BY-NC) with attribution displayed
- Bird sounds from [Xeno-canto](https://xeno-canto.org) (CC-BY-NC 4.0) via server-side proxy

## Tech Stack

- **Next.js 16** with App Router
- **React 19** with TypeScript
- **Tailwind CSS 4** for styling
- **localStorage** for progress persistence (no account needed)
- **PWA** with service worker for offline use
- **Vercel** hosting with Web Analytics
- **[iNaturalist API](https://www.inaturalist.org)** for species data and taxonomy
- **[OpenStreetMap Nominatim](https://nominatim.openstreetmap.org)** for geocoding
- **[Xeno-canto API](https://xeno-canto.org)** for bird sounds (proxied server-side)

## Getting Started

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Populating Real Species Data

```bash
# From the project root
python3 scripts/fetch_species.py
python3 scripts/fetch_photos.py
python3 scripts/fetch_sounds.py
python3 scripts/build_data.py
```

## Project Structure

```
web/
├── src/
│   ├── app/              # Next.js pages
│   │   ├── page.tsx      # Home — category selector, study launcher
│   │   ├── study/        # Flashcard study sessions
│   │   ├── browse/       # Field guide / species browser
│   │   ├── progress/     # Growth tracking & location map
│   │   └── api/          # Server-side API routes (Xeno-canto proxy)
│   ├── components/
│   │   ├── CategorySelector.tsx
│   │   ├── FallingLeaves.tsx
│   │   ├── Header.tsx
│   │   ├── LocationDisambiguator.tsx
│   │   ├── LocationPicker.tsx
│   │   ├── PhotoGallery.tsx
│   │   ├── ProgressDashboard.tsx
│   │   ├── QuizSettingsModal.tsx
│   │   ├── SeasonChooser.tsx
│   │   ├── ServiceWorkerRegistrar.tsx
│   │   ├── SoundPlayer.tsx
│   │   ├── SpeciesDetail.tsx
│   │   ├── StudyLocationMap.tsx
│   │   ├── TaxonomyChart.tsx
│   │   └── WelcomePopup.tsx
│   └── lib/
│       ├── types.ts            # TypeScript interfaces
│       ├── srs.ts              # SM-2 spaced repetition engine
│       ├── species.ts          # Data filtering/sorting
│       ├── categories.ts       # Taxa category definitions
│       ├── inat.ts             # iNaturalist API client
│       ├── storage.ts          # localStorage wrapper
│       └── location-tracker.ts # Study location tracking
├── public/data/          # Static species data
└── scripts/              # Python data pipeline
```

## Data Attribution

This app is built on the following open data and APIs:

- **[iNaturalist](https://www.inaturalist.org)** — Species observations, taxonomy, and photos (CC-BY-NC). iNaturalist is a joint initiative of the California Academy of Sciences and the National Geographic Society.
- **[Wikipedia](https://www.wikipedia.org)** — Species descriptions and key facts (CC BY-SA 3.0). Facts are sourced from Wikipedia summaries via the iNaturalist API.
- **[Xeno-canto](https://xeno-canto.org)** — Bird sound recordings (CC-BY-NC 4.0). Xeno-canto is a citizen science project for sharing bird sounds from around the world.
- **[OpenStreetMap Nominatim](https://nominatim.openstreetmap.org)** — Geocoding and location search (ODbL).

## License

MIT License — see [LICENSE](LICENSE) for details.

Built by [cjpaulphd](https://github.com/cjpaulphd)
