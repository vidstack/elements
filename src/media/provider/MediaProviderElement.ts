import { ExtractContextRecordTypes } from '@base/context/index';
import {
  discover,
  DiscoveryEvent,
  ElementDisposalController
} from '@base/elements/index';
import { eventListener, vdsEvent } from '@base/events/index';
import {
  FullscreenChangeEvent,
  FullscreenController
} from '@base/fullscreen/index';
import { RequestQueue } from '@base/queue/index';
import {
  ScreenOrientationController,
  ScreenOrientationLock
} from '@base/screen-orientation/index';
import { clampNumber } from '@utils/number';
import { LitElement, PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';

import { CanPlay } from '../CanPlay';
import {
  cloneMediaContextRecord,
  createMediaContextRecord,
  mediaContext
} from '../context';

/**
 * Fired when the media provider connects to the DOM.
 *
 * @event
 * @bubbles
 * @composed
 */
export type MediaProviderConnectEvent = DiscoveryEvent<MediaProviderElement>;

/**
 * Base abstract media provider class that defines the interface to be implemented by
 * all concrete media providers. Extending this class enables provider-agnostic communication 💬
 *
 */
@discover('vds-media-provider-connect')
export abstract class MediaProviderElement extends LitElement {
  static get events(): (keyof GlobalEventHandlersEventMap)[] {
    return [
      'vds-abort',
      'vds-can-play',
      'vds-can-play-through',
      'vds-duration-change',
      'vds-emptied',
      'vds-ended',
      'vds-error',
      'vds-fullscreen-change',
      'vds-loaded-data',
      'vds-load-start',
      'vds-loaded-metadata',
      'vds-media-type-change',
      'vds-pause',
      'vds-play',
      'vds-playing',
      'vds-progress',
      'vds-replay',
      'vds-seeked',
      'vds-seeking',
      'vds-stalled',
      'vds-started',
      'vds-suspend',
      'vds-time-update',
      'vds-view-type-change',
      'vds-volume-change',
      'vds-waiting',
      'vds-media-provider-connect'
    ];
  }

  // -------------------------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------------------------

  /**
   * @protected
   * @readonly
   */
  _disconnectDisposal = new ElementDisposalController(this);

  override connectedCallback() {
    super.connectedCallback();
    this._connectedQueue.flush();
    this._connectedQueue.serveImmediately = true;
  }

  protected override updated(changedProperties: PropertyValues) {
    if (changedProperties.has('autoplay')) {
      this.ctx.autoplay = this.autoplay;
    }

    if (changedProperties.has('controls')) {
      this.ctx.controls = this.controls;
    }

    if (changedProperties.has('loop')) {
      this.ctx.loop = this.loop;
    }

    if (changedProperties.has('playsinline')) {
      this.ctx.playsinline = this.playsinline;
    }

    super.updated(changedProperties);
  }

  protected override firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    this.ctx.canRequestFullscreen = this.canRequestFullscreen;
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._connectedQueue.destroy();
    this.mediaRequestQueue.destroy();
    this._hasFlushedMediaRequestQueueOnce = false;
  }

  // -------------------------------------------------------------------------------------------
  // Properties
  // -------------------------------------------------------------------------------------------

  /**
   * Whether playback should automatically begin as soon as enough media is available to do so
   * without interruption.
   *
   * Sites which automatically play audio (or videos with an audio track) can be an unpleasant
   * experience for users, so it should be avoided when possible. If you must offer autoplay
   * functionality, you should make it opt-in (requiring a user to specifically enable it).
   *
   * However, autoplay can be useful when creating media elements whose source will be set at a
   * later time, under user control.
   *
   * @link https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/autoplay
   */
  @property({ type: Boolean, reflect: true })
  autoplay = false;

  /**
   * Indicates whether a user interface should be shown for controlling the resource. Set this to
   * `false` when you want to provide your own custom controls, and `true` if you want the current
   * provider to supply its own default controls. Depending on the provider, changing this prop
   * may cause the player to completely reset.
   *
   * @link https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/controls
   */
  @property({ type: Boolean, reflect: true })
  controls = false;

  /**
   * Whether media should automatically start playing from the beginning (replay) every time
   * it ends.
   *
   * @default false
   * @link https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/loop
   */
  @property({ type: Boolean, reflect: true })
  loop = false;

  /**
   * Whether the video is to be played "inline", that is within the element's playback area. Note
   * that setting this to `false` does not imply that the video will always be played in fullscreen.
   * Depending on the provider, changing this prop may cause the player to completely reset.
   *
   */
  @property({ type: Boolean, reflect: true })
  playsinline = false;

  // --

  /**
   * An `int` between `0` (silent) and `1` (loudest) indicating the audio volume. Defaults to `1`.
   *
   * @default 1
   * @link https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/volume
   */
  @property({ type: Number, reflect: true })
  get volume() {
    return this.canPlay ? this._getVolume() : 1;
  }

  set volume(requestedVolume) {
    this.mediaRequestQueue.queue('volume', () => {
      this._setVolume(clampNumber(0, requestedVolume, 1));
    });
  }

  protected abstract _getVolume(): number;
  protected abstract _setVolume(newVolume: number): void;

  // ---

  /**
   * Whether playback should be paused. Defaults to `true` if no media has loaded or playback has
   * not started. Setting this to `false` will begin/resume playback.
   *
   * @default true
   * @link https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/paused
   */
  @property({ type: Boolean, reflect: true })
  get paused() {
    return this.canPlay ? this._getPaused() : true;
  }

  set paused(shouldPause) {
    this.mediaRequestQueue.queue('paused', () => {
      if (!shouldPause) {
        this.play();
      } else {
        this.pause();
      }
    });
  }

  protected abstract _getPaused(): boolean;

  // ---

  /**
   * A `double` indicating the current playback time in seconds. Defaults to `0` if the media has
   * not started to play and has not seeked. Setting this value seeks the media to the new
   * time. The value can be set to a minimum of `0` and maximum of the total length of the
   * media (indicated by the duration prop).
   *
   * @default 0
   * @link https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/currentTime
   */
  @property({ attribute: 'current-time', type: Number })
  get currentTime() {
    return this.canPlay ? this._getCurrentTime() : 0;
  }

  set currentTime(requestedTime) {
    this.mediaRequestQueue.queue('time', () => {
      this._setCurrentTime(requestedTime);
    });
  }

  protected abstract _getCurrentTime(): number;
  protected abstract _setCurrentTime(newTime: number): void;

  // ---

  /**
   * Whether the audio is muted or not.
   *
   * @link https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/muted
   */
  @property({ type: Boolean, reflect: true })
  get muted() {
    return this.canPlay ? this._getMuted() : false;
  }

  set muted(shouldMute) {
    this.mediaRequestQueue.queue('muted', () => {
      this._setMuted(shouldMute);
    });
  }

  protected abstract _getMuted(): boolean;
  protected abstract _setMuted(isMuted: boolean): void;

  // -------------------------------------------------------------------------------------------
  // Readonly Properties
  // -------------------------------------------------------------------------------------------

  /**
   * The underlying engine that is actually responsible for rendering/loading media. Some examples
   * are:
   *
   * - The `VideoElement` engine is `HTMLVideoElement`.
   * - The `HlsElement` engine is the `hls.js` instance.
   * - The `YoutubeElement` engine is `HTMLIFrameElement`.
   *
   * Refer to the respective provider documentation to find out which engine is powering it.
   *
   * @abstract
   */
  abstract get engine(): unknown;

  /**
   * An immutable snapshot of the current media state.
   */
  get mediaState(): Readonly<ExtractContextRecordTypes<typeof mediaContext>> {
    return cloneMediaContextRecord(this.ctx);
  }

  /**
   * Returns a `TimeRanges` object that indicates the ranges of the media source that the
   * browser has buffered (if any) at the moment the buffered property is accessed. This is usually
   * contiguous but if the user jumps about while media is buffering, it may contain holes.
   *
   * @link https://developer.mozilla.org/en-US/docs/Web/API/TimeRanges
   * @link https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/buffered
   * @default TimeRanges
   */
  get buffered() {
    return this.ctx.buffered;
  }

  /**
   * Whether the user agent can play the media, but estimates that **not enough** data has been
   * loaded to play the media up to its end without having to stop for further buffering of
   * content.
   *
   * @default false
   */
  get canPlay() {
    return this.ctx.canPlay;
  }

  /**
   * Whether the user agent can play the media, and estimates that enough data has been
   * loaded to play the media up to its end without having to stop for further buffering
   * of content.
   *
   * @default false
   */
  get canPlayThrough() {
    return this.ctx.canPlayThrough;
  }

  /**
   * The URL of the current poster. Defaults to `''` if no media/poster has been given or
   * loaded.
   */
  get currentPoster() {
    return this.ctx.currentPoster;
  }

  /**
   * The absolute URL of the media resource that has been chosen. Defaults to `''` if no
   * media has been loaded.
   *
   * @default ''
   * @link https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/currentSrc
   */
  get currentSrc() {
    return this.ctx.currentSrc;
  }

  /**
   * A `double` indicating the total playback length of the media in seconds. If no media data is
   * available, the returned value is `NaN`. If the media is of indefinite length (such as
   * streamed live media, a WebRTC call's media, or similar), the value is `+Infinity`.
   *
   * @default NaN
   * @link https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/duration
   */
  get duration() {
    return this.ctx.duration;
  }

  /**
   * Whether media playback has reached the end. In other words it'll be true
   * if `currentTime === duration`.
   *
   * @default false
   * @link https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/ended
   */
  get ended() {
    return this.ctx.ended;
  }

  /**
   * Contains the most recent error or undefined if there's been none. You can listen for
   * `vds-error` event updates and examine this object to debug further. The error could be a
   * native `MediaError` object or something else.
   *
   * @default undefined
   * @link https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/error
   */
  get error() {
    return this.ctx.error;
  }

  /**
   * Whether the current media is a live stream.
   *
   */
  get live() {
    return this.ctx.live;
  }

  /**
   * The type of media that is currently active, whether it's audio or video. Defaults
   * to `unknown` when no media has been loaded or the type cannot be determined.
   *
   * @default MediaType.Unknown
   */
  get mediaType() {
    return this.ctx.mediaType;
  }

  /**
   * Contains the ranges of the media source that the browser has played, if any.
   *
   * @default TimeRanges
   */
  get played() {
    return this.ctx.played;
  }

  /**
   * Whether media is actively playing back. Defaults to `false` if no media has
   * loaded or playback has not started.
   *
   * @default false
   */
  get playing() {
    return this.ctx.playing;
  }

  /**
   * Contains the time ranges that the user is able to seek to, if any. This tells us which parts
   * of the media can be played without delay; this is irrespective of whether that part has
   * been downloaded or not.
   *
   * Some parts of the media may be seekable but not buffered if byte-range
   * requests are enabled on the server. Byte range requests allow parts of the media file to
   * be delivered from the server and so can be ready to play almost immediately — thus they are
   * seekable.
   *
   * @default TimeRanges
   * @link https://developer.mozilla.org/en-US/docs/Web/API/TimeRanges
   * @link https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/seekable
   */
  get seekable() {
    return this.ctx.seekable;
  }

  /**
   * Whether media is actively seeking to an new playback position.
   *
   * @default false
   */
  get seeking() {
    return this.ctx.seeking;
  }

  /**
   * Whether media playback has started. In other words it will be true if `currentTime > 0`.
   *
   * @default false
   */
  get started() {
    return this.ctx.started;
  }

  /**
   * The type of player view that is being used, whether it's an audio player view or
   * video player view. Normally if the media type is of audio then the view is of type audio, but
   * in some cases it might be desirable to show a different view type. For example, when playing
   * audio with a poster. This is subject to the provider allowing it. Defaults to `unknown`
   * when no media has been loaded.
   *
   * @default ViewType.Unknown
   */
  get viewType() {
    return this.ctx.viewType;
  }

  /**
   * Whether playback has temporarily stopped because of a lack of temporary data.
   *
   * @default false
   */
  get waiting() {
    return this.ctx.waiting;
  }

  // -------------------------------------------------------------------------------------------
  // Support Checks
  // -------------------------------------------------------------------------------------------

  /**
   * Determines if the media provider can play the given `type`. The `type` is
   * generally the media resource identifier, URL or MIME type (optional Codecs parameter).
   *
   * @example `audio/mp3`
   * @example `video/mp4`
   * @example `video/webm; codecs="vp8, vorbis"`
   * @example `/my-audio-file.mp3`
   * @example `youtube/RO7VcUAsf-I`
   * @example `vimeo.com/411652396`
   * @example `https://www.youtube.com/watch?v=OQoz7FCWkfU`
   * @example `https://media.vidstack.io/hls/index.m3u8`
   * @example `https://media.vidstack.io/dash/index.mpd`
   * @link https://developer.mozilla.org/en-US/docs/Web/Media/Formats/codecs_parameter
   */
  abstract canPlayType(type: string): CanPlay;

  /**
   * Determines if the media provider "should" play the given type. "Should" in this
   * context refers to the `canPlayType()` method returning `Maybe` or `Probably`.
   *
   * @param type refer to `canPlayType`.
   */
  shouldPlayType(type: string): boolean {
    const canPlayType = this.canPlayType(type);
    return canPlayType === CanPlay.Maybe || canPlayType === CanPlay.Probably;
  }

  // -------------------------------------------------------------------------------------------
  // Playback
  // -------------------------------------------------------------------------------------------

  /**
   * Begins/resumes playback of the media. If this method is called programmatically before the
   * user has interacted with the player, the promise may be rejected subject to the browser's
   * autoplay policies.
   *
   * @link https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play
   */
  abstract play(): Promise<void>;

  /**
   * Pauses playback of the media.
   *
   * @link https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/pause
   */
  abstract pause(): Promise<void>;

  /**
   * @throws {Error} - Will throw if media is not ready for playback.
   */
  protected _throwIfNotReadyForPlayback() {
    if (!this.canPlay) {
      throw Error(`Media is not ready - wait for \`vds-can-play\` event.`);
    }
  }

  protected _hasPlaybackRoughlyEnded(): boolean {
    if (isNaN(this.duration) || this.duration === 0) return false;
    return (
      Math.abs(
        Math.round(this.duration * 10) - Math.round(this.currentTime * 10)
      ) <= 1
    );
  }

  /**
   * Call if you suspect that playback might have resumed/ended again.
   */
  protected _validatePlaybackEndedState(): void {
    if (this.ctx.ended && !this._hasPlaybackRoughlyEnded()) {
      this.ctx.ended = false;
    } else if (!this.ctx.ended && this._hasPlaybackRoughlyEnded()) {
      this.ctx.waiting = false;
      this.dispatchEvent(vdsEvent('vds-suspend'));
      this.ctx.ended = true;
      this.dispatchEvent(vdsEvent('vds-error'));
    }
  }

  protected async _resetPlayback(): Promise<void> {
    this._setCurrentTime(0);
  }

  protected async _resetPlaybackIfEnded(): Promise<void> {
    if (!this._hasPlaybackRoughlyEnded()) return;
    return this._resetPlayback();
  }

  /**
   * @throws {Error} - Will throw if player is not in a video view.
   */
  protected _throwIfNotVideoView() {
    if (!this.ctx.isVideoView) {
      throw Error('Player is currently not in a video view.');
    }
  }

  protected _handleMediaReady(event?: Event) {
    this.ctx.canPlay = true;
    this.dispatchEvent(vdsEvent('vds-can-play', { originalEvent: event }));
    this.mediaRequestQueue.flush();
    this.mediaRequestQueue.serveImmediately = true;
  }

  protected _hasFlushedMediaRequestQueueOnce = false;

  protected _handleMediaSrcChange() {
    // Skip first flush to ensure initial properties set make it to the provider.
    if (!this._hasFlushedMediaRequestQueueOnce) {
      this._hasFlushedMediaRequestQueueOnce = true;
      return;
    }

    this.mediaRequestQueue.serveImmediately = false;
    this.mediaRequestQueue.reset();
    this._softResetMediaContext();
  }

  // -------------------------------------------------------------------------------------------
  // Context
  // -------------------------------------------------------------------------------------------

  /**
   * Any property updated inside this object will trigger a context update. The media controller
   * will provide (inject) the context record to be managed by this media provider. Any updates here
   * will flow down from the media controller to all components.
   *
   * If there's no media controller then this will be a plain JS object that's used to keep
   * track of media state.
   *
   * @internal
   */
  readonly ctx = createMediaContextRecord();

  /**
   * Media context properties that should be reset when media is changed. Override this
   * to include additional properties.
   */
  protected _getMediaPropsToResetWhenSrcChanges(): Set<string> {
    return new Set([
      'buffered',
      'buffering',
      'canPlay',
      'canPlayThrough',
      'currentSrc',
      'currentTime',
      'duration',
      'ended',
      'mediaType',
      'paused',
      'canPlay',
      'played',
      'playing',
      'seekable',
      'seeking',
      'started',
      'waiting'
    ]);
  }

  /**
   * When the `currentSrc` is changed this method is called to update any context properties
   * that need to be reset. Important to note that not all properties are reset, only the
   * properties returned from `getSoftResettableMediaContextProps()`.
   */
  protected _softResetMediaContext() {
    const propsToReset = this._getMediaPropsToResetWhenSrcChanges();
    Object.keys(mediaContext).forEach((prop) => {
      if (propsToReset.has(prop)) {
        // @ts-expect-error
        this.ctx[prop] = mediaContext[prop].initialValue;
      }
    });
  }

  // -------------------------------------------------------------------------------------------
  // Request Queue
  // -------------------------------------------------------------------------------------------

  /**
   * Queue actions to be applied safely after the element has connected to the DOM.
   */
  readonly _connectedQueue = new RequestQueue();

  /**
   * Queue actions to be taken on the current media provider when it's ready for playback, marked
   * by the `canPlay` property. If the media provider is ready, actions will be invoked immediately.
   */
  readonly mediaRequestQueue = new RequestQueue();

  // -------------------------------------------------------------------------------------------
  // Orientation
  // -------------------------------------------------------------------------------------------

  readonly screenOrientationController = new ScreenOrientationController(this);

  // -------------------------------------------------------------------------------------------
  // Fullscreen
  // -------------------------------------------------------------------------------------------

  readonly fullscreenController = new FullscreenController(
    this,
    this.screenOrientationController
  );

  /**
   * Whether the native browser fullscreen API is available, or the current provider can
   * toggle fullscreen mode. This does not mean that the operation is guaranteed to be successful,
   * only that it can be attempted.
   *
   * @default false
   * @link https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API
   */
  get canRequestFullscreen(): boolean {
    return this.fullscreenController.isSupported;
  }

  /**
   * Whether the player is currently in fullscreen mode.
   *
   * @default false
   */
  get fullscreen(): boolean {
    return this.ctx.fullscreen;
  }

  /**
   * This will indicate the orientation to lock the screen to when in fullscreen mode and
   * the Screen Orientation API is available. The default is `undefined` which indicates
   * no screen orientation change.
   */
  @property({ attribute: 'fullscreen-orientation' })
  get fullscreenOrientation(): ScreenOrientationLock | undefined {
    return this.fullscreenController.screenOrientationLock;
  }

  set fullscreenOrientation(lockType) {
    this.fullscreenController.screenOrientationLock = lockType;
  }

  override async requestFullscreen(): Promise<void> {
    if (this.fullscreenController.isRequestingNativeFullscreen) {
      return super.requestFullscreen();
    }

    return this.fullscreenController.requestFullscreen();
  }

  exitFullscreen(): Promise<void> {
    return this.fullscreenController.exitFullscreen();
  }

  @eventListener('vds-fullscreen-change')
  protected _handleFullscreenChange(event: FullscreenChangeEvent) {
    this.ctx.fullscreen = event.detail;
  }
}
