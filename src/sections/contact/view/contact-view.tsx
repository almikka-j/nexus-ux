'use client';

import { Grid, Container } from '@mui/material';

import { ContactHero } from '../contact-hero';
import { ContactForm } from '../contact-form';
import { ContactDetails } from '../contact-details';

// ----------------------------------------------------------------------

export function ContactView() {
  return (
    <>
      <ContactHero />

      <Container sx={{ maxWidth: '1280px !important' }}>
        <Grid container py={{ xs: 5, md: 10 }} spacing={{ xs: 5, md: 10 }}>
          <Grid item xs={12} md={7}>
            <ContactForm />
          </Grid>

          <Grid item xs={12} md={5}>
            <ContactDetails />
          </Grid>
        </Grid>
      </Container>
    </>
  );
}
