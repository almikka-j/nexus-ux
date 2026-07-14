import React from 'react';

import { Box, Grid, useTheme, Container, Typography, useMediaQuery } from '@mui/material';

import { HomeCarousel } from './home-carousel';
import LoanCalculatorForm from './loan-calculator-form';

export function HomeHero() {
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'));

  return (
    <Box
      sx={{
        width: '100vw',
        minHeight: { lg: 721, xl: 960 },
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: { lg: 'visible' },
        position: 'relative',
        backgroundImage: 'url("/images/background/linear-bg.svg")',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        color: 'white',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: { xs: '100%', lg: '55%' },
          height: { xs: 1, lg: 721, xl: 960 },
          background: 'url("/images/background/texture.png")',
          backgroundSize: 'contain',
          backgroundRepeat: 'repeat',
          backgroundPosition: 'center',
        },
      }}
    >
      <Container
        maxWidth={false}
        sx={{
          maxWidth: '1280px',
          display: 'flex',
          position: 'relative',
        }}
      >
        <Grid container py={{ xs: 5, lg: 0 }}>
          <Grid
            item
            xs={12}
            lg={6}
            sx={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              overflow: { lg: 'visible' },
            }}
          >
            <Box
              sx={{
                textAlign: { xs: 'center', lg: 'left' },
                maxWidth: 480,
                mx: { sm: 'auto', lg: 0 },
                mb: { xs: 5, lg: 7 },
              }}
            >
              <Typography fontSize={{ xs: 35, lg: 60 }} fontWeight="bold" lineHeight={1} mb={2.5}>
                Kasangga Mo Sa Pag-Asenso
              </Typography>
              <Typography fontSize={{ lg: 18 }}>
                Empowering Filipino businesses and individuals with dependable financing since 1997.
              </Typography>
            </Box>

            <Box sx={{ mx: { xs: 'auto', lg: 0 } }}>
              <LoanCalculatorForm />
            </Box>
          </Grid>
        </Grid>
      </Container>
      {isLargeScreen && <HomeCarousel />}
    </Box>
  );
}
