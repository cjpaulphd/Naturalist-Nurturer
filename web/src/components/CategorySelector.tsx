"use client";

import { Category } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";

interface CategorySelectorProps {
  selected: Category[];
  onChange: (categories: Category[]) => void;
  /** Optional map of category → count of new (unlearned) species */
  newCounts?: Record<Category, number>;
}

export default function CategorySelector({
  selected,
  onChange,
  newCounts,
}: CategorySelectorProps) {
  const isAll = selected.length === 0;

  const selectCategory = (cat: Category) => {
    if (selected.includes(cat)) {
      onChange([]); // deselect → back to All
    } else {
      onChange([cat]); // exclusive: only this one
    }
  };

  const selectAll = () => onChange([]);

  return (
    <div className="flex gap-2 flex-wrap justify-center">
      <button
        onClick={selectAll}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex-shrink-0 ${
          isAll
            ? "bg-green-700 text-white"
            : "bg-stone-200 text-stone-600 hover:bg-stone-300"
        }`}
      >
        All
      </button>
      {CATEGORIES.map((cat) => {
        const count = newCounts?.[cat.value];
        const isEmpty = count !== undefined && count === 0;
        return (
          <button
            key={cat.value}
            onClick={() => selectCategory(cat.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex-shrink-0 ${
              selected.includes(cat.value)
                ? isEmpty
                  ? "bg-stone-400 text-white"
                  : "bg-green-700 text-white"
                : isEmpty
                  ? "bg-stone-100 text-stone-400"
                  : "bg-stone-200 text-stone-600 hover:bg-stone-300"
            }`}
          >
            <span className="mr-1">{cat.icon}</span>
            {cat.label}
            {count !== undefined && (
              <span className="ml-1 text-xs opacity-75">({count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
