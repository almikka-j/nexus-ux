'use client';

import { Box, Typography } from '@mui/material';

import { FAQHero } from '../faq-hero';
import { FAQList } from '../faq-list';

// ----------------------------------------------------------------------

export function FAQSearchResult() {
  return (
    <>
      <FAQHero>
        <Typography
          fontWeight="fontWeightSemiBold"
          sx={{
            fontSize: { xs: 25, md: 55 },
          }}
        >
          How can we help?
        </Typography>
      </FAQHero>

      <Box
        sx={{
          maxWidth: 746,
          width: 1,
          px: 2,
          py: { xs: 5, md: 6 },
          mx: 'auto',
        }}
      >
        <Typography fontSize={{ xs: 25, md: 35 }} fontWeight="bold" color="#0B1E59" mb={3}>
          Search Results for “[search]”
        </Typography>
        <FAQList />
      </Box>
    </>
  );
}
