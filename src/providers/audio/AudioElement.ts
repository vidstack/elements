import { CSSResultGroup, html, TemplateResult } from 'lit';
import { ref } from 'lit/directives/ref.js';

import { ifNonEmpty, ifNumber } from '../../base/directives';
import { Html5MediaElement } from '../html5';
import { audioElementStyles } from './styles';

/**
 * Used to embed sound content into documents via the native `<audio>` element. It may contain
 * one or more audio sources, represented using the `src` attribute or the `<source>` element: the
 * browser will choose the most suitable one.
 *
 * 💡 This element contains the exact same interface as the `<audio>` element. It redispatches
 * all the native events if needed, but prefer the `vds-*` variants (eg: `vds-play`) as they
 * iron out any browser issues.
 *
 * @tagname vds-audio
 * @slot Used to pass in `<source>`/`<track>` elements to the underlying HTML5 media player.
 * @csspart media - The audio element (`<audio>`).
 * @csspart audio - Alias for `media` part.
 * @example
 * ```html
 * <vds-audio src="/media/audio.mp3">
 *   <!-- Additional media resources here. -->
 * </vds-audio>
 * ```
 * @example
 * ```html
 * <vds-audio>
 *   <source src="/media/audio.mp3" type="audio/mp3" />
 * </vds-audio>
 * ```
 */
export class AudioElement extends Html5MediaElement {
  static override get styles(): CSSResultGroup {
    return [audioElementStyles];
  }

  protected override render(): TemplateResult {
    return this._renderAudio();
  }

  protected _renderAudio(): TemplateResult {
    return html`
      <audio
        part=${this._getAudioPartAttr()}
        src="${ifNonEmpty(this._shouldSetAudioSrcAttr() ? this.src : '')}"
        width="${ifNumber(this.width)}"
        height="${ifNumber(this.height)}"
        preload="${ifNonEmpty(this.preload)}"
        crossorigin="${ifNonEmpty(this.crossOrigin)}"
        controlslist="${ifNonEmpty(this.controlsList)}"
        ?playsinline="${this.playsinline}"
        ?controls="${this.controls}"
        ?disableremoteplayback="${this.disableRemotePlayback}"
        .defaultMuted="${this.defaultMuted ?? this.muted}"
        .defaultPlaybackRate="${this.defaultPlaybackRate ?? 1}"
        ${ref(this._mediaRef)}
      >
        ${this._renderMediaChildren()}
      </audio>
    `;
  }

  /**
   * Override this to modify audio CSS Parts.
   */
  protected _getAudioPartAttr(): string {
    return 'media audio';
  }

  /**
   * Can be used by attaching engine such as `hls.js` to prevent src attr being set on
   * `<audio>` element.
   */
  protected _shouldSetAudioSrcAttr(): boolean {
    return true;
  }
}
