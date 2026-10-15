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
          600: 'rgb(var(--color-accent-600) / <alpha-value>)',
          500: 'rgb(var(--color-accent-500) / <alpha-value>)',
          400: 'rgb(var(--color-accent-400) / <alpha-value>)',
          300: 'rgb(var(--color-accent-300) / <alpha-value>)',
          foreground: 'rgb(var(--color-accent-foreground) / <alpha-value>)',
        },
        success: '#22c55e',
        danger: '#ef4444',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgb(var(--color-accent-500) / 0.16), 0 12px 40px rgba(0, 0, 0, 0.35)',
      },
    },
  },
  plugins: [],
};
