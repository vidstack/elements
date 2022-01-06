import '../../../define/vds-slider';
import '../../../define/vds-volume-slider';

import { elementUpdated } from '@open-wc/testing-helpers';
import { html } from 'lit';

import { vdsEvent } from '../../../base/events';
import { waitForEvent } from '../../../global/tests/utils';
import { buildMediaPlayerFixture } from '../../../media/test-utils';

async function buildFixture() {
  const { player } = await buildMediaPlayerFixture(html`
    <vds-volume-slider></vds-volume-slider>
  `);

  const volumeSlider = player.querySelector('vds-volume-slider')!;

  return { player, volumeSlider };
}

test('it should render DOM correctly', async function () {
  const { volumeSlider } = await buildFixture();
  expect(volumeSlider).dom.to.equal(`
    <vds-volume-slider
      label="Media volume slider"
      orientation="horizontal"
    ></vds-volume-slider>
  `);
});

test('it should update when media volume changes', async function () {
  const { player, volumeSlider } = await buildFixture();

  expect(volumeSlider.volume).to.equal(1);

  player._mediaStore.volume.set(0.25);
  await elementUpdated(volumeSlider);

  expect(volumeSlider.volume).to.equal(0.25);

  player._mediaStore.volume.set(0.85);
  await elementUpdated(volumeSlider);

  expect(volumeSlider.volume).to.equal(0.85);
});

test('it should dispatch volume change request', async function () {
  const { player, volumeSlider } = await buildFixture();

  setTimeout(() => {
    volumeSlider.dispatchEvent(
      vdsEvent('vds-slider-value-change', { detail: 80 })
    );
  }, 0);

  const { detail } = await waitForEvent(player, 'vds-volume-change-request');

  expect(detail).to.equal(0.8);
});
