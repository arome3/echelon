/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // CSS variable-based colors (for shadcn/ui compatibility)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // Echelon brand colors - Muted Sepia/Cream (sophisticated)
        primary: {
          50: "#fafaf7",
          100: "#f5f5f0",
          200: "#e8e8e0",
          300: "#d4d4c8",
          400: "#c0c0b0",
          500: "#a8a898",
          600: "#8a8a78",
          700: "#6e6e5c",
          800: "#525244",
          900: "#3a3a30",
          950: "#1f1f1a",
        },
        success: {
          50: "#f5f7f4",
          400: "#9aab8a",
          500: "#8a9a7a",
          600: "#6e7e5e",
        },
        danger: {
          50: "#faf5f5",
          400: "#c88080",
          500: "#b87070",
          600: "#a06060",
        },
        warning: {
          50: "#faf8f5",
          400: "#c9b070",
          500: "#b9a060",
          600: "#a08850",
        },
        // Dark mode premium colors - Deep slate/charcoal
        dark: {
          950: "#0a0f14",
          900: "#0f161d",
          800: "#151e28",
          700: "#1c2732",
          600: "#24313e",
        },
        // Surface colors for glass morphism
        surface: {
          50: "rgba(255, 255, 255, 0.02)",
          100: "rgba(255, 255, 255, 0.04)",
          200: "rgba(255, 255, 255, 0.06)",
          300: "rgba(255, 255, 255, 0.08)",
          400: "rgba(255, 255, 255, 0.12)",
        },
        // Accent colors - muted complementary tones
        accent: {
          cream: "#d4d4c4",
          warm: "#c9b896",
          sage: "#8a9a7a",
        },
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "Menlo", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        // Delegation flow animations
        "flow-down": "flowDown 1.5s ease-in-out infinite",
        "bounce-subtle": "bounceSubtle 2s ease-in-out infinite",
        "pulse-subtle": "pulseSubtle 2s ease-in-out infinite",
        "ping-slow": "pingSlow 2s cubic-bezier(0, 0, 0.2, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        // Animated flow down the connection lines
        flowDown: {
          "0%": { transform: "translateY(-100%)", opacity: "0" },
          "50%": { opacity: "1" },
          "100%": { transform: "translateY(100%)", opacity: "0" },
        },
        // Subtle bounce for arrows
        bounceSubtle: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(2px)" },
        },
        // Subtle pulse for labels
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
        // Slow ping for status indicator
        pingSlow: {
          "0%": { transform: "scale(1)", opacity: "1" },
          "75%, 100%": { transform: "scale(1.5)", opacity: "0" },
        },
      },
      boxShadow: {
        "glow-primary": "0 0 30px -10px rgba(212, 212, 196, 0.25)",
        "glow-cream": "0 0 30px -10px rgba(212, 212, 196, 0.25)",
        "glow-green": "0 0 30px -10px rgba(138, 154, 122, 0.3)",
        "glow-red": "0 0 30px -10px rgba(239, 68, 68, 0.3)",
        "glow-warm": "0 0 30px -10px rgba(201, 184, 150, 0.25)",
        "glass": "0 8px 32px rgba(0, 0, 0, 0.4)",
        "glass-lg": "0 16px 48px rgba(0, 0, 0, 0.5)",
      },
      backdropBlur: {
        xs: "2px",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
