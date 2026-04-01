"use client";

import { Category } from "@/lib/types";

interface CategorySelectorProps {
  selected: Category[];
  onChange: (categories: Category[]) => void;
}

const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: "tree", label: "Trees", icon: "🌲" },
  { value: "plant", label: "Plants", icon: "🌸" },
  { value: "bird", label: "Birds", icon: "🐦" },
];

export default function CategorySelector({
  selected,
  onChange,
}: CategorySelectorProps) {
  const isAll = selected.length === 0;

  const toggleCategory = (cat: Category) => {
    if (selected.includes(cat)) {
      onChange(selected.filter((c) => c !== cat));
    } else {
      onChange([...selected, cat]);
    }
  };

  const selectAll = () => onChange([]);

  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={selectAll}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          isAll
            ? "bg-green-700 text-white"
            : "bg-stone-200 text-stone-600 hover:bg-stone-300"
        }`}
      >
        All
      </button>
      {CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          onClick={() => toggleCategory(cat.value)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selected.includes(cat.value)
              ? "bg-green-700 text-white"
              : "bg-stone-200 text-stone-600 hover:bg-stone-300"
          }`}
        >
          <span className="mr-1">{cat.icon}</span>
          {cat.label}
        </button>
      ))}
    </div>
  );
}
