# Naturalist Nurturer

**Know Your Neighbors. Learn the Species Where You Are.**

A mobile-first web app for learning species identification through flashcards, spaced repetition, and interactive quizzes. Built for naturalists at Green River Preserve and beyond.

## Features

### Location-Based Species Discovery
- **GPS detection** or **search by city/zip code** using OpenStreetMap geocoding
- Fetches real species data from iNaturalist for any US location
- Preset for Green River Preserve, NC
- 24-hour location cache for offline use

### Season Chooser
- **Current Season** auto-detects spring/summer/fall/winter
- **Random Season** for variety
- **Manual pick** from a visual season grid
- Filters species to those active in the selected season

### Study Modes
- **Photo ID** - Identify species from photos
- **Name Recall** - Describe species from name prompts
- **Sound ID** - Identify birds by their calls
- **Mixed Mode** - Random rotation of all modes

### Quiz Difficulty Levels
- **Flashcard** - Classic flip-to-reveal with self-rating (Again/Hard/Good/Easy)
- **Multiple Choice** - Pick from 4 same-category options
- **Dropdown** - Select from all species in that category
- **Free Response** - Type the common or scientific name

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
- Streak tracking and progress dashboard
- Per-category progress bars

### Field Guide / Browse
- Searchable species list (by name, scientific name, family, order, or genus)
- Filter by category (Trees, Plants, Birds)
- Sort by prevalence, alphabetical, or family
- Detailed species profiles with taxonomy, photos, sounds, and identification tips

## Species Data

Each species includes:
- Common and scientific names
- Full taxonomy: Order, Family, Genus
- Active seasons
- Observation count and local prevalence rank
- Key facts, habitat, and identification tips
- Photos (iNaturalist CC-BY-NC) and sounds (Xeno-canto CC-BY-NC 4.0)

## Tech Stack

- **Next.js 16** with App Router
- **React 19** with TypeScript
- **Tailwind CSS 4** for styling
- **localStorage** for progress persistence (no account needed)
- **PWA** with service worker for offline use
- **iNaturalist API** for species data
- **OpenStreetMap Nominatim** for geocoding
- **Xeno-canto API** for bird sounds

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
│   ├── app/           # Next.js pages (home, study, browse)
│   ├── components/    # React components
│   │   ├── CategorySelector.tsx
│   │   ├── SeasonChooser.tsx
│   │   ├── TaxonomyChart.tsx
│   │   ├── LocationPicker.tsx
│   │   ├── PhotoGallery.tsx
│   │   ├── SoundPlayer.tsx
│   │   ├── ProgressDashboard.tsx
│   │   └── SpeciesDetail.tsx
│   └── lib/           # Business logic
│       ├── types.ts   # TypeScript interfaces
│       ├── srs.ts     # SM-2 spaced repetition
│       ├── species.ts # Data filtering/sorting/seasons
│       ├── inat.ts    # iNaturalist API client
│       └── storage.ts # localStorage wrapper
├── public/data/       # Static species data
└── scripts/           # Python data pipeline
```

## License

Built by [cjpaulphd](https://github.com/cjpaulphd)
