import type Hls from 'hls.js';
import { PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';

import { VdsEvent, vdsEvent } from '../../base/events';
import { CanPlay, MediaType } from '../../media';
import { preconnect, ScriptLoader } from '../../utils/network';
import { isHlsjsSupported } from '../../utils/support';
import { isFunction, isNil, isString, isUndefined } from '../../utils/unit';
import { VideoElement } from '../video';

export const HLS_EXTENSIONS = /\.(m3u8)($|\?)/i;

export const HLS_TYPES = new Set([
  'application/x-mpegURL',
  'application/vnd.apple.mpegurl'
]);

export type HlsConstructor = typeof Hls;

export type DynamicHlsConstructorImport = () => Promise<
  { default: HlsConstructor } | undefined
>;

const HLS_LIB_CACHE = new Map<string, HlsConstructor>();

/**
 * Embeds video content into documents via the native `<video>` element. It may contain
 * one or more video sources, represented using the `src` attribute or the `<source>` element: the
 * browser will choose the most suitable one.
 *
 * In addition, this element introduces support for HLS streaming via the popular `hls.js` library.
 * HLS streaming is either [supported natively](https://caniuse.com/?search=hls) (generally
 * on iOS), or in environments that [support the Media Stream API](https://caniuse.com/?search=mediastream).
 *
 * 💡 This element contains the exact same interface as the `<video>` element. It re-dispatches
 * all the native events if needed, but prefer the `vds-*` variants (eg: `vds-play`) as they
 * iron out any browser issues. It also dispatches all the `hls.js` events.
 *
 * ## Loading hls.js (CDN)
 *
 * Simply point the `hls-library` attribute to a script on a CDN containing the library. For
 * example, you could use the following URL `https://cdn.jsdelivr.net/npm/hls.js@0.14.7/dist/hls.js`.
 * Swap `hls.js` for `hls.min.js` in production.
 *
 * We recommended using [JSDelivr](https://jsdelivr.com).
 *
 * ```html
 * <vds-hls
 *   src="https://stream.mux.com/dGTf2M5TBA5ZhXvwEIOziAHBhF2Rn00jk79SZ4gAFPn8.m3u8"
 *   hls-library="https://cdn.jsdelivr.net/npm/hls.js@0.14.7/dist/hls.js"
 * ></vds-hls>
 * ```
 *
 * ## Loading hls.js (import)
 *
 * You'll need to install `hls.js`...
 *
 * ```bash
 * $: npm install hls.js@^0.14.0 @types/hls.js@^0.13.3
 * ```
 *
 * Next, dynamically import it as follows...
 *
 * ```ts
 * import '@vidstack/player/define/vds-hls';
 *
 * import { html, LitElement } from 'lit';
 *
 * class MyElement extends LitElement {
 *   render() {
 *     return html`<vds-hls src="..." .hlsLibrary=${() => import('hls.js')}></vds-hls>`;
 *   }
 * }
 * ```
 *
 * @tagname vds-hls
 * @slot Used to pass in `<source>` and `<track>` elements to the underlying HTML5 media player.
 * @slot ui - Used to pass in `<vds-ui>` to customize the player user interface.
 * @csspart media - The video element (`<video>`).
 * @csspart video - Alias for `media` part.
 * @example
 * ```html
 * <vds-hls src="/media/index.m3u8" poster="/media/poster.png">
 *   <!-- Additional media resources here. -->
 * </vds-hls>
 * ```
 * @example
 * ```html
 * <vds-hls src="/media/index.m3u8" poster="/media/poster.png">
 *   <track default kind="subtitles" src="/media/subs/en.vtt" srclang="en" label="English" />
 * </vds-hls>
 * ```
 */
export class HlsElement extends VideoElement {
  // -------------------------------------------------------------------------------------------
  // Properties
  // -------------------------------------------------------------------------------------------

  /**
   * The `hls.js` configuration object.
   */
  @property({ type: Object, attribute: 'hls-config' })
  hlsConfig: Partial<Hls.Config | undefined> = {};

  /**
   * The `hls.js` constructor (supports dynamic imports) or a URL of where it can be found. Only
   * version `^0.13.3` (note `^`) is supported at the moment. Important to note that by default
   * this is `undefined` so you can freely optimize when the best possible time is to load the
   * library.
   */
  @property({ attribute: 'hls-library' })
  hlsLibrary: HlsConstructor | DynamicHlsConstructorImport | string | undefined;

  protected _Hls: HlsConstructor | undefined;

  /**
   * The `hls.js` constructor.
   */
  get Hls() {
    return this._Hls;
  }

  protected _hlsEngine: Hls | undefined;

  protected _isHlsEngineAttached = false;

  /**
   * The current `hls.js` instance.
   */
  get hlsEngine() {
    return this._hlsEngine;
  }

  /**
   * Whether the `hls.js` instance has mounted the `HtmlMediaElement`.
   *
   * @default false
   */
  get isHlsEngineAttached() {
    return this._isHlsEngineAttached;
  }

  override get currentSrc() {
    return this.isHlsStream && !this.shouldUseNativeHlsSupport
      ? this.src
      : this.videoEngine?.currentSrc ?? '';
  }

  // -------------------------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------------------------

  override connectedCallback() {
    super.connectedCallback();
    this._initiateHlsLibraryDownloadConnection();
  }

  protected override async update(changedProperties: PropertyValues) {
    super.update(changedProperties);

    if (
      changedProperties.has('hlsLibrary') &&
      this.hasUpdated &&
      this.canLoad &&
      !this.shouldUseNativeHlsSupport
    ) {
      this._initiateHlsLibraryDownloadConnection();
      await this._buildHlsEngine(true);
      this._attachHlsEngine();
      this._loadSrcOnHlsEngine();
    }
  }

  override disconnectedCallback() {
    this._destroyHlsEngine();
    super.disconnectedCallback();
  }

  override async handleMediaCanLoad() {
    await super.handleMediaCanLoad();

    window.requestAnimationFrame(() => {
      this._handleMediaSrcChange();
    });

    /**
     * We can't actually determine whether there is native HLS support until the underlying
     * `<video>` element has rendered, since we rely on calling `canPlayType` on it. Thus we retry
     * this getter here, and if it returns `true` we request an update so the `src` is set
     * on the `<video>` element (determined by `_shouldSetVideoSrcAttr()` method).
     */
    if (this.shouldUseNativeHlsSupport) {
      this.requestUpdate();
    }
  }

  // -------------------------------------------------------------------------------------------
  // Methods
  // -------------------------------------------------------------------------------------------

  /**
   * Attempts to preconnect to the `hls.js` remote source given via `hlsLibrary`. This is
   * assuming `hls.js` is not bundled and `hlsLibrary` is a URL string pointing to where it
   * can be found.
   */
  protected _initiateHlsLibraryDownloadConnection() {
    if (!isString(this.hlsLibrary) || HLS_LIB_CACHE.has(this.hlsLibrary)) {
      return;
    }

    if (__DEV__) {
      this._logger
        ?.infoGroup('preconnect to `hls.js` download')
        .labelledLog('URL', this.hlsLibrary)
        .dispatch();
    }

    preconnect(this.hlsLibrary);
  }

  override canPlayType(type: string): CanPlay {
    if (HLS_TYPES.has(type)) {
      this.isHlsSupported ? CanPlay.Probably : CanPlay.No;
    }

    return super.canPlayType(type);
  }

  /**
   * Whether HLS streaming is supported in this environment.
   */
  get isHlsSupported(): boolean {
    return (
      (this.Hls?.isSupported() ?? isHlsjsSupported()) ||
      this.hasNativeHlsSupport
    );
  }

  /**
   * Whether the current src is using HLS.
   *
   * @default false
   */
  get isHlsStream(): boolean {
    return HLS_EXTENSIONS.test(this.src);
  }

  /**
   * Whether the browser natively supports HLS, mostly only true in Safari. Only call this method
   * after the provider has connected to the DOM (wait for `MediaProviderConnectEvent`).
   */
  get hasNativeHlsSupport(): boolean {
    /**
     * We need to call this directly on `HTMLMediaElement`, calling `this.shouldPlayType(...)`
     * won't work here because it'll use the `CanPlayType` result from this provider override
     * which will incorrectly indicate that HLS can natively played due to `hls.js` support.
     */
    const canPlayType = super.canPlayType('application/vnd.apple.mpegurl');

    if (__DEV__) {
      this._logger
        ?.debugGroup('checking for native HLS support')
        .labelledLog('Can play type', canPlayType)
        .dispatch();
    }

    return canPlayType === CanPlay.Maybe || canPlayType === CanPlay.Probably;
  }

  /**
   * Whether native HLS support is available and whether it should be used. Generally defaults
   * to `false` as long as `window.MediaSource` is defined to enforce consistency by
   * using `hls.js` where ever possible.
   *
   * @default false
   */
  get shouldUseNativeHlsSupport(): boolean {
    /**
     * // TODO: stage-2 we'll need to rework this line and determine when to "upgrade" to `hls.js`.
     *
     * @see https://github.com/vidstack/player/issues/376
     */
    if (isHlsjsSupported()) return false;
    return this.hasNativeHlsSupport;
  }

  /**
   * Notifies the `VideoElement` whether the `src` attribute should be set on the rendered
   * `<video>` element. If we're using `hls.js` we don't want to override the `blob`.
   */
  protected override _shouldSetVideoSrcAttr(): boolean {
    return (
      this.canLoad && (this.shouldUseNativeHlsSupport || !this.isHlsStream)
    );
  }

  /**
   * Loads `hls.js` from a remote source found at the `hlsLibrary` URL (if a string).
   */
  protected async _loadHlsLibraryFromRemoteSource(): Promise<void> {
    if (!isString(this.hlsLibrary) || HLS_LIB_CACHE.has(this.hlsLibrary)) {
      return;
    }

    const HlsConstructor = await this._loadHlsScript();

    // Loading failed.
    if (isUndefined(HlsConstructor)) return;

    HLS_LIB_CACHE.set(this.hlsLibrary, HlsConstructor);

    this.dispatchEvent(
      vdsEvent('vds-hls-load', {
        detail: HlsConstructor
      })
    );
  }

  /**
   * Loads `hls.js` from the remote source given via `hlsLibrary` into the window namespace. This
   * is because `hls.js` in 2021 still doesn't provide a ESM export. This method will return
   * `undefined` if it fails to load the script. Listen to `HlsLoadErrorEvent` to be notified
   * of any failures.
   */
  protected async _loadHlsScript(): Promise<HlsConstructor | undefined> {
    if (!isString(this.hlsLibrary)) return undefined;

    if (__DEV__) {
      this._logger?.debug('Starting to load `hls.js`');
    }

    try {
      await ScriptLoader.load(this.hlsLibrary);

      if (!isFunction(window.Hls)) {
        throw Error(
          '[vds]: Failed loading `hls.js`. Could not find a valid constructor at `window.Hls`.'
        );
      }

      if (__DEV__) {
        this._logger
          ?.debugGroup('Loaded `hls.js`')
          .labelledLog('URL', this.hlsLibrary)
          .labelledLog('Library', window.Hls)
          .dispatch();
      }

      return window.Hls;
    } catch (err) {
      if (__DEV__) {
        this._logger
          ?.errorGroup('Failed to load `hls.js`')
          .labelledLog('URL', this.hlsLibrary)
          .dispatch();
      }

      this.dispatchEvent(
        vdsEvent('vds-hls-load-error', {
          detail: err as Error
        })
      );
    }

    return undefined;
  }

  protected async _buildHlsEngine(forceRebuild = false): Promise<void> {
    // Need to mount on `<video>`.
    if (
      isNil(this.videoEngine) &&
      !forceRebuild &&
      !isUndefined(this.hlsEngine)
    ) {
      return;
    }

    if (__DEV__) {
      this._logger?.info('🏗️ Building HLS engine');
    }

    // Destroy old engine.
    if (!isUndefined(this.hlsEngine)) {
      this._destroyHlsEngine();
    }

    if (isString(this.hlsLibrary)) {
      await this._loadHlsLibraryFromRemoteSource();
    }

    // First we check if it's a string which would have been loaded from a remote source right
    // above this line.
    this._Hls = isString(this.hlsLibrary)
      ? HLS_LIB_CACHE.get(this.hlsLibrary)
      : undefined;

    // If it's not a remote source, it must of been passed in directly as a static/dynamic import.
    if (!isString(this.hlsLibrary) && isUndefined(this._Hls)) {
      // Dynamic import.
      if (isFunction(this.hlsLibrary)) {
        const cacheKey = String(this.hlsLibrary);

        this._Hls = HLS_LIB_CACHE.has(cacheKey)
          ? HLS_LIB_CACHE.get(cacheKey)
          : (await (this.hlsLibrary as DynamicHlsConstructorImport)())?.default;

        if (this._Hls) HLS_LIB_CACHE.set(cacheKey, this._Hls);
      } else {
        // Static.
        this._Hls = this.hlsLibrary;
      }
    }

    if (!this.Hls?.isSupported?.()) {
      if (__DEV__) {
        this._logger?.warn('`hls.js` is not supported in this environment');
      }

      this.dispatchEvent(vdsEvent('vds-hls-no-support'));
      return;
    }

    this._hlsEngine = new this.Hls(this.hlsConfig ?? {});

    if (__DEV__) {
      this._logger
        ?.infoGroup('🏗️ HLS engine built')
        .labelledLog('HLS Engine', this._hlsEngine)
        .labelledLog('Video Engine', this.videoEngine)
        .dispatch();
    }

    this.dispatchEvent(vdsEvent('vds-hls-build', { detail: this.hlsEngine }));
    this._listenToHlsEngine();
  }

  protected _destroyHlsEngine(): void {
    this.hlsEngine?.destroy();
    this._prevHlsEngineSrc = '';
    this._hlsEngine = undefined;
    this._isHlsEngineAttached = false;

    if (__DEV__) {
      this._logger?.info('🏗️ Destroyed HLS engine');
    }
  }

  protected _prevHlsEngineSrc = '';

  // Let `Html5MediaElement` know we're taking over ready events.
  protected override _willAnotherEngineAttach(): boolean {
    return this.isHlsStream && !this.shouldUseNativeHlsSupport;
  }

  protected _attachHlsEngine(): void {
    if (
      this.isHlsEngineAttached ||
      isUndefined(this.hlsEngine) ||
      isNil(this.videoEngine)
    ) {
      return;
    }

    this.hlsEngine.attachMedia(this.videoEngine);
    this._isHlsEngineAttached = true;

    if (__DEV__) {
      this._logger
        ?.infoGroup('🏗️ attached HLS engine')
        .labelledLog('HLS Engine', this._hlsEngine)
        .labelledLog('Video Engine', this.videoEngine)
        .dispatch();
    }

    this.dispatchEvent(vdsEvent('vds-hls-attach', { detail: this.hlsEngine }));
  }

  protected _detachHlsEngine(): void {
    if (!this.isHlsEngineAttached) return;
    this.hlsEngine?.detachMedia();
    this._isHlsEngineAttached = false;
    this._prevHlsEngineSrc = '';

    if (__DEV__) {
      this._logger
        ?.infoGroup('🏗️ detached HLS engine')
        .labelledLog('Video Engine', this.videoEngine)
        .dispatch();
    }

    this.dispatchEvent(vdsEvent('vds-hls-detach', { detail: this.hlsEngine }));
  }

  protected _loadSrcOnHlsEngine(): void {
    if (
      isNil(this.hlsEngine) ||
      !this.isHlsStream ||
      this.shouldUseNativeHlsSupport ||
      this.src === this._prevHlsEngineSrc
    ) {
      return;
    }

    if (__DEV__) {
      this._logger
        ?.infoGroup(`📼 loading src`)
        .labelledLog('Src', this.src)
        .labelledLog('HLS Engine', this._hlsEngine)
        .labelledLog('Video Engine', this.videoEngine)
        .dispatch();
    }

    this.hlsEngine.loadSource(this.src);
    this._prevHlsEngineSrc = this.src;
  }

  protected override _getMediaType(): MediaType {
    if (this.mediaType === MediaType.LiveVideo) {
      return MediaType.LiveVideo;
    }

    if (this.isHlsStream) {
      return MediaType.Video;
    }

    return super._getMediaType();
  }

  // -------------------------------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------------------------------

  protected override _handleLoadedMetadata(event: Event) {
    super._handleLoadedMetadata(event);
    // iOS doesn't fire `canplay` event when loading HLS videos natively.
    if (this.shouldUseNativeHlsSupport && this.isHlsStream) {
      this._handleCanPlay(event);
    }
  }

  protected override async _handleMediaSrcChange() {
    super._handleMediaSrcChange();

    // We don't want to load `hls.js` until the browser has had a chance to paint.
    if (!this.hasUpdated || !this.canLoad) return;

    if (!this.isHlsStream) {
      this._detachHlsEngine();
      return;
    }

    // Need to wait for `src` attribute on `<video>` to clear if last `src` was not using HLS engine.
    await this.updateComplete;

    if (isNil(this.hlsLibrary) || this.shouldUseNativeHlsSupport) return;

    if (isUndefined(this.hlsEngine)) {
      await this._buildHlsEngine();
    }

    if (__DEV__) {
      this._logger?.debug(`📼 detected src change \`${this.src}\``);
    }

    this._attachHlsEngine();
    this._loadSrcOnHlsEngine();
  }

  protected _listenToHlsEngine(): void {
    if (isUndefined(this.hlsEngine) || isUndefined(this.Hls)) return;

    // TODO: Bind all events.

    this.hlsEngine.on(
      this.Hls.Events.LEVEL_LOADED,
      this._handleHlsLevelLoaded.bind(this)
    );

    this.hlsEngine.on(this.Hls.Events.ERROR, this._handleHlsError.bind(this));
  }

  protected _handleHlsError(eventType: string, data: Hls.errorData): void {
    if (isUndefined(this.Hls)) return;

    if (__DEV__) {
      this._logger
        ?.errorGroup(`HLS error \`${eventType}\``)
        .labelledLog('Event type', eventType)
        .labelledLog('Data', data)
        .labelledLog('Src', this.src)
        .labelledLog('State', { ...this.mediaState })
        .labelledLog('HLS Engine', this._hlsEngine)
        .labelledLog('Video Engine', this.videoEngine)
        .dispatch();
    }

    if (data.fatal) {
      switch (data.type) {
        case this.Hls.ErrorTypes.NETWORK_ERROR:
          this._handleHlsNetworkError(eventType, data);
          break;
        case this.Hls.ErrorTypes.MEDIA_ERROR:
          this._handleHlsMediaError(eventType, data);
          break;
        default:
          this._handleHlsIrrecoverableError(eventType, data);
          break;
      }
    }

    this.dispatchEvent(
      vdsEvent('vds-error', {
        originalEvent: new VdsEvent(eventType, { detail: data })
      })
    );
  }

  protected _handleHlsNetworkError(
    eventType: string,
    data: Hls.errorData
  ): void {
    this.hlsEngine?.startLoad();
  }

  protected _handleHlsMediaError(eventType: string, data: Hls.errorData): void {
    this.hlsEngine?.recoverMediaError();
  }

  protected _handleHlsIrrecoverableError(
    eventType: string,
    data: Hls.errorData
  ): void {
    this._destroyHlsEngine();
  }

  protected _handleHlsLevelLoaded(
    eventType: string,
    data: Hls.levelLoadedData
  ): void {
    if (this.canPlay) return;
    this._handleHlsMediaReady(eventType, data);
  }

  protected override _mediaReadyOnMetadataLoad = true;
  protected _handleHlsMediaReady(
    eventType: string,
    data: Hls.levelLoadedData
  ): void {
    const { live, totalduration: duration } = data.details;

    const event = new VdsEvent(eventType, { detail: data });

    const mediaType = live ? MediaType.LiveVideo : MediaType.Video;
    if (this.mediaState.mediaType !== mediaType) {
      this.dispatchEvent(
        vdsEvent('vds-media-type-change', {
          detail: mediaType,
          originalEvent: event
        })
      );
    }

    if (this.duration !== duration) {
      this.dispatchEvent(
        vdsEvent('vds-duration-change', {
          detail: duration,
          originalEvent: event
        })
      );
    }
  }
}
