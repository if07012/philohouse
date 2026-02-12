// tailwind.config.js
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary-pink": "#ef476f",
        "dark-blue": "#26547c",
        "accent-yellow": "#ffd166",
      },
    },
  },
  plugins: [],
}