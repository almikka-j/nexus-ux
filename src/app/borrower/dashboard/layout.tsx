import { BorrowerLayout } from 'src/layouts/borrower/layout';

// ----------------------------------------------------------------------

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <BorrowerLayout>{children}</BorrowerLayout>;
}
