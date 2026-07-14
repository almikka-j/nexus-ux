import { Box, Link, Stack, Container, Typography } from '@mui/material';

export function HomeAccreditation() {
  const list: any = [
    {
      title: 'Securities and Exchange Commission (SEC)',
      image: '/images/organization/sec.png',
      link: 'https://www.sec.gov.ph/#gsc.tab=0',
    },
    {
      title: 'Philippine Finance Association (PFA)',
      image: '/images/organization/pfa.png',
    },
    {
      title: 'Credit Management Association of the Philippines (CMAP)',
      image: '/images/organization/cmap.png',
    },
    {
      title: 'Bankers Association of the Philippines (BAP)',
      image: '/images/organization/bap.png',
    },
    {
      title: 'CIBI Information, Inc.',
      image: '/images/organization/cibi.png',
    },
    {
      title: 'Credit Information Corporation (CIC)',
      image: '/images/organization/cic.png',
    },
  ];
  return (
    <Box py={{ xs: 10, md: 15, lg: 20 }}>
      <Container sx={{ maxWidth: '1280px !important' }}>
        <Box textAlign="center" mb={{ xs: 5, md: 10 }}>
          <Typography
            color="#0B1E59"
            fontSize={{ xs: 35, md: 45 }}
            fontWeight={600}
            lineHeight="normal"
            mb={1}
          >
            Accredited for Excellence
          </Typography>
          <Typography fontSize={{ xs: 14, md: 16 }} color="#6B6C70">
            Accredited by leading organizations, ensuring top-quality standards in every service we
            provide.
          </Typography>
        </Box>
        <Stack
          direction="row"
          alignItems="center"
          flexWrap="wrap"
          gap={2}
          justifyContent={{ xs: 'center', sm: 'space-between' }}
        >
          {list.map((item: any, index: number) => (
            <Box
              key={index}
              sx={{
                width: { xs: '30%', md: '15%', lg: '10%' },
                maxWidth: 200,
                minWidth: 100,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                p: 1,
              }}
            >
              {item.link ? (
                <Link
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="none"
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: 1,
                  }}
                >
                  <Box
                    component="img"
                    src={item.image}
                    alt={item.title}
                    sx={{
                      width: 1,
                      height: { xs: 150, md: 200 },
                      borderRadius: 2,
                      objectFit: 'contain',
                      mb: 1,
                      background: '#fff',
                    }}
                  />
                </Link>
              ) : (
                <Box
                  component="img"
                  src={item.image}
                  alt={item.title}
                  sx={{
                    width: 1,
                    height: { xs: 150, md: 200 },
                    borderRadius: 2,
                    objectFit: 'contain',
                    mb: 1,
                    background: '#fff',
                  }}
                />
              )}
            </Box>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}
