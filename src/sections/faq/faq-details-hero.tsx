import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

export function FAQDetailsHero() {
  return (
    <Box
      sx={{
        py: { xs: 5, md: 6 },
        px: 3,
        overflow: 'hidden',
        position: 'relative',
        ':before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 0,
          width: '100%',
          height: 280,
          background: 'url("/images/background/blue-linear-bg.svg") repeat-x center',
        },
      }}
    >
      <Container sx={{ maxWidth: '1280px !important', position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            textAlign: 'center',
            justifyContent: { xs: 'center', md: 'flex-start' },
          }}
        >
          <Typography
            fontWeight="fontWeightSemiBold"
            sx={{
              color: 'white',
              fontWeight: 600,
              fontSize: { xs: 30, md: 45 },
              mb: 2,
            }}
          >
            What types of loans do you offer?
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
