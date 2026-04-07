#!/usr/bin/env python3
"""Merge all fetched data into a single species_data.json file."""

import json
import os
import re

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")
OUTPUT_PATH = os.path.join(DATA_DIR, "species_data.json")


def load_json(filepath):
    """Load JSON file, return empty list/dict on failure."""
    if not os.path.exists(filepath):
        return []
    with open(filepath) as f:
        return json.load(f)


def load_taxon_data(taxon_id):
    """Load cached taxon data from the taxa directory."""
    path = os.path.join(RAW_DIR, "taxa", f"{taxon_id}.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return None


def extract_facts(taxon_data):
    """Extract key facts and extended facts from the wikipedia_summary field.

    Returns a tuple of (key_facts, extended_facts) where key_facts are the
    first 3 informative sentences and extended_facts are up to 7 more.
    """
    if not taxon_data:
        return [], []

    summary = taxon_data.get("wikipedia_summary", "")
    if not summary:
        return [], []

    # Clean HTML tags
    clean = re.sub(r"<[^>]+>", "", summary)
    clean = clean.strip()

    if not clean:
        return [], []

    # Split into sentences and collect informative ones
    sentences = re.split(r"(?<=[.!?])\s+", clean)
    facts = []
    for s in sentences:
        s = s.strip()
        if len(s) > 20 and len(s) < 500:
            facts.append(s)
        if len(facts) >= 10:
            break

    key_facts = facts[:3]
    extended_facts = facts[3:]

    return key_facts, extended_facts


def get_native_status(taxon_data):
    """Determine native/introduced status from taxon data.

    Checks establishment_means first (most reliable when fetched with a
    preferred_place_id), then falls back to conservation statuses.
    """
    if not taxon_data:
        return "unknown"

    # Check establishment_means — this is the primary signal from iNaturalist.
    # The API returns it as an object: { "establishment_means": "native", "place": {...} }
    # or occasionally as a plain string.
    em = taxon_data.get("establishment_means")
    if em:
        em_value = em if isinstance(em, str) else em.get("establishment_means", "")
        if em_value in ("native", "endemic"):
            return "native"
        if em_value == "introduced":
            return "introduced"

    # Fallback: check conservation statuses for US-based native info
    statuses = taxon_data.get("conservation_statuses", [])
    for status in statuses:
        place = status.get("place", {})
        if place and "united states" in (place.get("display_name") or "").lower():
            return "native"

    return "unknown"


def get_family(taxon_data, item_taxon):
    """Extract family name from taxon data or item."""
    if taxon_data:
        ancestors = taxon_data.get("ancestors", [])
        for ancestor in ancestors:
            if ancestor.get("rank") == "family":
                return ancestor.get("name", "Unknown")

    # Fallback: check the item's taxon ancestors
    ancestors = item_taxon.get("ancestors", [])
    for ancestor in ancestors:
        if ancestor.get("rank") == "family":
            return ancestor.get("name", "Unknown")

    return "Unknown"


def get_habitat(taxon_data):
    """Extract habitat information from taxon data."""
    if not taxon_data:
        return ""

    summary = taxon_data.get("wikipedia_summary", "")
    if not summary:
        return ""

    clean = re.sub(r"<[^>]+>", "", summary).strip()

    # Look for habitat-related sentences
    habitat_keywords = ["habitat", "found in", "lives in", "grows in", "native to",
                        "forests", "woodland", "meadow", "wetland", "stream",
                        "mountain", "elevation"]
    sentences = re.split(r"(?<=[.!?])\s+", clean)
    for s in sentences:
        s_lower = s.lower()
        if any(kw in s_lower for kw in habitat_keywords):
            return s.strip()

    return ""


def get_identification_tips(taxon_data):
    """Extract identification tips from taxon data."""
    if not taxon_data:
        return ""

    summary = taxon_data.get("wikipedia_summary", "")
    if not summary:
        return ""

    clean = re.sub(r"<[^>]+>", "", summary).strip()

    id_keywords = ["identified by", "recognized by", "distinguished",
                   "characterized", "features", "appearance", "plumage",
                   "leaves", "bark", "flowers", "song", "call",
                   "length", "wingspan", "color", "markings"]
    sentences = re.split(r"(?<=[.!?])\s+", clean)
    for s in sentences:
        s_lower = s.lower()
        if any(kw in s_lower for kw in id_keywords):
            return s.strip()

    return ""


def build_species_data():
    """Merge all data sources into the final species data file."""
    # Load species lists
    categories = [
        ("trees_species.json", "tree"),
        ("plants_species.json", "plant"),
        ("aves_species.json", "bird"),
    ]

    # Load photo and sound indices
    photo_index = load_json(os.path.join(RAW_DIR, "photo_index.json"))
    if isinstance(photo_index, list):
        photo_index = {}
    sound_index = load_json(os.path.join(RAW_DIR, "sound_index.json"))
    if isinstance(sound_index, list):
        sound_index = {}

    all_species = []

    for filename, category in categories:
        filepath = os.path.join(RAW_DIR, filename)
        items = load_json(filepath)
        if not items:
            print(f"Warning: No data for {category} ({filename})")
            continue

        print(f"Processing {len(items)} {category} species...")

        # Sort by observation count descending for prevalence ranking
        items.sort(key=lambda x: x.get("count", 0), reverse=True)

        for rank, item in enumerate(items, 1):
            taxon = item.get("taxon", {})
            taxon_id = taxon.get("id")

            if not taxon_id:
                continue

            # Load detailed taxon data if available
            taxon_data = load_taxon_data(taxon_id)

            # Get photos
            photos_raw = photo_index.get(str(taxon_id), [])
            photos = [
                {
                    "url": p.get("url", ""),
                    "attribution": p.get("attribution", ""),
                    "filename": p.get("filename", ""),
                }
                for p in photos_raw
            ]

            # Get sounds (birds only)
            sounds = []
            if category == "bird":
                sounds_raw = sound_index.get(str(taxon_id), [])
                sounds = [
                    {
                        "url": s.get("url", ""),
                        "attribution": s.get("attribution", ""),
                        "filename": s.get("filename", ""),
                        "duration": s.get("duration"),
                    }
                    for s in sounds_raw
                ]

            key_facts, extended_facts = extract_facts(taxon_data)

            species_entry = {
                "id": taxon_id,
                "category": category,
                "commonName": taxon.get("preferred_common_name", ""),
                "scientificName": taxon.get("name", ""),
                "family": get_family(taxon_data, taxon),
                "observationCount": item.get("count", 0),
                "prevalenceRank": rank,
                "nativeStatus": get_native_status(taxon_data),
                "photos": photos,
                "sounds": sounds,
                "keyFacts": key_facts,
                "extendedFacts": extended_facts,
                "habitat": get_habitat(taxon_data),
                "identificationTips": get_identification_tips(taxon_data),
            }

            all_species.append(species_entry)

    return all_species


def main():
    print("Building merged species data...\n")

    species_data = build_species_data()

    if not species_data:
        print("No species data to merge. Run the fetch scripts first.")
        return

    # Write output
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(species_data, f, indent=2)

    # Summary
    by_category = {}
    for sp in species_data:
        cat = sp["category"]
        by_category[cat] = by_category.get(cat, 0) + 1

    print(f"\nWrote {len(species_data)} species to {OUTPUT_PATH}")
    for cat, count in sorted(by_category.items()):
        print(f"  {cat}: {count}")

    # Stats
    with_photos = sum(1 for sp in species_data if sp["photos"])
    with_sounds = sum(1 for sp in species_data if sp["sounds"])
    with_facts = sum(1 for sp in species_data if sp["keyFacts"])
    print(f"\n  With photos: {with_photos}")
    print(f"  With sounds: {with_sounds}")
    print(f"  With key facts: {with_facts}")


if __name__ == "__main__":
    main()
