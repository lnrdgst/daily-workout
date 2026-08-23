/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          950: '#09090b',
          900: '#111115',
          800: '#18181f',
          700: '#23232d',
        },
        accent: {
          500: '#f97316',
          400: '#fb923c',
          300: '#fdba74',
        },
        success: '#22c55e',
        danger: '#ef4444',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(249, 115, 22, 0.16), 0 12px 40px rgba(0, 0, 0, 0.35)',
      },
    },
  },
  plugins: [],
};
