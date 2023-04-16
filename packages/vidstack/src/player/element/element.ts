import { effect, getScope, onDispose, scoped } from 'maverick.js';
import {
  defineCustomElement,
  onAttach,
  onConnect,
  type AttributesRecord,
} from 'maverick.js/element';
import {
  camelToKebabCase,
  dispatchEvent,
  isNull,
  listenEvent,
  mergeProperties,
  noop,
} from 'maverick.js/std';

import { createLogPrinter } from '../../foundation/logger/log-printer';
import { useFocusVisible } from '../../foundation/observers/use-focus-visible';
import { createMediaController } from '../media/controller/create-controller';
import type { AnyMediaProvider } from '../media/controller/types';
import type { MediaState } from '../media/state';
import { isTrackCaptionKind } from '../media/tracks/text/text-track';
import { useKeyboard } from './keyboard';
import { mediaPlayerProps } from './props';
import type { MediaPlayerConnectEvent, MediaPlayerElement } from './types';

declare global {
  interface HTMLElementTagNameMap {
    'media-player': MediaPlayerElement;
  }

  interface HTMLElementEventMap {
    'media-player-connect': MediaPlayerConnectEvent;
  }
}

const MEDIA_ATTRIBUTES: (keyof MediaState)[] = [
  'autoplay',
  'autoplayError',
  'canFullscreen',
  'canPictureInPicture',
  'canLoad',
  'canPlay',
  'canSeek',
  'ended',
  'error',
  'fullscreen',
  'loop',
  'live',
  'liveEdge',
  'mediaType',
  'muted',
  'paused',
  'pictureInPicture',
  'playing',
  'playsinline',
  'seeking',
  'started',
  'streamType',
  'userIdle',
  'viewType',
  'waiting',
];

export const PlayerDefinition = defineCustomElement<MediaPlayerElement>({
  tagName: 'media-player',
  props: mediaPlayerProps,
  setup({ host, props, accessors }) {
    const scope = getScope()!,
      controller = createMediaController(props),
      context = controller._context,
      $media = context.$store;

    if (__DEV__) {
      const logPrinter = createLogPrinter(host.$el);
      effect(() => void (logPrinter.logLevel = props.$logLevel()));
    }

    onAttach(() => {
      host.el!.setAttribute('tabindex', '0');
      if (!host.el!.hasAttribute('aria-label')) {
        host.el!.setAttribute('aria-label', 'Media Player');
      }
      context.$player.set(host.el);
      context.remote.setTarget(host.el!);
      context.remote.setPlayer(host.el!);
      listenEvent(host.el!, 'find-media-player', ({ detail }) => detail(host.el));
    });

    onConnect(() => {
      dispatchEvent(host.el, 'media-player-connect', {
        detail: host.el!,
        bubbles: true,
        composed: true,
      });

      window.requestAnimationFrame(() => {
        if (isNull($media.canLoadPoster)) $media.canLoadPoster = true;
      });
    });

    context.ariaKeys = {};
    context.$keyShortcuts = props.$keyShortcuts;
    useKeyboard(context, props);
    useFocusVisible(host.$el);

    const $attrs: AttributesRecord = {
      'aspect-ratio': props.$aspectRatio,
      'data-captions': () => !!$media.textTrack && isTrackCaptionKind($media.textTrack),
      'data-ios-controls': context.$iosControls,
    };

    const mediaAttrName = {
      canPictureInPicture: 'can-pip',
      pictureInPicture: 'pip',
    };

    for (const prop of MEDIA_ATTRIBUTES) {
      $attrs['data-' + (mediaAttrName[prop] ?? camelToKebabCase(prop as string))] = () =>
        $media[prop] as string | number;
    }

    host.setAttributes($attrs);

    host.setCSSVars({
      '--media-aspect-ratio': () => {
        const ratio = props.$aspectRatio();
        return ratio ? +ratio.toFixed(4) : null;
      },
      '--media-buffered': () => +$media.bufferedEnd.toFixed(3),
      '--media-current-time': () => +$media.currentTime.toFixed(3),
      '--media-duration': () =>
        Number.isFinite($media.duration) ? +$media.duration.toFixed(3) : 0,
    });

    onDispose(() => {
      dispatchEvent(host.el, 'destroy');
    });

    return mergeProperties(
      accessors(),
      {
        get user() {
          return controller._request._user;
        },
        get orientation() {
          return controller._request._orientation;
        },
        get provider() {
          return context.$provider() as AnyMediaProvider;
        },
        get qualities() {
          return context.qualities;
        },
        get audioTracks() {
          return context.audioTracks;
        },
        get textTracks() {
          return context.textTracks;
        },
        get textRenderers() {
          return context.textRenderers;
        },
        get $store() {
          return $media;
        },
        state: new Proxy($media, {
          // @ts-expect-error
          set: noop,
        }),
        subscribe: (callback) => scoped(() => effect(() => callback($media)), scope)!,
        startLoading: controller._start,
        play: controller._request._play,
        pause: controller._request._pause,
        seekToLiveEdge: controller._request._seekToLiveEdge,
        enterFullscreen: controller._request._enterFullscreen,
        exitFullscreen: controller._request._exitFullscreen,
        enterPictureInPicture: controller._request._enterPictureInPicture,
        exitPictureInPicture: controller._request._exitPictureInPicture,
      },
      controller._provider,
    );
  },
});
