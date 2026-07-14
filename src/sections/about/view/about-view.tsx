'use client';

import {
  Box,
  List,
  Stack,
  ListItem,
  Container,
  Typography,
  ListItemText,
  ListItemAvatar,
} from '@mui/material';

import { CONFIG } from 'src/config-global';

import { Image } from 'src/components/image';
import { HeroBannerSection } from 'src/components/hero-section/hero-banner-section';

// ----------------------------------------------------------------------

export function AboutView() {
  const list = [
    {
      title: 'Our Mission',
      description: (
        <>
          At PGFinance, we believe that every business deserves a chance to thrive. Our mission is
          to provide accessible and innovative financial solutions that empower SMEs to overcome
          challenges, seize opportunities, and realize their dreams.
        </>
      ),
    },
    {
      title: 'Our Vision',
      description: (
        <>
          Our vision at PGFinance is to be the leading catalyst for economic empowerment, fostering
          a thriving ecosystem where every small and medium-sized enterprise (SME) in the
          Philippines has the opportunity to flourish and realize its fullest potential.
        </>
      ),
    },
  ];
  const valuesList = [
    {
      title: 'Sustainability Initiatives',
      description: (
        <>
          At PGFinance, we recognize our responsibility to not only deliver financial success but
          also to contribute positively to society and the environment. Our commitment to
          Environmental, Social, and Governance (ESG) principles guides our actions as we strive to
          create a more sustainable and equitable future.
        </>
      ),
    },
    {
      title: 'Our Values',
      description: (
        <>
          At PGFinance, <strong>integrity</strong>, <strong>innovation</strong>, and{' '}
          <strong>empowerment</strong> drive everything we do. We&apos;re committed to upholding the
          highest ethical standards, embracing change and innovation, and empowering SMEs to take
          control of their financial future.
        </>
      ),
    },
  ];
  return (
    <>
      <HeroBannerSection
        title={
          <>
            Discover PGFinance:
            <br />
            Empowering SMEs, Driving Growth
          </>
        }
        description="Learn more about PGFinance's commitment to empowering small and medium-sized enterprises (SMEs) and driving economic growth in the Philippines."
        bannerImgUrl="/images/team.jpg"
        isDark
        slotProps={{
          title: { maxWidth: 930 },
          description: { maxWidth: 700 },
        }}
      />

      <Box>
        <Container sx={{ maxWidth: '1280px !important' }}>
          <Box sx={{ textAlign: 'center', pt: { xs: 5, md: 10 }, pb: { sx: 5, md: 10 } }}>
            <Typography
              sx={{
                fontSize: { xs: 35, md: 45 },
                fontWeight: 'bold',
                color: '#0B1E59',
                lineHeight: 'normal',
                maxWidth: 900,
                mx: 'auto',
                mb: 2.5,
              }}
            >
              Prime Global Finance, the SME-focused financing company in the Philippines.
            </Typography>
            <Typography
              fontSize={{ xs: 14, md: 16 }}
              color="#6B6C70"
              sx={{ maxWidth: 850, mx: 'auto' }}
            >
              Established in 1997, PG Finance is a pioneering digital lending company dedicated to
              empowering small and medium-sized enterprises (SMEs) in the vibrant landscape of the
              Philippines. With an unwavering commitment to your success, we have evolved as a
              beacon of financial support, enabling businesses to flourish and achieve their true
              potential.
            </Typography>
          </Box>

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems="center"
            justifyContent="center"
            spacing={7}
            sx={{ pt: { xs: 5, md: 10 }, pb: { xs: 5, md: 20 } }}
          >
            <List sx={{ bgcolor: 'background.paper', pl: 0, width: 1 }}>
              {list.map((item, index) => (
                <ListItem
                  key={index}
                  sx={{
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: { xs: 'center', md: 'flex-start' },
                    textAlign: { xs: 'center', md: 'left' },
                    px: 0,
                    mb: 3,
                  }}
                >
                  <ListItemAvatar>
                    <Image
                      src="/logo/logo-single.svg"
                      alt="PGFinance Logo"
                      sx={{
                        width: { xs: 36, md: 45 },
                        height: { xs: 36, md: 45 },
                        backgroundColor: 'white',
                        mb: { xs: 2, md: 0 },
                        mr: 1.5,
                      }}
                    />
                  </ListItemAvatar>
                  <ListItemText
                    primary={item.title}
                    secondary={
                      <Typography fontSize={{ xs: 14, md: 16 }} color="#545457">
                        {item.description}
                      </Typography>
                    }
                    primaryTypographyProps={{
                      color: '#0B1E59',
                      fontSize: { xs: 25, md: 40 },
                      fontWeight: 'bold',
                      lineHeight: 'normal',
                      mb: 2,
                    }}
                  />
                </ListItem>
              ))}
            </List>

            <Image
              alt="Business Loan"
              src="/images/corporate-handshake-collaboration.jpg"
              ratio="1/1"
              width={1}
              borderRadius="8px"
              sx={{
                height: { xs: 300, md: 400, lg: 500 },
              }}
            />
          </Stack>
        </Container>

        <Box
          sx={{
            overflow: 'hidden',
            position: 'relative',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundImage: `url(${CONFIG.site.basePath}/images/background/wall-design.png)`,
            pb: 5,
            ':after': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: 0,
              zIndex: 0,
              width: '100%',
              height: { xs: 200, md: 400 },
              backgroundColor: 'white',
            },
          }}
        >
          <Container sx={{ maxWidth: '1280px !important', position: 'relative', zIndex: 1 }}>
            <Stack
              direction="column"
              alignItems="center"
              justifyContent="center"
              sx={{
                textAlign: 'center',
                py: { xs: 5, md: 6.625 },
              }}
            >
              <Typography
                sx={{
                  color: '#0B1E59',
                  fontWeight: 'bold',
                  fontSize: { xs: 32, md: 45 },
                  lineHeight: 'normal',
                  maxWidth: 920,
                  mx: 'auto',
                }}
              >
                Prime Global Finance, the SME-focused financing company in the Philippines.

              </Typography>

              <Typography
                variant="body1"
                sx={{
                  color: '#6B6C70',
                  mx: 'auto',
                  mt: 1.875,
                  maxWidth: 600,
                }}
              >
                Watch our video to learn more about PGFinance&apos;s commitment to empowering SMEs
                and driving economic growth in the Philippines.
              </Typography>
            </Stack>
            <Box
              component="img"
              src="/images/thumbnail-image.jpg"
              width={1}
              maxWidth={900}
              height={{ xs: 200, md: 506 }}
              mx="auto"
              display="block"
            />
          </Container>
        </Box>

        <Container>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems="center"
            justifyContent="center"
            spacing={5}
            sx={{ pt: { xs: 5, md: 10 }, pb: { xs: 5, md: 20 } }}
          >
            <Image
              alt="Business Loan"
              src="/images/corporate-team.jpg"
              ratio="1/1"
              width={1}
              borderRadius="8px"
              sx={{ height: { xs: 300, md: 400, lg: 560 } }}
            />

            <List
              sx={{
                bgcolor: 'background.paper',
                width: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}
            >
              {valuesList.map((item, index) => (
                <ListItem
                  key={index}
                  sx={{
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: { xs: 'center', md: 'flex-start' },
                    textAlign: { xs: 'center', md: 'left' },
                    px: 0,
                  }}
                >
                  <ListItemAvatar>
                    <Image
                      src="/logo/logo-single.svg"
                      alt="PGFinance Logo"
                      sx={{
                        width: { xs: 36, md: 45 },
                        height: { xs: 36, md: 45 },
                        backgroundColor: 'white',
                        mb: { xs: 2, md: 0 },
                        mr: 1.5,
                      }}
                    />
                  </ListItemAvatar>
                  <Box>
                    <ListItemText
                      primary={item.title}
                      secondary={<>{item.description}</>}
                      primaryTypographyProps={{
                        color: '#0B1E59',
                        fontSize: { xs: 25, md: 40 },
                        fontWeight: 'bold',
                        lineHeight: 'normal',
                        mb: 2,
                      }}
                      secondaryTypographyProps={{
                        fontSize: { xs: 14, md: 16 },
                        color: '#545457',
                      }}
                    />
                  </Box>
                </ListItem>
              ))}
            </List>
          </Stack>

          <Box py={{ xs: 5, md: 10 }}>
            <Typography
              fontSize={{ xs: 14, md: 18 }}
              fontStyle="italic"
              color="#6B6C70"
              textAlign="center"
              maxWidth={1000}
              mx="auto"
            >
              Join PGFinance in our mission to empower SMEs and drive economic growth in the
              Philippines. Whether you&apos;re a startup or an established enterprise, explore our
              lending solutions, connect with our team, and step into a brighter financial future
              today!
            </Typography>
          </Box>
        </Container>
      </Box>
    </>
  );
}
