"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import TextSizeToggle from "@/components/TextSizeToggle";

const NAV_ITEMS = [
  { href: "/", label: "Learn" },
  { href: "/browse", label: "Browse" },
  { href: "/progress", label: "Grow" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="bg-green-800 text-white shadow-md">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <span className="text-2xl" role="img" aria-label="leaf">
            🌿
          </span>
          {/* nn-header-title is hidden on narrow screens when a large text
              size is active (globals.css) — the leaf remains the home link. */}
          <h1 className="nn-header-title text-lg font-bold tracking-tight leading-tight">
            Naturalist Nurturer
          </h1>
        </Link>
        <nav className="flex items-center gap-1 shrink-0">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => {
                if (pathname === item.href) {
                  e.preventDefault();
                  router.push(item.href + "?t=" + Date.now());
                }
              }}
              className={`px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === item.href
                  ? "bg-green-700 text-white"
                  : "text-green-100 hover:bg-green-700/50"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <TextSizeToggle />
        </nav>
      </div>
    </header>
  );
}
