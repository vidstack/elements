import { LIB_PREFIX } from './constants';

export interface VdsEventInit<DetailType> extends CustomEventInit<DetailType> {
  readonly originalEvent?: unknown;
}

export interface VdsCustomEventConstructor<DetailType> {
  readonly TYPE: string;
  new (eventInit?: VdsEventInit<DetailType>): VdsCustomEvent<DetailType>;
}

export type VdsEvents<T> = {
  [P in Extract<keyof T, string> as `${typeof LIB_PREFIX}-${P}`]: T[P];
};

export type ExtractEventDetailType<Type> = Type extends VdsCustomEvent<infer X>
  ? X
  : void;

export abstract class VdsCustomEvent<
  DetailType
> extends CustomEvent<DetailType> {
  static readonly TYPE: string;

  readonly originalEvent?: unknown;

  constructor(type: string, eventInit?: VdsEventInit<DetailType>) {
    const { originalEvent, ...init } = eventInit ?? {};

    super(type, {
      bubbles: true,
      composed: true,
      cancelable: true,
      ...init,
    });

    this.originalEvent = originalEvent;
  }
}

export function buildVdsEvent<DetailType>(
  type: string,
): VdsCustomEventConstructor<DetailType> {
  return class VdsEvent extends VdsCustomEvent<DetailType> {
    static readonly TYPE = `${LIB_PREFIX}-${type}`;

    constructor(eventInit?: VdsEventInit<DetailType>) {
      super(`${LIB_PREFIX}-${type}`, eventInit);
    }
  };
}
