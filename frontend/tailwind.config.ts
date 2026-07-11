import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#000000",
          panel: "#0a0a0a",
          inset: "#111111",
          row: "#0d0d0d",
        },
        border: {
          DEFAULT: "#1a1a1a",
          subtle: "#141414",
        },
        text: {
          primary: "#fafafa",
          secondary: "#737373",
          muted: "#525252",
        },
        accent: {
          DEFAULT: "#ffffff",
          hover: "#e5e5e5",
          muted: "rgba(255, 255, 255, 0.06)",
        },
        success: "#4ade80",
        error: "#f87171",
        warning: "#fbbf24",
      },
      fontFamily: {
        sans: ["Poppins", "var(--font-poppins)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-out": { from: { opacity: "1" }, to: { opacity: "0" } },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(24px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-border": {
          "0%, 100%": { borderColor: "#1a1a1a" },
          "50%": { borderColor: "#404040" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "fade-out": "fade-out 100ms ease-in",
        "scale-in": "scale-in 200ms ease-out",
        "slide-up": "slide-up 400ms ease-out",
        "slide-in-right": "slide-in-right 200ms ease-out",
        "pulse-border": "pulse-border 2s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        "spin-slow": "spin-slow 3s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
