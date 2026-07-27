'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export type SectionNavEntry = {
  key: string;
  label: string;
  received: number;
  total: number;
  fullyVerified: boolean;
  onClick: () => void;
};

export type RequirementChecklistSectionNavProps = {
  entries: SectionNavEntry[];
  variant: 'side' | 'bar';
};

export function RequirementChecklistSectionNav({ entries, variant }: RequirementChecklistSectionNavProps) {
  const isSide = variant === 'side';

  return (
    <Stack
      direction={isSide ? 'column' : 'row'}
      spacing={isSide ? 1 : 1.5}
      sx={
        isSide
          ? { p: 1.25, borderRadius: '13px', bgcolor: 'common.white', border: '1px solid #EBEDF3' }
          : {
              px: 2,
              py: 1.25,
              bgcolor: 'common.white',
              borderBottom: '1px solid #EBEDF3',
              overflowX: 'auto',
            }
      }
    >
      {entries.map((entry) => (
        <Stack
          key={entry.key}
          component={ButtonBase}
          onClick={entry.onClick}
          direction="row"
          alignItems="center"
          spacing={0.75}
          sx={{
            px: 1.25,
            py: 0.75,
            borderRadius: '9px',
            justifyContent: 'flex-start',
            flexShrink: 0,
            '&:hover': { bgcolor: '#F5F7FF' },
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              flexShrink: 0,
              bgcolor: entry.fullyVerified ? '#12B76A' : '#F5A623',
            }}
          />
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#14172A', whiteSpace: 'nowrap' }}>
            {entry.label}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: '#8891A6', whiteSpace: 'nowrap' }}>
            {entry.received}/{entry.total}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}
