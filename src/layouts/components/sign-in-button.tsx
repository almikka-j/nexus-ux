import type { ButtonProps } from '@mui/material/Button';

import Button from '@mui/material/Button';

import { RouterLink } from 'src/routes/components';

// ----------------------------------------------------------------------
// NOTE: Simplified from the source project's sign-in-button.tsx. The
// original pointed at `CONFIG.auth.redirectPath`, which was tied to the
// full app's configurable auth provider (jwt/amplify/firebase/supabase/
// auth0). This destination project's CONFIG has no `auth` section, so
// this links to a plain `/auth/login` route instead (that route does
// not need to exist yet). Nothing in the marketing site currently
// renders this button.
// ----------------------------------------------------------------------

export function SignInButton({ sx, ...other }: ButtonProps) {
  return (
    <Button component={RouterLink} href="/auth/login" variant="outlined" sx={sx} {...other}>
      Sign in
    </Button>
  );
}
