import { useReactContext } from 'maverick.js/react';
import type { RefObject } from 'react';
import {
  sliderStore,
  sliderStoreContext,
  type MediaSliderElement,
  type SliderStore,
} from 'vidstack';

import { useStore } from './use-store';

/**
 * This hook is used to subscribe to the current slider state on the given or nearest
 * slider element (e.g., `<media-slider>`, `<media-time-slider>`, `<media-volume-slider>`).
 *
 * @docs {@link https://vidstack.io/docs/react/player/components/sliders/slider#subscribe}
 */
export function useSliderStore(ref?: RefObject<MediaSliderElement | null>): SliderStore {
  const $store = useReactContext(sliderStoreContext);

  if (__DEV__ && !$store && !ref) {
    console.warn(
      `[vidstack] \`useSliderStore\` requires \`RefObject<MediaSliderElement>\` argument if called` +
        ' outside a media slider component',
    );
  }

  return useStore(sliderStore, ref, $store);
}
