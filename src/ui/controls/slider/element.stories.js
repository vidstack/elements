import './define.js';

import { html } from 'lit';

import { ifNonEmpty } from '../../../shared/directives/if-non-empty.js';
import {
	VDS_SLIDER_ELEMENT_STORYBOOK_ARG_TYPES,
	VDS_SLIDER_ELEMENT_TAG_NAME
} from './SliderElement.js';

export default {
	title: 'UI/Foundation/Controls/Slider',
	component: VDS_SLIDER_ELEMENT_TAG_NAME,
	argTypes: VDS_SLIDER_ELEMENT_STORYBOOK_ARG_TYPES
};

/**
 * @param {import('./types').SliderElementStorybookArgs} args
 */
function Template({
	// Properties
	label,
	min = 0,
	max,
	step,
	stepMultiplier,
	hidden,
	disabled,
	value,
	valueText,
	orientation,
	throttle,
	// Actions
	onVdsSliderDragStart,
	onVdsSliderDragEnd,
	onVdsSliderValueChange
}) {
	return html`
		<vds-slider
			label=${ifNonEmpty(label)}
			max=${max}
			min=${min}
			orientation=${orientation}
			step-multiplier=${stepMultiplier}
			step=${step}
			throttle=${throttle}
			value-text=${ifNonEmpty(valueText)}
			value=${value}
			?disabled=${disabled}
			?hidden=${hidden}
			@vds-slider-drag-end=${onVdsSliderDragEnd}
			@vds-slider-drag-start=${onVdsSliderDragStart}
			@vds-slider-value-change=${onVdsSliderValueChange}
		></vds-slider>
	`;
}

export const Slider = Template.bind({});
