import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./dnd.config.{ts,tsx}", // so Tailwind sees classes used in Dnd config
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
