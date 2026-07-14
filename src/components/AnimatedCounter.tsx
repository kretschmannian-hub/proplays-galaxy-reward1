"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

export function AnimatedCounter({ value, duration = 1.4 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setDisplay(value);
      return;
    }

    let raf: number;
    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  return (
    <motion.span ref={ref} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {display.toLocaleString()}
    </motion.span>
  );
}
