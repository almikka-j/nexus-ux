import { Box, Stack, Button, Container, Typography } from '@mui/material';

import { Image } from 'src/components/image';

export function HomeLoan() {
  const data = [
    {
      title: 'Personal Loan',
      description:
        'Fast, flexible funds for education, health, or major needs—secured by your property.',
      image: '/images/loan/personal-loan.png',
      link: '/personal-loan',
    },
    {
      title: 'Housing Loan',
      description: 'Build, buy, or renovate with competitive, property-backed financing.',
      image: '/images/loan/housing-loan.png',
      link: '/housing-loan',
    },

    {
      title: 'Business Loan',
      description: 'Secure funding for growth, equipment, or operations—built for entrepreneurs.',
      image: '/images/loan/business-loan.png',
      link: '/business-loan',
    },
    {
      title: 'Clubshare Loan',
      description: 'Club membership unlocks access to an exclusive loan benefit, reserved exclusively for members.',
      image: '/images/loan/clubshare1.png',
      link: '/clubshare-loan',
    },
    {
      title: 'Sangla Titulo',
      description:
        'An option that gives you a reliable funding with fast approval for your next move.',
      image: '/images/loan/property-sale.png',
      link: '/property-forsale',
    },
  ];
  return (
    <Box
      py={{ xs: 10, md: 15 }}
      sx={{
        background: 'url(/images/background/wall-design.png) no-repeat center',
        backgroundSize: 'cover',
      }}
    >
      <Container sx={{ maxWidth: '1280px !important' }}>
        <Box textAlign="center" maxWidth={945} mb={{ xs: 5, md: 10 }} mx="auto">
          <Typography
            color="#0B1E59"
            fontSize={{ xs: 35, md: 45 }}
            fontWeight={600}
            lineHeight="normal"
            mb={1}
          >
            Our Solutions To Move you forward
          </Typography>
          <Typography fontSize={{ xs: 14, md: 16 }} color="#6B6C70">
            Discover flexible, collateral-backed financing options designed to support your
            goals—whether personal, professional, or property-related.
          </Typography>
        </Box>
        <Stack direction="row" flexWrap="wrap" justifyContent="center">
          {data.map((item, index) => (
            <Box
              key={index}
              sx={{
                position: 'relative',
                width: {
                  xs: '100%',
                  sm: '50%',
                  md: '33.33%',
                  lg: '20%',
                },
                maxWidth: 240,
                mb: 2,
                px: { xs: 0, sm: 1 },
              }}
            >
              <Image
                alt={item.title}
                src={item.image}
                ratio="1/1"
                width={1}
                borderRadius="8px"
                sx={{ height: 328 }}
              />
              <Stack
                direction="column"
                sx={{
                  position: 'absolute',
                  width: 1,
                  height: 1,
                  left: 0,
                  top: 0,
                  textAlign: 'center',
                  p: 2,
                }}
              >
                <Box mb="auto">
                  <Typography
                    fontSize={24}
                    fontWeight={600}
                    lineHeight="normal"
                    color="white"
                    mb={0}
                  >
                    {item.title}
                  </Typography>
                  
                </Box>
                <Box>
                  <Typography fontSize={14} color="#12355B" lineHeight="normal" mb={2}>
                    {item.description}
                  </Typography>
                  <Button
                    fullWidth
                    href={item.link}
                    variant="contained"
                    sx={{
                      bgcolor: 'white',
                      color: '#0B1E59',
                      fontWeight: 500,
                      ':hover': {
                        bgcolor: 'white',
                        opacity: 0.6,
                      },
                    }}
                  >
                    Discover
                  </Button>
                </Box>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}
