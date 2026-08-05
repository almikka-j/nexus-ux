'use client';

import { useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import ButtonBase from '@mui/material/ButtonBase';

import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { LogoFull } from 'src/components/logo/logo-full';

import {
  adminNavData,
  isAdminNavChildActive,
} from './config-nav-admin';
import { AdminHeaderActions } from './header';

// ----------------------------------------------------------------------

type AdminNavHorizontalProps = {
  displayName: string;
};

export function AdminNavHorizontal({ displayName }: AdminNavHorizontalProps) {
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
        height: 68,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        px: { xs: 2, md: 5 },
        bgcolor: 'common.white',
        boxShadow: '0 1px 0 #EBEDF3, 0 2px 12px rgba(20,23,42,0.03)',
        position: 'sticky',
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, mr: 1 }}>
        <LogoFull width={130} height={32} />
      </Box>

      <Stack direction="row" spacing={3} alignItems="center" sx={{ flex: 1, height: 1, overflowX: 'auto' }}>
        {adminNavData.map((item) => {
          const hasChildren = !!item.children?.length;
          const active =
            item.title !== 'Dashboard' &&
            !hasChildren &&
            (pathname === item.path || pathname.startsWith(`${item.path}/`));
          const isMenuOpen = openMenuTitle === item.title;

          const commonSx = {
            flexShrink: 0,
            height: 68,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 0.25,
            color: '#5A6273',
            fontSize: 14,
            fontWeight: 600,
            gap: 0.75,
            transition: 'color 0.15s ease',
            '&:hover': {
              color: '#1C2A6E',
            },
            ...((active || isMenuOpen) && {
              color: '#1C2A6E',
              fontWeight: 700,
            }),
          };

          if (hasChildren) {
            return (
              <ButtonBase
                key={item.title}
                onClick={(event) => handleOpenMenu(event, item.title)}
                sx={commonSx}
              >
                <Box component="span">{item.title}</Box>
                <Iconify
                  icon="eva:chevron-down-fill"
                  width={15}
                  sx={{
                    color: 'inherit',
                    opacity: 0.7,
                    transition: 'transform 0.15s ease',
                    transform: isMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </ButtonBase>
            );
          }

          return (
            <ButtonBase key={item.title} component={RouterLink} href={item.path!} sx={commonSx}>
              <Box component="span">{item.title}</Box>
            </ButtonBase>
          );
        })}
      </Stack>

      <Divider orientation="vertical" flexItem sx={{ my: 1.5, borderColor: '#EBEDF3' }} />

      <AdminHeaderActions displayName={displayName} />

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
              const childActive = isAdminNavChildActive(child, pathname, searchStep);

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
