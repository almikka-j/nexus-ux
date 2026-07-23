'use client';

import { useState, cloneElement, isValidElement } from 'react';
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

import { adminNavData } from './config-nav-admin';
import { AdminHeaderActions } from './header';

// ----------------------------------------------------------------------

function isInsideSection(item: (typeof adminNavData)[number], pathname: string) {
  return !!item.children?.some((child) => pathname === child.path.split('?')[0]);
}

// Nav icons are sized 24px for the sidebar's own row — too large next to
// 14px text in this compact top-bar pill, so shrink them just for this view.
function NavIcon({ icon }: { icon: React.ReactNode }) {
  if (!isValidElement<{ width?: number }>(icon)) return icon;
  return cloneElement(icon, { width: 19 });
}

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
        height: 64,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        px: { xs: 2, md: 5 },
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        bgcolor: 'common.white',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <LogoFull width={132} height={32} />
      </Box>

      <Stack direction="row" spacing={0.75} sx={{ flex: 1, overflowX: 'auto' }}>
        {adminNavData.map((item) => {
          const hasChildren = !!item.children?.length;
          const active = !hasChildren && (pathname === item.path || pathname.startsWith(`${item.path}/`));
          const isSectionActive = hasChildren && isInsideSection(item, pathname);
          const isMenuOpen = openMenuTitle === item.title;

          const commonSx = {
            flexShrink: 0,
            height: 40,
            px: 2,
            borderRadius: '10px',
            color: '#5A6273',
            fontSize: 14,
            fontWeight: 600,
            gap: 1,
            transition: 'background-color 0.15s ease, color 0.15s ease',
            '&:hover': {
              bgcolor: '#F5F6FA',
            },
            ...(active && {
              bgcolor: '#EEF1FE',
              color: '#1C2A6E',
              fontWeight: 700,
              '&:hover': { bgcolor: '#EEF1FE' },
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
                <NavIcon icon={item.icon} />
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
              <NavIcon icon={item.icon} />
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
