import {
  Box,
  Button,
  Container,
  Typography,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';
import { LoanType } from 'src/components/loan-type';

// ----------------------------------------------------------------------

export function SanglaTituloHero() {
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
          <LoanType primary="SANGLA" secondary="TITULO" />
          <Typography variant="h2" sx={{ fontWeight: 'bold', lineHeight: 1, my: 1.5 }}>
           Make your 
            <br /> Resources Useful
          </Typography>
          <Typography variant="body1" sx={{ maxWidth: 460, mx: { xs: 'auto', md: 0 } }}>
           An option that gives you a reliable funding with fast approval for your next move
          </Typography>
            <Button
              component="a"
              href="https://account.pgfinance.com.ph/n_housing_loan"
              target="_blank"
              rel="noopener noreferrer"
              variant="text"
              sx={{
              mt: 3,
              color: 'white',
              px: 0,
              transition: 'padding 0.2s',
              ':hover': { px: 1 },
              }}
              startIcon={<Iconify icon="mdi:arrow-right" />}
            >
              Check your eligibility now
            </Button>
        </Box>
      </Container>
    </Box>
  );
}
