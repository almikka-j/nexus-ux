import Box from '@mui/material/Box';
import Link from '@mui/material/Link';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { LogoFull } from 'src/components/logo/logo-full';

// ----------------------------------------------------------------------

export function Section() {
  return (
    <Box
      sx={{
        width: 1,
        height: 1,
        display: { xs: 'none', md: 'flex' },
        position: 'relative',
        px: 6,
        py: 8,
        alignItems: 'flex-end',
        justifyContent: 'center',
        backgroundImage: 'url(/images/background/blue-wall.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Link component={RouterLink} href={paths.root}>
        <LogoFull width={189} height={49} />
      </Link>
    </Box>
  );
}
