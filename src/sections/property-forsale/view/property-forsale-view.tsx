'use client';

import {
  Box,
  Card,
  Grid,
  Stack,
  Button,
  Container,
  Typography,
  ButtonBase,
  CardHeader,
} from '@mui/material';

import { useBoolean } from 'src/hooks/use-boolean';

import { Iconify } from 'src/components/iconify';

import { ListingDialog } from '../listing-dialog';
import { PropertyForsaleHero } from '../property-forsale-hero';
import { PropertyForsaleForm } from '../property-forsale-form';

// ----------------------------------------------------------------------

export function PropertyForsaleView() {
  const confirm = useBoolean();

  return (
    <>
      <PropertyForsaleHero />

      <Container sx={{ maxWidth: '1280px !important' }}>
        <Grid container py={10} spacing={10}>
          <Grid item xs={12} md={8}>
            <PropertyForsaleForm />
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: '#F5F5F5', borderRadius: '8px', boxShadow: 'none', mb: 3 }}>
              <CardHeader
                title="Available Properties"
                sx={{ fontSize: 25, color: '#0B1E59', px: 4, pt: 5 }}
              />
              <Box sx={{ px: 4, pt: 2, pb: 5 }}>
                <Typography variant="body1" color="#6B6C70" mb={2}>
                  Complete list of Foreclosed Properties as of December 31, 2023.
                </Typography>

                <ButtonBase
                  sx={{
                    backgroundColor: '#E9EBF5',
                    color: '#233997',
                    borderRadius: '16px',
                    fontSize: 16,
                    fontWeight: 600,
                    py: 0.5,
                    px: 2,
                  }}
                  onClick={() => confirm.onTrue()}
                >
                  See Property Listing
                </ButtonBase>
              </Box>
            </Card>

            <Card sx={{ bgcolor: '#F5F5F5', borderRadius: '8px', boxShadow: 'none' }}>
              <CardHeader title="About" sx={{ fontSize: 25, color: '#0B1E59', px: 4, pt: 5 }} />

              <Stack spacing={2} sx={{ px: 4, pt: 2, pb: 5 }}>
                <Stack direction="row" sx={{ typography: 'body1', color: '#6B6C70' }}>
                  <Iconify
                    icon="fluent:mail-24-filled"
                    color="#0B1E59"
                    width={16}
                    sx={{ mr: 1.5, mt: 0.5 }}
                  />
                  support@pgfinance.com.ph
                </Stack>

                <Stack direction="row" sx={{ typography: 'body1', color: '#6B6C70' }}>
                  <Iconify
                    icon="solar:phone-bold"
                    color="#0B1E59"
                    width={16}
                    sx={{ mr: 1.5, mt: 0.5 }}
                  />
                  (0908) 816-2318, (0919) 088-2494, (0919) 497-8911, (0939) 088-2494
                </Stack>

                <Stack direction="row" sx={{ typography: 'body1', color: '#6B6C70' }}>
                  <Iconify
                    icon="mingcute:location-fill"
                    color="#0B1E59"
                    width={16}
                    sx={{ mr: 1.5, mt: 0.5 }}
                  />
                  8th floor, The Currency Tower, F. Ortigas Jr. Road cor Dona Julia Vargas Ave,
                  Ortigas Center Pasig City, Philippines 1600
                </Stack>
              </Stack>
            </Card>
          </Grid>
        </Grid>
        <ListingDialog
          open={confirm.value}
          onClose={confirm.onFalse}
          title="Delete"
          content="Are you sure want to delete?"
          action={
            <Button variant="contained" color="error" onClick={() => confirm.onFalse()}>
              Delete
            </Button>
          }
        />
      </Container>
    </>
  );
}
