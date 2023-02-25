import { computed, effect, peek, ReadSignal, signal } from 'maverick.js';
import { dispatchEvent, listenEvent } from 'maverick.js/std';

import type { MediaControllerElement } from './controller/types';
import type { MediaStore } from './store';

const STOP_IDLE_EVENTS = ['pointerup', 'pointermove', 'focus', 'keydown', 'playing'] as const;

export function createMediaUser(
  $controller: ReadSignal<MediaControllerElement | null>,
  $media: MediaStore,
): Mediauser {
  let idleTimeout: any,
    delay = 2000,
    trigger: Event | undefined,
    $idle = signal(false),
    $userPaused = signal(false),
    $paused = computed(() => $userPaused() || $media.paused),
    $ended = computed(() => $media.ended);

  effect(() => {
    const target = $controller();
    if (!target) return;

    for (const eventType of STOP_IDLE_EVENTS) {
      listenEvent(target, eventType, stopIdling);
    }

    effect(() => {
      window.clearTimeout(idleTimeout);
      const idle = $idle();
      $media.userIdle = idle;
      dispatchEvent(target, 'user-idle-change', { detail: idle, trigger });
      trigger = undefined;
    });

    return () => $idle.set(false);
  });

  function stopIdling(event: Event) {
    if (peek($paused) && !peek($ended)) {
      return;
    }
    if ($idle()) trigger = event;
    $idle.set(false);
    window.clearTimeout(idleTimeout);
    idleTimeout = window.setTimeout(() => $idle.set(!peek($paused)), delay);
  }

  return {
    idle: {
      get idling() {
        return $idle();
      },
      get paused() {
        return $userPaused();
      },
      set paused(paused) {
        $userPaused.set(paused);
      },
      get delay() {
        return delay;
      },
      set delay(newDelay) {
        delay = newDelay;
      },
    },
  };
}

export interface Mediauser {
  idle: {
    /**
     * Whether the media user is currently idle.
     *
     * @signal
     */
    readonly idling: boolean;
    /**
     * Whether idle state tracking has been paused.
     *
     * @signal
     */
    paused: boolean;
    /**
     * The amount of delay in milliseconds while media playback is progressing without user
     * activity to indicate an idle state.
     *
     * @defaultValue 2000
     */
    delay: number;
  };
}
