'use client';

import { Typography } from '@mui/material';
import Container from '@mui/material/Container';

import NewsList from '../news-list';
import { NewsHero } from '../news-hero';

// ----------------------------------------------------------------------

export function NewsView() {
  return (
    <>
      <NewsHero>
        <Typography
          fontWeight="bold"
          lineHeight="normal"
          fontSize={{ xs: 35, md: 50 }}
          color="#0B1E59"
          mb={2}
        >
          Kasangga Stories
        </Typography>
        <Typography fontSize={{ xs: 16, md: 18 }} color="#0B1E59" maxWidth={600} mx="auto">
          Practical lessons, insights, and success stories to empower you in your financial journey
        </Typography>
      </NewsHero>

      <Container sx={{ pb: 15, pt: 6, position: 'relative' }}>
        <NewsList />
      </Container>
    </>
  );
}
