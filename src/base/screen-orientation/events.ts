import { VdsEvent } from '../events/index';
import { ScreenOrientation, ScreenOrientationLock } from './ScreenOrientation';

export type ScreenOrientationEvents = {
  'vds-screen-orientation-change': ScreenOrientationChangeEvent;
  'vds-screen-orientation-lock-change': ScreenOrientationLockChangeEvent;
};

/**
 * Fired when the current screen orientation changes.
 *
 * @event
 */
export type ScreenOrientationChangeEvent = VdsEvent<ScreenOrientation>;

/**
 * Fired when the current screen orientation lock changes.
 *
 * @event
 */
export type ScreenOrientationLockChangeEvent = VdsEvent<ScreenOrientationLock>;
