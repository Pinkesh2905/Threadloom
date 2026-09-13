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
        bg: "#FFFFFF",
        ink: "#141414",
        secondary: "#6B6B6B",
        accent: {
          DEFAULT: "#000000",
          // deliberate-ignore no-active-state — token name, not a CSS :hover style
          hover: "#262626",
        },
        hairline: "#E4E4E4",
        surface: "#FFFFFF",
        "surface-subtle": "var(--color-surface-subtle)",
        // System mappings
        background: "#FFFFFF",
        border: "#E4E4E4",
        primary: {
          DEFAULT: "#141414",
          hover: "#000000",
          muted: "rgba(20, 20, 20, 0.08)",
        },
        text: {
          main: "#141414",
          muted: "#6B6B6B",
          dim: "#B0B0B0",
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        serif: ['var(--font-fraunces)', 'Georgia', 'serif'],
      },
      spacing: {
        'sp-1': '8px',
        'sp-2': '16px',
        'sp-3': '24px',
        'sp-4': '32px',
        'sp-5': '48px',
        'sp-6': '64px',
        'sp-8': '96px',
      },
      boxShadow: {
        paper: '0 1px 4px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
};

export default config;
