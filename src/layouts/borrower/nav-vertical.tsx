'use client';

import { usePathname } from 'next/navigation';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ListItemButton from '@mui/material/ListItemButton';

import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { LogoFull } from 'src/components/logo/logo-full';

import { borrowerNavData } from './config-nav-borrower';

// ----------------------------------------------------------------------

const NAV_WIDTH = 280;

export function BorrowerNav() {
  const pathname = usePathname();

  return (
    <Box
      component="nav"
      sx={{
        width: NAV_WIDTH,
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: (theme) => `1px solid ${theme.palette.divider}`,
        bgcolor: 'common.white',
        px: 2,
        py: 3,
      }}
    >
      <Box sx={{ px: 1.5, mb: 3 }}>
        <LogoFull width={148} height={36} />
      </Box>

      <Stack spacing={0.5}>
        {borrowerNavData.map((item) => {
          const active = !!item.path && pathname === item.path;

          return (
            <ListItemButton
              key={item.title}
              disabled={!item.path}
              {...(item.path && { component: RouterLink, href: item.path })}
              sx={{
                flex: '0 0 auto',
                minHeight: 44,
                borderRadius: '10px',
                color: '#5A6273',
                fontSize: 14,
                fontWeight: 600,
                gap: 1.5,
                ...(active && {
                  bgcolor: '#EEF1FE',
                  color: '#1C2A6E',
                  fontWeight: 700,
                }),
              }}
            >
              {item.icon}
              {item.title}
            </ListItemButton>
          );
        })}
      </Stack>

      <Box sx={{ flex: 1 }} />

      <Box
        sx={{
          p: 2,
          borderRadius: '13px',
          background: 'linear-gradient(160deg, #1C2A6E, #141F52)',
          color: 'common.white',
        }}
      >
        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Need help?</Typography>
        <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.72)', mt: 0.5, mb: 1.5, lineHeight: 1.5 }}>
          Our team is here for you.
        </Typography>
        <Box
          sx={{
            fontSize: 11.5,
            fontWeight: 600,
            color: 'common.white',
            bgcolor: 'rgba(255,255,255,0.14)',
            borderRadius: '8px',
            py: 1,
            textAlign: 'center',
            cursor: 'pointer',
          }}
        >
          Contact support
        </Box>
      </Box>
    </Box>
  );
}
