import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        void: "#07080D",
        surface: "#12141C",
        surface2: "#181B26",
        border: "rgba(255,255,255,0.08)",
        glass: "rgba(255,255,255,0.045)",
        ink: "#E8E9F1",
        muted: "#888C9C",
        nova: {
          400: "#8B7CF6",
          500: "#6C5CE7",
          600: "#5645C9",
        },
        cyan: {
          300: "#67E8F9",
          400: "#22D3EE",
        },
        gold: {
          300: "#FFD98A",
          400: "#FFC65C",
          500: "#F5A623",
        },
        danger: "#FF5C7A",
        success: "#4ADE80",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "nova-gradient": "linear-gradient(135deg, #6C5CE7 0%, #22D3EE 100%)",
        "gold-gradient": "linear-gradient(135deg, #FFD98A 0%, #F5A623 100%)",
        "radial-fade": "radial-gradient(circle at center, var(--tw-gradient-stops))",
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(108,92,231,0.55)",
        "glow-cyan": "0 0 40px -10px rgba(34,211,238,0.5)",
        "glow-gold": "0 0 40px -10px rgba(245,166,35,0.5)",
        card: "0 8px 30px rgba(0,0,0,0.35)",
      },
      keyframes: {
        float: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "gradient-x": {
          "0%,100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "gradient-x": "gradient-x 8s ease infinite",
        shimmer: "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
