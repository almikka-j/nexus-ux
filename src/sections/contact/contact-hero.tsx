import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { MotionContainer } from 'src/components/animate';

export function ContactHero() {
  return (
    <Box
      sx={{
        height: { md: 300 },
        py: { xs: 5, md: 0 },
        overflow: 'hidden',
        position: 'relative',
        background:
          'url("/images/background/texture.png"), linear-gradient(to top, #FFFCDF 0%, #84E3DB 50%, #52D9D9 99%)',
        backgroundSize: 'contain, cover',
        backgroundRepeat: 'repeat, no-repeat',
        backgroundPosition: 'center, center',
      }}
    >
      <Container component={MotionContainer}>
        <Box
          sx={{
            position: { md: 'absolute' },
            top: { md: '50%' },
            left: { md: '50%' },
            transform: { md: 'translate(-50%, -50%)' },
            textAlign: 'center',
            justifyContent: { xs: 'center', md: 'flex-start' },
          }}
        >
          <Typography
            variant="h1"
            sx={{
              color: '#0B1E59',
              fontWeight: 600,
              fontSize: { xs: 32, md: 55 },
              mb: 2,
            }}
          >
            We&rsquo;re Here To Help
          </Typography>

          <Typography fontSize={{ xs: 14, md: 16 }} sx={{ color: '#0B1E59', maxWidth: 600, mb: 2 }}>
            Whether it&apos;s a question or a loan inquiry, our team is ready to assist you
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
