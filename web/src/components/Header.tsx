"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Learn" },
  { href: "/browse", label: "Browse" },
  { href: "/progress", label: "Progress" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="bg-green-800 text-white shadow-md">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl" role="img" aria-label="leaf">
            🌿
          </span>
          <h1 className="text-lg font-bold tracking-tight">
            Naturalist Nurturer
          </h1>
        </Link>
        <nav className="flex gap-1">
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
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === item.href
                  ? "bg-green-700 text-white"
                  : "text-green-100 hover:bg-green-700/50"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
