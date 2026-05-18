/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: '#0A1628',
        deepblue: '#264653',
        sunset: '#F4A261',
        paper: '#F5F1E8',
        complete: '#2A9D8F',
      },
      fontFamily: {
        ticket: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
