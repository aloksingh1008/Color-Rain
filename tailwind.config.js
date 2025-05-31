/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // This line is crucial for React projects
    "./public/index.html",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}