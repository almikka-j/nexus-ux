import React from 'react';

import { Box, Grid, Rating, Container, Typography } from '@mui/material';

export function HomeTestimonial() {
  return (
    <Box pt={{ xs: 5, xl: 10 }} pb={{ xs: 10, md: 15 }}>
      <Container
        maxWidth={false}
        sx={{
          maxWidth: '1280px',
          display: 'flex',
          position: 'relative',
        }}
      >
        <Grid container spacing={7} alignItems="center">
          <Grid item xs={12} md={7} display="flex" justifyContent="flex-end">
            <Box
              component="video"
              controls
              poster="/images/testimonial-poster.png"
              sx={{
                width: '95%',
                borderRadius: 2,
                boxShadow: 3,
              }}
            >
              <source
                src="https://hortaleza-web.s3.ap-southeast-1.amazonaws.com/videos/testimonial.mp4"
                type="video/mp4"
              />
              Your browser does not support the video tag.
            </Box>
          </Grid>

          <Grid item xs={12} md={5}>
            <Box maxWidth={430} textAlign={{ xs: 'center', md: 'left' }}>
              <Typography
                color="#0B1E59"
                fontSize={{ xs: 30, md: 45 }}
                fontWeight="bold"
                lineHeight="normal"
                gutterBottom
              >
                Real Stories.
                <br />
                Real Progress.
              </Typography>
              <Typography variant="body2" color="#6B6C70" mb={{ xs: 5, md: 10 }}>
                See how PG Finance is moving people forward—one success story at a time.
              </Typography>

              <Rating value={5} readOnly sx={{ mb: 1 }} />
              <Typography variant="body2" fontWeight="medium" color="text.primary">
                Mr. & Mrs. Nazaire
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
