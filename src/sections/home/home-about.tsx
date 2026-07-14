import { Box, Stack, Button, Container, Typography } from '@mui/material';

export function HomeAbout() {
  return (
    <Box
      pt={{ xs: 5, xl: 10 }}
      pb={{ xs: 10, md: 15 }}
      sx={{
        background: 'url(/images/background/wall-design.png) no-repeat center',
        backgroundSize: 'cover',
      }}
    >
      <Container sx={{ maxWidth: '1280px !important' }}>
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={{ xs: 0, lg: 8 }}
          alignItems={{ lg: 'center' }}
          textAlign={{ xs: 'center', lg: 'left' }}
          maxWidth={{ md: 500, lg: '100%' }}
          mx={{ md: 'auto', lg: 0 }}
        >
          <Box width={1}>
            <Typography
              fontSize={{ xs: 35, lg: 45 }}
              fontWeight={600}
              color="#0B1E59"
              lineHeight="normal"
              mb={{ xs: 3, lg: 0 }}
            >
              Prime Global Finance, the SME-focused financing company in the Philippines.
            </Typography>
          </Box>
          <Box width={1}>
            <Typography fontSize={{ xs: 14, lg: 16 }} color="#6B6C70" mb={4}>
              Established in 1997, PG Finance is a pioneering digital lending company dedicated to
              empowering small and medium-sized enterprises (SMEs) in the vibrant landscape of the
              Philippines. With an unwavering commitment to your success, we have evolved as a
              beacon of financial support, enabling businesses to flourish and achieve their true
              potential.
            </Typography>
            <Button
              href="/about-us"
              variant="contained"
              color="primary"
              sx={{ fontSize: { xs: 14, md: 16 }, fontWeight: 500, borderRadius: '4px', px: 2 }}
            >
              About Us
            </Button>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
