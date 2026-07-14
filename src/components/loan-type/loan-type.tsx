import { Box, Stack } from '@mui/material';

export function LoanType({ primary, secondary }: any) {
  return (
    <Stack
      direction="row"
      justifyContent={{ xs: 'center', md: 'flex-start' }}
      lineHeight={1}
      fontSize={{ xs: 20, sm: 30 }}
    >
      <Box
        sx={{
          backgroundColor: '#fdfde3',
          padding: '0 5px',
          borderRadius: '4px',
          transform: 'skewX(-10deg)',
        }}
      >
        <Box
          sx={{
            fontWeight: 'bold',
            color: '#0a2a50',
            transform: 'skewX(10deg)', // to neutralize the parent skew
            fontStyle: 'italic',
            letterSpacing: -1,
          }}
        >
          {primary}
        </Box>
      </Box>
      <Box
        sx={{
          color: '#ffffff',
          fontStyle: 'italic',
          fontWeight: 300,
        }}
      >
        {secondary}
      </Box>
    </Stack>
  );
}
