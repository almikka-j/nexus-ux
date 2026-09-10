import type { Metadata } from 'next';

import { DesignSystemView } from 'src/sections/admin/design-system-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Admin Design System | HHC LMS',
};

export default function Page() {
  return <DesignSystemView />;
}
