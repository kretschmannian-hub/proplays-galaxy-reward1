"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

/**
 * Renders a Cloudflare Turnstile widget into the returned ref, if
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is configured. Returns null tokens (and a
 * null ref target that renders nothing) when it isn't — so the app works
 * fine without Turnstile configured, and picks it up automatically the
 * moment the env var is set, no code changes needed.
 */
export function useTurnstile() {
  const ref = useRef<HTMLDivElement>(null);
  const [token, setToken] = useState<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return;
    const scriptId = "cf-turnstile-script";

    function renderWidget() {
      if (ref.current && window.turnstile) {
        window.turnstile.render(ref.current, {
          sitekey: siteKey,
          theme: "dark",
          callback: (t: string) => setToken(t),
        });
      }
    }

    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      document.body.appendChild(script);
    } else {
      renderWidget();
    }
  }, [siteKey]);

  return { ref, token, enabled: !!siteKey };
}
