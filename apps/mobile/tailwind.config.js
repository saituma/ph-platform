/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx,js,jsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        app: "var(--color-text)",
        secondary: "var(--color-text-secondary)",
        muted: "var(--color-text-muted)",
        accent: "var(--color-accent)",
        "accent-light": "var(--color-accent-light)",
        input: "var(--color-bg-input)",
        card: "var(--color-card)",
        "card-elevated": "var(--color-card-elevated)",
        separator: "var(--color-separator)",
        background: "var(--color-bg)",
        "background-secondary": "var(--color-bg-secondary)",
        border: "var(--color-border)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
      },
      borderRadius: {
        'card': '20px',
        'card-lg': '28px',
        'button': '14px',
        'button-lg': '20px',
      },
      fontSize: {
        xs: ["0.75rem", "1.05rem"],
        sm: ["0.875rem", "1.25rem"],
        base: ["1rem", "1.45rem"],
        lg: ["1.125rem", "1.55rem"],
        xl: ["1.25rem", "1.65rem"],
        "2xl": ["1.5rem", "1.95rem"],
        "3xl": ["1.875rem", "2.3rem"],
        "4xl": ["2.25rem", "2.75rem"],
      },
      fontFamily: {
        // App typography semantics
        'display': ['Chillax-Bold'], // big hero / oversized emphasis
        'headline': ['Outfit-SemiBold'], // primary headlines and high-priority CTAs
        'cta': ['Outfit-SemiBold'], // button/action emphasis
        'section': ['Outfit-Medium'], // section headers and cards
        'body': ['Outfit-Regular'], // default readable body copy

        // Chillax (Display)
        'chillax-extralight': ['Chillax-Extralight'],
        'chillax-light': ['Chillax-Light'],
        'chillax': ['Chillax'],
        'chillax-medium': ['Chillax-Medium'],
        'chillax-semibold': ['Chillax-Semibold'],
        'chillax-bold': ['Chillax-Bold'],

        // Outfit (Body)
        'outfit-thin': ['Outfit-Thin'],
        'outfit-extralight': ['Outfit-ExtraLight'],
        'outfit-light': ['Outfit-Light'],
        'outfit': ['Outfit'],
        'outfit-medium': ['Outfit-Medium'],
        'outfit-semibold': ['Outfit-SemiBold'],
        'outfit-bold': ['Outfit-Bold'],
        'outfit-extrabold': ['Outfit-ExtraBold'],
        'outfit-black': ['Outfit-Black'],
      },
    },
  },
  plugins: [],
}
