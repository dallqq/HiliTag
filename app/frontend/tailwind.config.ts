import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        lora: ["var(--font-lora)", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        paper: {
          DEFAULT: "#faf8f5",
          warm: "#f3efe8",
          mid: "#ece7de",
        },
        accent: {
          DEFAULT: "#8B4513",
          light: "#f5ece3",
          mid: "#c8854a",
          dark: "#723610",
        },
        ink: {
          DEFAULT: "#1a1714",
          muted: "#6b6560",
          faint: "#b0aaa4",
        },
        border: {
          light: "rgba(139,69,19,0.15)",
          mid: "rgba(139,69,19,0.25)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
