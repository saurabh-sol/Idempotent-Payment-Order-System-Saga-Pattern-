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
        brand: {
          DEFAULT: "#FF6B2C",
          light: "#FF8F5C",
          dark: "#E55A1F",
          glow: "rgba(255, 107, 44, 0.15)",
          muted: "rgba(255, 107, 44, 0.08)",
        },
        surface: {
          DEFAULT: "#ffffff",
          secondary: "#fafafa",
          tertiary: "#f5f5f5",
          card: "#ffffff",
          hover: "#fff7f3",
        },
        border: {
          DEFAULT: "#e5e7eb",
          subtle: "#f3f4f6",
          brand: "rgba(255, 107, 44, 0.3)",
        },
        text: {
          primary: "#1a1a1a",
          secondary: "#6b7280",
          muted: "#9ca3af",
          inverse: "#ffffff",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        float: "float 6s ease-in-out infinite",
        "float-delayed": "float 6s ease-in-out 2s infinite",
        "float-slow": "float 8s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        "bounce-subtle": "bounceSubtle 0.5s ease-out",
        typewriter: "typewriter 0.1s steps(1) forwards",
        blink: "blink 1s step-end infinite",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        bounceSubtle: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        typewriter: {
          "0%": { width: "0" },
          "100%": { width: "100%" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(255, 107, 44, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(255, 107, 44, 0.5)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "shimmer-gradient":
          "linear-gradient(90deg, transparent 0%, rgba(255,107,44,0.1) 50%, transparent 100%)",
      },
      boxShadow: {
        glow: "0 0 30px rgba(255, 107, 44, 0.2)",
        "glow-lg": "0 0 50px rgba(255, 107, 44, 0.3)",
        card: "0 4px 20px rgba(0, 0, 0, 0.05)",
        "card-hover": "0 8px 40px rgba(0, 0, 0, 0.1)",
        nav: "0 2px 20px rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
