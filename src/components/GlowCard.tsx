"use client";

import { useRef, type ReactNode } from "react";

export function GlowCard({
  children,
  className = "",
  as: Component = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: any;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  return (
    <Component
      ref={ref}
      onMouseMove={handleMouseMove}
      className={`group relative overflow-hidden rounded-3xl glass shadow-card transition-transform duration-300 hover:-translate-y-1 ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(500px circle at var(--mx, 50%) var(--my, 50%), rgba(108,92,231,0.13), transparent 65%)",
        }}
      />
      <div className="relative">{children}</div>
    </Component>
  );
}
