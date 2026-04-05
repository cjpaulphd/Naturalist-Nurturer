"use client";

import { useEffect, useState } from "react";

interface Leaf {
  id: number;
  left: number; // % from left
  delay: number; // animation delay in seconds
  duration: number; // fall duration in seconds
  size: number; // font size in rem
  swayAmount: number; // horizontal sway in px
}

function createLeaves(count: number): Leaf[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 4,
    size: 1 + Math.random() * 1.2,
    swayAmount: 20 + Math.random() * 40,
  }));
}

export default function FallingLeaves({ count = 20 }: { count?: number }) {
  const [leaves, setLeaves] = useState<Leaf[]>([]);

  useEffect(() => {
    // Check for prefers-reduced-motion
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    setLeaves(createLeaves(count));
  }, [count]);

  if (leaves.length === 0) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-50"
      aria-hidden="true"
    >
      {leaves.map((leaf) => (
        <span
          key={leaf.id}
          className="absolute animate-leaf-fall"
          style={{
            left: `${leaf.left}%`,
            top: "-2rem",
            fontSize: `${leaf.size}rem`,
            animationDelay: `${leaf.delay}s`,
            animationDuration: `${leaf.duration}s`,
            "--sway": `${leaf.swayAmount}px`,
          } as React.CSSProperties}
        >
          🌿
        </span>
      ))}
    </div>
  );
}
