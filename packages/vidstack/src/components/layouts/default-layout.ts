import {
  Component,
  createContext,
  prop,
  provideContext,
  useContext,
  type ReadSignal,
} from 'maverick.js';

import { PlayerQueryList } from '../../core';
import type { ThumbnailSrc } from '../ui/thumbnails/thumbnail-loader';

export class DefaultLayout extends Component<DefaultLayoutProps> {
  static props: DefaultLayoutProps = {
    when: '',
    smallWhen: '',
    thumbnails: null,
    customIcons: false,
    translations: null,
    menuGroup: 'bottom',
    noModal: false,
    sliderChaptersMinWidth: 600,
    disableTimeSlider: false,
    noGestures: false,
    noKeyboardActionDisplay: false,
  };

  // slider-chapters-min-width

  private _whenQueryList!: PlayerQueryList;
  private _whenSmQueryList!: PlayerQueryList;

  @prop
  menuContainer: HTMLElement | null = null;

  @prop
  get isMatch() {
    return this._whenQueryList.matches;
  }

  @prop
  get isSmallLayout() {
    return this._whenSmQueryList.matches;
  }

  protected override onSetup(): void {
    const {
      when,
      smallWhen,
      thumbnails,
      translations,
      menuGroup,
      noModal,
      sliderChaptersMinWidth,
      disableTimeSlider,
      noGestures,
      noKeyboardActionDisplay,
    } = this.$props;

    this._whenQueryList = PlayerQueryList.create(when);
    this._whenSmQueryList = PlayerQueryList.create(smallWhen);

    this.setAttributes({
      'data-match': this._whenQueryList.$matches,
      'data-size': () => (this._whenSmQueryList.matches ? 'sm' : null),
    });

    const self = this;
    provideContext(defaultLayoutContext, {
      smQueryList: this._whenSmQueryList,
      thumbnails,
      translations,
      menuGroup,
      noModal,
      sliderChaptersMinWidth,
      disableTimeSlider,
      noGestures,
      noKeyboardActionDisplay,
      get menuContainer() {
        return self.menuContainer;
      },
    });
  }
}

/**
 * The audio layout is our production-ready UI that's displayed when the media view type is set to
 * 'audio'. It includes support for audio tracks, slider chapters, and captions out of the box. It
 * doesn't support live streams just yet.
 *
 * @attr data-match - Whether this layout is being used (query match).
 * @attr data-size - The active layout size.
 */
export class DefaultAudioLayout extends DefaultLayout {
  static override props: DefaultLayoutProps = {
    ...super.props,
    when: '(view-type: audio)',
    smallWhen: '(width < 576)',
  };
}

/**
 * The video layout is our production-ready UI that's displayed when the media view type is set to
 * 'video'. It includes support for picture-in-picture, fullscreen, slider chapters, slider
 * previews, captions, and audio/quality settings out of the box. It doesn't support live
 * streams just yet.
 *
 * @attr data-match - Whether this layout is being used (query match).
 * @attr data-size - The active layout size.
 */
export class DefaultVideoLayout extends DefaultLayout {
  static override props: DefaultLayoutProps = {
    ...super.props,
    when: '(view-type: video)',
    smallWhen: '(width < 576) or (height < 380)',
  };
}

export interface DefaultLayoutProps {
  /**
   * A player query string that determines when the UI should be displayed. The special string
   * 'never' will indicate that the UI should never be displayed.
   */
  when: string;
  /**
   * A player query string that determines when the small (e.g., mobile) UI should be displayed. The
   * special string 'never' will indicate that the small device optimized UI should never be
   * displayed.
   */
  smallWhen: string;
  /**
   * The thumbnails resource.
   *
   * @see {@link https://www.vidstack.io/docs/wc/player/core-concepts/loading#thumbnails}
   */
  thumbnails: ThumbnailSrc;
  /**
   * Whether the default icons should _not_ be loaded. Set this to `true` when providing your own
   * icons.
   */
  customIcons: boolean;
  /**
   * Translation map from english to your desired language for words used throughout the layout.
   */
  translations: DefaultLayoutTranslations | null;
  /**
   * Specifies whether menu buttons should be placed in the top or bottom controls group. This
   * only applies to the large video layout.
   */
  menuGroup: 'top' | 'bottom';
  /**
   * Whether modal menus should be disabled when the small layout is active. A modal menu is
   * a floating panel that floats up from the bottom of the screen (outside of the player). It's
   * enabled by default as it provides a better user experience for touch devices.
   */
  noModal: boolean;
  /**
   * The minimum width to start displaying slider chapters when available.
   */
  sliderChaptersMinWidth: number;
  /**
   * Whether the time slider should be disabled.
   */
  disableTimeSlider: boolean;
  /**
   * Whether all gestures such as press to play or seek should not be active.
   */
  noGestures: boolean;
  /**
   * Whether keyboard actions should not be displayed.
   */
  noKeyboardActionDisplay: boolean;
}

export interface DefaultLayoutContext {
  smQueryList: PlayerQueryList;
  thumbnails: ReadSignal<ThumbnailSrc>;
  translations: ReadSignal<DefaultLayoutTranslations | null>;
  noModal: ReadSignal<DefaultLayoutProps['noModal']>;
  menuGroup: ReadSignal<DefaultLayoutProps['menuGroup']>;
  sliderChaptersMinWidth: ReadSignal<DefaultLayoutProps['sliderChaptersMinWidth']>;
  menuContainer: HTMLElement | null;
  disableTimeSlider: ReadSignal<boolean>;
  noGestures: ReadSignal<boolean>;
  noKeyboardActionDisplay: ReadSignal<boolean>;
}

export interface DefaultLayoutTranslations {
  'Closed-Captions Off': string;
  'Closed-Captions On': string;
  'Enter Fullscreen': string;
  'Enter PiP': string;
  'Exit Fullscreen': string;
  'Exit PiP': string;
  'Seek Backward': string;
  'Seek Forward': string;
  AirPlay: string;
  Audio: string;
  Auto: string;
  Captions: string;
  Chapters: string;
  Connected: string;
  Connecting: string;
  Disconnected: string;
  Default: string;
  LIVE: string;
  Mute: string;
  Normal: string;
  Off: string;
  Pause: string;
  Play: string;
  Quality: string;
  Seek: string;
  Settings: string;
  'Skip To Live': string;
  Speed: string;
  Unmute: string;
  Volume: string;
}

export function getDefaultLayoutLang(
  translations: ReadSignal<DefaultLayoutTranslations | null>,
  word: keyof DefaultLayoutTranslations,
) {
  return translations()?.[word] ?? word;
}

export const defaultLayoutContext = createContext<DefaultLayoutContext>();

export function useDefaultLayoutContext() {
  return useContext(defaultLayoutContext);
}
