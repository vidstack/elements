import { html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

import { DisposalBin, hostedEventListener, vdsEvent } from '../../base/events';
import { IntersectionController, PageController } from '../../base/observers';
import type { MediaProviderElement } from '../provider';

/**
 * This element is responsible for managing a `MediaProviderElement` as viewport or page
 * visibility changes occur.
 *
 * Management includes:
 *
 * - Playback or volume changes when page visibility changes (eg: user changes tab or device
 * sleeps).
 *
 * - Playback or volume changes when viewport visibility changes (eg: user scrolls video in and
 * out of view).
 *
 * @tagname vds-media-visibility
 * @slot - Used to pass in content, typically a media player/provider.
 * @example
 * ```html
 * <vds-media-visibility
 *   on-enter="play"
 *   on-exit="pause"
 * >
 *   <!-- ... -->
 * </vds-media-visibility>
 * ```
 */
export class MediaVisibilityElement extends LitElement {
  /**
   * The action to perform on the media provider when it becomes active by either entering
   * the viewport, or the page becomes visible.
   *
   * @default undefined
   */
  @property({ attribute: 'on-enter' })
  onEnter?: 'play' | 'unmute';

  /**
   * The action to perform on the media provider when it becomes inactive by either exiting
   * the viewport, or the page becomes hidden.
   *
   * @default undefined
   */
  @property({ attribute: 'on-exit' })
  onExit?: 'pause' | 'mute';

  /**
   * The type of page state to use when determining visibility.
   *
   * - **state:** Refers to the page lifecycle state. This is typically what you want.
   * - **visibility:** Visible here means the page content may be at least partially visible. In
   * practice, this means that the page is the foreground tab of a non-minimized window.
   *
   *💡 Need help making a decision?
   *
   * - Use `state` when you want completely visible / not visible.
   * - Use `visibility` when you want partially visible / not visible.
   *
   * @default 'state'
   */
  @property({ attribute: 'page-change-type' })
  pageChangeType: 'state' | 'visibility' = 'state';

  /**
   * A DOM query selector for the element that is used as the viewport for checking visibility
   * of the media player. Must be a ancestor of the media player. Defaults to the browser viewport
   * if not specified.
   *
   * @default undefined
   */
  @property({ attribute: 'intersection-root' })
  intersectionRoot?: string;

  /**
   * A number which indicates at what percentage of the media player's visibility the observer's
   * `onEnter` and `onExit` actions should be triggered.
   *
   * @default 1
   */
  @property({ type: Number, attribute: 'intersection-threshold' })
  intersectionThreshold = 1;

  // -------------------------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------------------------

  protected _isIntersecting = false;

  get isIntersecting() {
    return this._isIntersecting;
  }

  // -------------------------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------------------------

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._hasIntersected = false;
    this._mediaProviderDisposal.empty();
  }

  override render() {
    return html`<slot></slot>`;
  }

  // -------------------------------------------------------------------------------------------
  // Media Provider Connect
  // -------------------------------------------------------------------------------------------

  protected _mediaProvider?: MediaProviderElement;
  protected _mediaProviderDisposal = new DisposalBin();

  get mediaProvider() {
    return this._mediaProvider;
  }

  protected _handleMediaProviderConnect = hostedEventListener(
    this,
    'vds-media-provider-connect',
    (event) => {
      const { element, onDisconnect } = event.detail;

      this._mediaProvider = element;

      this._mediaProviderDisposal.add(() => {
        this._mediaProvider = undefined;
      });

      onDisconnect(() => {
        this._mediaProviderDisposal.empty();
      });
    }
  );

  // -------------------------------------------------------------------------------------------
  // Observers
  // -------------------------------------------------------------------------------------------

  protected _hasIntersected = false;

  protected intersectionController = new IntersectionController(
    this,
    {
      root: this.intersectionRoot
        ? document.querySelector(this.intersectionRoot)
        : null,
      threshold: this.intersectionThreshold
    },
    (entries) => {
      const entry = entries[0];

      this._isIntersecting = entry.isIntersecting;

      // Skip first, we only want as we enter/exit viewport (not initial load).
      if (this._hasIntersected) {
        if (entry.isIntersecting) {
          this._triggerOnEnter();
        } else if (this.onExit) {
          this._isIntersecting = false;
          this._triggerOnExit();
        }
      }

      this._hasIntersected = true;
      this._dispatchVisibilityChange();
    }
  );

  protected pageController = new PageController(
    this,
    ({ state, visibility }) => {
      if (this.isIntersecting) {
        const newState = this.pageChangeType === 'state' ? state : visibility;

        if (newState === 'hidden') {
          this._triggerOnExit();
        } else if (this.onEnter) {
          this._triggerOnEnter();
        }
      }

      this._dispatchVisibilityChange();
    }
  );

  // -------------------------------------------------------------------------------------------
  // Triggers
  // -------------------------------------------------------------------------------------------

  protected _triggerOnEnter() {
    if (!this._mediaProvider) return;

    if (this.onEnter === 'play') {
      this._mediaProvider.paused = false;
    } else if (this.onEnter === 'unmute') {
      this._mediaProvider.muted = false;
    }
  }

  protected _triggerOnExit() {
    if (!this._mediaProvider) return;

    if (this.onExit === 'pause') {
      this._mediaProvider.paused = true;
    } else if (this.onExit === 'mute') {
      this._mediaProvider.muted = true;
    }
  }

  protected _dispatchVisibilityChange() {
    if (!this._mediaProvider) return;

    this.dispatchEvent(
      vdsEvent('vds-media-visibility-change', {
        bubbles: true,
        composed: true,
        detail: {
          provider: this._mediaProvider,
          viewport: {
            isIntersecting: this.isIntersecting
          },
          page: {
            state: this.pageController.state,
            visibility: this.pageController.visibility
          }
        }
      })
    );
  }
}
