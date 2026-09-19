import { createTheme, MantineColorsTuple } from '@mantine/core';

// Modern Royal Electric Blue Palette (like YowTrip & EcoJourney)
const royalBlue: MantineColorsTuple = [
  '#EFF6FF',
  '#DBEAFE',
  '#BFDBFE',
  '#93C5FD',
  '#60A5FA',
  '#2563EB', // Primary Brand Blue
  '#1D4ED8',
  '#1E40AF',
  '#1E3A8A',
  '#172554',
];

export const theme = createTheme({
  primaryColor: 'blue',
  primaryShade: 5,
  colors: {
    blue: royalBlue,
  },
  fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  headings: {
    fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontWeight: '700',
  },
  defaultRadius: 'md',
  cursorType: 'pointer',
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
        fw: 600,
      },
    },
    Paper: {
      defaultProps: {
        radius: 'lg',
      },
    },
    Card: {
      defaultProps: {
        radius: 'lg',
      },
    },
    Badge: {
      defaultProps: {
        radius: 'xl',
        fw: 600,
      },
    },
  },
});


