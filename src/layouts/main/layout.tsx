'use client';

import type { Theme, SxProps, Breakpoint } from '@mui/material/styles';

import { Main } from './main';
import { Footer } from './footer';
import CustomHeader from './header';
import { LayoutSection } from '../core/layout-section';

// ----------------------------------------------------------------------

export type MainLayoutProps = {
  sx?: SxProps<Theme>;
  children: React.ReactNode;
};

export function MainLayout({ sx, children }: MainLayoutProps) {
  const layoutQuery: Breakpoint = 'md';

  return (
    <LayoutSection
      /** **************************************
       * Header
       *************************************** */
      headerSection={<CustomHeader />}
      /** **************************************
       * Footer
       *************************************** */
      footerSection={<Footer layoutQuery={layoutQuery} />}
      /** **************************************
       * Style
       *************************************** */
      sx={sx}
    >
      <Main>{children}</Main>
    </LayoutSection>
  );
}
