'use client';

import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';
import ListItemButton from '@mui/material/ListItemButton';

import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { LogoFull } from 'src/components/logo/logo-full';

import { adminNavData } from './config-nav-admin';

// ----------------------------------------------------------------------

const NAV_WIDTH = 280;

// Which of an item's children (if any) matches the current URL — used to
// decide whether a given expandable section should be treated as "active"
// (auto-expanded, label highlighted).
function isInsideSection(item: (typeof adminNavData)[number], pathname: string) {
  return !!item.children?.some((child) => pathname === child.path.split('?')[0]);
}

export function AdminNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchStep = searchParams.get('step');

  // Each expandable section (Application List, For Reconsideration) tracks
  // its own expand/collapse state independently, keyed by title.
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      adminNavData
        .filter((item) => item.children?.length)
        .map((item) => [item.title, isInsideSection(item, pathname)])
    )
  );

  // Keep a section expanded whenever navigation lands inside it (e.g. clicking
  // a review step elsewhere in the app), without fighting a manual collapse
  // when browsing other sections.
  useEffect(() => {
    adminNavData.forEach((item) => {
      if (item.children?.length && isInsideSection(item, pathname)) {
        setExpandedSections((prev) => (prev[item.title] ? prev : { ...prev, [item.title]: true }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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
        {adminNavData.map((item) => {
          const hasChildren = !!item.children?.length;
          const active = !hasChildren && (pathname === item.path || pathname.startsWith(`${item.path}/`));
          const isNonClickableLabel = hasChildren && !item.path;
          const isExpanded = !!expandedSections[item.title];
          const isSectionActive = hasChildren && isInsideSection(item, pathname);

          return (
            <Box key={item.title}>
              <ListItemButton
                {...(isNonClickableLabel
                  ? { onClick: () => setExpandedSections((prev) => ({ ...prev, [item.title]: !prev[item.title] })) }
                  : { component: RouterLink, href: item.path! })}
                sx={{
                  flex: '0 0 auto',
                  minHeight: 44,
                  borderRadius: '10px',
                  color: isSectionActive && isNonClickableLabel ? '#1C2A6E' : '#5A6273',
                  fontSize: 14,
                  fontWeight: isSectionActive && isNonClickableLabel ? 700 : 600,
                  gap: 1.5,
                  ...(active && {
                    bgcolor: '#EEF1FE',
                    color: '#1C2A6E',
                    fontWeight: 700,
                  }),
                  ...(isSectionActive &&
                    isNonClickableLabel && {
                      bgcolor: '#EEF1FE',
                    }),
                }}
              >
                {item.icon}
                <Box component="span" sx={{ flex: 1 }}>
                  {item.title}
                </Box>
                {hasChildren && (
                  <Iconify
                    icon="eva:chevron-down-fill"
                    width={16}
                    sx={{
                      color: 'inherit',
                      transition: 'transform 0.15s ease',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  />
                )}
              </ListItemButton>

              {hasChildren && (
                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  <Stack spacing={0.25} sx={{ mt: 0.5, pl: 1 }}>
                    {item.children!.map((child) => {
                      const childPathWithoutQuery = child.path.split('?')[0];
                      const childActive =
                        child.step === null
                          ? pathname === childPathWithoutQuery
                          : pathname === childPathWithoutQuery &&
                            (child.step === 'creditChecking' ? !searchStep : searchStep === child.step);

                      return (
                        <ListItemButton
                          key={child.title}
                          component={RouterLink}
                          href={child.path}
                          sx={{
                            flex: '0 0 auto',
                            minHeight: 38,
                            borderRadius: '8px',
                            color: '#8891A6',
                            fontSize: 13,
                            fontWeight: 500,
                            pl: 2.75,
                            ...(childActive && {
                              bgcolor: '#EEF1FE',
                              color: '#1C2A6E',
                              fontWeight: 700,
                            }),
                          }}
                        >
                          {child.title}
                        </ListItemButton>
                      );
                    })}
                  </Stack>
                </Collapse>
              )}
            </Box>
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
          Contact IT support for system issues.
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
