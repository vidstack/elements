/* c8 ignore next 1000 */

import { vdsEvent } from '@base/events/index';

import { CanPlay } from '../../CanPlay';
import { mediaContext } from '../../context';
import { MediaProviderElement } from '../../provider/MediaProviderElement';

export const FAKE_MEDIA_PROVIDER_ELEMENT_TAG_NAME = 'vds-fake-media-provider';

/**
 * A fake media provider that's used for testing. This class alone does nothing special. It can
 * be combined with Sinon spies/stubs/mocks to set the provider in the desired state.
 */
export class FakeMediaProviderElement extends MediaProviderElement {
  constructor() {
    super();
    this._defineContextAccessors();
  }

  /**
   * Used to define accessors that are used during testing to update the context object.
   *
   * @protected
   */
  _defineContextAccessors() {
    Object.keys(mediaContext).forEach((ctxProp) => {
      Object.defineProperty(this, `${ctxProp}Context`, {
        get: () => {
          // @ts-expect-error
          return this.ctx[ctxProp];
        },
        set: (newValue) => {
          // Only run context updates after we've connected to the DOM so we update the inject
          // media context object on the `MediaControllerElement`.
          this._connectedQueue.queue(`contextUpdate[${ctxProp}]`, () => {
            // @ts-expect-error
            this.ctx[ctxProp] = newValue;
          });
        }
      });
    });
  }

  // -------------------------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------------------------

  override connectedCallback() {
    super.connectedCallback();
    if (this.canPlay) this.forceMediaReady();
  }

  // -------------------------------------------------------------------------------------------
  // Provider Methods
  // -------------------------------------------------------------------------------------------

  forceMediaReady() {
    this._handleMediaReady();
  }

  _getCurrentTime() {
    return this.ctx.currentTime;
  }

  _setCurrentTime(time: number) {
    this.ctx.currentTime = time;
    this.dispatchEvent(vdsEvent('vds-time-update', { detail: time }));
  }

  _getMuted() {
    return this.ctx.muted;
  }

  _setMuted(muted: boolean) {
    this.ctx.muted = muted;
    this.dispatchEvent(
      vdsEvent('vds-volume-change', {
        detail: {
          volume: this.ctx.volume,
          muted
        }
      })
    );
  }

  _getPaused() {
    return this.ctx.paused;
  }

  _getVolume() {
    return this.ctx.volume;
  }

  _setVolume(volume: number) {
    this.ctx.volume = volume;
    this.dispatchEvent(
      vdsEvent('vds-volume-change', {
        detail: {
          volume,
          muted: this.ctx.muted
        }
      })
    );
  }

  // -------------------------------------------------------------------------------------------
  // Readonly Properties
  // -------------------------------------------------------------------------------------------

  get engine() {
    return undefined;
  }

  // -------------------------------------------------------------------------------------------
  // Playback
  // -------------------------------------------------------------------------------------------

  canPlayType() {
    return CanPlay.No;
  }

  async play() {
    this.ctx.paused = false;
    this.dispatchEvent(vdsEvent('vds-play'));
  }

  async pause() {
    this.ctx.paused = true;
    this.dispatchEvent(vdsEvent('vds-pause'));
  }

  // -------------------------------------------------------------------------------------------
  // Fullscreen
  // -------------------------------------------------------------------------------------------

  override async requestFullscreen() {
    this.ctx.fullscreen = true;
  }

  override async exitFullscreen() {
    this.ctx.fullscreen = false;
  }
}
