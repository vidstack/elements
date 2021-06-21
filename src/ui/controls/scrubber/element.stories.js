import '../../../media/define.js';
import '../../../media/test-utils/define.js';
import './define.js';

import { html } from 'lit';

import { createTimeRanges } from '../../../media/index.js';
import { ifNonEmpty } from '../../../shared/directives/if-non-empty.js';
import {
	VDS_SCRUBBER_ELEMENT_STORYBOOK_ARG_TYPES,
	VDS_SCRUBBER_ELEMENT_TAG_NAME
} from './ScrubberElement.js';

export default {
	title: 'UI/Foundation/Controls/Scrubber',
	component: VDS_SCRUBBER_ELEMENT_TAG_NAME,
	argTypes: VDS_SCRUBBER_ELEMENT_STORYBOOK_ARG_TYPES
};

/**
 * @param {import('./types').ScrubberElementStorybookArgs} args
 */
function Template({
	// Properties
	disabled,
	hidden,
	noPreviewClamp,
	noPreviewTrack,
	orientation,
	pauseWhileDragging,
	previewTimeThrottle,
	progressLabel,
	progressText,
	sliderLabel,
	step,
	stepMultiplier,
	throttle,
	userSeekingThrottle,
	// Scrubber Actions
	onVdsScrubberPreviewShow,
	onVdsScrubberPreviewHide,
	onVdsScrubberPreviewTimeUpdate,
	// Media Request Actions
	onVdsPauseRequest,
	onVdsPlayRequest,
	onVdsSeekRequest,
	onVdsSeekingRequest,
	// Media Properties
	mediaCurrentTime,
	mediaDuration,
	mediaPaused,
	mediaSeekableAmount
}) {
	return html`
		<vds-media-controller
			@vds-pause-request=${onVdsPauseRequest}
			@vds-play-request=${onVdsPlayRequest}
			@vds-seek-request=${onVdsSeekRequest}
			@vds-seeking-request=${onVdsSeekingRequest}
		>
			<vds-media-container>
				<vds-fake-media-provider
					.canPlayContext=${true}
					.currentTimeContext=${mediaCurrentTime}
					.durationContext=${mediaDuration}
					.pausedContext=${mediaPaused}
					.seekableContext=${createTimeRanges(0, mediaSeekableAmount)}
					slot="media"
				></vds-fake-media-provider>

				<vds-scrubber
					orientation=${orientation}
					preview-time-throttle=${previewTimeThrottle}
					progress-label=${ifNonEmpty(progressLabel)}
					progress-text=${ifNonEmpty(progressText)}
					slider-label=${ifNonEmpty(sliderLabel)}
					step-multiplier=${stepMultiplier}
					step=${step}
					throttle=${throttle}
					user-seeking-throttle=${userSeekingThrottle}
					?disabled=${disabled}
					?hidden=${hidden}
					?no-preview-clamp=${noPreviewClamp}
					?no-preview-track=${noPreviewTrack}
					?pause-while-dragging=${pauseWhileDragging}
					@vds-scrubber-preview-hide=${onVdsScrubberPreviewHide}
					@vds-scrubber-preview-show=${onVdsScrubberPreviewShow}
					@vds-scrubber-preview-time-update=${onVdsScrubberPreviewTimeUpdate}
				>
					<div class="preview" slot="preview">Preview</div>
				</vds-scrubber>
			</vds-media-container>
		</vds-media-controller>

		<style>
			vds-scrubber {
				margin-top: 48px;
			}

			.preview {
				background-color: #161616;
				color: #ff2a5d;
				opacity: 1;
				position: absolute;
				left: 0;
				bottom: 40px;
				transition: opacity 0.3s ease-in;
			}

			.preview[hidden] {
				opacity: 0;
			}
		</style>
	`;
}

export const Scrubber = Template.bind({});
