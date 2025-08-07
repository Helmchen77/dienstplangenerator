/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff8e6',
          100: '#ffefcc',
          500: '#ff8c00',
          600: '#e67e00',
          700: '#cc7000',
        },
        orange: {
          50: '#fff8e6',
          100: '#ffefcc',
          500: '#ff8c00',
          600: '#e67e00',
          700: '#cc7000',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
        }
      }
    },
  },
  plugins: [],
}