import type { Metadata } from 'next';

import { MainLayout } from 'src/layouts/main';

import { HomeView } from 'src/sections/home/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'HHC LMS | Financing and Lending',
  description:
    'HHC LMS is a financing and lending company in the Philippines that offers fast and easy loans to individuals and businesses. We provide flexible payment terms and competitive interest rates to help you achieve your financial goals.',
};

export default function Page() {
  return (
    <MainLayout>
      <HomeView />
    </MainLayout>
  );
}
