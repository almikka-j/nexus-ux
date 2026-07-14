import Box from '@mui/material/Box';

// ----------------------------------------------------------------------

import type { ReactNode } from 'react';

interface FAQHeroProps {
  children: ReactNode;
}

export function FAQHero({ children }: FAQHeroProps) {
  return (
    <Box
      sx={{
        py: { xs: 5, md: 6 },
        px: 3,
        overflow: 'hidden',
        position: 'relative',
        height: { md: 280 },
        ':before': {
          content: '""',
          position: 'absolute',
          bottom: 0,
          left: 0,
          zIndex: 0,
          width: '100%',
          height: 1,
          background: 'url("/images/background/blue-linear-bg.svg") repeat-x center',
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          color: 'white',
          textAlign: 'center',
          maxWidth: 800,
          mx: 'auto',
          zIndex: 1,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
