import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { MotionContainer } from 'src/components/animate';

// ----------------------------------------------------------------------

export function NewsDetailsHero() {
  return (
    <Box
      sx={{
        py: 10,
        overflow: 'hidden',
        position: 'relative',
        background:
          'url("/images/background/texture.png"), linear-gradient(to top, #FFD400 0%, #F9A016 50%, #F68B1F 99%)',
        backgroundSize: 'auto, cover',
        backgroundRepeat: 'repeat, no-repeat',
        backgroundPosition: 'center, center',
        color: 'white',
      }}
    >
      <Container component={MotionContainer}>
        <Box
          sx={{
            textAlign: 'center',
            justifyContent: { xs: 'center', md: 'flex-start' },
          }}
        >
          <Typography
            fontWeight="fontWeightSemiBold"
            lineHeight="normal"
            fontSize={{ xs: 32, md: 55 }}
            mb={2}
          >
            PGFC and Philippine Guarantee Corporation partners for accessible housing loans
          </Typography>
          <Typography fontSize={{ xs: 14, md: 20 }} textTransform="uppercase">
            January 06, 2023
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
