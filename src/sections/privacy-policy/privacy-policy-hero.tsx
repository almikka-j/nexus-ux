import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { MotionContainer } from 'src/components/animate';

// ----------------------------------------------------------------------

export function PrivacyPolicyHero() {
  return (
    <Box
      sx={{
        height: { md: 237 },
        py: { xs: 5, md: 0 },
        overflow: 'hidden',
        position: 'relative',
        background:
          'url("/images/background/texture.png"), linear-gradient(to top, #F68B1F 0%, #595048 50%, #12355B 99%)',
        backgroundSize: 'auto, cover',
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
            fontWeight="fontWeightSemiBold"
            sx={{
              color: 'white',
              fontSize: { xs: 32, md: 55 },
            }}
          >
            Privacy Policy
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
