/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        purple: {
          700: '#6b21a8',
          800: '#5b21b6',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
} 