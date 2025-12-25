import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Discord color palette
        "discord-dark": "#1E1F22",      // The server rail
        "discord-sidebar": "#2B2D31",   // The channel sidebar
        "discord-bg": "#313338",        // The main content
        "discord-item": "#3F4147",      // Hover states
        "discord-blurple": "#5865F2",   // Discord's signature blue-purple
        "discord-green": "#23A559",     // Online/success green
        "discord-text": "#DBDEE1",      // Primary text
        "discord-text-muted": "#949BA4", // Secondary/muted text
      },
    },
  },
  plugins: [],
};

export default config;
