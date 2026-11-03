/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        helm: {
          50: '#f0f7f6',
          100: '#d9ebe9',
          200: '#b3d6d3',
          300: '#7fb8b3',
          400: '#4a9690',
          500: '#026558',
          600: '#004b49',
          700: '#003d3b',
          800: '#002f2e',
          900: '#001f1e',
        },
        coral: {
          DEFAULT: '#ca805e',
          light: '#e08b64',
          dark: '#b36d4d',
        },
        gold: {
          DEFAULT: '#E19839',
          muted: '#cfaf5b',
        },
        canvas: '#F3F2ED',
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Montserrat', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        node: '0 1px 3px rgba(0, 75, 73, 0.08), 0 4px 12px rgba(0, 75, 73, 0.06)',
        panel: '0 8px 30px rgba(0, 31, 30, 0.08)',
      },
    },
  },
  plugins: [],
}
