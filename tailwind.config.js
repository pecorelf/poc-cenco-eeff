/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Montserrat", "system-ui", "sans-serif"] },
      colors: {
        paper: "var(--paper)", panel: "var(--panel)", ink: "var(--ink)", ink2: "var(--ink-2)", ink3: "var(--ink-3)",
        rule: "var(--rule)", rule2: "var(--rule-2)", accent: "var(--accent)", accent2: "var(--accent-2)", accentSoft: "var(--accent-soft)", head: "var(--head)",
        ok: "var(--ok)", ko: "var(--ko)", warn: "var(--warn)", dd: "#86BC25"
      },
      borderRadius: { DEFAULT: "6px", sm: "4px", md: "6px", lg: "8px", xl: "12px", "2xl": "16px" },
      fontSize: { "2xs": ["10.5px", "14px"] }
    }
  },
  plugins: []
};
