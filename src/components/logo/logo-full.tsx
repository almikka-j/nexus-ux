import { Box } from '@mui/material';

import { CONFIG } from 'src/config-global';

export function LogoFull({ width = 140, height = 35 }: any) {
  return (
    <Box
      alt="logo"
      component="img"
      src={`${CONFIG.site.basePath}/logo/logo-full.svg`}
      width={width}
      height={height}
    />
  );
}
