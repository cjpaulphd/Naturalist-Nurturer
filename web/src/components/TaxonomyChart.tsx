"use client";

import { Species } from "@/lib/types";

interface TaxonomyChartProps {
  species: Species;
  allSpecies: Species[];
}

export default function TaxonomyChart({ species, allSpecies }: TaxonomyChartProps) {
  // Find related species at each level for context
  const sameOrder = allSpecies.filter((s) => s.order === species.order && s.id !== species.id);
  const sameFamily = allSpecies.filter((s) => s.family === species.family && s.id !== species.id);
  const sameGenus = allSpecies.filter((s) => s.genus === species.genus && s.id !== species.id);

  // Parse genus and specific epithet from scientificName
  const [genus, ...epithetParts] = species.scientificName.split(" ");
  const epithet = epithetParts.join(" ");

  const levels = [
    {
      rank: "Order",
      value: species.order,
      related: sameOrder,
      color: "bg-purple-100 text-purple-800 border-purple-300",
      lineColor: "border-purple-300",
    },
    {
      rank: "Family",
      value: species.family,
      related: sameFamily,
      color: "bg-blue-100 text-blue-800 border-blue-300",
      lineColor: "border-blue-300",
    },
    {
      rank: "Genus",
      value: genus,
      related: sameGenus,
      color: "bg-teal-100 text-teal-800 border-teal-300",
      lineColor: "border-teal-300",
    },
    {
      rank: "Species",
      value: epithet,
      related: [],
      color: "bg-green-100 text-green-800 border-green-300",
      lineColor: "border-green-300",
    },
  ];

  return (
    <div className="bg-stone-50 rounded-lg p-3 border border-stone-200">
      <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
        Taxonomy
      </h4>
      <div className="space-y-0">
        {levels.map((level, i) => (
          <div key={level.rank} className="flex items-start">
            {/* Connector line */}
            <div className="flex flex-col items-center w-6 flex-shrink-0">
              {i > 0 && (
                <div className={`w-px h-2 ${level.lineColor} border-l-2 border-dashed`} />
              )}
              <div className={`w-3 h-3 rounded-full border-2 ${level.color} flex-shrink-0`} />
              {i < levels.length - 1 && (
                <div className={`w-px flex-1 min-h-[8px] ${levels[i + 1].lineColor} border-l-2 border-dashed`} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-2 ml-2">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-semibold uppercase text-stone-400 w-12">
                  {level.rank}
                </span>
                <span className={`text-sm font-medium ${level.rank === "Species" || level.rank === "Genus" ? "italic" : ""}`}>
                  {level.value}
                </span>
              </div>
              {/* Show common names of related species at this level */}
              {level.related.length > 0 && (
                <div className="ml-12 mt-0.5">
                  <span className="text-[10px] text-stone-400">
                    Also: {level.related.map((s) => s.commonName).join(", ")}
                  </span>
                </div>
              )}
              {level.rank === "Species" && (
                <div className="ml-12 mt-0.5">
                  <span className="text-[10px] text-stone-400 font-medium">
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
        <span className="text-xs italic text-stone-600">
          {species.scientificName}
        </span>
        <span className="text-xs text-stone-400 ml-2">
          ({species.commonName})
        </span>
      </div>
    </div>
  );
}
