import { elementUpdated, expect, oneEvent } from '@open-wc/testing';
import { html } from 'lit';

import { VdsMuteRequestEvent, VdsUnmuteRequestEvent } from '../../../../media';
import { buildMediaFixture } from '../../../../media/test-utils';
import {
	MuteButtonElement,
	VDS_MUTE_BUTTON_ELEMENT_TAG_NAME
} from '../MuteButtonElement';

window.customElements.define(
	VDS_MUTE_BUTTON_ELEMENT_TAG_NAME,
	MuteButtonElement
);

describe(VDS_MUTE_BUTTON_ELEMENT_TAG_NAME, function () {
	async function buildFixture() {
		const { container, provider } = await buildMediaFixture(html`
			<vds-mute-button>
				<div class="mute" slot="mute"></div>
				<div class="unmute" slot="unmute"></div>
			</vds-mute-button>
		`);

		provider.forceMediaReady();

		const button = /** @type {MuteButtonElement} */ (
			container.querySelector(VDS_MUTE_BUTTON_ELEMENT_TAG_NAME)
		);

		return { provider, button };
	}

	it('should render DOM correctly', async function () {
		const { button } = await buildFixture();
		expect(button).dom.to.equal(`
      <vds-mute-button>
        <div class="mute" slot="mute"></div>
        <div class="unmute" slot="unmute" hidden></div>
      </vds-mute-button>
    `);
	});

	it('should render shadow DOM correctly', async function () {
		const { button } = await buildFixture();
		expect(button).shadowDom.to.equal(`
      <vds-button
        id="root"
        class="root"
        label="Mute"
        part="root button"
				type="button"
        exportparts="root: button-root"
      >
        <slot name="unmute"></slot>
        <slot name="mute"></slot>
      </button>
    `);
	});

	it('should render mute/unmute slots', async function () {
		const { button } = await buildFixture();
		expect(button.muteSlotElement).to.have.class('mute');
		expect(button.unmuteSlotElement).to.have.class('unmute');
	});

	it('should set unmute slot to hidden when unmuted', async function () {
		const { provider, button } = await buildFixture();
		provider.muted = false;
		await elementUpdated(button);
		expect(button.muteSlotElement).to.not.have.attribute('hidden');
		expect(button.unmuteSlotElement).to.have.attribute('hidden', '');
	});

	it('should set mute slot to hidden when muted', async function () {
		const { provider, button } = await buildFixture();
		provider.muted = true;
		await elementUpdated(button);
		expect(button.muteSlotElement).to.have.attribute('hidden', '');
		expect(button.unmuteSlotElement).to.not.have.attribute('hidden');
	});

	it(`should emit ${VdsMuteRequestEvent.TYPE} with true detail clicked while unmuted`, async function () {
		const { provider, button } = await buildFixture();
		provider.muted = false;
		await elementUpdated(button);
		setTimeout(() => button.click());
		await oneEvent(button, VdsMuteRequestEvent.TYPE);
	});

	it(`should emit ${VdsUnmuteRequestEvent.TYPE} with false detail when clicked while muted`, async function () {
		const { provider, button } = await buildFixture();
		provider.muted = true;
		await elementUpdated(button);
		setTimeout(() => button.click());
		await oneEvent(button, VdsUnmuteRequestEvent.TYPE);
	});

	it('should receive muted context updates', async function () {
		const { provider, button } = await buildFixture();
		provider.context.muted = true;
		await elementUpdated(button);
		expect(button.pressed).to.be.true;
		provider.context.muted = false;
		await elementUpdated(button);
		expect(button.pressed).to.be.false;
	});
});
