import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/config-global';

import { MotionContainer } from 'src/components/animate';

// ----------------------------------------------------------------------

export function ESGHero() {
  return (
    <Box
      sx={{
        height: { md: 380 },
        py: { xs: 10, md: 0 },
        overflow: 'hidden',
        position: 'relative',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundImage: `url(${CONFIG.site.basePath}/images/background/wall.png)`,
      }}
    >
      <Container component={MotionContainer}>
        <Box
          sx={{
            position: { md: 'absolute' },
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
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
            Building a Sustainable Future at PGFinance
          </Typography>

          {/* <m.div variants={varFade({ distance: 24 }).inUp}> */}
          <Typography variant="body1" sx={{ color: '#6B6C70', maxWidth: 700, mb: 2, mx: 'auto' }}>
            Discover PGFinance&apos;s ESG commitment: pioneering sustainability for a better future.
            Explore how we&apos;re building a sustainable tomorrow, one investment at a time.
          </Typography>
          {/* </m.div> */}
        </Box>
      </Container>
    </Box>
  );
}
