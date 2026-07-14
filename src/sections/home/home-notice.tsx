import { useState, useEffect } from 'react';

import { Box, IconButton } from '@mui/material';

import { CONFIG } from 'src/config-global';

import { Image } from 'src/components/image';
import {
  Carousel,
  useCarousel,
  CarouselDotButtons,
  CarouselArrowFloatButtons,
} from 'src/components/carousel';

export function HomeNotice() {
  const [showNotice, setShowNotice] = useState(false);

  const carousel = useCarousel({
    loop: true,
  });

  const images = [
    `${CONFIG.site.basePath}/images/notice/notice1.jpg`,
    `${CONFIG.site.basePath}/images/notice/notice2.jpg`,
    `${CONFIG.site.basePath}/images/notice/notice3.jpg`,
  ];

  useEffect(() => {
    const noticeClosed = localStorage.getItem('noticeClosed');
    if (!noticeClosed) {
      setShowNotice(true);
    }
  }, []);

  if (!showNotice) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 1,
        height: 1,
        zIndex: 1101,
        bgcolor: 'rgb(0,0,0,.30)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          maxWidth: 440,
          width: '90%',
          animation: 'scaleIn 1s ease-out',
          '@keyframes scaleIn': {
            from: {
              transform: 'scale(0)',
              opacity: 0,
            },
            to: {
              transform: 'scale(1)',
              opacity: 1,
            },
          },
        }}
      >
        <IconButton
          sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}
          onClick={() => {
            localStorage.setItem('noticeClosed', 'true');
            setShowNotice(false);
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none">
            <path
              fill="#fff"
              d="M1.4 13.307.69 12.6l5.6-5.6-5.6-5.6L1.4.691l5.6 5.6 5.6-5.6.708.708-5.6 5.6 5.6 5.6-.708.708-5.6-5.6-5.6 5.6Z"
            />
          </svg>
        </IconButton>
        <CarouselDotButtons
          scrollSnaps={carousel.dots.scrollSnaps}
          selectedIndex={carousel.dots.selectedIndex}
          onClickDot={carousel.dots.onClickDot}
          sx={{
            position: 'absolute',
            left: '50%',
            bottom: 10,
            transform: 'translateX(-50%)',
            color: 'primary.main',
          }}
        />

        <CarouselArrowFloatButtons
          {...carousel.arrows}
          options={carousel.options}
          slotProps={{
            prevBtn: {
              sx: { bgcolor: 'white', color: '#344054', borderRadius: '100%' },
            },
            nextBtn: {
              sx: { bgcolor: 'white', color: '#344054', borderRadius: '100%' },
            },
          }}
        />

        <Carousel carousel={carousel} sx={{ color: 'common.white', height: 1 }}>
          {images.map((src, index) => (
            <Image
              key={index}
              src={src}
              alt={`Banner Image ${index + 1}`}
              sx={{ width: 1, height: 1, objectFit: 'cover' }}
            />
          ))}
        </Carousel>
      </Box>
    </Box>
  );
}
