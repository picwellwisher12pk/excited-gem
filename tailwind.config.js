/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: 'jit',
  darkMode: 'class',
  content: [
    './src/**/*.{ts,tsx}',
    './tabs/**/*.{ts,tsx}',
    './contents/**/*.{ts,tsx}',
    './popup/**/*.{ts,tsx}',
    './options/**/*.{ts,tsx}'
  ],
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ]
}
