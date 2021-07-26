import {
  isReactiveElementProto,
  throwIfTC39Decorator
} from '@base/elements/decorators';
import { ElementDisposalController } from '@base/elements/index';
import { listen } from '@base/events/index';
import { Values } from '@helpers';
import { MediaEvents } from '@media/events';
import { keysOf } from '@utils/object';
import { isFunction } from '@utils/unit';
import { ReactiveElement } from 'lit';

import { MediaControllerConnectEvent } from './MediaControllerElement';

export type MediaEventListenerControllerHost = ReactiveElement;

export type MediaEventListenerTuple = Values<
  {
    [P in keyof MediaEvents]: [P, (event: MediaEvents[P]) => void];
  }
>;

export type MediaEventListenerTupleArray = MediaEventListenerTuple[];

export type MediaEventListenerRecord = {
  [P in keyof MediaEvents]?: (event: MediaEvents[P]) => void;
};

/**
 * A controller to simplify attaching event listeners to a media controller below in the DOM.
 * Listens for a connect event from the media controller and then attaches event listeners
 * directly on it. This is required because media events don't bubble by default.
 *
 * @example
 * ```ts
 * import { LitElement } from 'lit';
 * import { MediaEventListenerController, PlayEvent, CanPlayEvent } from '@vidstack/elements';
 *
 * class MyElement extends LitElement {
 *   mediaEventListeners = new MediaEventListenerController(this, {
 *     'vds-play': this.handlePlay,
 *     'vds-can-play': this.handleCanPlay
 *   });
 *
 *   handlePlay(event: PlayEvent) {
 *     // ...
 *   }
 *
 *   handleCanPlay(event: CanPlayEvent) {
 *     // ...
 *   }
 * }
 * ```
 */
export class MediaEventListenerController {
  protected readonly _eventListeners: MediaEventListenerTupleArray;

  protected readonly _disposal: ElementDisposalController;

  constructor(
    protected readonly _host: MediaEventListenerControllerHost,
    eventListeners: MediaEventListenerRecord
  ) {
    this._eventListeners = keysOf(eventListeners).reduce(
      (listeners, eventType) => [
        ...listeners,
        [eventType, eventListeners[eventType]]
      ],
      [] as any
    );

    this._disposal = new ElementDisposalController(_host);

    listen(
      _host,
      'vds-media-controller-connect',
      this._handleMediaControllerConnectEvent.bind(this)
    );
  }

  addListener(listener: MediaEventListenerTuple) {
    this._eventListeners.push(listener);
  }

  protected _handleMediaControllerConnectEvent(
    event: MediaControllerConnectEvent
  ) {
    this._disposal.empty();

    const { element: mediaController, onDisconnect } = event.detail;

    this._eventListeners.forEach(([type, listener]) => {
      const dispose = listen(mediaController, type, listener.bind(this._host));
      this._disposal.add(dispose);
    });

    onDisconnect(() => {
      this._disposal.empty();
    });
  }
}

const CONTROLLER = Symbol('Vidstack.mediaEventListener');

/**
 * A decorator to simplify attaching event listeners to a media controller below in the DOM.
 * Listens for a connect event from the media controller and then attaches the decorated method
 * as a listener directly on it. This is required because media events don't bubble by default.
 *
 * @param type - The name of the event to listen to.
 * @example
 * ```ts
 * import { LitElement } from 'lit';
 * import { mediaEventListener, PlayEvent, CanPlayEvent } from '@vidstack/elements';
 *
 * class MyElement extends LitElement {
 *   \@mediaEventListener('vds-play')
 *   handlePlay(event: PlayEvent) {
 *     // ...
 *   }
 *
 *   \@mediaEventListener('vds-can-play')
 *   handleCanPlay(event: CanPlayEvent) {
 *     // ...
 *   }
 * }
 * ```
 */
export function mediaEventListener(type: keyof MediaEvents): MethodDecorator {
  return function (proto, methodName) {
    const decoratorName = mediaEventListener.name;

    // TODO: implement when spec formalized.
    throwIfTC39Decorator(decoratorName, proto);

    if (isReactiveElementProto(decoratorName, proto)) {
      const ctor = proto.constructor;

      ctor.addInitializer((host) => {
        // @ts-expect-error
        if (!isFunction(host[methodName])) return;

        const controller =
          // @ts-expect-error
          host[CONTROLLER] ??
          // @ts-expect-error
          (host[CONTROLLER] = new MediaEventListenerController(host, {}));

        // @ts-expect-error
        const listener = host[methodName].bind(host);
        controller.addListener([type, listener]);
      });
    }
  };
}
