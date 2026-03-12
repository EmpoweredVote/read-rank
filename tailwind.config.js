/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // EV Color Palette
        'ev-black': '#1c1c1c',
        'ev-white': '#ffffff',
        'ev-coral': '#ff5740',
        'ev-muted-blue': '#00657c',
        'ev-light-blue': '#59b0c4',
        'ev-yellow': '#fed12e',
      },
      fontFamily: {
        'manrope': ['Manrope', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
      },
      animation: {
        'pulse-gentle': 'pulse 1200ms ease-in-out infinite',
      },
      backgroundImage: {
        'ev-gradient-top-match': 'linear-gradient(135deg, #ff5740 0%, #ff7a5c 100%)',
        'ev-gradient-mid-match': 'linear-gradient(135deg, #fed12e 0%, #ffed4e 100%)',
        'ev-gradient-low-match': 'linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}