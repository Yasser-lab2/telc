import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#01696F',
        accentDark: '#0C4E54',
        bg: '#F7F6F2',
        surface: '#F9F8F5',
        border: '#D4D1CA',
        text: '#28251D',
        muted: '#7A7974',
        ink: '#17222B',
        accentSoft: '#DCEFED',
        dark: '#08090C',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
