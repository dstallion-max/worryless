import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

// Design tokens. Use these names in the UI, never raw colors.
//   brand  = Worryless purple (#5A2A8A at 700)
//   free   = free-to-spend green (500 = #10B981)
//   locked = locked/scheduled slate (800 = #1E293B)
//   warn   = nearing expiry
//   frozen = frozen/alert red (500 = #EF4444)
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F6EFFC",
          100: "#EBDDF7",
          200: "#D6BBEF",
          300: "#BE93E4",
          400: "#A06BD3",
          500: "#7F44B8",
          600: "#6A35A0",
          700: "#5A2A8A",
          800: "#46216C",
          900: "#331850",
        },
        free: colors.emerald,
        locked: colors.slate,
        warn: colors.amber,
        frozen: colors.red,
      },
    },
  },
  plugins: [],
};
export default config;
