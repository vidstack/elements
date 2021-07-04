import { expect, fixture, oneEvent } from '@open-wc/testing';
import { html } from 'lit';
import { mock, spy } from 'sinon';

import { raf } from '../../../utils/dom.js';
import { VolumeChangeEvent } from '../../events.js';
import {
  EnterFullscreenRequestEvent,
  ExitFullscreenRequestEvent,
  MuteRequestEvent,
  PauseRequestEvent,
  PlayRequestEvent,
  SeekRequestEvent,
  UnmuteRequestEvent,
  VolumeChangeRequestEvent
} from '../../request.events.js';
import {
  buildMediaFixture,
  FAKE_MEDIA_PROVIDER_ELEMENT_TAG_NAME
} from '../../test-utils/index.js';
import {
  MEDIA_CONTROLLER_ELEMENT_TAG_NAME,
  MediaControllerElement
} from '../MediaControllerElement.js';

describe(MEDIA_CONTROLLER_ELEMENT_TAG_NAME, function () {
  describe('render', function () {
    it('should render DOM correctly', async function () {
      const { controller } = await buildMediaFixture();
      expect(controller).dom.to.equal(`
        <vds-media-controller>
          <vds-media-container>
            <vds-fake-media-provider slot="media"></vds-fake-media-provider>
          </vds-media-container>
        </vds-media-controller>
      `);
    });

    it('should render shadow DOM correctly', async function () {
      const { controller } = await buildMediaFixture();
      expect(controller).shadowDom.to.equal('<slot></slot>');
    });
  });

  describe('media container', function () {
    it('should connect/disconnect', async function () {
      /** @type {MediaControllerElement} */
      const controller = await fixture(
        html`<vds-media-controller></vds-media-controller>`
      );

      const container = document.createElement('vds-media-container');
      controller.append(container);
      expect(controller.mediaContainer).to.equal(container);

      container.remove();
      expect(controller.mediaContainer).to.be.undefined;
    });
  });

  describe('media provider', function () {
    it('should connect/disconnect', async function () {
      /** @type {MediaControllerElement} */
      const controller = await fixture(
        html`<vds-media-controller></vds-media-controller>`
      );

      const provider = document.createElement(
        FAKE_MEDIA_PROVIDER_ELEMENT_TAG_NAME
      );

      controller.append(provider);
      expect(controller.mediaProvider).to.equal(provider);

      provider.remove();
      expect(controller.mediaProvider).to.be.undefined;
    });

    it('should forward properties to the media provider', async function () {
      const { controller, provider } = await buildMediaFixture();
      provider.forceMediaReady();
      controller.paused = false;
      expect(provider.paused).to.be.false;
    });

    it('should forward methods to the media provider', async function () {
      const { controller, provider } = await buildMediaFixture();
      const playSpy = spy(provider, 'play');
      controller.play();
      expect(playSpy).to.have.been.calledOnce;
    });

    it('should forward attributes to the media provider', async function () {
      const { controller, provider } = await buildMediaFixture();

      controller.setAttribute('muted', '');
      await raf();
      expect(provider).to.have.attribute('muted');
      controller.removeAttribute('muted');
      await raf();
      expect(provider).to.not.have.attribute('muted');
    });

    it('should forward events from the media provider', async function () {
      const { controller, provider } = await buildMediaFixture();

      const detail = { volume: 30, muted: false };
      const originalEvent = new MouseEvent('click');

      setTimeout(() => {
        provider.dispatchEvent(
          new VolumeChangeEvent({ detail, originalEvent })
        );
      }, 0);

      const event = /** @type {VolumeChangeEvent} */ (
        await oneEvent(controller, VolumeChangeEvent.TYPE)
      );

      expect(event.detail).to.equal(detail);
      expect(event.originalEvent).to.equal(originalEvent);
    });
  });

  describe('media requests', function () {
    it('should handle mute request', async function () {
      const { container, provider } = await buildMediaFixture();
      const setMutedSpy = spy(provider, 'setMuted');
      container.dispatchEvent(new MuteRequestEvent());
      await provider.mediaRequestQueue.flush();
      expect(setMutedSpy).to.have.been.calledWith(true);
      setMutedSpy.restore();
    });

    it('should handle unmute request', async function () {
      const { container, provider } = await buildMediaFixture();
      const setMutedSpy = spy(provider, 'setMuted');
      container.dispatchEvent(new UnmuteRequestEvent());
      await provider.mediaRequestQueue.flush();
      expect(setMutedSpy).to.have.been.calledWith(false);
      setMutedSpy.restore();
    });

    it('should handle play request', async function () {
      const { container, provider } = await buildMediaFixture();
      const playSpy = spy(provider, 'play');
      container.dispatchEvent(new PlayRequestEvent());
      await provider.mediaRequestQueue.flush();
      expect(playSpy).to.have.been.calledOnce;
      playSpy.restore();
    });

    it('should handle pause request', async function () {
      const { container, provider } = await buildMediaFixture();
      const pauseSpy = spy(provider, 'pause');
      container.dispatchEvent(new PauseRequestEvent());
      await provider.mediaRequestQueue.flush();
      expect(pauseSpy).to.have.been.calledOnce;
      pauseSpy.restore();
    });

    it('should handle seek request', async function () {
      const { container, provider } = await buildMediaFixture();
      const setCurrentTimeSpy = spy(provider, 'setCurrentTime');
      container.dispatchEvent(new SeekRequestEvent({ detail: 100 }));
      await provider.mediaRequestQueue.flush();
      expect(setCurrentTimeSpy).to.have.been.calledWith(100);
      setCurrentTimeSpy.restore();
    });

    it('should handle volume change request', async function () {
      const { container, provider } = await buildMediaFixture();
      const setVolumeSpy = spy(provider, 'setVolume');
      container.dispatchEvent(new VolumeChangeRequestEvent({ detail: 100 }));
      await provider.mediaRequestQueue.flush();
      expect(setVolumeSpy).to.have.been.calledWith(100);
      setVolumeSpy.restore();
    });

    it('should handle enter fullscreen request', async function () {
      const { container } = await buildMediaFixture();
      const requestFullscreenMock = mock();
      container.requestFullscreen = requestFullscreenMock;
      container.dispatchEvent(new EnterFullscreenRequestEvent());
      expect(requestFullscreenMock).to.have.been.called;
    });

    it('should handle exit fullscreen request', async function () {
      const { container } = await buildMediaFixture();
      const exitFullscreenMock = mock();
      container.exitFullscreen = exitFullscreenMock;
      container.dispatchEvent(new ExitFullscreenRequestEvent());
      expect(exitFullscreenMock).to.have.been.called;
    });
  });
});
