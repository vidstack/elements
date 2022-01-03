import type { ReactiveControllerHost } from 'lit';

import {
  type Context,
  type ContextConsumerController,
  isContext
} from '../context';
import type { ReadableStore } from './types';

/**
 * Helper function to subscribe to a store for the life of the given `host` element, meaning
 * when it's disconnected from the DOM, the subscription is destroyed.
 *
 * @example
 * ```ts
 * import { LitElement } from 'lit';
 * import { hostedStoreSubscription } from '@vidstack/elements';
 *
 * class MyElement extends LitElement {
 *   constructor() {
 *     super();
 *     hostedStoreSubscription(this, <<store>>, (value) => {
 *       // ...
 *     });
 *   }
 * }
 * ```
 */
export function hostedStoreSubscription<T>(
  host: ReactiveControllerHost & EventTarget,
  store: ReadableStore<T> | Context<ReadableStore<T>>,
  onChange: (value: T) => void
) {
  let consumer: ContextConsumerController<ReadableStore<T>> | undefined;

  if (isContext(store)) {
    consumer = store.consume(host);
  }

  let unsubscribe: () => void;

  host.addController({
    hostConnected() {
      unsubscribe = (consumer?.value ?? (store as ReadableStore<T>)).subscribe(
        onChange
      );
    },
    hostDisconnected() {
      unsubscribe?.();
    }
  });
}
