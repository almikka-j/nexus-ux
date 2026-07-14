import React, { useState } from 'react';

import {
  Box,
  Menu,
  Link,
  Stack,
  AppBar,
  Button,
  Toolbar,
  MenuItem,
  Collapse,
  Container,
  IconButton,
} from '@mui/material';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { LogoFull } from 'src/components/logo/logo-full';

import { navData } from '../config-nav-main';

export default function CustomHeader() {
  const router = useRouter();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [submenuItems, setSubmenuItems] = useState<any>([]);
  const [navOpen, setNavOpen] = useState(false);

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>, items: any[]) => {
    setAnchorEl(event.currentTarget);
    setSubmenuItems(items);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSubmenuItems([]);
  };

  return (
    <AppBar position="sticky" sx={{ bgcolor: 'white' }}>
      <Container sx={{ maxWidth: '1280px !important', position: 'relative' }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', height: 80, px: 0 }}>
          <Link href="/" sx={{ ':hover': { opacity: 0.6 } }}>
            <LogoFull width={180} height={50} />
          </Link>

          <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', gap: 2 }}>
            {navData.map((item, index) => (
              <div key={index}>
                <Button
                  sx={{ color: '#6B6C70', fontWeight: 'medium' }}
                  onClick={(e) => item?.children?.length && handleMenuClick(e, item?.children)}
                  endIcon={
                    item?.children && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="6" fill="none">
                        <path
                          stroke="#919295"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.667"
                          d="m1.117 1.125 3.75 3.75 3.75-3.75"
                        />
                      </svg>
                    )
                  }
                  href={!item.children ? item.path : undefined}
                >
                  {item.title}
                </Button>
              </div>
            ))}
          </Box>

          <Stack direction="row" gap={2} display={{ xs: 'none', lg: 'flex' }}>
            <Button
              variant="soft"
              sx={{ fontSize: 14, fontWeight: 600, color: '#1C388C' }}
              href={paths.auth.login}
            >
              Borrower&apos;s Login
            </Button>
            <Button
              variant="contained"
              color="primary"
              sx={{ fontSize: 14, fontWeight: 600 }}
              href={paths.auth.signUp}
            >
              Apply Now!
            </Button>
          </Stack>

          {/* Mobile Menu Button */}
          <IconButton
            color="inherit"
            edge="end"
            sx={{ display: { lg: 'none' } }}
            onClick={() => setNavOpen(!navOpen)}
          >
            {!navOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none">
                <path
                  stroke="#6B6C70"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 12h16M4 6h16M4 18h16"
                />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none">
                <path
                  fill="#6B6C70"
                  d="m7.002 8.195-5.179 5.178a.817.817 0 0 1-.596.255.817.817 0 0 1-.597-.255.818.818 0 0 1-.255-.596c0-.228.085-.427.255-.597l5.178-5.178L.63 1.823a.817.817 0 0 1-.255-.596C.375.999.46.8.63.63a.817.817 0 0 1 .597-.255c.228 0 .426.085.596.255l5.179 5.178L12.18.63a.817.817 0 0 1 .597-.255c.228 0 .426.085.596.255.17.17.255.369.255.597a.817.817 0 0 1-.255.596L8.195 7.002l5.178 5.178c.17.17.255.369.255.597a.818.818 0 0 1-.255.596.818.818 0 0 1-.596.255.817.817 0 0 1-.597-.255L7.002 8.195Z"
                />
              </svg>
            )}
          </IconButton>

          {/* Submenu */}
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
            {submenuItems.map((subItem: any, index: number) => (
              <MenuItem
                key={index}
                onClick={() => {
                  router.push(subItem?.path);
                  handleMenuClose();
                }}
              >
                {subItem?.title}
              </MenuItem>
            ))}
          </Menu>
        </Toolbar>
      </Container>

      {/* Mobile Navigation */}
      {navOpen && (
        <Box
          className="mobile-nav"
          sx={{
            display: { xs: 'block', lg: 'none' },
            position: 'absolute',
            top: 60,
            left: 0,
            width: 1,
            bgcolor: 'white',
            overflowY: 'scroll',
            py: 2,
          }}
        >
          {navData && navData?.map((item, index) => <HeaderGridToggle key={index} item={item} />)}
        </Box>
      )}
    </AppBar>
  );
}

export function HeaderGridToggle({ item }: any) {
  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({});

  return (
    <Box>
      <Box
        onClick={(event) =>
          item?.children
            ? setOpenMenus((prev) => ({
                ...prev,
                [item.title]: !prev[item.title],
              }))
            : undefined
        }
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: { xs: 'center', lg: 'start' },
          gap: 1,
          cursor: 'pointer',
          py: 2,
        }}
      >
        {item?.path ? (
          <Link href={item?.path ?? '#!'} color="#323234">
            {item?.title}
          </Link>
        ) : (
          item?.title
        )}
        {item?.children && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="8"
            height="5"
            fill="none"
            style={{
              transform: openMenus[item.title] ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s',
            }}
          >
            <path
              fill="#6B6C70"
              d="M3.564 4.563.543 1.543a.392.392 0 0 1-.125-.292c0-.111.038-.209.115-.292A.39.39 0 0 1 .835.834h6.333a.39.39 0 0 1 .302.125c.076.083.115.18.115.292 0 .027-.042.125-.125.291L4.439 4.563a.635.635 0 0 1-.209.146.612.612 0 0 1-.229.042.612.612 0 0 1-.229-.042.635.635 0 0 1-.208-.146Z"
            />
          </svg>
        )}
      </Box>
      <Collapse in={openMenus[item.title]} timeout="auto" unmountOnExit>
        <Stack
          spacing={2}
          sx={{
            bgcolor: '#F9F9F9',
            py: 2,
          }}
        >
          {item?.children?.map(({ path, title }: any) => (
            <Link key={path} href={path} color="#323234" textAlign="center">
              {title}
            </Link>
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
}
