"use client";

import { useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { motion } from "framer-motion";

interface MagneticButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "gold" | "ghost";
}

export function MagneticButton({ children, variant = "primary", className = "", ...props }: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  function handleMouseMove(e: React.MouseEvent<HTMLButtonElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setPos({ x: x * 0.25, y: y * 0.25 });
  }

  function handleMouseLeave() {
    setPos({ x: 0, y: 0 });
  }

  const variants = {
    primary: "bg-nova-gradient text-white shadow-glow hover:shadow-[0_0_60px_-8px_rgba(108,92,231,0.75)]",
    gold: "bg-gold-gradient text-[#1a1400] shadow-glow-gold hover:shadow-[0_0_60px_-8px_rgba(245,166,35,0.75)]",
    ghost: "glass text-ink hover:bg-white/[0.08]",
  };

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: "spring", stiffness: 150, damping: 12, mass: 0.4 }}
      className={`relative inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-4 font-display font-semibold text-base transition-shadow duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...(props as any)}
    >
      {children}
    </motion.button>
  );
}
