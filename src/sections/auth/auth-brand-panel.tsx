import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';
import { LogoFull } from 'src/components/logo/logo-full';

// ----------------------------------------------------------------------

const CHECK_ITEMS = [
  'Bank-grade security & data privacy',
  'Fast, transparent approvals',
  'Track your loans anytime',
];

type AuthBrandPanelProps = {
  title: React.ReactNode;
  description: string;
  icon?: string;
  checklist?: boolean;
};

export function AuthBrandPanel({ title, description, icon, checklist }: AuthBrandPanelProps) {
  return (
    <Box
      sx={{
        position: 'relative',
        flex: '0 0 34%',
        minWidth: 320,
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: '#132155',
        color: 'common.white',
        p: { md: 6, lg: 7 },
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background: 'url("/images/background/texture-strong.png")',
          backgroundSize: '1400px',
          backgroundRepeat: 'repeat',
          backgroundPosition: 'center',
          opacity: 0.04,
          pointerEvents: 'none',
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          zIndex: 0,
          top: -90,
          right: -70,
          width: 300,
          height: 300,
          borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.06)',
          animation: 'pgPanelFloatA 7s ease-in-out infinite',
          '@keyframes pgPanelFloatA': {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-14px)' },
          },
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          zIndex: 0,
          bottom: 60,
          left: -90,
          width: 260,
          height: 260,
          borderRadius: '50%',
          bgcolor: 'rgba(67,97,238,0.32)',
          filter: 'blur(8px)',
          animation: 'pgPanelFloatB 8s ease-in-out infinite',
          '@keyframes pgPanelFloatB': {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(12px)' },
          },
        }}
      />

      <Box sx={{ position: 'relative', zIndex: 1, filter: 'brightness(0) invert(1)' }}>
        <LogoFull width={140} height={27} />
      </Box>

      <Stack spacing={0} sx={{ position: 'relative', zIndex: 1, mt: 'auto', maxWidth: 440 }}>
        {icon && (
          <Box
            sx={{
              width: 84,
              height: 84,
              borderRadius: 3,
              bgcolor: 'rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 3.5,
            }}
          >
            <Iconify icon={icon} width={40} />
          </Box>
        )}

        <Typography
          sx={{
            fontSize: { md: 28, lg: 34 },
            lineHeight: 1.18,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            mb: 2,
          }}
        >
          {title}
        </Typography>

        <Typography
          sx={{
            fontSize: 16,
            lineHeight: 1.65,
            color: 'rgba(255,255,255,0.75)',
            mb: checklist ? 4.25 : 0,
          }}
        >
          {description}
        </Typography>

        {checklist && (
          <Stack spacing={2.25}>
            {CHECK_ITEMS.map((item) => (
              <Stack key={item} direction="row" alignItems="center" spacing={1.5}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    bgcolor: 'rgba(255,255,255,0.14)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Iconify icon="eva:checkmark-fill" width={14} />
                </Box>
                <Typography sx={{ fontSize: 15, color: 'rgba(255,255,255,0.92)' }}>
                  {item}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
