import 'src/global.css';

// ----------------------------------------------------------------------

import type { Metadata, Viewport } from 'next';

import { primary } from 'src/theme/core/palette';
import { ThemeProvider } from 'src/theme/theme-provider';
import { getInitColorSchemeScript } from 'src/theme/color-scheme-script';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'HHC LMS',
  description: 'Hortaleza Holdings Corporation — Loan Management System',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: primary.main,
};

type Props = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: Props) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ overflowX: 'hidden' }}>
        {getInitColorSchemeScript}

        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
