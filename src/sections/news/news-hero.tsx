import Box from '@mui/material/Box';

// ----------------------------------------------------------------------

import type { ReactNode } from 'react';

interface FAQHeroProps {
  children: ReactNode;
}

export function NewsHero({ children }: FAQHeroProps) {
  return (
    <Box
      sx={{
        py: 10,
        px: 2,
        overflow: 'hidden',
        position: 'relative',
        background:
          'url("/images/background/texture.png"), linear-gradient(to top, #00B1FF 0%, #2DC7EA 32%, #ECF8DE 88%)',
        backgroundSize: 'auto, cover',
        backgroundRepeat: 'repeat, no-repeat',
        backgroundPosition: 'center, center',
        color: 'white',
      }}
    >
      <Box
        sx={{
          textAlign: 'center',
          maxWidth: 800,
          mx: 'auto',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
