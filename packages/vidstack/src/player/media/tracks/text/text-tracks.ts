import { DOMEvent } from 'maverick.js/std';

import { List, type ListReadonlyChangeEvent } from '../../../../foundation/list/list';
import { LIST_ADD, LIST_REMOVE } from '../../../../foundation/list/symbols';
import { TEXT_TRACK_CAN_LOAD, TEXT_TRACK_ON_MODE_CHANGE } from './symbols';
import {
  isTrackCaptionKind,
  TextTrack,
  type TextTrackInit,
  type TextTrackModeChangeEvent,
} from './text-track';

/**
 * @see {@link https://vidstack.io/docs/player/core-concepts/text-tracks}
 */
export class TextTrackList extends List<TextTrack, TextTrackListEvents> {
  private _canLoad = false;
  private _default: TextTrack | null = null;

  get default() {
    return this._default;
  }

  get selected() {
    const track = this._items.find((t) => t.mode === 'showing' && isTrackCaptionKind(t));
    return track ?? null;
  }

  add(init: TextTrackInit | TextTrack, trigger?: Event) {
    const isTrack = init instanceof TextTrack,
      track = isTrack ? init : new TextTrack(init);

    if (this._default && init.default) delete init.default;
    track.addEventListener('mode-change', this._handleTrackModeChange);
    this[LIST_ADD](track, trigger);
    if (this._canLoad) track[TEXT_TRACK_CAN_LOAD]();

    if (init.default) {
      this._default = track;
      track.mode = 'showing';
    }

    return this;
  }

  remove(track: TextTrack, trigger?: Event) {
    if (!this._items.includes(track)) return;
    if (track === this._default) this._default = null;
    track.mode = 'disabled';
    track[TEXT_TRACK_ON_MODE_CHANGE] = null;
    track.removeEventListener('mode-change', this._handleTrackModeChange);
    this[LIST_REMOVE](track, trigger);
    return this;
  }

  clear(trigger?: Event) {
    for (const track of this._items) this.remove(track, trigger);
    return this;
  }

  getById(id: string): TextTrack | null {
    return this._items.find((track) => track.id === id) ?? null;
  }

  getByKind(kind: TextTrackKind | TextTrackKind[]): TextTrack[] {
    const kinds = Array.isArray(kind) ? kind : [kind];
    return this._items.filter((track) => kinds.includes(track.kind));
  }

  /* @internal */
  [TEXT_TRACK_CAN_LOAD]() {
    if (this._canLoad) return;
    for (const track of this._items) track[TEXT_TRACK_CAN_LOAD]();
    this._canLoad = true;
  }

  private _handleTrackModeChange = this._onTrackModeChange.bind(this);
  private _onTrackModeChange(event: TextTrackModeChangeEvent) {
    const track = event.detail;

    if (track.mode === 'showing') {
      const kinds = isTrackCaptionKind(track) ? ['captions', 'subtitles'] : [track.kind];
      for (const t of this._items) {
        if (t.mode === 'showing' && t != track && kinds.includes(t.kind)) {
          t.mode = 'disabled';
        }
      }
    }

    this.dispatchEvent(
      new DOMEvent<TextTrack>('mode-change', {
        detail: event.detail,
        trigger: event,
      }),
    );
  }
}

export interface TextTrackListEvents {
  add: TextTrackAddEvent;
  remove: TextTrackRemoveEvent;
  'mode-change': TextTrackListModeChangeEvent;
  'readonly-change': ListReadonlyChangeEvent;
}

/**
 * Fired when a text track has been added to the list.
 */
export interface TextTrackAddEvent extends DOMEvent<TextTrack> {}

/**
 * Fired when a text track has been removed from the list.
 */
export interface TextTrackRemoveEvent extends DOMEvent<TextTrack> {}

/**
 * Fired when the mode of any text track in the list has changed.
 */
export interface TextTrackListModeChangeEvent extends DOMEvent<TextTrack> {}
