'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Popover from '@mui/material/Popover';
import Tooltip from '@mui/material/Tooltip';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { useAdminNavMode, type AdminNavMode } from './nav-mode-context';

// ----------------------------------------------------------------------

const NAV_MODE_OPTIONS: { value: AdminNavMode; label: string; icon: string }[] = [
  { value: 'top', label: 'Top navigation', icon: 'solar:slider-horizontal-bold-duotone' },
  { value: 'side', label: 'Side navigation', icon: 'solar:slider-vertical-bold-duotone' },
];

export function AdminNavSettingsButton() {
  const { navMode, setNavMode } = useAdminNavMode();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  return (
    <>
      <Tooltip title="Layout settings" placement="left">
        <ButtonBase
          onClick={(event) => setAnchorEl(event.currentTarget)}
          aria-label="Open layout settings"
          sx={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            width: 52,
            height: 52,
            borderRadius: '50%',
            zIndex: (theme) => theme.zIndex.speedDial,
            bgcolor: '#1C2A6E',
            color: 'common.white',
            boxShadow: '0 8px 20px rgba(28,42,110,0.35)',
            '&:hover': { bgcolor: '#14205A' },
          }}
        >
          <Iconify icon="solar:settings-bold-duotone" width={24} />
        </ButtonBase>
      </Tooltip>

      <Popover
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slotProps={{ paper: { sx: { borderRadius: '14px', width: 250 } } }}
      >
        <Box sx={{ p: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A', mb: 1.5 }}>
            Menu navigation
          </Typography>

          <Stack spacing={1}>
            {NAV_MODE_OPTIONS.map((option) => {
              const selected = navMode === option.value;

              return (
                <ButtonBase
                  key={option.value}
                  onClick={() => setNavMode(option.value)}
                  sx={{
                    justifyContent: 'flex-start',
                    gap: 1.25,
                    px: 1.5,
                    py: 1,
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: selected ? '#1C2A6E' : '#E7EAF1',
                    bgcolor: selected ? '#EEF1FE' : 'transparent',
                    color: selected ? '#1C2A6E' : '#5A6273',
                  }}
                >
                  <Iconify icon={option.icon} width={20} />
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{option.label}</Typography>
                  {selected && (
                    <Iconify
                      icon="solar:check-circle-bold"
                      width={18}
                      sx={{ ml: 'auto', color: '#1C2A6E' }}
                    />
                  )}
                </ButtonBase>
              );
            })}
          </Stack>
        </Box>
      </Popover>
    </>
  );
}
