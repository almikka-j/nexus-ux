'use client';

import Container from '@mui/material/Container';
import { Grid, Typography } from '@mui/material';

import { ContactDetails } from 'src/sections/contact/contact-details';

import { FAQHero } from '../faq-hero';
import { FAQList } from '../faq-list';
// ----------------------------------------------------------------------

export function FAQView() {
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
        <Typography fontSize={{ xs: 14, sm: 16, md: 18 }}>
          Got questions? Explore our FAQs for quick insights on loans, applications, and repayments.
          Find everything you need to make informed decisions.
        </Typography>
        {/* <TextField
          fullWidth
          placeholder="Find Help..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            mt: 2.5,
            [`& .${outlinedInputClasses.root}`]: { bgcolor: 'common.white' },
            [`& .${outlinedInputClasses.input}`]: { typography: 'subtitle1' },
          }}
        /> */}
      </FAQHero>

      <Container sx={{ pb: 15, pt: 6, position: 'relative' }}>
        <Grid container spacing={5}>
          <Grid item xs={12} md={5}>
            <ContactDetails />
          </Grid>
          <Grid item xs={12} md={7}>
            <FAQList />
          </Grid>
        </Grid>
      </Container>
    </>
  );
}
