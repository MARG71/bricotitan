import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#ff6a00',
          accent: '#0ea5e9',
          gray: '#f5f5f7',
          dark: '#1a1a1a',
        },
      },
    },
  },
  plugins: [],
}
export default config
