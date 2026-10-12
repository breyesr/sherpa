import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        deep: "var(--deep)",
        "deep-2": "var(--deep-2)",
        lime: "var(--lime)",
        "dark-accent": "var(--dark-accent)",
        "accent-ink": "var(--accent-ink)",
        field: "var(--field)",
        utility: "var(--utility)",
        muted: "var(--muted)",
        slate: "var(--slate)",
        success: "var(--success)",
        warning: "var(--warning)",
        alert: "var(--alert)",
        ear: "var(--ear)",
        "ear-ink": "var(--ear-ink)",
        memory: "var(--memory)",
        "memory-ink": "var(--memory-ink)",
        brain: "var(--brain)",
        "brain-ink": "var(--brain-ink)",
        hands: "var(--hands)",
        "hands-ink": "var(--hands-ink)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      boxShadow: {
        "brand-subtle": "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        "brand-card": "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
        "brand-glow": "0 0 15px -3px var(--dark-accent)",
      },
    },
  },
  plugins: [],
};

export default config;
