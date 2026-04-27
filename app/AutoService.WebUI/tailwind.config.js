/**
 * Tailwind CSS v4 config.
 *
 * Design tokens (colors, etc.) are defined in src/index.css via @theme.
 * Dark mode variant is declared there too via @custom-variant.
 * This file only needs to specify template paths for content scanning.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  plugins: [],
}
