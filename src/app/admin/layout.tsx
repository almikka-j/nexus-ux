import { AdminProvider } from 'src/auth/admin-context';
import { RegistrationProvider } from 'src/auth/registration-context';

// ----------------------------------------------------------------------

export default function AdminAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RegistrationProvider>
      <AdminProvider>{children}</AdminProvider>
    </RegistrationProvider>
  );
}
