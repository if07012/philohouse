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
        "calm-teal": "#5B9EA0",
        "muted-navy": "#334E58",
        "soft-sand": "#F6E7D7",
        "calm-cream": "#F7FAF8",
      },
      boxShadow: {
        soft: '0 8px 24px rgba(51,78,88,0.08)'
      },
    },
  },
  plugins: [],
}