import { Iconify } from 'src/components/iconify';

import { paths } from 'src/routes/paths';

// ----------------------------------------------------------------------

export const borrowerNavData = [
  {
    title: 'Dashboard',
    path: paths.borrower.dashboard,
    icon: <Iconify width={24} icon="solar:widget-2-bold-duotone" />,
  },
  {
    title: 'Loan Application',
    path: paths.borrower.apply,
    icon: <Iconify width={24} icon="solar:document-add-bold-duotone" />,
  },
  {
    title: 'Approved Loan',
    path: null,
    icon: <Iconify width={24} icon="solar:file-check-bold-duotone" />,
  },
  {
    title: 'Payment',
    path: null,
    icon: <Iconify width={24} icon="solar:wallet-money-bold-duotone" />,
  },
  {
    title: 'Account',
    path: null,
    icon: <Iconify width={24} icon="solar:user-circle-bold-duotone" />,
  },
];
