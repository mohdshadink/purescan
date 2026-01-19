import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                neon: "var(--primary)",
                "organic-dark": "#0C3B2E",
                "organic-sage": "#6D9773",
                "organic-earth": "#BB8A52",
                "organic-gold": "#FFBA00",
                "organic-light": "#F3F4F1",
            },
            fontFamily: {
                sans: ["var(--font-geist-sans)", "Arial", "sans-serif"],
                mono: ["var(--font-geist-mono)", "monospace"],
            },
            animation: {
                blob: "blob 7s infinite",
                scan: "scan 2s italic infinite",
                "pulse-glow": "pulse-glow 2s infinite",
            },
            keyframes: {
                blob: {
                    "0%": { transform: "translate(0px, 0px) scale(1)" },
                    "33%": { transform: "translate(30px, -50px) scale(1.1)" },
                    "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
                    "100%": { transform: "translate(0px, 0px) scale(1)" },
                },
                scan: {
                    "0%": { top: "0", opacity: "0" },
                    "10%": { opacity: "1" },
                    "90%": { opacity: "1" },
                    "100%": { top: "100%", opacity: "0" },
                },
                "pulse-glow": {
                    "0%, 100%": { boxShadow: "0 0 20px rgba(0, 255, 0, 0.2)" },
                    "50%": { boxShadow: "0 0 40px rgba(0, 255, 0, 0.4)" },
                },
            },
        },
    },
    plugins: [],
};
export default config;
