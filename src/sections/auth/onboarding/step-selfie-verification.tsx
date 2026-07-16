'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useRegistration } from 'src/auth/registration-context';

import { Iconify } from 'src/components/iconify';

import { authPrimaryButtonSx } from '../auth-input-styles';

// ----------------------------------------------------------------------

type CaptureState =
  | 'idle'
  | 'requesting'
  | 'positioning'
  | 'countdown'
  | 'captured'
  | 'verifying'
  | 'verified'
  | 'denied';

const COUNTDOWN_START = 3;

type StepSelfieVerificationProps = {
  onContinue: (photo: string | null) => void;
};

export function StepSelfieVerification({ onContinue }: StepSelfieVerificationProps) {
  const { signUpData, setSignUpData } = useRegistration();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<CaptureState>('idle');
  const [photo, setPhoto] = useState<string | null>(null);
  const [count, setCount] = useState(COUNTDOWN_START);

  // Consent — collected here, right before final submit, rather than as a
  // separate step. termsAccepted also persists onto SignUpData so it isn't
  // simply discarded once this screen is left behind.
  const [accurateInfo, setAccurateInfo] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [verificationConsent, setVerificationConsent] = useState(false);
  const allConsentsGiven =
    accurateInfo && termsAccepted && privacyAcknowledged && verificationConsent;

  const isLiveFeed = state === 'positioning' || state === 'countdown';

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  const startCamera = async () => {
    setState('requesting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState('positioning');
    } catch {
      setState('denied');
    }
  };

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

    setPhoto(canvas.toDataURL('image/jpeg'));
    stopStream();
    setState('captured');
  }, [stopStream]);

  // Once positioned, auto-run a countdown then capture — matches the
  // "hold still, capturing automatically" pattern of real KYC selfie checks
  // rather than a manual shutter-button tap.
  useEffect(() => {
    if (state !== 'countdown') return undefined;

    if (count === 0) {
      capturePhoto();
      return undefined;
    }

    const timer = setTimeout(() => setCount((prev) => prev - 1), 800);
    return () => clearTimeout(timer);
  }, [state, count, capturePhoto]);

  const beginCountdown = () => {
    setCount(COUNTDOWN_START);
    setState('countdown');
  };

  const retake = () => {
    setPhoto(null);
    startCamera();
  };

  const runVerification = () => {
    setState('verifying');
    setTimeout(() => setState('verified'), 1800);
  };

  return (
    <Box
      sx={{
        width: 1,
        maxWidth: 460,
        bgcolor: 'common.white',
        borderRadius: '18px',
        boxShadow: '0 22px 60px -30px rgba(20,23,42,0.28)',
        p: { xs: 3, md: 4 },
      }}
    >
      <Stack alignItems="center" textAlign="center" spacing={0.75} sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8891A6' }}>
          Step 4 · Verify it&apos;s you
        </Typography>
        <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#14172A', letterSpacing: '-0.02em' }}>
          Selfie with ID
        </Typography>
        <Typography sx={{ fontSize: 14, color: '#667085', lineHeight: 1.6 }}>
          Hold your valid ID next to your face so we can match it and confirm it&apos;s really
          you.
        </Typography>
      </Stack>

      {state === 'idle' && (
        <Typography sx={{ fontSize: 12.5, color: '#8891A6', textAlign: 'center', mb: 1.5 }}>
          Find a well-lit spot and make sure your face is clearly visible before you begin.
        </Typography>
      )}

      <Box
        sx={{
          position: 'relative',
          width: 1,
          aspectRatio: '3 / 4',
          borderRadius: '16px',
          overflow: 'hidden',
          bgcolor: '#14172A',
        }}
      >
        {state === 'idle' && (
          <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ width: 1, height: 1 }}>
            <Iconify icon="solar:card-send-bold-duotone" width={44} sx={{ color: 'rgba(255,255,255,0.5)' }} />
            <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', textAlign: 'center', px: 3 }}>
              Camera preview will appear here — have your ID ready
            </Typography>
          </Stack>
        )}

        {state === 'requesting' && (
          <Stack alignItems="center" justifyContent="center" sx={{ width: 1, height: 1 }}>
            <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)' }}>
              Requesting camera…
            </Typography>
          </Stack>
        )}

        {state === 'denied' && (
          <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ width: 1, height: 1, px: 3 }}>
            <Iconify icon="solar:camera-minimalistic-bold" width={32} sx={{ color: '#F68F86' }} />
            <Typography sx={{ fontSize: 12.5, color: '#F68F86', textAlign: 'center' }}>
              Camera access denied
            </Typography>
          </Stack>
        )}

        <Box
          component="video"
          ref={videoRef}
          muted
          playsInline
          sx={{
            width: 1,
            height: 1,
            objectFit: 'cover',
            display: isLiveFeed ? 'block' : 'none',
            transform: 'scaleX(-1)',
          }}
        />

        {photo && (state === 'captured' || state === 'verifying' || state === 'verified') && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt="Captured selfie holding ID"
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
        )}

        {/* Face oval (upper) + ID card outline (lower), shown while live and while reviewing the capture */}
        {(isLiveFeed || state === 'captured' || state === 'verifying' || state === 'verified') && (
          <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <Box
              sx={{
                position: 'absolute',
                top: '14%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '46%',
                height: '34%',
                borderRadius: '50%',
                border: '2.5px dashed',
                borderColor:
                  state === 'verified' ? '#12B76A' : state === 'countdown' ? '#fff' : 'rgba(255,255,255,0.55)',
                transition: 'border-color 0.2s ease',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: '10%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '72%',
                aspectRatio: '1.586 / 1',
                borderRadius: '10px',
                border: '2.5px dashed',
                borderColor:
                  state === 'verified' ? '#12B76A' : state === 'countdown' ? '#fff' : 'rgba(255,255,255,0.55)',
                transition: 'border-color 0.2s ease',
              }}
            >
              <Iconify
                icon="solar:card-bold-duotone"
                width={18}
                style={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  color: 'rgba(255,255,255,0.55)',
                }}
              />
            </Box>
            {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => (
              <Box
                key={corner}
                sx={{
                  position: 'absolute',
                  width: 22,
                  height: 22,
                  borderColor: 'rgba(255,255,255,0.85)',
                  ...(corner.includes('top') ? { top: 14 } : { bottom: 14 }),
                  ...(corner.includes('left') ? { left: 14 } : { right: 14 }),
                  ...(corner.includes('top') && { borderTop: '2.5px solid' }),
                  ...(corner.includes('bottom') && { borderBottom: '2.5px solid' }),
                  ...(corner.includes('left') && { borderLeft: '2.5px solid' }),
                  ...(corner.includes('right') && { borderRight: '2.5px solid' }),
                }}
              />
            ))}
          </Box>
        )}

        {state === 'positioning' && (
          <Stack
            alignItems="center"
            sx={{ position: 'absolute', left: 0, right: 0, bottom: 16, px: 2 }}
          >
            <Typography
              sx={{
                fontSize: 12.5,
                fontWeight: 600,
                color: 'common.white',
                bgcolor: 'rgba(19,33,85,0.65)',
                borderRadius: '999px',
                px: 1.75,
                py: 0.5,
              }}
            >
              Hold your ID below your face, in view of the camera
            </Typography>
          </Stack>
        )}

        {state === 'countdown' && (
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(19,33,85,0.15)' }}
          >
            <Typography
              key={count}
              sx={{
                fontSize: 56,
                fontWeight: 800,
                color: 'common.white',
                textShadow: '0 4px 18px rgba(0,0,0,0.45)',
                animation: 'pgSelfieCountPulse 0.8s ease',
                '@keyframes pgSelfieCountPulse': {
                  '0%': { transform: 'scale(1.4)', opacity: 0 },
                  '30%': { transform: 'scale(1)', opacity: 1 },
                  '100%': { transform: 'scale(1)', opacity: 1 },
                },
              }}
            >
              {count > 0 ? count : ''}
            </Typography>
            {count > 0 && (
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.85)', mt: 1 }}>
                Hold still — capturing…
              </Typography>
            )}
          </Stack>
        )}

        {state === 'captured' && (
          <Stack
            alignItems="center"
            sx={{ position: 'absolute', left: 0, right: 0, bottom: 16, px: 2 }}
          >
            <Typography
              sx={{
                fontSize: 12.5,
                fontWeight: 600,
                color: 'common.white',
                bgcolor: 'rgba(19,33,85,0.65)',
                borderRadius: '999px',
                px: 1.75,
                py: 0.5,
              }}
            >
              Looking good?
            </Typography>
          </Stack>
        )}

        {state === 'verifying' && (
          <Stack
            alignItems="center"
            justifyContent="center"
            spacing={1.25}
            sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(19,33,85,0.6)' }}
          >
            <Box
              sx={{
                width: 30,
                height: 30,
                border: '3px solid rgba(255,255,255,0.35)',
                borderTopColor: 'common.white',
                borderRadius: '50%',
                animation: 'pgSelfieSpin 0.8s linear infinite',
                '@keyframes pgSelfieSpin': { to: { transform: 'rotate(360deg)' } },
              }}
            />
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: 'common.white' }}>
              Matching your face to your ID…
            </Typography>
          </Stack>
        )}

        {state === 'verified' && (
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(18,183,106,0.18)' }}
          >
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                bgcolor: '#12B76A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px -6px rgba(18,183,106,0.6)',
              }}
            >
              <Iconify icon="eva:checkmark-fill" width={26} sx={{ color: 'common.white' }} />
            </Box>
          </Stack>
        )}
      </Box>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {state === 'denied' && (
        <Alert severity="warning" sx={{ mt: 2.5, fontSize: 13 }}>
          We couldn&apos;t access your camera. Check your browser permissions and try again.
        </Alert>
      )}

      <Stack spacing={1.5} sx={{ mt: 2.5 }}>
        {(state === 'idle' || state === 'denied') && (
          <Button
            fullWidth
            onClick={startCamera}
            variant="contained"
            startIcon={<Iconify icon="solar:camera-bold-duotone" width={18} />}
            sx={authPrimaryButtonSx}
          >
            {state === 'denied' ? 'Try Again' : 'Enable Camera'}
          </Button>
        )}

        {state === 'requesting' && (
          <Button fullWidth disabled variant="contained" sx={authPrimaryButtonSx}>
            Requesting camera access…
          </Button>
        )}

        {state === 'positioning' && (
          <Button fullWidth onClick={beginCountdown} variant="contained" sx={authPrimaryButtonSx}>
            I&apos;m Ready
          </Button>
        )}

        {state === 'countdown' && (
          <Button fullWidth disabled variant="contained" sx={authPrimaryButtonSx}>
            Capturing…
          </Button>
        )}

        {state === 'captured' && (
          <Stack direction="row" spacing={1.5}>
            <Button fullWidth onClick={retake} variant="outlined" sx={{ borderRadius: '11px' }}>
              Retake
            </Button>
            <Button fullWidth onClick={runVerification} variant="contained" sx={authPrimaryButtonSx}>
              Verify Selfie with ID
            </Button>
          </Stack>
        )}

        {state === 'verifying' && (
          <Button fullWidth disabled variant="contained" sx={authPrimaryButtonSx}>
            Verifying…
          </Button>
        )}

        {state === 'verified' && (
          <Stack spacing={1.5}>
            <Stack spacing={0.75} sx={{ p: 2, borderRadius: '12px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={accurateInfo}
                    onChange={(event) => setAccurateInfo(event.target.checked)}
                  />
                }
                label={
                  <Typography sx={{ fontSize: 12.5, color: '#5A6273' }}>
                    The information I&apos;ve provided in this application is accurate.
                  </Typography>
                }
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={termsAccepted}
                    onChange={(event) => setTermsAccepted(event.target.checked)}
                  />
                }
                label={
                  <Typography sx={{ fontSize: 12.5, color: '#5A6273' }}>
                    I agree to the{' '}
                    <Link component={RouterLink} href={paths.terms} sx={{ color: '#4361EE', fontWeight: 600 }}>
                      Terms &amp; Conditions
                    </Link>
                    .
                  </Typography>
                }
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={privacyAcknowledged}
                    onChange={(event) => setPrivacyAcknowledged(event.target.checked)}
                  />
                }
                label={
                  <Typography sx={{ fontSize: 12.5, color: '#5A6273' }}>
                    I acknowledge the{' '}
                    <Link component={RouterLink} href={paths.privacyPolicy} sx={{ color: '#4361EE', fontWeight: 600 }}>
                      Privacy Policy
                    </Link>
                    .
                  </Typography>
                }
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={verificationConsent}
                    onChange={(event) => setVerificationConsent(event.target.checked)}
                  />
                }
                label={
                  <Typography sx={{ fontSize: 12.5, color: '#5A6273' }}>
                    I consent to the processing and verification of my personal information,
                    government ID, and facial image.
                  </Typography>
                }
              />
            </Stack>

            <Button
              fullWidth
              disabled={!allConsentsGiven}
              onClick={() => {
                if (signUpData) {
                  setSignUpData({ ...signUpData, termsAccepted: true });
                }
                onContinue(photo);
              }}
              variant="contained"
              sx={authPrimaryButtonSx}
            >
              Submit Application →
            </Button>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
