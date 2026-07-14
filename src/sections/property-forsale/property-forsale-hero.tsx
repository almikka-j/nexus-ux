import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { LoanType } from 'src/components/loan-type';

// ----------------------------------------------------------------------

export function PropertyForsaleHero() {
  return (
    <Box
      sx={{
        height: { md: 497 },
        backgroundImage: {
          xs: 'url("/images/background/blue.jpg")',
          md: 'url("/images/loan/property-forsale-banner.png") ',
        },
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        color: 'white',
        py: { xs: 5, md: 0 },
      }}
    >
      <Container sx={{ maxWidth: '1280px !important' }}>
        <Box textAlign={{ xs: 'center', md: 'left' }} pl={{ md: 10 }}>
          <LoanType primary="PROPERTY" secondary="FOR SALE" />
          <Typography variant="h2" sx={{ fontWeight: 'bold', lineHeight: 1, my: 1.5 }}>
            Find Space for Your
            <br /> Next Chapter
          </Typography>
          <Typography variant="body1" sx={{ maxWidth: 460, mx: { xs: 'auto', md: 0 } }}>
            Explore affordable listings &mdash; from homes to investments &mdash; and take the next
            step toward owndership or growth.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
