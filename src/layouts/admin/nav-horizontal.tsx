'use client';

import { useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import ButtonBase from '@mui/material/ButtonBase';

import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { LogoFull } from 'src/components/logo/logo-full';

import { adminNavData } from './config-nav-admin';

// ----------------------------------------------------------------------

function isInsideSection(item: (typeof adminNavData)[number], pathname: string) {
  return !!item.children?.some((child) => pathname === child.path.split('?')[0]);
}

export function AdminNavHorizontal() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchStep = searchParams.get('step');

  const [openMenuTitle, setOpenMenuTitle] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, title: string) => {
    setAnchorEl(event.currentTarget);
    setOpenMenuTitle(title);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setOpenMenuTitle(null);
  };

  return (
    <Box
      component="nav"
      sx={{
        height: 64,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        px: { xs: 2, md: 5 },
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        bgcolor: 'common.white',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <LogoFull width={132} height={32} />
      </Box>

      <Stack direction="row" spacing={0.5} sx={{ flex: 1, overflowX: 'auto' }}>
        {adminNavData.map((item) => {
          const hasChildren = !!item.children?.length;
          const active = !hasChildren && (pathname === item.path || pathname.startsWith(`${item.path}/`));
          const isSectionActive = hasChildren && isInsideSection(item, pathname);
          const isMenuOpen = openMenuTitle === item.title;

          const commonSx = {
            flexShrink: 0,
            height: 40,
            px: 1.75,
            borderRadius: '10px',
            color: '#5A6273',
            fontSize: 14,
            fontWeight: 600,
            gap: 1,
            ...(active && {
              bgcolor: '#EEF1FE',
              color: '#1C2A6E',
              fontWeight: 700,
            }),
            ...(isSectionActive && {
              color: '#1C2A6E',
              fontWeight: 700,
              ...(isMenuOpen && { bgcolor: '#EEF1FE' }),
            }),
          };

          if (hasChildren) {
            return (
              <ButtonBase
                key={item.title}
                onClick={(event) => handleOpenMenu(event, item.title)}
                sx={commonSx}
              >
                {item.icon}
                <Box component="span">{item.title}</Box>
                <Iconify
                  icon="eva:chevron-down-fill"
                  width={16}
                  sx={{
                    color: 'inherit',
                    transition: 'transform 0.15s ease',
                    transform: isMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </ButtonBase>
            );
          }

          return (
            <ButtonBase key={item.title} component={RouterLink} href={item.path!} sx={commonSx}>
              {item.icon}
              <Box component="span">{item.title}</Box>
            </ButtonBase>
          );
        })}
      </Stack>

      {adminNavData.map((item) => {
        if (!item.children?.length) return null;

        return (
          <Menu
            key={item.title}
            anchorEl={anchorEl}
            open={openMenuTitle === item.title}
            onClose={handleCloseMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            {item.children.map((child) => {
              const childPathWithoutQuery = child.path.split('?')[0];
              const childActive =
                child.step === null
                  ? pathname === childPathWithoutQuery
                  : pathname === childPathWithoutQuery &&
                    (child.step === 'creditChecking' ? !searchStep : searchStep === child.step);

              return (
                <MenuItem
                  key={child.title}
                  component={RouterLink}
                  href={child.path}
                  onClick={handleCloseMenu}
                  sx={{
                    fontSize: 13.5,
                    fontWeight: 500,
                    color: '#5A6273',
                    minWidth: 200,
                    ...(childActive && {
                      bgcolor: '#EEF1FE',
                      color: '#1C2A6E',
                      fontWeight: 700,
                    }),
                  }}
                >
                  {child.title}
                </MenuItem>
              );
            })}
          </Menu>
        );
      })}
    </Box>
  );
}
