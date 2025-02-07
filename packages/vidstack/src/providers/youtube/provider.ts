import { createScope, effect, signal } from 'maverick.js';
import {
  deferredPromise,
  isBoolean,
  isNumber,
  isObject,
  isString,
  isUndefined,
  type DeferredPromise,
} from 'maverick.js/std';

import type { MediaContext } from '../../core/api/media-context';
import type { Src } from '../../core/api/src-types';
import { TimeRange } from '../../core/time-ranges';
import { preconnect } from '../../utils/network';
import { EmbedProvider } from '../embed/EmbedProvider';
import type { MediaProviderAdapter } from '../types';
import type { YouTubeCommand, YouTubeCommandArg } from './embed/command';
import type { YouTubeMessage } from './embed/message';
import type { YouTubeParams } from './embed/params';
import { YouTubePlayerState, type YouTubePlayerStateValue } from './embed/state';
import { resolveYouTubeVideoId } from './utils';

/**
 * This provider enables loading videos uploaded to YouTube (youtube.com) via embeds.
 *
 * @docs {@link https://www.vidstack.io/docs/player/providers/youtube}
 * @see {@link https://developers.google.com/youtube/iframe_api_reference}
 * @example
 * ```html
 * <media-player src="youtube/_cMxraX_5RE">
 *   <media-provider></media-provider>
 * </media-player>
 * ```
 */
export class YouTubeProvider
  extends EmbedProvider<YouTubeMessage>
  implements MediaProviderAdapter, Pick<YouTubeParams, 'color' | 'start' | 'end'>
{
  protected readonly $$PROVIDER_TYPE = 'YOUTUBE';

  readonly scope = createScope();

  readonly #ctx: MediaContext;

  #videoId = signal('');
  #state: YouTubePlayerStateValue = -1;
  #currentSrc: Src<string> | null = null;

  #seekingTimer = -1;
  #invalidPlay = false;

  #promises = new Map<string, DeferredPromise<any, string>[]>();

  constructor(iframe: HTMLIFrameElement, ctx: MediaContext) {
    super(iframe);
    this.#ctx = ctx;
  }

  /**
   * Sets the player's interface language. The parameter value is an ISO 639-1 two-letter
   * language code or a fully specified locale. For example, fr and fr-ca are both valid values.
   * Other language input codes, such as IETF language tags (BCP 47) might also be handled properly.
   *
   * The interface language is used for tooltips in the player and also affects the default caption
   * track. Note that YouTube might select a different caption track language for a particular
   * user based on the user's individual language preferences and the availability of caption tracks.
   *
   * @defaultValue 'en'
   */
  language = 'en';
  color: 'white' | 'red' = 'red';

  /**
   * Whether cookies should be enabled on the embed. This is turned off by default to be
   * GDPR-compliant.
   *
   * @defaultValue `false`
   */
  cookies = false;

  get currentSrc(): Src<string> | null {
    return this.#currentSrc;
  }

  get type() {
    return 'youtube';
  }

  get videoId() {
    return this.#videoId();
  }

  preconnect() {
    preconnect(this.getOrigin());
  }

  override setup() {
    super.setup();
    effect(this.#watchVideoId.bind(this));
    this.#ctx.notify('provider-setup', this);
  }

  destroy() {
    this.#reset();

    // Release all pending promises.
    const message = 'provider destroyed';
    for (const promises of this.#promises.values()) {
      for (const { reject } of promises) reject(message);
    }

    this.#promises.clear();
  }

  async play() {
    return this.#remote('playVideo');
  }

  #playFail(message: string) {
    this.#getPromise('playVideo')?.reject(message);
  }

  async pause() {
    return this.#remote('pauseVideo');
  }

  #pauseFail(message: string) {
    this.#getPromise('pauseVideo')?.reject(message);
  }

  setMuted(muted: boolean) {
    if (muted) this.#remote('mute');
    else this.#remote('unMute');
  }

  setCurrentTime(time: number) {
    this.#remote('seekTo', time);
    this.#ctx.notify('seeking', time);
  }

  setVolume(volume: number) {
    this.#remote('setVolume', volume * 100);
  }

  setPlaybackRate(rate: number) {
    this.#remote('setPlaybackRate', rate);
  }

  async loadSource(src: Src) {
    if (!isString(src.src)) {
      this.#currentSrc = null;
      this.#videoId.set('');
      return;
    }

    const videoId = resolveYouTubeVideoId(src.src);
    this.#videoId.set(videoId ?? '');

    this.#currentSrc = src as Src<string>;
  }

  protected override getOrigin() {
    return !this.cookies ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com';
  }

  #watchVideoId() {
    this.#reset();

    const videoId = this.#videoId();

    if (!videoId) {
      this.src.set('');
      return;
    }

    this.src.set(`${this.getOrigin()}/embed/${videoId}`);
    this.#ctx.notify('load-start');
  }

  protected override buildParams(): YouTubeParams {
    const { keyDisabled } = this.#ctx.$props,
      { muted, playsInline, nativeControls } = this.#ctx.$state,
      showControls = nativeControls();
    return {
      rel: 0,
      autoplay: 0,
      cc_lang_pref: this.language,
      cc_load_policy: showControls ? 1 : undefined,
      color: this.color,
      controls: showControls ? 1 : 0,
      disablekb: !showControls || keyDisabled() ? 1 : 0,
      enablejsapi: 1,
      fs: 1,
      hl: this.language,
      iv_load_policy: showControls ? 1 : 3,
      mute: muted() ? 1 : 0,
      playsinline: playsInline() ? 1 : 0,
    };
  }

  #remote<T extends keyof YouTubeCommandArg>(command: T, arg?: YouTubeCommandArg[T]) {
    let promise = deferredPromise<void, string>(),
      promises = this.#promises.get(command);

    if (!promises) this.#promises.set(command, (promises = []));

    promises.push(promise);

    this.postMessage({
      event: 'command',
      func: command,
      args: arg ? [arg] : undefined,
    });

    return promise.promise;
  }

  protected override onLoad(): void {
    // Seems like we have to wait a random small delay or else YT player isn't ready.
    window.setTimeout(() => this.postMessage({ event: 'listening' }), 100);
  }

  #onReady(trigger: Event) {
    this.#ctx.notify('loaded-metadata');
    this.#ctx.notify('loaded-data');
    this.#ctx.delegate.ready(undefined, trigger);
  }

  #onPause(trigger: Event) {
    this.#getPromise('pauseVideo')?.resolve();
    this.#ctx.notify('pause', undefined, trigger);
  }

  #onTimeUpdate(time: number, trigger: Event) {
    const { duration, realCurrentTime } = this.#ctx.$state,
      hasEnded = this.#state === YouTubePlayerState.Ended,
      boundTime = hasEnded ? duration() : time;

    this.#ctx.notify('time-change', boundTime, trigger);

    // // This is the only way to detect `seeking`.
    if (!hasEnded && Math.abs(boundTime - realCurrentTime()) > 1) {
      this.#ctx.notify('seeking', boundTime, trigger);
    }
  }

  #onProgress(buffered: number, seekable: TimeRange, trigger: Event) {
    const detail = {
      buffered: new TimeRange(0, buffered),
      seekable,
    };

    this.#ctx.notify('progress', detail, trigger);

    const { seeking, realCurrentTime } = this.#ctx.$state;

    /**
     * This is the only way to detect `seeked`. Unfortunately while the player is `paused` `seeking`
     * and `seeked` will fire at the same time, there are no updates in-between -_-. We need an
     * artificial delay between the two events.
     */
    if (seeking() && buffered > realCurrentTime()) {
      this.#onSeeked(trigger);
    }
  }

  #onSeeked(trigger: Event) {
    const { paused, realCurrentTime } = this.#ctx.$state;

    window.clearTimeout(this.#seekingTimer);

    this.#seekingTimer = window.setTimeout(
      () => {
        this.#ctx.notify('seeked', realCurrentTime(), trigger);
        this.#seekingTimer = -1;
      },
      paused() ? 100 : 0,
    );
  }

  #onEnded(trigger: Event) {
    const { seeking } = this.#ctx.$state;
    if (seeking()) this.#onSeeked(trigger);
    this.#ctx.notify('pause', undefined, trigger);
    this.#ctx.notify('end', undefined, trigger);
  }

  #onStateChange(state: YouTubePlayerStateValue, trigger: Event) {
    const { paused, seeking } = this.#ctx.$state,
      isPlaying = state === YouTubePlayerState.Playing,
      isBuffering = state === YouTubePlayerState.Buffering,
      isPendingPlay = this.#isPending('playVideo'),
      isPlay = paused() && (isBuffering || isPlaying);

    if (isBuffering) this.#ctx.notify('waiting', undefined, trigger);

    if (seeking() && isPlaying) {
      this.#onSeeked(trigger);
    }

    if (this.#invalidPlay && isPlaying) {
      this.pause();
      this.#invalidPlay = false;
      this.setMuted(this.#ctx.$state.muted());
      return;
    }

    // Embed incorrectly plays on seek operations.
    if (!isPendingPlay && isPlay) {
      this.#invalidPlay = true;
      // Prevent any audio between time of play and playing which is when we pause so
      // frame is loaded.
      this.setMuted(true);
      return;
    }

    // Attempt to detect `play` events early.
    if (isPlay) {
      this.#getPromise('playVideo')?.resolve();
      this.#ctx.notify('play', undefined, trigger);
    }

    switch (state) {
      case YouTubePlayerState.Cued:
        this.#onReady(trigger);
        break;
      case YouTubePlayerState.Playing:
        this.#ctx.notify('playing', undefined, trigger);
        break;
      case YouTubePlayerState.Paused:
        this.#onPause(trigger);
        break;
      case YouTubePlayerState.Ended:
        this.#onEnded(trigger);
        break;
    }

    this.#state = state;
  }

  protected override onMessage({ info }: YouTubeMessage, event: MessageEvent) {
    if (!info) return;

    const { title, intrinsicDuration, playbackRate } = this.#ctx.$state;

    if (isObject(info.videoData) && info.videoData.title !== title()) {
      this.#ctx.notify('title-change', info.videoData.title, event);
    }

    if (isNumber(info.duration) && info.duration !== intrinsicDuration()) {
      if (isNumber(info.videoLoadedFraction)) {
        const buffered = info.progressState?.loaded ?? info.videoLoadedFraction * info.duration,
          seekable = new TimeRange(0, info.duration);
        this.#onProgress(buffered, seekable, event);
      }

      this.#ctx.notify('duration-change', info.duration, event);
    }

    if (isNumber(info.playbackRate) && info.playbackRate !== playbackRate()) {
      this.#ctx.notify('rate-change', info.playbackRate, event);
    }

    if (info.progressState) {
      const { current, seekableStart, seekableEnd, loaded, duration } = info.progressState;
      this.#onTimeUpdate(current, event);
      this.#onProgress(loaded, new TimeRange(seekableStart, seekableEnd), event);
      if (duration !== intrinsicDuration()) {
        this.#ctx.notify('duration-change', duration, event);
      }
    }

    if (isNumber(info.volume) && isBoolean(info.muted) && !this.#invalidPlay) {
      const detail = {
        muted: info.muted,
        volume: info.volume / 100,
      };

      this.#ctx.notify('volume-change', detail, event);
    }

    if (isNumber(info.playerState) && info.playerState !== this.#state) {
      this.#onStateChange(info.playerState, event);
    }
  }

  #reset() {
    this.#state = -1;
    this.#seekingTimer = -1;
    this.#invalidPlay = false;
  }

  #getPromise(command: YouTubeCommand) {
    return this.#promises.get(command)?.shift();
  }

  #isPending(command: YouTubeCommand) {
    return Boolean(this.#promises.get(command)?.length);
  }
}
