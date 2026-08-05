import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type ProgressBarProps = {
  activeStep: number;
  totalSteps: number;
  complete?: boolean;
  labels?: string[];
};

// Connector lines are drawn as one continuous track behind the circles
// (absolutely positioned, vertically centered on the circle row), with a
// green overlay whose width is driven by completed-step count — not one
// line per gap wedged between flex/grid cells. That avoids the previous
// implementation's bug: connectors as flex siblings of each circle+label
// block meant a long label (e.g. "Financial Info") could push the
// following connector's width around and throw off alignment across the
// bar, especially inside the layout's fixed 420px container. Circles and
// labels each sit in their own even CSS grid row, so every step is
// centered under equal-width columns regardless of label length.
export function ProgressBar({ activeStep, totalSteps, complete, labels }: ProgressBarProps) {
  const steps = Array.from({ length: totalSteps }, (_, index) => index + 1);
  const completedSteps = complete ? totalSteps - 1 : Math.max(0, Math.min(activeStep - 1, totalSteps - 1));
  // The track only runs between circle *centers*, i.e. it's inset by half a
  // circle's width on each side — expressed as a percentage of the total
  // (totalSteps - 1) gaps so it works at any column count.
  const trackInset = totalSteps > 1 ? `${50 / totalSteps}%` : '50%';
  const progressFraction = totalSteps > 1 ? completedSteps / (totalSteps - 1) : 0;

  return (
    <Box sx={{ width: 1 }}>
      <Box sx={{ position: 'relative' }}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: trackInset,
            right: trackInset,
            height: 2,
            transform: 'translateY(-50%)',
            borderRadius: 999,
            bgcolor: '#E1E4ED',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              height: 1,
              width: `${progressFraction * 100}%`,
              bgcolor: '#12B76A',
              transition: (theme) => theme.transitions.create('width'),
            }}
          />
        </Box>

        <Box
          sx={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: `repeat(${totalSteps}, 1fr)`,
          }}
        >
          {steps.map((stepNumber) => {
            const isDone = complete || stepNumber < activeStep;
            const isCurrent = !complete && stepNumber === activeStep;

            return (
              <Box
                key={stepNumber}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  fontSize: 12,
                  fontWeight: 700,
                  mx: 'auto',
                  bgcolor: isDone ? '#12B76A' : isCurrent ? '#1C2A6E' : '#E1E4ED',
                  color: isDone || isCurrent ? 'common.white' : '#8891A6',
                  transition: (theme) => theme.transitions.create(['background-color', 'color']),
                }}
              >
                {isDone ? <Iconify icon="eva:checkmark-fill" width={15} /> : stepNumber}
              </Box>
            );
          })}
        </Box>
      </Box>

      {labels && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${totalSteps}, 1fr)`,
            mt: 0.75,
          }}
        >
          {steps.map((stepNumber) => {
            const isDone = complete || stepNumber < activeStep;
            const isCurrent = !complete && stepNumber === activeStep;
            const label = labels[stepNumber - 1];

            return (
              <Typography
                key={stepNumber}
                noWrap
                sx={{
                  fontSize: 11.5,
                  fontWeight: isCurrent ? 700 : 600,
                  color: isCurrent ? '#14172A' : isDone ? '#667085' : '#A0A7B8',
                  textAlign: 'center',
                  px: 0.25,
                }}
              >
                {label}
              </Typography>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
