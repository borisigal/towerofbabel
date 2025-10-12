import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        // Mobile: <640px (default)
        // Tablet: 640px - 1024px
        tablet: '640px',
        // Desktop: >1024px
        desktop: '1024px',
      },
    },
  },
  plugins: [],
};

export default config;
