// tailwind.config.js
import { fontFamily } from "tailwindcss/defaultTheme";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        lumora: {
          primary: "#4F46E5", // Indigo
          accent: "#0EA5E9", // Sky Blue
          background: "#F8FAFC", // Light background
          surface: "#FFFFFF", // Card / component surface
          border: "#CBD5E1", // Subtle borders
          text: "#1E293B", // Main text (Slate-800)
          subtext: "#64748B", // Secondary text (Slate-500)
          success: "#10B981", // Emerald
          warning: "#F59E0B", // Amber
          danger: "#EF4444", // Rose
        },
      },
      fontFamily: {
        sans: ["Inter", ...fontFamily.sans],
        heading: ["Poppins", "Inter", ...fontFamily.sans],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
