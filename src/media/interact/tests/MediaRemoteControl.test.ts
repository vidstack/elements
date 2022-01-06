import { fixture, oneEvent } from '@open-wc/testing-helpers';
import { html, LitElement } from 'lit';

import type {
  EnterFullscreenRequestEvent,
  ExitFullscreenRequestEvent,
  MuteRequestEvent,
  PauseRequestEvent,
  PlayRequestEvent,
  SeekingRequestEvent,
  SeekRequestEvent,
  UnmuteRequestEvent,
  VolumeChangeRequestEvent
} from '../../request.events';
import { MediaRemoteControl } from '../MediaRemoteControl';

class RemoteControlElement extends LitElement {
  control = new MediaRemoteControl(this);
}

window.customElements.define('remote-control', RemoteControlElement);

async function buildFixture() {
  const controller = await fixture(html`
    <!-- Dummy media controller. -->
    <div class="fake-media-controller">
      <!-- Filler to ensure requests are bubbling. -->
      <div>
        <remote-control></remote-control>
      </div>
    </div>
  `);

  const remoteControl = controller.querySelector(
    'remote-control'
  ) as RemoteControlElement;

  return { controller, remoteControl };
}

test('it should dispatch play request', async function () {
  const { controller, remoteControl } = await buildFixture();

  const originalEvent = new MouseEvent('click');

  setTimeout(() => {
    remoteControl.control.play(originalEvent);
  });

  const event = (await oneEvent(
    controller,
    'vds-play-request'
  )) as PlayRequestEvent;

  expect(event.originalEvent).to.equal(originalEvent);
});

test('it should dispatch pause request', async function () {
  const { controller, remoteControl } = await buildFixture();

  const originalEvent = new MouseEvent('click');

  setTimeout(() => {
    remoteControl.control.pause(originalEvent);
  });

  const event = (await oneEvent(
    controller,
    'vds-pause-request'
  )) as PauseRequestEvent;

  expect(event.originalEvent).to.equal(originalEvent);
});

test('it should dispatch mute request', async function () {
  const { controller, remoteControl } = await buildFixture();

  const originalEvent = new MouseEvent('click');

  setTimeout(() => {
    remoteControl.control.mute(originalEvent);
  });

  const event = (await oneEvent(
    controller,
    'vds-mute-request'
  )) as MuteRequestEvent;

  expect(event.originalEvent).to.equal(originalEvent);
});

test('it should dispatch unmute request', async function () {
  const { controller, remoteControl } = await buildFixture();

  const originalEvent = new MouseEvent('click');

  setTimeout(() => {
    remoteControl.control.unmute(originalEvent);
  });

  const event = (await oneEvent(
    controller,
    'vds-unmute-request'
  )) as UnmuteRequestEvent;

  expect(event.originalEvent).to.equal(originalEvent);
});

test('it should dispatch enter fullscreen request', async function () {
  const { controller, remoteControl } = await buildFixture();

  const originalEvent = new MouseEvent('click');

  setTimeout(() => {
    remoteControl.control.enterFullscreen(originalEvent);
  });

  const event = (await oneEvent(
    controller,
    'vds-enter-fullscreen-request'
  )) as EnterFullscreenRequestEvent;

  expect(event.originalEvent).to.equal(originalEvent);
});

test('it should dispatch exit fullscreen request', async function () {
  const { controller, remoteControl } = await buildFixture();

  const originalEvent = new MouseEvent('click');

  setTimeout(() => {
    remoteControl.control.exitFullscreen(originalEvent);
  });

  const event = (await oneEvent(
    controller,
    'vds-exit-fullscreen-request'
  )) as ExitFullscreenRequestEvent;

  expect(event.originalEvent).to.equal(originalEvent);
});

test('it should dispatch seeking request', async function () {
  const { controller, remoteControl } = await buildFixture();

  const originalEvent = new MouseEvent('click');

  setTimeout(() => {
    remoteControl.control.seeking(50, originalEvent);
  });

  const event = (await oneEvent(
    controller,
    'vds-seeking-request'
  )) as SeekingRequestEvent;

  expect(event.detail).to.equal(50);
  expect(event.originalEvent).to.equal(originalEvent);
});

test('it should dispatch seek request', async function () {
  const { controller, remoteControl } = await buildFixture();

  const originalEvent = new MouseEvent('click');

  setTimeout(() => {
    remoteControl.control.seek(50, originalEvent);
  });

  const event = (await oneEvent(
    controller,
    'vds-seek-request'
  )) as SeekRequestEvent;

  expect(event.detail).to.equal(50);
  expect(event.originalEvent).to.equal(originalEvent);
});

test('it should dispatch volume change request', async function () {
  const { controller, remoteControl } = await buildFixture();

  const originalEvent = new MouseEvent('click');

  setTimeout(() => {
    remoteControl.control.changeVolume(50, originalEvent);
  });

  const event = (await oneEvent(
    controller,
    'vds-volume-change-request'
  )) as VolumeChangeRequestEvent;

  expect(event.detail).to.equal(50);
  expect(event.originalEvent).to.equal(originalEvent);
});
