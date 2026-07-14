"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  z: number;
  r: number;
  twinklePhase: number;
}

/**
 * The signature visual element for Galaxy Rewards: a slow, ambient
 * starfield with faint constellation lines drawn between nearby stars,
 * and a subtle parallax response to mouse movement. Respects
 * prefers-reduced-motion by freezing on a single rendered frame.
 */
export function Starfield({ density = 140 }: { density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = (canvas.width = canvas.offsetWidth * devicePixelRatio);
    let height = (canvas.height = canvas.offsetHeight * devicePixelRatio);
    let stars: Star[] = [];
    let mouseX = 0;
    let mouseY = 0;
    let raf = 0;

    function initStars() {
      stars = Array.from({ length: density }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 0.8 + 0.2,
        r: Math.random() * 1.4 + 0.3,
        twinklePhase: Math.random() * Math.PI * 2,
      }));
    }

    function resize() {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth * devicePixelRatio;
      height = canvas.height = canvas.offsetHeight * devicePixelRatio;
      initStars();
    }

    function draw(t: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      const parallaxX = (mouseX - 0.5) * 30;
      const parallaxY = (mouseY - 0.5) * 30;

      for (const star of stars) {
        const twinkle = reduceMotion ? 0.8 : 0.55 + Math.sin(t / 900 + star.twinklePhase) * 0.45;
        const px = star.x + parallaxX * star.z;
        const py = star.y + parallaxY * star.z;

        ctx.beginPath();
        ctx.arc(px, py, star.r * devicePixelRatio, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(232, 233, 241, ${twinkle * star.z})`;
        ctx.fill();
      }

      // Constellation lines between nearby bright stars
      ctx.lineWidth = 1;
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const a = stars[i];
          const b = stars[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 110 * devicePixelRatio;
          if (dist < maxDist && a.z > 0.6 && b.z > 0.6) {
            const opacity = (1 - dist / maxDist) * 0.12;
            ctx.strokeStyle = `rgba(103, 232, 249, ${opacity})`;
            ctx.beginPath();
            ctx.moveTo(a.x + parallaxX * a.z, a.y + parallaxY * a.z);
            ctx.lineTo(b.x + parallaxX * b.z, b.y + parallaxY * b.z);
            ctx.stroke();
          }
        }
      }

      if (!reduceMotion) raf = requestAnimationFrame(draw);
    }

    function handleMouseMove(e: MouseEvent) {
      mouseX = e.clientX / window.innerWidth;
      mouseY = e.clientY / window.innerHeight;
    }

    initStars();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-80"
    />
  );
}
