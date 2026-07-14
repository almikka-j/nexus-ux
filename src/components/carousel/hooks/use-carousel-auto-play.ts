import type { EmblaCarouselType } from 'embla-carousel';

import { useState, useCallback } from 'react';

import type { UseCarouselAutoPlayReturn } from '../types';

// ----------------------------------------------------------------------

export function useCarouselAutoPlay(mainApi?: EmblaCarouselType): UseCarouselAutoPlayReturn {
  const [isPlaying] = useState(false);

  const onClickAutoplay = useCallback((callback: () => void) => {
    // const autoplay = mainApi?.plugins()?.autoplay;
    // if (!autoplay) return;
    // const resetOrStop =
    //   autoplay.options.stopOnInteraction === false ? autoplay.reset : autoplay.stop;
    // resetOrStop();
    // callback();
  }, []);

  const onTogglePlay = useCallback(() => {
    // const autoplay = mainApi?.plugins()?.autoplay;
    // if (!autoplay) return;
    // const playOrStop = autoplay.isPlaying() ? autoplay.stop : autoplay.play;
    // playOrStop();
  }, []);

  // useEffect(() => {
  //   const autoplay = mainApi?.plugins()?.autoplay;
  //   if (!autoplay) return;

  //   setIsPlaying(autoplay.isPlaying());
  //   mainApi
  //     .on('autoplay:play', () => setIsPlaying(true))
  //     .on('autoplay:stop', () => setIsPlaying(false))
  //     .on('reInit', () => setIsPlaying(false));
  // }, [mainApi]);

  return { isPlaying, onTogglePlay, onClickAutoplay };
}
