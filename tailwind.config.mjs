import typography from '@tailwindcss/typography';

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        // Page background and text adapt via CSS variables (see global.css).
        bg:      'rgb(var(--bg)      / <alpha-value>)',
        ink:     'rgb(var(--ink)     / <alpha-value>)',
        rule:    'rgb(var(--rule)    / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        muted:   'rgb(var(--muted)   / <alpha-value>)',
        // Brand accent — kept stable across both modes.
        primary: '#D7282F',
        accent:  '#D7282F', // alias retained for component back-compat
        button:  '#111111',
        myth:    '#F5B81D',
        cream:   '#F7F2E8',
      },
      fontFamily: {
        display: ['"Archivo Black"', 'Roboto', 'system-ui', 'sans-serif'],
        body:    ['"Source Serif 4"', 'Georgia', 'serif'],
        sans:    ['Roboto', 'system-ui', 'sans-serif'],
      },
      letterSpacing: { caps: '0.08em', tight: '-0.02em' },
      maxWidth: { content: '54rem' },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body':       theme('colors.ink'),
            '--tw-prose-headings':   theme('colors.ink'),
            '--tw-prose-links':      theme('colors.primary'),
            '--tw-prose-bold':       theme('colors.ink'),
            '--tw-prose-quotes':     theme('colors.ink'),
            fontFamily: theme('fontFamily.body').join(','),
            fontSize: '1.1875rem',
            lineHeight: '1.65',
            maxWidth: 'none',
            'h1, h2, h3, h4': {
              fontFamily: theme('fontFamily.display').join(','),
              letterSpacing: '-0.01em',
            },
            'a': { textDecoration: 'underline', textUnderlineOffset: '3px' },
            'a:hover': { color: '#A41C28' },
            'blockquote': { fontStyle: 'italic', borderLeftColor: theme('colors.primary') },
          },
        },
        invert: {
          css: {
            '--tw-prose-body':     '#EAEAEA',
            '--tw-prose-headings': '#EAEAEA',
            '--tw-prose-links':    '#FF5A66',
            '--tw-prose-bold':     '#EAEAEA',
            '--tw-prose-quotes':   '#EAEAEA',
          },
        },
      }),
    },
  },
  plugins: [typography],
};
