#!/usr/bin/env python3
"""Fetch species counts from iNaturalist for the Green River Preserve area."""

import json
import os
import time

import requests

BASE_URL = "https://api.inaturalist.org/v1"
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw")
HEADERS = {
    "User-Agent": "NaturalistNurturer/1.0 (species flashcard app; Green River Preserve)"
}

# Bounding box: ~10mi radius around GRP (35.25, -82.61)
BBOX = {
    "swlat": 35.15,
    "swlng": -82.75,
    "nelat": 35.35,
    "nelng": -82.45,
}

MAX_RESULTS = 200
REQUEST_DELAY = 1.1  # seconds between requests (stay under 60/min)
MAX_RETRIES = 3

# Tree-related ancestor taxon IDs and ranks used to distinguish trees from other plants
TREE_ANCESTOR_IDS = {
    47375,   # Magnoliopsida (flowering plants - we check rank further)
    136329,  # Pinopsida (conifers)
}
TREE_RANKS = {"genus", "species", "subspecies", "variety", "form"}
TREE_ORDER_IDS = {
    47347,   # Pinales (conifers)
    47851,   # Fagales (oaks, beeches, birches)
    47191,   # Sapindales (maples, etc.)
    48808,   # Magnoliales
    47637,   # Laurales
    71274,   # Ericales (sourwood, etc.)
    48092,   # Cornales (dogwood, etc.)
    47122,   # Rosales (cherry, serviceberry, etc.)
    47123,   # Fabales (locusts, redbuds)
    47741,   # Malvales (basswood)
    48075,   # Lamiales (ashes, catalpas)
    53542,   # Aquifoliales (hollies)
}

# Key families known to contain trees in the Blue Ridge
TREE_FAMILIES = {
    "Pinaceae", "Cupressaceae", "Taxaceae",           # conifers
    "Fagaceae", "Betulaceae", "Juglandaceae",          # Fagales
    "Sapindaceae", "Anacardiaceae", "Simaroubaceae",   # Sapindales
    "Magnoliaceae", "Annonaceae",                      # Magnoliales
    "Lauraceae",                                       # Laurales
    "Rosaceae",                                        # Rosales (cherry, serviceberry)
    "Fabaceae",                                        # Fabales (locust, redbud)
    "Ericaceae",                                       # Ericales (sourwood, rhododendron)
    "Cornaceae", "Nyssaceae",                          # Cornales
    "Oleaceae",                                        # Lamiales (ash, fringe tree)
    "Malvaceae",                                       # Malvales (basswood)
    "Aquifoliaceae",                                   # hollies
    "Altingiaceae",                                    # sweetgum
    "Platanaceae",                                     # sycamore
    "Hamamelidaceae",                                  # witch hazel
    "Ulmaceae",                                        # elms
    "Salicaceae",                                      # willows, poplars
    "Paulowniaceae",                                   # paulownia
    "Bignoniaceae",                                    # catalpa
    "Ebenaceae",                                       # persimmon
    "Styracaceae",                                     # silverbells
    "Symplocaceae",                                    # sweetleaf
    "Adoxaceae",                                       # elderberry (some tree-like)
}

# Ranks that indicate tree-level taxa (not herbs/ground cover)
TREE_RANK_LEVELS = {"species", "subspecies", "variety", "hybrid"}


def fetch_species_counts(iconic_taxa, per_page=200):
    """Fetch species counts from iNaturalist observations/species_counts endpoint."""
    params = {
        **BBOX,
        "iconic_taxa": iconic_taxa,
        "quality_grade": "research",
        "rank": "species",
        "per_page": per_page,
        "order_by": "count",
        "order": "desc",
    }

    all_results = []
    page = 1

    while len(all_results) < MAX_RESULTS:
        params["page"] = page
        params["per_page"] = min(per_page, MAX_RESULTS - len(all_results))

        for attempt in range(MAX_RETRIES):
            try:
                print(f"  Fetching page {page} (have {len(all_results)} so far)...")
                resp = requests.get(
                    f"{BASE_URL}/observations/species_counts",
                    params=params,
                    headers=HEADERS,
                    timeout=30,
                )
                resp.raise_for_status()
                data = resp.json()
                break
            except (requests.RequestException, ValueError) as e:
                wait = 2 ** (attempt + 1)
                print(f"  Error: {e}. Retrying in {wait}s...")
                time.sleep(wait)
        else:
            print(f"  Failed after {MAX_RETRIES} retries, stopping.")
            break

        results = data.get("results", [])
        if not results:
            break

        all_results.extend(results)
        total = data.get("total_results", 0)
        print(f"  Got {len(results)} results (total available: {total})")

        if len(all_results) >= total or len(all_results) >= MAX_RESULTS:
            break

        page += 1
        time.sleep(REQUEST_DELAY)

    return all_results[:MAX_RESULTS]


def is_tree(taxon):
    """Heuristic: determine if a Plantae taxon is likely a tree.

    Uses family name and ancestry information to classify.
    """
    family = taxon.get("iconic_taxon_name", "")

    # Check the taxon's own family name from ancestors
    ancestors = taxon.get("ancestors", [])
    ancestor_names = {a.get("name", "") for a in ancestors}
    ancestor_ids = {a.get("id") for a in ancestors}
    ancestor_ranks = {a.get("rank", ""): a.get("name", "") for a in ancestors}

    # Check family from the taxon data
    taxon_family = ancestor_ranks.get("family", "")
    if taxon_family in TREE_FAMILIES:
        rank = taxon.get("rank", "species")
        # For families that contain both trees and non-trees, use rank_level
        # Trees typically have rank_level >= 10 (species level)
        if taxon_family in {"Rosaceae", "Fabaceae", "Ericaceae", "Salicaceae", "Adoxaceae", "Anacardiaceae", "Oleaceae", "Bignoniaceae"}:
            # These families have many non-tree members; check if common name
            # suggests tree-like growth
            common = (taxon.get("preferred_common_name") or "").lower()
            tree_words = {
                "tree", "oak", "maple", "pine", "birch", "beech", "ash",
                "elm", "hickory", "walnut", "cherry", "poplar", "willow",
                "locust", "redbud", "dogwood", "magnolia", "tulip",
                "sassafras", "sweetgum", "sycamore", "hemlock", "spruce",
                "fir", "cedar", "juniper", "holly", "sourwood", "basswood",
                "buckeye", "chestnut", "persimmon", "serviceberry",
                "silverbell", "pawpaw", "rhododendron", "mountain laurel",
                "witch hazel", "catalpa", "paulownia",
                "sumac", "smoketree", "fringe tree",
            }
            return any(w in common for w in tree_words)
        return True

    # Check ancestry IDs for tree orders
    if ancestor_ids & TREE_ORDER_IDS:
        return True

    return False


def classify_plants(plantae_results):
    """Split Plantae results into trees and non-tree plants."""
    trees = []
    plants = []

    for item in plantae_results:
        taxon = item.get("taxon", {})
        if is_tree(taxon):
            trees.append(item)
        else:
            plants.append(item)

    return trees, plants


def save_json(data, filename):
    """Save data as JSON to the raw data directory."""
    os.makedirs(DATA_DIR, exist_ok=True)
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)
    print(f"  Saved {len(data)} records to {filepath}")


def main():
    os.makedirs(DATA_DIR, exist_ok=True)

    # Check for cached files
    plantae_path = os.path.join(DATA_DIR, "plantae_species.json")
    aves_path = os.path.join(DATA_DIR, "aves_species.json")
    trees_path = os.path.join(DATA_DIR, "trees_species.json")
    plants_path = os.path.join(DATA_DIR, "plants_species.json")

    # Fetch Plantae
    if os.path.exists(plantae_path):
        print("Plantae: using cached data")
        with open(plantae_path) as f:
            plantae_results = json.load(f)
    else:
        print("Fetching Plantae species counts...")
        plantae_results = fetch_species_counts("Plantae")
        save_json(plantae_results, "plantae_species.json")

    time.sleep(REQUEST_DELAY)

    # Fetch Aves
    if os.path.exists(aves_path):
        print("Aves: using cached data")
        with open(aves_path) as f:
            aves_results = json.load(f)
    else:
        print("Fetching Aves species counts...")
        aves_results = fetch_species_counts("Aves")
        save_json(aves_results, "aves_species.json")

    # Classify plants into trees vs non-tree plants
    print("\nClassifying Plantae into trees vs plants...")
    trees, plants = classify_plants(plantae_results)
    save_json(trees, "trees_species.json")
    save_json(plants, "plants_species.json")

    # Summary
    print(f"\n--- Summary ---")
    print(f"Plantae total: {len(plantae_results)}")
    print(f"  Trees: {len(trees)}")
    print(f"  Plants (non-tree): {len(plants)}")
    print(f"Aves: {len(aves_results)}")

    # Print a few examples from each
    for label, data in [("Trees", trees), ("Plants", plants), ("Birds", aves_results)]:
        print(f"\nTop 5 {label}:")
        for item in data[:5]:
            taxon = item.get("taxon", {})
            name = taxon.get("preferred_common_name", taxon.get("name", "Unknown"))
            sci = taxon.get("name", "")
            count = item.get("count", 0)
            print(f"  {name} ({sci}) - {count} observations")


if __name__ == "__main__":
    main()
