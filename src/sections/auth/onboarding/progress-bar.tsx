import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

// ----------------------------------------------------------------------

type ProgressBarProps = {
  activeStep: number;
  totalSteps: number;
  complete?: boolean;
};

export function ProgressBar({ activeStep, totalSteps, complete }: ProgressBarProps) {
  return (
    <Stack direction="row" spacing={1}>
      {Array.from({ length: totalSteps }, (_, index) => {
        const isActive = complete || index + 1 <= activeStep;

        return (
          <Box
            key={index}
            sx={{
              flex: 1,
              height: 5,
              borderRadius: 999,
              bgcolor: isActive ? (complete ? '#12B76A' : '#1C2A6E') : '#E1E4ED',
              transition: (theme) => theme.transitions.create('background-color'),
            }}
          />
        );
      })}
    </Stack>
  );
}
