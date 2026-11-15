import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { ink: "#0E1220", bone: "#E9E2D3", ash: "#8A8F9C", red: "#F04A2E" },
      fontFamily: {
        d: ["Big Shoulders Display", "Impact", "sans-serif"],
        s: ["Instrument Serif", "Georgia", "serif"],
        b: ["Instrument Sans", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
