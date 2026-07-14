import type { Theme, SxProps } from '@mui/material';

import React from 'react';

import { Box, Stack, Container, Typography } from '@mui/material';

import { CONFIG } from 'src/config-global';

export type HeroSectionProps = {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  caption?: string;
  slotProps?: {
    container?: SxProps<Theme>;
    title?: SxProps<Theme>;
    description?: SxProps<Theme>;
    action?: SxProps<Theme>;
    caption?: SxProps<Theme>;
    img?: SxProps<Theme>;
  };
};

export function HeroSection({ title, description, action, caption, slotProps }: HeroSectionProps) {
  return (
    <Box
      sx={{
        py: { xs: 8.125, md: 8.75 },
        overflow: 'hidden',
        position: 'relative',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundImage: `url(${CONFIG.site.basePath}/images/background/wall-design.png)`,
        ...slotProps?.img,
      }}
    >
      <Container sx={{ maxWidth: '1280px !important' }}>
        <Stack
          direction="column"
          alignItems="center"
          sx={{ textAlign: 'center', mx: 'auto', ...slotProps?.container }}
        >
          {title && (
            <Typography
              variant="h1"
              sx={{
                color: '#0B1E59',
                fontWeight: 600,
                fontSize: { xs: 32, md: 55 },
              }}
            >
              {title}
            </Typography>
          )}

          {/* <m.div variants={varFade({ distance: 24 }).inUp}> */}
          {description && (
            <Typography variant="body1" sx={{ color: '#6B6C70', maxWidth: 600, mt: 1.875 }}>
              {description}
            </Typography>
          )}
          {/* </m.div> */}
          {action && <Box mt={2}>{action}</Box>}
          {caption && (
            <Typography variant="caption" sx={{ color: '#76777B', maxWidth: 600, mt: 2 }}>
              {caption}
            </Typography>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
