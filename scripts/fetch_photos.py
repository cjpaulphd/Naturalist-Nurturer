#!/usr/bin/env python3
"""Fetch photos for each species from iNaturalist taxa endpoint."""

import json
import os
import time

import requests

BASE_URL = "https://api.inaturalist.org/v1"
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")
PHOTOS_DIR = os.path.join(DATA_DIR, "photos")
HEADERS = {
    "User-Agent": "NaturalistNurturer/1.0 (species flashcard app; Green River Preserve)"
}

MAX_PHOTOS = 5
REQUEST_DELAY = 1.1  # stay under 60 req/min
MAX_RETRIES = 3

# Creative Commons license codes accepted
CC_LICENSES = {"cc-by", "cc-by-sa", "cc-by-nc", "cc-by-nc-sa", "cc0", "cc-by-nd", "cc-by-nc-nd"}


def load_species_list():
    """Load all species from raw data files."""
    species = []

    for filename, category in [
        ("trees_species.json", "tree"),
        ("plants_species.json", "plant"),
        ("aves_species.json", "bird"),
    ]:
        filepath = os.path.join(RAW_DIR, filename)
        if not os.path.exists(filepath):
            print(f"Warning: {filepath} not found. Run fetch_species.py first.")
            continue
        with open(filepath) as f:
            data = json.load(f)
        for item in data:
            taxon = item.get("taxon", {})
            species.append({
                "taxon_id": taxon.get("id"),
                "name": taxon.get("preferred_common_name", taxon.get("name", "Unknown")),
                "scientific_name": taxon.get("name", ""),
                "category": category,
            })

    return species


def fetch_taxon_photos(taxon_id):
    """Fetch taxon details including photos from iNaturalist."""
    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.get(
                f"{BASE_URL}/taxa/{taxon_id}",
                headers=HEADERS,
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
            results = data.get("results", [])
            if results:
                return results[0]
            return None
        except (requests.RequestException, ValueError) as e:
            wait = 2 ** (attempt + 1)
            print(f"    Error fetching taxon {taxon_id}: {e}. Retrying in {wait}s...")
            time.sleep(wait)

    print(f"    Failed to fetch taxon {taxon_id} after {MAX_RETRIES} retries.")
    return None


def download_photo(url, filepath):
    """Download a photo to the given filepath."""
    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=30, stream=True)
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


def get_medium_url(photo):
    """Get the medium-resolution URL for a photo."""
    # iNat photo URLs follow a pattern; medium_url is typically provided
    medium = photo.get("medium_url")
    if medium:
        return medium
    # Fallback: construct from the URL pattern
    url = photo.get("url", "")
    if url:
        return url.replace("square", "medium")
    return None


def process_species(species_info, photo_index):
    """Fetch and download photos for a single species."""
    taxon_id = species_info["taxon_id"]
    species_dir = os.path.join(PHOTOS_DIR, str(taxon_id))
    meta_path = os.path.join(species_dir, "photo_meta.json")

    # Check cache
    if os.path.exists(meta_path):
        with open(meta_path) as f:
            existing = json.load(f)
        if len(existing) > 0:
            return existing

    taxon_data = fetch_taxon_photos(taxon_id)
    if not taxon_data:
        return []

    # Also save the full taxon response for build_data.py to use
    taxon_cache_path = os.path.join(RAW_DIR, "taxa", f"{taxon_id}.json")
    os.makedirs(os.path.dirname(taxon_cache_path), exist_ok=True)
    if not os.path.exists(taxon_cache_path):
        with open(taxon_cache_path, "w") as f:
            json.dump(taxon_data, f, indent=2)

    photos = taxon_data.get("taxon_photos", [])
    photo_records = []

    os.makedirs(species_dir, exist_ok=True)

    for photo_entry in photos:
        if len(photo_records) >= MAX_PHOTOS:
            break

        photo = photo_entry.get("photo", {})
        license_code = (photo.get("license_code") or "").lower()

        if license_code not in CC_LICENSES:
            continue

        photo_id = photo.get("id")
        url = get_medium_url(photo)
        if not url:
            continue

        # Determine file extension from URL
        ext = "jpg"
        if ".png" in url:
            ext = "png"

        filename = f"{photo_id}.{ext}"
        filepath = os.path.join(species_dir, filename)

        if not os.path.exists(filepath):
            success = download_photo(url, filepath)
            if not success:
                continue
            time.sleep(0.5)  # brief delay between photo downloads

        attribution = photo.get("attribution", "Unknown")
        photo_records.append({
            "url": url,
            "attribution": attribution,
            "filename": filename,
            "license": license_code,
            "photo_id": photo_id,
        })

    # Save metadata
    with open(meta_path, "w") as f:
        json.dump(photo_records, f, indent=2)

    return photo_records


def main():
    os.makedirs(PHOTOS_DIR, exist_ok=True)

    species_list = load_species_list()
    if not species_list:
        print("No species found. Run fetch_species.py first.")
        return

    print(f"Fetching photos for {len(species_list)} species...\n")

    total = len(species_list)
    photo_index = {}

    for i, sp in enumerate(species_list, 1):
        name = sp["name"]
        taxon_id = sp["taxon_id"]
        category = sp["category"]
        print(f"[{i}/{total}] {name} (taxon {taxon_id}, {category})")

        photos = process_species(sp, photo_index)
        photo_index[taxon_id] = photos
        print(f"  -> {len(photos)} photos")

        # Rate limiting
        time.sleep(REQUEST_DELAY)

    # Save the full photo index
    index_path = os.path.join(DATA_DIR, "raw", "photo_index.json")
    with open(index_path, "w") as f:
        json.dump(photo_index, f, indent=2)

    total_photos = sum(len(p) for p in photo_index.values())
    print(f"\nDone! {total_photos} photos across {len(photo_index)} species.")


if __name__ == "__main__":
    main()
