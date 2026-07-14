import type { Theme, SxProps } from '@mui/material';

import React from 'react';

import { Box, Stack, Container, Typography } from '@mui/material';

export type HeroSectionProps = {
  imgUrl?: string;
  title?: string | React.ReactNode;
  description?: string;
  action?: React.ReactNode;
  caption?: string;
  bannerImgUrl?: string;
  slotProps?: {
    container?: SxProps<Theme>;
    title?: SxProps<Theme>;
    description?: SxProps<Theme>;
    action?: SxProps<Theme>;
    caption?: SxProps<Theme>;
    img?: SxProps<Theme>;
  };
  isDark?: boolean;
};

export function HeroBannerSection({
  imgUrl,
  title,
  description,
  action,
  caption,
  bannerImgUrl,
  slotProps,
  isDark = false,
}: HeroSectionProps) {
  return (
    <Box
      sx={{
        overflow: 'hidden',
        position: 'relative',
        ...slotProps?.img,
        ':before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 0,
          width: '100%',
          height: 520,
          background: 'url("/images/background/blue-linear-bg.svg") repeat-x center center',
        },
        pb: { xs: 5, md: 0 },
      }}
    >
      <Container sx={{ maxWidth: '1280px !important', position: 'relative', zIndex: 1 }}>
        <Stack
          direction="column"
          alignItems="center"
          justifyContent="center"
          sx={{
            textAlign: 'center',
            py: { xs: 5, md: 6.625 },
          }}
        >
          {title && (
            <Typography
              sx={{
                color: !isDark ? '#0B1E59' : 'white',
                fontWeight: 'bold',
                fontSize: { xs: 35, md: 50 },
                lineHeight: 'normal',
                mx: 'auto',
                ...slotProps?.title,
              }}
            >
              {title}
            </Typography>
          )}

          {description && (
            <Typography
              sx={{
                fontSize: { xs: 16, md: 18 },
                color: !isDark ? '#6B6C70' : 'white',
                mx: 'auto',
                mt: 1.875,
                ...slotProps?.description,
              }}
            >
              {description}
            </Typography>
          )}

          {action && <Box mt={2}>{action}</Box>}
          {caption && (
            <Typography variant="caption" sx={{ color: '#76777B', mt: 2 }}>
              {caption}
            </Typography>
          )}
        </Stack>
        {bannerImgUrl && (
          <Box
            component="img"
            src={bannerImgUrl}
            width={1}
            height={{ xs: 200, md: 400 }}
            sx={{ objectFit: 'cover' }}
          />
        )}
      </Container>
    </Box>
  );
}
