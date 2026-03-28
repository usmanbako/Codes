/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#0A84FF',
        'primary-dark': '#0066CC',
        accent: '#FF6B35',
        'accent-light': '#FF8C5A',
        crew: '#00C9A7',
        background: '#F8F9FA',
        card: '#FFFFFF',
        border: '#E5E7EB',
        'text-primary': '#111827',
        'text-secondary': '#6B7280',
        'text-muted': '#9CA3AF',
        verified: '#00C9A7',
        pending: '#F59E0B',
        rejected: '#EF4444',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
