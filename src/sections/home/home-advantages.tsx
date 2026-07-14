import {
  Box,
  Grid,
  List,
  ListItem,
  Container,
  Typography,
  ListItemText,
  ListItemAvatar,
} from '@mui/material';

import { Image } from 'src/components/image';

export function HomeAdvantages() {
  const list = [
    {
      title: 'Unlock New Opportunities',
      description: (
        <>
          We offer access to <strong>bank take-out loans</strong>, a solution utilized by
          <strong>15% of our satisfied clients</strong>. This opens doors to potentially larger loan
          amounts to fuel your business growth.
        </>
      ),
    },
    {
      title: 'Fast and Efficient',
      description: (
        <>
          Experience quick loan approvals within <strong>7 working days</strong> upon complete
          submission of documents. No more waiting around for lengthy approvals to slow you down.
        </>
      ),
    },
    {
      title: 'Added Value, Reduced Costs',
      description: (
        <>
          Enjoy exclusive <strong>discounted fire insurance</strong> on approved loans. This
          provides essential coverage for your business while saving you money on premiums.
        </>
      ),
    },
  ];
  return (
    <Box py={{ xs: 10, md: 15 }}>
      <Container sx={{ maxWidth: '1280px !important' }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sx={{ p: 0, order: 1 }}>
            <Box sx={{ maxWidth: 945, textAlign: 'center', mx: 'auto', mb: { xs: 2, md: 10 } }}>
              <Typography
                color="#0B1E59"
                fontWeight={600}
                fontSize={{ xs: 35, md: 45 }}
                lineHeight="normal"
                mb={2}
              >
                The Smarter Choice for Filipino Businesses: Why Choose PGFinance?
              </Typography>
              <Typography fontSize={{ xs: 14, md: 16 }} color="#6B6C70">
                At PGFinance, we&apos;re dedicated to helping Filipino businesses thrive.
                Here&apos;s what sets us apart and makes us the smarter choice for your financing
                needs:
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6} sx={{ p: 0, order: { xs: 3, md: 2 } }}>
            <List
              sx={{
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'background.paper',
                gap: { xs: 5, md: 3 },
              }}
            >
              {list.map((item, index) => (
                <ListItem
                  key={index}
                  alignItems="flex-start"
                  sx={{
                    flexDirection: { xs: 'column', md: 'row' },
                    textAlign: { xs: 'center', md: 'left' },
                    gap: { xs: 1, md: 2 },
                  }}
                >
                  <ListItemAvatar sx={{ mx: { xs: 'auto', md: 0 } }}>
                    <Image
                      src="/logo/logo-single.svg"
                      alt="PGFinance Logo"
                      sx={{
                        backgroundColor: 'white',
                        width: { xs: 36, md: 45 },
                        height: { xs: 36, md: 45 },
                      }}
                    />
                  </ListItemAvatar>
                  <ListItemText
                    primary={item.title}
                    secondary={
                      <Typography variant="body1" color="#545457">
                        {item.description}
                      </Typography>
                    }
                    primaryTypographyProps={{
                      color: '#0B1E59',
                      fontSize: 20,
                      fontWeight: 600,
                      mb: 1,
                    }}
                    sx={{
                      mt: 2,
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Grid>
          <Grid item xs={12} md={6} sx={{ order: { xs: 2, md: 3 } }}>
            <Image
              alt="Business Loan"
              src="/images/entrance-greeting.png"
              ratio="1/1"
              width={1}
              borderRadius="8px"
              sx={{ height: { xs: 300, md: 400, lg: 500 } }}
            />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
