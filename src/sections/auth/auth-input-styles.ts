// ----------------------------------------------------------------------
// Shared MUI `sx` for form fields on the re-themed onboarding/auth screens,
// matching the "DC" mockups: 46px height, 10px radius, accent focus ring.
// ----------------------------------------------------------------------

export const authFieldSx = {
  '& .MuiOutlinedInput-root': {
    height: 46,
    borderRadius: '10px',
    fontSize: 14,
    bgcolor: 'common.white',
    '& fieldset': { borderColor: '#E1E4ED', borderWidth: '1.5px' },
    '&:hover fieldset': { borderColor: '#E1E4ED' },
    '&.Mui-focused fieldset': { borderColor: '#4361EE', borderWidth: '1.5px' },
    '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(67,97,238,0.14)' },
  },
  '& .MuiInputLabel-root': { display: 'none' },
  '& .MuiOutlinedInput-input': { color: '#14172A' },
  '& .MuiOutlinedInput-input::placeholder': { color: '#9AA1B2', opacity: 1 },
};

export const authFieldLabelSx = {
  display: 'block',
  fontSize: 12.5,
  fontWeight: 600,
  color: '#3B4256',
  mb: 0.75,
};

export const authPrimaryButtonSx = {
  height: 52,
  borderRadius: '11px',
  bgcolor: '#1C2A6E',
  fontSize: 15,
  fontWeight: 700,
  boxShadow: '0 12px 24px -10px rgba(28,42,110,0.6)',
  '&:hover': { bgcolor: '#14205A' },
};
