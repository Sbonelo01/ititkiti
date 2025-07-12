/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-roboto)', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      colors: {
        'spotify-green': '#1DB954',
        'background': 'var(--background)',
        'foreground': 'var(--foreground)',
        'card-background': 'var(--card-background)',
        'text-light': 'var(--text-light)',
        'text-faded': 'var(--text-faded)',
        'input-background': 'var(--input-background)',
      },
      textColor: {
        'spotify-green': '#1DB954',
      },
    },
  },
  plugins: [],
} 