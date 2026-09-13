/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF8F3",
        panel: "#FFFFFF",
        ink: "#1B1F1C",
        pine: {
          DEFAULT: "#2F5D50",
          dark: "#15241F",
          light: "#E7EFEC",
        },
        gold: {
          DEFAULT: "#B8860B",
          light: "#F4E9CE",
        },
        line: "#E2DFD3",
        rust: "#B3452D",
      },
      fontFamily: {
        serif: ["Fraunces", "ui-serif", "Georgia", "serif"],
        sans: ["IBM Plex Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
