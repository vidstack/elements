import '$lib/define/vds-media';
import '$lib/define/vds-fake-media-provider';

import { elementUpdated } from '@open-wc/testing-helpers';
import { isFunction, waitForEvent } from '@vidstack/foundation';

import { MediaProviderElement } from '$lib';
import { buildMediaPlayerFixture } from '$test-utils';

async function buildFixture() {
  return await buildMediaPlayerFixture();
}

it('should render light DOM', async function () {
  const { provider } = await buildFixture();
  expect(provider).dom.to.equal(`
    <vds-fake-media-provider></vds-fake-media-provider>
  `);
});

it('should render shadow DOM', async function () {
  const { provider } = await buildFixture();
  expect(provider).shadowDom.to.equal('<slot></slot>');
});

it('it should dispatch discovery event on connect', async function () {
  const provider = document.createElement('vds-fake-media-provider');

  setTimeout(() => {
    window.document.body.append(provider);
  });

  const { detail } = await waitForEvent(provider, 'vds-media-provider-connect');

  expect(detail.element).to.be.instanceOf(MediaProviderElement);
  expect(isFunction(detail.onDisconnect)).to.be.true;
});

it('it should update volume', async function () {
  const { provider } = await buildFixture();
  const volume = 0.75;
  const volumeSpy = vi.spyOn(provider, '_setVolume');
  await provider.mediaRequestQueue.start();
  provider._volume = volume;
  expect(volumeSpy).toHaveBeenCalledWith(volume);
});

it('it should update currentTime', async function () {
  const { provider } = await buildFixture();
  const currentTime = 420;
  const currentTimeSpy = vi.spyOn(provider, '_setCurrentTime');
  await provider.mediaRequestQueue.start();
  provider._currentTime = currentTime;
  expect(currentTimeSpy).toHaveBeenCalledWith(currentTime);
});

it('it should update paused', async function () {
  const { media, provider } = await buildFixture();
  const playSpy = vi.spyOn(provider, 'play');
  const pauseSpy = vi.spyOn(provider, 'pause');
  await provider.mediaRequestQueue.start();
  provider._paused = false;
  expect(playSpy).toHaveBeenCalledOnce();
  media.controller._store.paused.set(false);
  provider._paused = true;
  expect(pauseSpy).toHaveBeenCalledOnce();
});

it('it should update muted', async function () {
  const { provider } = await buildFixture();
  const mutedSpy = vi.spyOn(provider, '_setMuted');
  await provider.mediaRequestQueue.start();
  provider._muted = true;
  expect(mutedSpy).toHaveBeenCalledWith(true);
});

describe('media request queue', function () {
  it('it should queue request given media is not ready and flush once ready', async function () {
    const { provider } = await buildFixture();

    const volumeSpy = vi.spyOn(provider, '_setVolume');

    // Queue.
    provider._volume = 0.53;
    expect(provider.mediaRequestQueue.size, 'queue size').to.equal(1);

    // Flush.
    await provider.mediaRequestQueue.start();

    // Check.
    expect(provider.mediaRequestQueue.size, 'new queue size').to.equal(0);
    expect(volumeSpy).toHaveBeenCalledWith(0.53);
  });

  it('it should make request immediately if media is ready', async function () {
    const { provider } = await buildFixture();

    const volumeSpy = vi.spyOn(provider, '_setVolume');

    await provider.mediaRequestQueue.start();

    provider._volume = 0.53;

    await elementUpdated(provider);

    expect(provider.mediaRequestQueue.size, 'queue size').to.equal(0);
    expect(volumeSpy).toHaveBeenCalledWith(0.53);
  });

  it('it should overwrite request keys and only call once per "type"', async function () {
    const { provider } = await buildFixture();

    const playSpy = vi.spyOn(provider, 'play');
    const pauseSpy = vi.spyOn(provider, 'pause');

    provider._paused = false;

    setTimeout(() => {
      provider._paused = true;
      expect(provider.mediaRequestQueue.size, 'queue size').to.equal(1);
      provider.mediaRequestQueue.start();
    });

    await provider.mediaRequestQueue.waitForFlush();

    expect(playSpy).not.toHaveBeenCalled();
    expect(pauseSpy).to.not.toHaveBeenCalled();
  });
});

describe('autoplay', function () {
  it('it should not call play if autoplay is false', async function () {
    const { provider } = await buildFixture();

    provider._store.autoplay.set(false);
    provider._store.canPlay.set(false);

    const playSpy = vi.spyOn(provider, 'play');

    await provider.attemptAutoplay();

    expect(playSpy).not.toHaveBeenCalled();
  });

  it('it should not call play if not ready for playback', async function () {
    const { provider } = await buildFixture();

    provider._store.autoplay.set(true);
    provider._store.canPlay.set(false);

    const playSpy = vi.spyOn(provider, 'play');

    await provider.attemptAutoplay();

    expect(playSpy).not.toHaveBeenCalled();
  });

  it('it should not call play if playback has started', async function () {
    const { provider } = await buildFixture();

    provider._store.autoplay.set(true);
    provider._store.canPlay.set(true);
    provider._store.started.set(true);

    const playSpy = vi.spyOn(provider, 'play');

    await provider.attemptAutoplay();

    expect(playSpy).not.toHaveBeenCalled();
  });
});
