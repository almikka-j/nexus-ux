'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';

import { paths } from 'src/routes/paths';

import { useAdmin } from 'src/auth/admin-context';
import { useBoolean } from 'src/hooks/use-boolean';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';

import { HaiChatDrawer } from './hai-chat-drawer';

// ----------------------------------------------------------------------

type AdminHeaderProps = {
  displayName: string;
  role?: string;
};

// Shared account/notification controls — the right-hand cluster of the admin
// header. Extracted so AdminNavHorizontal can render it inline in its own
// single-row top bar instead of stacking a whole separate <AdminHeader> row
// underneath, while AdminHeader (used in side-nav mode) keeps rendering it
// inside its own bordered row.
export function AdminHeaderActions({ displayName, role = 'Credit Officer' }: AdminHeaderProps) {
  const router = useRouter();
  const { logout } = useAdmin();
  const logoutConfirm = useBoolean();
  const haiChat = useBoolean();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleLogout = () => {
    setAnchorEl(null);
    logoutConfirm.onFalse();
    logout();
    router.push(paths.admin.login);
  };

  return (
    <Stack direction="row" alignItems="center" gap={2}>
      <Badge color="error" badgeContent={0} overlap="circular">
        <IconButton>
          <Iconify icon="solar:bell-bold-duotone" width={24} />
        </IconButton>
      </Badge>

      <Button
        variant="outlined"
        startIcon={<Iconify icon="solar:magic-stick-3-bold-duotone" width={18} />}
        onClick={haiChat.onTrue}
        sx={{
          minHeight: 38,
          borderRadius: '10px',
          borderColor: '#D9DDEA',
          color: '#1C2A6E',
          fontWeight: 700,
          '&:hover': { borderColor: '#1C2A6E', bgcolor: '#F5F7FF' },
        }}
      >
        ASK HAI
      </Button>

      <ButtonBase
        onClick={(event) => setAnchorEl(event.currentTarget)}
        aria-label="Open account menu"
        sx={{ borderRadius: '50%', p: 0.5 }}
      >
        <Avatar sx={{ bgcolor: '#1C2A6E', color: 'common.white', fontWeight: 700 }}>
          {displayName.charAt(0).toUpperCase()}
        </Avatar>
      </ButtonBase>

      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
        <MenuItem disabled sx={{ opacity: '1 !important' }}>
          <Stack>
            <Typography variant="subtitle2">{displayName}</Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              {role}
            </Typography>
          </Stack>
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            logoutConfirm.onTrue();
          }}
          sx={{ color: 'error.main' }}
        >
          <Iconify icon="solar:logout-3-bold-duotone" width={20} sx={{ mr: 1.5 }} />
          Logout
        </MenuItem>
      </Menu>

      <HaiChatDrawer open={haiChat.value} onClose={haiChat.onFalse} />

      <ConfirmDialog
        open={logoutConfirm.value}
        onClose={logoutConfirm.onFalse}
        title="Logout"
        content="Are you sure you want to log out?"
        action={
          <Button variant="contained" color="error" onClick={handleLogout}>
            Logout
          </Button>
        }
      />
    </Stack>
  );
}

export function AdminHeader({ displayName, role = 'Credit Officer' }: AdminHeaderProps) {
  return (
    <Box
      component="header"
      sx={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 2,
        px: { xs: 2, md: 5 },
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        bgcolor: 'common.white',
      }}
    >
      <AdminHeaderActions displayName={displayName} role={role} />
    </Box>
  );
}
