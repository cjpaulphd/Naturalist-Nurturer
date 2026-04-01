#!/usr/bin/env python3
"""Fetch bird sounds from Xeno-canto API for bird species."""

import json
import os
import time

import requests

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")
SOUNDS_DIR = os.path.join(DATA_DIR, "sounds")
XENO_CANTO_URL = "https://xeno-canto.org/api/3/recordings"
HEADERS = {
    "User-Agent": "NaturalistNurturer/1.0 (species flashcard app; Green River Preserve)"
}

MAX_RECORDINGS = 2
REQUEST_DELAY = 0.7  # stay under 100 req/min
MAX_RETRIES = 3


def load_bird_species():
    """Load bird species from raw data."""
    filepath = os.path.join(RAW_DIR, "aves_species.json")
    if not os.path.exists(filepath):
        print(f"Error: {filepath} not found. Run fetch_species.py first.")
        return []

    with open(filepath) as f:
        data = json.load(f)

    birds = []
    for item in data:
        taxon = item.get("taxon", {})
        birds.append({
            "taxon_id": taxon.get("id"),
            "name": taxon.get("preferred_common_name", taxon.get("name", "Unknown")),
            "scientific_name": taxon.get("name", ""),
        })
    return birds


def search_xenocanto(scientific_name):
    """Search Xeno-canto for recordings of a species."""
    # Xeno-canto v3 query format: name + location filter
    query = f'{scientific_name} loc:"North Carolina"'

    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.get(
                XENO_CANTO_URL,
                params={"query": query},
                headers=HEADERS,
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("recordings", [])
        except (requests.RequestException, ValueError) as e:
            wait = 2 ** (attempt + 1)
            print(f"    Error searching Xeno-canto: {e}. Retrying in {wait}s...")
            time.sleep(wait)

    return []


def download_recording(url, filepath):
    """Download an MP3 recording."""
    for attempt in range(MAX_RETRIES):
        try:
            # Xeno-canto download URLs may need https
            if url.startswith("//"):
                url = "https:" + url
            resp = requests.get(url, headers=HEADERS, timeout=60, stream=True)
            resp.raise_for_status()
            with open(filepath, "wb") as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    f.write(chunk)
            return True
        except (requests.RequestException, IOError) as e:
            wait = 2 ** (attempt + 1)
            print(f"    Download error: {e}. Retrying in {wait}s...")
            time.sleep(wait)
    return False


def parse_duration(length_str):
    """Parse Xeno-canto duration string (e.g., '0:45' or '1:23') to seconds."""
    try:
        parts = length_str.strip().split(":")
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    except (ValueError, IndexError):
        pass
    return None


def process_bird(bird_info):
    """Fetch and download sounds for a single bird species."""
    taxon_id = bird_info["taxon_id"]
    scientific_name = bird_info["scientific_name"]
    species_dir = os.path.join(SOUNDS_DIR, str(taxon_id))
    meta_path = os.path.join(species_dir, "sound_meta.json")

    # Check cache
    if os.path.exists(meta_path):
        with open(meta_path) as f:
            existing = json.load(f)
        if len(existing) > 0:
            return existing

    recordings = search_xenocanto(scientific_name)

    # Filter for quality A or B
    quality_recordings = [
        r for r in recordings
        if r.get("q", "").upper() in ("A", "B")
    ]

    # Sort by quality (A first), then by number of listens or rating
    quality_recordings.sort(key=lambda r: (0 if r.get("q", "").upper() == "A" else 1))

    os.makedirs(species_dir, exist_ok=True)
    sound_records = []

    for rec in quality_recordings[:MAX_RECORDINGS]:
        rec_id = rec.get("id", "unknown")
        # Xeno-canto provides a file download URL
        file_url = rec.get("file")
        if not file_url:
            continue

        if file_url.startswith("//"):
            file_url = "https:" + file_url

        filename = f"XC{rec_id}.mp3"
        filepath = os.path.join(species_dir, filename)

        if not os.path.exists(filepath):
            success = download_recording(file_url, filepath)
            if not success:
                continue
            time.sleep(0.5)

        # Build attribution (CC-BY-NC required by Xeno-canto)
        recordist = rec.get("rec", "Unknown")
        license_info = rec.get("lic", "CC-BY-NC-4.0")
        duration = parse_duration(rec.get("length", "0:00"))

        sound_records.append({
            "url": file_url,
            "attribution": f"{recordist}, XC{rec_id}, Xeno-canto, {license_info}",
            "filename": filename,
            "duration": duration,
            "xc_id": rec_id,
            "quality": rec.get("q", ""),
            "recordist": recordist,
            "license": license_info,
        })

    # Save metadata
    with open(meta_path, "w") as f:
        json.dump(sound_records, f, indent=2)

    return sound_records


def main():
    os.makedirs(SOUNDS_DIR, exist_ok=True)

    birds = load_bird_species()
    if not birds:
        print("No bird species found. Run fetch_species.py first.")
        return

    print(f"Fetching sounds for {len(birds)} bird species...\n")

    total = len(birds)
    sound_index = {}

    for i, bird in enumerate(birds, 1):
        name = bird["name"]
        taxon_id = bird["taxon_id"]
        print(f"[{i}/{total}] {name} ({bird['scientific_name']})")

        sounds = process_bird(bird)
        sound_index[taxon_id] = sounds
        print(f"  -> {len(sounds)} recordings")

        time.sleep(REQUEST_DELAY)

    # Save the full sound index
    index_path = os.path.join(RAW_DIR, "sound_index.json")
    with open(index_path, "w") as f:
        json.dump(sound_index, f, indent=2)

    total_sounds = sum(len(s) for s in sound_index.values())
    species_with_sounds = sum(1 for s in sound_index.values() if s)
    print(f"\nDone! {total_sounds} recordings for {species_with_sounds}/{len(birds)} species.")


if __name__ == "__main__":
    main()
