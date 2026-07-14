import { Box, Card, Link, Stack, Typography } from '@mui/material';

import { Iconify } from 'src/components/iconify';

export function ContactDetails() {
  const SOCIALS = [
    {
      name: 'Instagram',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none">
          <path
            fill="url(#a)"
            d="M9.492 8.837a2.605 2.605 0 1 0 2.896 4.331 2.605 2.605 0 0 0-2.896-4.331Zm6.948-3.34a2.626 2.626 0 0 0-.898-.586c-.884-.347-2.813-.332-4.058-.317-.2 0-.385.005-.546.005-.162 0-.352 0-.557-.005-1.245-.015-3.164-.034-4.048.317-.337.132-.64.332-.898.586a2.557 2.557 0 0 0-.586.899c-.347.883-.328 2.817-.318 4.062 0 .2.005.386.005.542 0 .156 0 .342-.005.542-.01 1.245-.029 3.179.318 4.063.131.336.332.64.586.898.253.259.561.454.898.586.884.347 2.813.332 4.058.317.2 0 .385-.005.546-.005.162 0 .352 0 .557.005 1.245.015 3.164.034 4.048-.317.337-.132.64-.332.898-.586.26-.254.454-.562.586-.899.352-.878.332-2.802.318-4.052 0-.205-.005-.396-.005-.557 0-.161 0-.347.005-.556.014-1.246.034-3.17-.318-4.053a2.675 2.675 0 0 0-.586-.899v.01ZM13.164 7.67a4.006 4.006 0 1 1-3.011-.597 4.005 4.005 0 0 1 3.006.597h.005Zm1.426-.064a.932.932 0 0 1-.146-1.44.937.937 0 0 1 1.597.66.985.985 0 0 1-.07.356.922.922 0 0 1-.86.581.922.922 0 0 1-.516-.157h-.005Zm7.285-4.418A3.128 3.128 0 0 0 18.75.062H3.125A3.128 3.128 0 0 0 0 3.188v15.624a3.128 3.128 0 0 0 3.125 3.125H18.75a3.128 3.128 0 0 0 3.125-3.125V3.188Zm-4.443 14.306c-.913.913-2.022 1.201-3.272 1.265-1.289.073-5.156.073-6.445 0-1.25-.064-2.359-.352-3.272-1.265-.913-.913-1.2-2.021-1.26-3.271-.073-1.29-.073-5.157 0-6.446.064-1.25.347-2.358 1.26-3.271.913-.913 2.027-1.201 3.272-1.26 1.289-.073 5.156-.073 6.445 0 1.25.064 2.359.347 3.272 1.26.913.913 1.2 2.021 1.26 3.271.073 1.285.073 5.147 0 6.44-.064 1.25-.347 2.36-1.26 3.272v.005Z"
          />
          <defs>
            <linearGradient
              id="a"
              x1="10.938"
              x2="10.938"
              y1="-9.768"
              y2="18.588"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#0937C0" />
              <stop offset="1" stopColor="#12355B" />
            </linearGradient>
          </defs>
        </svg>
      ),
      href: 'https://www.instagram.com/pgfinanceph/',
    },
    {
      name: 'Linkedin',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="23" height="22" fill="none">
          <path
            fill="url(#a)"
            d="M21.188.063H2.433A1.57 1.57 0 0 0 .875 1.64v18.72c0 .87.698 1.578 1.558 1.578h18.755c.859 0 1.562-.708 1.562-1.578V1.64c0-.87-.703-1.577-1.563-1.577ZM7.486 18.813H4.244V8.373h3.247v10.44h-.005ZM5.866 6.947a1.88 1.88 0 0 1 0-3.76c1.034 0 1.88.845 1.88 1.88 0 1.04-.84 1.88-1.88 1.88ZM19.64 18.813h-3.242v-5.079c0-1.21-.025-2.768-1.685-2.768-1.69 0-1.948 1.318-1.948 2.68v5.166H9.522V8.373h3.11v1.426h.045c.434-.82 1.494-1.685 3.071-1.685 3.281 0 3.892 2.163 3.892 4.976v5.723Z"
          />
          <defs>
            <linearGradient
              id="a"
              x1="11.813"
              x2="11.813"
              y1="-9.768"
              y2="18.588"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#0937C0" />
              <stop offset="1" stopColor="#12355B" />
            </linearGradient>
          </defs>
        </svg>
      ),
      href: 'https://www.linkedin.com/company/primeglobalfinance/',
    },
    {
      name: 'Facebook',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="23" height="22" fill="none">
          <path
            fill="url(#a)"
            d="M3.875.063A3.128 3.128 0 0 0 .75 3.187v15.626a3.128 3.128 0 0 0 3.125 3.125H8.67v-7.12H6.092V11H8.67V9.354c0-4.252 1.924-6.225 6.103-6.225.792 0 2.159.156 2.72.312v3.457a16.47 16.47 0 0 0-1.445-.048c-2.05 0-2.842.776-2.842 2.793V11h4.082l-.703 3.818h-3.384v7.12H19.5a3.128 3.128 0 0 0 3.125-3.125V3.188A3.128 3.128 0 0 0 19.5.062H3.875Z"
          />
          <defs>
            <linearGradient
              id="a"
              x1="11.688"
              x2="11.688"
              y1="-9.768"
              y2="18.588"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#0937C0" />
              <stop offset="1" stopColor="#12355B" />
            </linearGradient>
          </defs>
        </svg>
      ),
      href: 'https://www.facebook.com/primeglobalfinance/',
    },
    {
      name: 'Tiktok',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="23" height="26" fill="none">
          <path
            fill="url(#a)"
            d="M22.5 10.749a10.259 10.259 0 0 1-5.996-1.919v8.73a7.94 7.94 0 1 1-6.846-7.866v4.39a3.642 3.642 0 1 0 2.549 3.477V.5h4.297c-.003.363.028.726.093 1.084A5.966 5.966 0 0 0 19.228 5.5c.971.641 2.109.982 3.272.981v4.268Z"
          />
          <defs>
            <linearGradient
              id="a"
              x1="11.563"
              x2="11.563"
              y1="-10.733"
              y2="21.67"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#0937C0" />
              <stop offset="1" stopColor="#12355B" />
            </linearGradient>
          </defs>
        </svg>
      ),
      href: 'https://www.tiktok.com/@pgfinanceph',
    },
  ];
  return (
    <Card sx={{ bgcolor: '#F5F5F5', borderRadius: '8px', boxShadow: 'none' }}>
      <Box pb={5}>
        <Typography sx={{ fontSize: 25, fontWeight: 600, color: '#0B1E59', px: 4, pt: 5 }}>
          Contact Information
        </Typography>

        <Stack spacing={2} sx={{ px: 4, pt: 2 }}>
          <Stack direction="row" sx={{ typography: { xs: 14, md: 16 }, color: '#6B6C70' }}>
            <Iconify
              icon="fluent:mail-24-filled"
              color="#0B1E59"
              width={16}
              sx={{ mr: 1.5, mt: 0.5 }}
            />
            support@pgfinance.com.ph
          </Stack>

          <Stack direction="row" sx={{ typography: { xs: 14, md: 16 }, color: '#6B6C70' }}>
            <Iconify icon="solar:phone-bold" color="#0B1E59" width={16} sx={{ mr: 1.5, mt: 0.5 }} />
            (0908) 816-2318, (0919) 088-2494, (0919) 497-8911, (0939) 088-2494
          </Stack>

          <Stack direction="row" sx={{ typography: { xs: 14, md: 16 }, color: '#6B6C70' }}>
            <Iconify
              icon="mingcute:location-fill"
              color="#0B1E59"
              width={16}
              sx={{ mr: 1.5, mt: 0.5 }}
            />
            8th floor, The Currency Tower, F. Ortigas Jr. Road cor Dona Julia Vargas Ave, Ortigas
            Center Pasig City, Philippines 1600
          </Stack>
        </Stack>

        <Typography sx={{ fontSize: 25, fontWeight: 600, color: '#0B1E59', px: 4, pt: 5 }}>
          Business Hours:
        </Typography>
        <Stack spacing={2} sx={{ px: 4, pt: 2 }}>
          <Stack direction="row" sx={{ typography: { xs: 14, md: 16 }, color: '#6B6C70' }}>
            <Iconify
              icon="mingcute:location-fill"
              color="#0B1E59"
              width={16}
              sx={{ mr: 1.5, mt: 0.5 }}
            />
            Monday - Friday: 8:00am - 5:00pm
          </Stack>
        </Stack>

        <Typography sx={{ fontSize: 25, fontWeight: 600, color: '#0B1E59', px: 4, pt: 5 }}>
          Connect With Us:
        </Typography>
        <Box sx={{ px: 4, pt: 2 }}>
          <Typography fontSize={{ xs: 14, md: 16 }} color="#6B6C70">
            Follow us on social media for updates and more:
          </Typography>
          <Stack direction="row" alignItems="center" gap={2} mt={1}>
            {SOCIALS.map((social) => (
              <Link key={social.name} href={social.href} target="_blank" sx={{ ':hover': { opacity: 0.6 } }}>
                {social.icon}
              </Link>
            ))}
          </Stack>
        </Box>
      </Box>
    </Card>
  );
}
