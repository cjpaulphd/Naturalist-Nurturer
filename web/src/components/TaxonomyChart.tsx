"use client";

import { Species } from "@/lib/types";

interface TaxonomyChartProps {
  species: Species;
  allSpecies: Species[];
}

const MAX_RELATED = 5;

/** Build a Wikipedia URL for a taxon name */
function wikiUrl(name: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(name.replace(/ /g, "_"))}`;
}

/** Build an iNaturalist taxon URL from a species ID */
function inatUrl(id: number): string {
  return `https://www.inaturalist.org/taxa/${id}`;
}

export default function TaxonomyChart({ species, allSpecies }: TaxonomyChartProps) {
  // Don't render if no taxonomy data available
  if (!species.order && !species.family && !species.genus) return null;
  // Also skip if family is "Unknown"
  if (species.family === "Unknown" && !species.order && !species.genus) return null;

  // Find related species at each level for context
  const sameOrder = species.order
    ? allSpecies.filter((s) => s.order === species.order && s.id !== species.id)
    : [];
  const sameFamily = species.family && species.family !== "Unknown"
    ? allSpecies.filter((s) => s.family === species.family && s.id !== species.id)
    : [];
  const sameGenus = species.genus
    ? allSpecies.filter((s) => s.genus === species.genus && s.id !== species.id)
    : [];

  // Parse genus and specific epithet from scientificName
  const [genus, ...epithetParts] = species.scientificName.split(" ");
  const epithet = epithetParts.join(" ");

  // Build levels, only include those with actual data
  const allLevels = [
    {
      rank: "Order",
      value: species.order,
      related: sameOrder,
      color: "bg-purple-100 text-purple-800 border-purple-300",
    },
    {
      rank: "Family",
      value: species.family !== "Unknown" ? species.family : "",
      related: sameFamily,
      color: "bg-blue-100 text-blue-800 border-blue-300",
    },
    {
      rank: "Genus",
      value: genus || species.genus,
      related: sameGenus,
      color: "bg-teal-100 text-teal-800 border-teal-300",
    },
    {
      rank: "Species",
      value: epithet || species.scientificName,
      related: [],
      color: "bg-green-100 text-green-800 border-green-300",
    },
  ];

  // Filter out levels with no data
  const levels = allLevels.filter((level) => level.value);

  if (levels.length === 0) return null;

  // Wikipedia link for a taxonomy value; for Species rank, use the full scientific name
  const linkForLevel = (level: { rank: string; value: string }) => {
    if (level.rank === "Species") {
      return wikiUrl(species.scientificName);
    }
    return wikiUrl(level.value);
  };

  return (
    <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
      <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3 text-center">
        Taxonomy
      </h4>
      <div className="space-y-0">
        {levels.map((level, i) => (
          <div key={level.rank} className="flex items-start">
            {/* Connector line */}
            <div className="flex flex-col items-center w-6 flex-shrink-0">
              {i > 0 && (
                <div className="w-px h-2 border-l-2 border-dashed border-stone-300" />
              )}
              <div className={`w-3 h-3 rounded-full border-2 ${level.color} flex-shrink-0`} />
              {i < levels.length - 1 && (
                <div className="w-px flex-1 min-h-[8px] border-l-2 border-dashed border-stone-300" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-2 ml-2">
              <div className="flex items-baseline gap-2">
                <span className="text-[0.625rem] font-semibold uppercase text-stone-400 w-12">
                  {level.rank}
                </span>
                <a
                  href={linkForLevel(level)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-sm font-medium hover:underline ${level.rank === "Species" || level.rank === "Genus" ? "italic" : ""}`}
                >
                  {level.value}
                </a>
              </div>
              {/* Show common names of related species at this level (capped) */}
              {level.related.length > 0 && (
                <div className="ml-12 mt-0.5">
                  <span className="text-[0.625rem] text-stone-400">
                    Also:{" "}
                    {level.related.slice(0, MAX_RELATED).map((s, idx) => (
                      <span key={s.id}>
                        {idx > 0 && ", "}
                        <a
                          href={inatUrl(s.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline hover:text-stone-600 transition-colors"
                        >
                          {s.commonName}
                        </a>
                      </span>
                    ))}
                    {level.related.length > MAX_RELATED && (
                      <> +{level.related.length - MAX_RELATED} more</>
                    )}
                  </span>
                </div>
              )}
              {level.rank === "Species" && (
                <div className="ml-12 mt-0.5">
                  <span className="text-[0.625rem] text-stone-400 font-medium">
                    = {species.commonName}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Full scientific name */}
      <div className="mt-2 pt-2 border-t border-stone-200 text-center">
        <a
          href={inatUrl(species.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs italic text-stone-600 hover:underline hover:text-green-700 transition-colors"
        >
          {species.scientificName}
        </a>
        <span className="text-xs text-stone-400 ml-2">
          ({species.commonName})
        </span>
      </div>
    </div>
  );
}
