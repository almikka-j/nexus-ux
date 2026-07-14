import { RegistrationProvider } from 'src/auth/registration-context';

// ----------------------------------------------------------------------

export default function AuthAppLayout({ children }: { children: React.ReactNode }) {
  return <RegistrationProvider>{children}</RegistrationProvider>;
}
