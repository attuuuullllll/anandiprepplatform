/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: '#06070B',
          void: '#040407',
          card: '#0D0F17',
          elevated: '#131622',
          border: 'rgba(255, 255, 255, 0.08)',
          hover: '#181C2B',
        },
        coinbase: {
          blue: '#0052FF',
          hover: '#0045D8',
          glow: 'rgba(0, 82, 255, 0.35)',
          light: '#387BFF',
        },
        claude: {
          amber: '#F59E0B',
          terracotta: '#FF8C42',
          warm: '#E07A5F',
          clay: '#C25E38',
        },
        mint: {
          DEFAULT: '#00E599',
          glow: 'rgba(0, 229, 153, 0.3)',
        },
        ink: {
          pure: '#FFFFFF',
          primary: '#F3F4F8',
          secondary: '#9499AD',
          tertiary: '#5D647B',
          faint: '#3B4154',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'coinbase': '0 0 25px -4px rgba(0, 82, 255, 0.45)',
        'claude': '0 0 25px -4px rgba(245, 158, 11, 0.35)',
        'mint': '0 0 25px -4px rgba(0, 229, 153, 0.35)',
        'glass': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.08), 0 8px 32px 0 rgba(0, 0, 0, 0.4)',
      }
    },
  },
  plugins: [],
}
