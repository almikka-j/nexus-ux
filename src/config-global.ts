export type ConfigValue = {
  site: {
    name: string;
    basePath: string;
  };
};

// ----------------------------------------------------------------------

export const CONFIG: ConfigValue = {
  site: {
    name: 'HHC LMS',
    basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '',
  },
};
