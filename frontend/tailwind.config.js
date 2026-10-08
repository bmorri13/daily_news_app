/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    // Modular type scale (1.25 ratio). Replaces Tailwind's defaults so ad-hoc
    // sizes can't creep back in; nothing goes below 12px.
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.375rem' }],
      base: ['1rem', { lineHeight: '1.6rem' }],
      lg: ['1.25rem', { lineHeight: '1.75rem' }],
      xl: ['1.5625rem', { lineHeight: '2rem' }],
      '2xl': ['1.953rem', { lineHeight: '2.375rem' }],
      '3xl': ['2.441rem', { lineHeight: '2.75rem' }],
      '4xl': ['3.052rem', { lineHeight: '3.25rem' }],
    },
    extend: {
      // All colors resolve to the OKLCH tokens in app/globals.css
      colors: {
        canvas: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          raised: 'var(--surface-raised)',
        },
        line: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
        },
        fg: {
          DEFAULT: 'var(--fg)',
          muted: 'var(--fg-muted)',
          subtle: 'var(--fg-subtle)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          fg: 'var(--accent-fg)',
        },
        positive: 'var(--positive)',
        negative: 'var(--negative)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms cubic-bezier(0.25, 1, 0.5, 1)',
        'pop-in': 'pop-in 220ms cubic-bezier(0.25, 1, 0.5, 1)',
      },
    },
  },
  plugins: [],
};
