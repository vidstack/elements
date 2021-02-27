import { listen } from '@wcom/events';
import { UpdatingElement } from 'lit-element';
import { Constructor } from '../../shared';
import { PlayerState, ViewType } from '../player.types';
import {
  ProviderDisconnectEvent,
  ProviderViewTypeChangeEvent,
} from '../provider';

export type ViewTypeMixinBase = Constructor<UpdatingElement>;

export type ViewTypeCocktail<T extends ViewTypeMixinBase> = T &
  Constructor<
    Pick<PlayerState, 'viewType' | 'isAudioView' | 'isVideoView'> & {
      /**
       * The attribute name on the player for which to set whether the player view is of type
       * audio. This attribute will be set to `true`/`false` accordingly.
       */
      audioViewAttrName: string;

      /**
       * The attribute name on the player for which to set whether the player view is of type
       * video. This attribute will be set to `true`/`false` accordingly.
       */
      videoViewAttrName: string;
    }
  >;

/**
 * Mixes in properties for checking the current view type, updates the view type when
 * the `ProviderViewTypeChange` event is fired, and sets audio/video attributes on the
 * component.
 *
 * @param Base - The constructor to mix into.
 */
export function ViewTypeMixin<T extends ViewTypeMixinBase>(
  Base: T,
): ViewTypeCocktail<T> {
  class ViewTypeMixin extends Base {
    protected _viewType = ViewType.Unknown;

    audioViewAttrName = 'audio';

    videoViewAttrName = 'video';

    @listen(ProviderViewTypeChangeEvent.TYPE)
    protected handleViewTypeChange(e: ProviderViewTypeChangeEvent): void {
      this._viewType = e.detail;
      this.setAttribute(this.audioViewAttrName, String(this.isAudioView));
      this.setAttribute(this.videoViewAttrName, String(this.isVideoView));
      this.requestUpdate();
    }

    @listen(ProviderDisconnectEvent.TYPE)
    protected handleViewTypeReset() {
      this._viewType = ViewType.Unknown;
    }

    get viewType(): ViewType {
      return this._viewType;
    }

    get isAudioView(): boolean {
      return this.viewType === ViewType.Audio;
    }

    get isVideoView(): boolean {
      return this.viewType === ViewType.Video;
    }
  }

  return ViewTypeMixin;
}
