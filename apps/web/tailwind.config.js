/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        arbitrum: {
          blue: '#28a0f0',
          dark: '#1b2338',
        },
      },
    },
  },
  plugins: [],
}
