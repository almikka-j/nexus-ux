import Autoplay from 'embla-carousel-autoplay';

import { Box } from '@mui/material';

import { CONFIG } from 'src/config-global';

import { Carousel, useCarousel, CarouselDotButtons } from 'src/components/carousel';

export function HomeCarousel() {
  const carousel = useCarousel(
    {
      loop: true,
    },
    [Autoplay({ playOnInit: true })]
  );

  const images = [
    `${CONFIG.site.basePath}/images/barista-woman.jpg`,
    `${CONFIG.site.basePath}/images/barista-man.jpg`,
    `${CONFIG.site.basePath}/images/businessman.jpg`,
  ];

  return (
    <Box
      sx={{
        position: 'absolute',
        right: 0,
        top: 0,
        zIndex: 1,
        width: '45vw',
        height: { lg: 720, xl: 960 },
        bgcolor: '#F3F4F4',
        display: { xs: 'none', md: 'block' },
      }}
    >
      <CarouselDotButtons
        scrollSnaps={carousel.dots.scrollSnaps}
        selectedIndex={carousel.dots.selectedIndex}
        onClickDot={carousel.dots.onClickDot}
        sx={{ left: 15, bottom: 15, position: 'absolute', color: 'primary.main' }}
      />

      <Carousel carousel={carousel} sx={{ color: 'common.white', height: 1 }}>
        {images.map((src, index) => (
          <Box
            component="img"
            key={index}
            src={src}
            alt={`Banner Image ${index + 1}`}
            sx={{ width: 1, height: 1, objectFit: 'cover', objectPosition: 'top' }}
          />
        ))}
      </Carousel>
    </Box>
  );
}
