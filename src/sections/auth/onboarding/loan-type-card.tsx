import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type LoanTypeCardProps = {
  icon: string;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
};

export function LoanTypeCard({ icon, title, description, selected, onClick }: LoanTypeCardProps) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        width: 1,
        textAlign: 'left',
        alignItems: 'flex-start',
        display: 'block',
        borderRadius: '16px',
        bgcolor: 'common.white',
        border: '2px solid',
        borderColor: selected ? '#1C2A6E' : '#EBEDF3',
        boxShadow: selected ? '0 16px 34px -18px rgba(28,42,110,0.5)' : '0 1px 2px rgba(20,23,42,0.04)',
        p: 3.25,
        transition: (theme) => theme.transitions.create(['border-color', 'box-shadow', 'transform']),
        '&:hover': { transform: 'translateY(-3px)' },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.25, width: 1 }}>
        <Box
          sx={{
            width: 50,
            height: 50,
            borderRadius: '13px',
            bgcolor: '#EEF1FE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Iconify icon={icon} width={26} sx={{ color: '#1C2A6E' }} />
        </Box>

        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: '2px solid',
            borderColor: selected ? '#1C2A6E' : '#D2D6E0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {selected && <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: '#1C2A6E' }} />}
        </Box>
      </Stack>

      <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A', mb: 0.75 }}>
        {title}
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#667085', lineHeight: 1.55 }}>
        {description}
      </Typography>
    </ButtonBase>
  );
}
