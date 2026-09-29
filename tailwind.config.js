/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Poppins", "system-ui", "sans-serif"] },
      colors: {
        paper: "var(--paper)", panel: "var(--panel)", ink: "var(--ink)", ink2: "var(--ink-2)", ink3: "var(--ink-3)",
        rule: "var(--rule)", rule2: "var(--rule-2)", accent: "var(--accent)", accent2: "var(--accent-2)", accentSoft: "var(--accent-soft)",
        ok: "var(--ok)", ko: "var(--ko)", warn: "var(--warn)", dd: "#86BC25"
      },
      borderRadius: { DEFAULT: "2px", sm: "2px", md: "3px", lg: "4px" },
      fontSize: { "2xs": ["10.5px", "14px"] }
    }
  },
  plugins: []
};
