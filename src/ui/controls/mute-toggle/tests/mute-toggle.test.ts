import '../vds-mute-toggle';
import '../../../../core/fakes/vds-fake-media-provider';

import { elementUpdated, expect, html, oneEvent } from '@open-wc/testing';

import {
  FakeMediaProvider,
  UserMutedChangeRequestEvent,
} from '../../../../core';
import { buildFakeMediaProvider } from '../../../../core/fakes/helpers';
import { getSlottedChildren } from '../../../../utils/dom';
import { MuteToggle } from '../MuteToggle';
import { MUTE_TOGGLE_TAG_NAME } from '../vds-mute-toggle';

describe(MUTE_TOGGLE_TAG_NAME, () => {
  async function buildFixture(): Promise<[FakeMediaProvider, MuteToggle]> {
    const provider = await buildFakeMediaProvider(html`
      <vds-mute-toggle>
        <div class="mute" slot="mute"></div>
        <div class="unmute" slot="unmute"></div>
      </vds-mute-toggle>
    `);

    const toggle = provider.querySelector('vds-mute-toggle') as MuteToggle;

    return [provider, toggle];
  }

  it('should render mute/unmute slots', async () => {
    const [, toggle] = await buildFixture();
    const muteSlot = getSlottedChildren(toggle, 'mute')[0];
    const unmuteSlot = getSlottedChildren(toggle, 'unmute')[0];
    expect(muteSlot).to.have.class('mute');
    expect(unmuteSlot).to.have.class('unmute');
  });

  it('should set unmute slot to hidden when unmuted', async () => {
    const [, toggle] = await buildFixture();
    toggle.on = false;
    await elementUpdated(toggle);
    const muteSlot = getSlottedChildren(toggle, 'mute')[0];
    const unmuteSlot = getSlottedChildren(toggle, 'unmute')[0];
    expect(muteSlot).to.not.have.attribute('hidden');
    expect(unmuteSlot).to.have.attribute('hidden', '');
  });

  it('should set mute slot to hidden when muted', async () => {
    const [, toggle] = await buildFixture();
    toggle.on = true;
    await elementUpdated(toggle);
    const muteSlot = getSlottedChildren(toggle, 'mute')[0];
    const unmuteSlot = getSlottedChildren(toggle, 'unmute')[0];
    expect(muteSlot).to.have.attribute('hidden', '');
    expect(unmuteSlot).to.not.have.attribute('hidden');
  });

  it('should toggle pressed state correctly', async () => {
    const [, toggle] = await buildFixture();
    const control = toggle.shadowRoot?.querySelector('vds-control');

    toggle.on = false;
    await elementUpdated(toggle);

    expect(control).to.not.have.attribute('pressed');

    toggle.on = true;
    await elementUpdated(toggle);

    expect(control).to.have.attribute('pressed');
  });

  it('should set disabled attribute', async () => {
    const [, toggle] = await buildFixture();
    const control = toggle.shadowRoot?.querySelector('vds-control');

    toggle.disabled = true;
    await elementUpdated(toggle);

    expect(control).to.have.attribute('disabled');
  });

  it(`should emit ${UserMutedChangeRequestEvent.TYPE} with true detail clicked while unmuted`, async () => {
    const [, toggle] = await buildFixture();
    toggle.on = false;
    await elementUpdated(toggle);
    setTimeout(() => toggle.click());
    const { detail } = await oneEvent(toggle, UserMutedChangeRequestEvent.TYPE);
    expect(detail).to.be.true;
  });

  it(`should emit ${UserMutedChangeRequestEvent.TYPE} with false detail when clicked while muted`, async () => {
    const [, toggle] = await buildFixture();
    toggle.on = true;
    await elementUpdated(toggle);
    setTimeout(() => toggle.click());
    const { detail } = await oneEvent(toggle, UserMutedChangeRequestEvent.TYPE);
    expect(detail).to.be.false;
  });

  it('should receive muted context updates', async () => {
    const [provider, toggle] = await buildFixture();
    provider.playerContext.mutedCtx = true;
    await elementUpdated(toggle);
    expect(toggle.on).to.be.true;
    provider.playerContext.mutedCtx = false;
    await elementUpdated(toggle);
    expect(toggle.on).to.be.false;
  });
});
