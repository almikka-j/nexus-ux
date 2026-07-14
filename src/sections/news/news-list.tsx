import React from 'react';

import { Box, Card, Stack, Button, Typography, CardContent } from '@mui/material';

import { maxLine } from 'src/theme/styles';

import { Image } from 'src/components/image';

const newsData = [
  {
    id: '1',
    image: '/images/news/news1.jpg',
    title: 'PGFC and Philippine Guarantee Corporation partners for accessible housing loans',
  },
  {
    id: '2',
    image: '/images/news/news2.png',
    title: 'PGFinance 1st Loan Agents Convention',
  },
  {
    id: '3',
    image: '/images/news/news3.png',
    title: 'Empower your business with Prime Global Finance: The No. 1 Lending Partner',
  },
];

export default function NewsList() {
  return (
    <Box sx={{ py: 3 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 2,
          px: 0,
        }}
      >
        {newsData?.map((item: { id: string; image: string; title: string }) => (
          <Card
            key={item.id || `fallback-${Math.random()}`}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              boxShadow: 'none',
              px: 0,
            }}
          >
            <Image
              src={item.image}
              alt={item.title}
              sx={{
                maxWidth: 412,
                width: 1,
                height: 240,
                objectFit: 'cover',
              }}
            />
            <CardContent sx={{ display: 'flex', flexDirection: 'column', flex: 1, px: 0, py: 1 }}>
              <Box mb={2}>
                <Typography
                  variant="caption"
                  color="#83B0D9"
                  fontWeight={600}
                  textTransform="uppercase"
                >
                  Caption
                </Typography>
                <Typography
                  sx={{
                    fontSize: 24,
                    fontWeight: 600,
                    lineHeight: 'normal',
                    marginTop: 1,
                    ...maxLine({ line: 2 }),
                  }}
                >
                  {item.title}
                </Typography>
              </Box>
              <Stack direction="row" justifyContent="start">
                <Button
                  href="#!"
                  sx={{
                    bgcolor: '#E9EBF5',
                    color: '#233997',
                    borderRadius: '20px',
                    px: 2,
                    py: 0,
                    gap: 1,
                  }}
                >
                  Read More
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="12" fill="none">
                    <path
                      fill="#233997"
                      d="m12.364 11.42-1.17-1.164 3.505-3.5H0V5.062h14.699l-3.506-3.505 1.17-1.16 5.512 5.512-5.511 5.512Z"
                    />
                  </svg>
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
