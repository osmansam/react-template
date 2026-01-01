module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Modern neutral palette inspired by Linear/Vercel
        neutral: {
          50: "#fafafa",
          100: "#f5f5f5",
          150: "#ececec",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
          950: "#0a0a0a",
        },
        // Primary brand colors
        brand: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
        // Accent colors
        accent: {
          purple: "#8b5cf6",
          pink: "#ec4899",
          indigo: "#6366f1",
        },
        // Semantic colors
        success: {
          50: "#f0fdf4",
          100: "#dcfce7",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
        },
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
        },
        error: {
          50: "#fef2f2",
          100: "#fee2e2",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
        },
      },
      fontSize: {
        xs: [
          "0.6875rem",
          { lineHeight: "1rem", letterSpacing: "0.01em", fontWeight: "400" },
        ],
        sm: [
          "0.8125rem",
          {
            lineHeight: "1.25rem",
            letterSpacing: "-0.006em",
            fontWeight: "400",
          },
        ],
        base: [
          "0.9375rem",
          {
            lineHeight: "1.47059",
            letterSpacing: "-0.0084em",
            fontWeight: "400",
          },
        ],
        lg: [
          "1.0625rem",
          {
            lineHeight: "1.41176",
            letterSpacing: "-0.0122em",
            fontWeight: "400",
          },
        ],
        xl: [
          "1.1875rem",
          {
            lineHeight: "1.36842",
            letterSpacing: "-0.0142em",
            fontWeight: "400",
          },
        ],
        "2xl": [
          "1.5rem",
          {
            lineHeight: "1.33333",
            letterSpacing: "-0.016em",
            fontWeight: "600",
          },
        ],
        "3xl": [
          "1.875rem",
          { lineHeight: "1.2", letterSpacing: "-0.019em", fontWeight: "600" },
        ],
        "4xl": [
          "2.5rem",
          { lineHeight: "1.1", letterSpacing: "-0.022em", fontWeight: "600" },
        ],
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Helvetica Neue",
          "system-ui",
          "Arial",
          "sans-serif",
        ],
        display: [
          "Inter",
          "SF Pro Display",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        sm: "0.375rem",
        DEFAULT: "0.5rem",
        md: "0.625rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        sm: "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.03)",
        DEFAULT:
          "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.04)",
        md: "0 10px 15px -3px rgba(0, 0, 0, 0.06), 0 4px 6px -4px rgba(0, 0, 0, 0.05)",
        lg: "0 20px 25px -5px rgba(0, 0, 0, 0.06), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
        xl: "0 25px 50px -12px rgba(0, 0, 0, 0.1)",
        inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.04)",
        none: "none",
      },
      spacing: {
        4.5: "1.125rem",
        5.5: "1.375rem",
        13: "3.25rem",
        15: "3.75rem",
        18: "4.5rem",
      },
      transitionDuration: {
        400: "400ms",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
