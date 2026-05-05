import typography from '@tailwindcss/typography';

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        accent: '#D62636',
        button: '#141413',
        myth: '#F5B81D',
        cream: '#F4ECDD',
        rule: 'rgb(var(--rule) / <alpha-value>)',
        muted: '#6B6B6B',
      },
      fontFamily: {
        display: ['Roboto', 'system-ui', 'sans-serif'],
        body: ['"Source Serif Pro"', 'Georgia', 'serif'],
      },
      letterSpacing: { caps: '0.08em', tight: '-0.02em' },
      maxWidth: { content: '54rem' },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.ink'),
            '--tw-prose-headings': theme('colors.ink'),
            '--tw-prose-links': '#D62636',
            '--tw-prose-bold': theme('colors.ink'),
            '--tw-prose-quotes': theme('colors.ink'),
            fontFamily: theme('fontFamily.body').join(','),
            fontSize: '1.1875rem',
            lineHeight: '1.65',
            maxWidth: 'none',
            'h1, h2, h3, h4': { fontFamily: theme('fontFamily.display').join(','), letterSpacing: '-0.01em' },
            'a': { textDecoration: 'underline', textUnderlineOffset: '3px' },
            'a:hover': { color: '#A41C28' },
            'blockquote': { fontStyle: 'italic', borderLeftColor: '#D62636' },
          },
        },
        invert: {
          css: {
            '--tw-prose-body': '#EAEAEA',
            '--tw-prose-headings': '#EAEAEA',
            '--tw-prose-links': '#FF5A66',
            '--tw-prose-bold': '#EAEAEA',
            '--tw-prose-quotes': '#EAEAEA',
          },
        },
      }),
    },
  },
  plugins: [typography],
};
