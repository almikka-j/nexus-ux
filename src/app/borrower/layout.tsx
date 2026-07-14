import { RegistrationProvider } from 'src/auth/registration-context';

// ----------------------------------------------------------------------

export default function BorrowerAppLayout({ children }: { children: React.ReactNode }) {
  return <RegistrationProvider>{children}</RegistrationProvider>;
}
