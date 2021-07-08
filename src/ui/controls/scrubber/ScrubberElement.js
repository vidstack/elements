// ** Dependencies **
import '../slider/define.js';

import clsx from 'clsx';
import { html } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import { styleMap } from 'lit/directives/style-map.js';

import { ifNonEmpty } from '../../../foundation/directives/index.js';
import { VdsElement, WithFocus } from '../../../foundation/elements/index.js';
import {
  isPointerEvent,
  isVdsEvent
} from '../../../foundation/events/index.js';
import {
  storybookAction,
  StorybookControlType
} from '../../../foundation/storybook/index.js';
import {
  mediaContext,
  MediaRemoteControl,
  PauseRequestEvent,
  PlayRequestEvent,
  SeekingRequestEvent,
  SeekRequestEvent
} from '../../../media/index.js';
import { getSlottedChildren, raf } from '../../../utils/dom.js';
import { clampNumber, round } from '../../../utils/number.js';
import { formatSpokenTime } from '../../../utils/time.js';
import { throttle } from '../../../utils/timing.js';
import { isNil, isUndefined } from '../../../utils/unit.js';
import {
  SLIDER_ELEMENT_STORYBOOK_ARG_TYPES,
  SliderDragEndEvent,
  SliderDragStartEvent,
  SliderElement,
  SliderValueChangeEvent
} from '../slider/index.js';
import { scrubberContext } from './context.js';
import {
  ScrubberPreviewHideEvent,
  ScrubberPreviewShowEvent,
  ScrubberPreviewTimeUpdateEvent
} from './events.js';
import { scrubberElementStyles } from './styles.js';

export const SCRUBBER_ELEMENT_TAG_NAME = 'vds-scrubber';

/**
 * A control that displays the progression of playback and the amount seekable on a slider. This
 * control can be used to update the current playback time by interacting with the slider.
 *
 * ## Previews / Storyboards
 *
 * You can pass in a preview to be shown while the user is interacting (hover/drag) with the
 * scrubber by passing an element into the `preview` slot, such as `<div slot="preview"></div>`.
 *
 * You need to do the following on your root preview element:**
 *
 * - Expect that your root preview element will be positioned absolutely.
 * - Set the `bottom` CSS property on it to adjust it to the desired position above the slider.
 * - Create CSS styles for when it has a hidden attribute (`.preview[hidden] {}`).
 *
 * The Scrubber will automatically do the following to the root preview element passed in:**
 *
 * - Set a `hidden` attribute when it should be hidden (it's left to you to hide it with CSS).
 * - Set a safe `z-index` value so the preview is above all other components and is visible.
 * - Update the `translateX()` CSS property to position the preview accordingly.
 *
 * ### How do I get the current preview time?
 *
 * You can either listen to `vds-scrubber-preview-time-update` event on this component, or you can
 * use the `scrubberPreviewContext`.
 *
 * For styling you have access to the `--vds-scrubber-preview-time` CSS property which contains
 * the current time in seconds the user is previewing.
 *
 * @tagname vds-scrubber
 * @slot Used to pass content into the root.
 * @slot progress - Used to pass content into the progress element (`<div>`).
 * @slot preview - Used to pass in a preview to be shown while the user is interacting (hover/drag) with the scrubber.
 * @slot slider - Used to pass content into the slider component (`<vds-slider>`).
 * @csspart root - The component's root element (`<div>`).
 * @csspart slider - The slider component (`<vds-slider>`).
 * @csspart slider-* - All slider parts re-exported with the `slider` prefix such as `slider-root` and `slider-thumb`.
 * @csspart progress - The progress element (`<div>`).
 * @csspart preview-track - The part of the slider track that displays
 * @csspart preview-track-hidden - Targets the `preview-track` part when it's hidden.
 * @cssprop --vds-slider-* - All slider CSS properties can be used to style the underlying `<vds-slider>` component.
 * @cssprop --vds-scrubber-current-time - Current time of playback.
 * @cssprop --vds-scrubber-seekable - The amount of media that is seekable.
 * @cssprop --vds-scrubber-duration - The length of media playback.
 * @cssprop --vds-scrubber-progress-bg - The background color of the amount that is seekable.
 * @cssprop --vds-scrubber-progress-height - The height of the progress bar (defaults to `--vds-slider-track-height`).
 * @cssprop --vds-scrubber-preview-time - The current time in seconds that is being previewed (hover/drag).
 * @cssprop --vds-scrubber-preview-track-height - The height of the preview track (defaults to `--vds-slider-track-height`).
 * @cssprop --vds-preview-track-bg - The background color of the preview track.
 * @example
 * ```html
 * <vds-scrubber
 *   label="Time scrubber"
 *   progress-label="Amount seekable"
 * >
 *   <!-- `hidden` attribute will automatically be applied/removed -->
 *  <div class="preview" slot="preview" hidden>Preview</div>
 * </vds-scrubber>
 * ```
 * @example
 * ```css
 * vds-scrubber {
 *   --vds-scrubber-progress-bg: pink;
 * }
 *
 * .preview {
 *   position: absolute;
 *   left: 0;
 *   bottom: 12px;
 *   opacity: 1;
 *   transition: opacity 0.3s ease-in;
 * }
 *
 * .preview[hidden] {
 *   opacity: 0;
 * }
 * ```
 */
export class ScrubberElement extends WithFocus(VdsElement) {
  /** @type {import('lit').CSSResultGroup} */
  static get styles() {
    return [scrubberElementStyles];
  }

  /** @type {string[]} */
  static get parts() {
    const sliderExportParts = SliderElement.parts.map(
      (part) => `slider-${part}`
    );
    return ['root', 'slider', 'progress', ...sliderExportParts];
  }

  /** @type {string[]} */
  static get events() {
    return [
      ScrubberPreviewHideEvent.TYPE,
      ScrubberPreviewShowEvent.TYPE,
      ScrubberPreviewTimeUpdateEvent.TYPE
    ];
  }

  constructor() {
    super();

    // Properties
    /**
     * Whether the scubber is disabled.
     *
     * @type {boolean}
     */
    this.disabled = false;

    /**
     * Whether the scrubber is hidden.
     *
     * @type {boolean}
     */
    this.hidden = false;

    /**
     * Whether the preview passed in should NOT be clamped to the scrubber edges. In other words,
     * setting this to `true` means the preview element can escape the scrubber bounds.
     *
     * @type {boolean}
     */
    this.noPreviewClamp = false;

    /**
     * Whether to remove the preview track.
     *
     * @type {boolean}
     */
    this.noPreviewTrack = false;

    /**
     * The slider orientation.
     *
     * @type {'horizontal' | 'vertical'}
     */
    this.orientation = 'horizontal';

    /**
     * Whether the scrubber should request playback to pause while the user is dragging the
     * thumb. If the media was playing before the dragging starts, the state will be restored by
     * dispatching a user play request once the dragging ends.
     *
     * @type {boolean}
     */
    this.pauseWhileDragging = false;

    /**
     * The amount of milliseconds to throttle preview time updates by.
     *
     * @type {number}
     */
    this.previewTimeThrottle = 30;

    /**
     * ♿ **ARIA:** The `aria-label` for the buffered progress bar.
     *
     * @type {string}
     */
    this.progressLabel = 'Amount seekable';

    /**
     * ♿ **ARIA:** Human-readable text alternative for the current scrubber progress. If you pass
     * in a string containing `{currentTime}` or `{duration}` templates they'll be replaced with
     * the spoken form such as `20 minutes out of 1 hour, 20 minutes. `
     *
     * @type {string}
     */
    this.progressText = '{currentTime} out of {duration}';

    /**
     * ♿ **ARIA:** The `aria-label` for the slider.
     *
     * @type {string}
     */
    this.label = 'Time scrubber';

    /**
     * A number that specifies the granularity that the slider value must adhere to in seconds.
     * For example, a step with the value `1` indicates a granularity of 1 second increments.
     *
     * @type {number}
     */
    this.step = 0.5;

    /**
     * ♿ **ARIA:** A number that specifies the number of steps taken when interacting with
     * the slider via keyboard.
     *
     * @type {number}
     */
    this.keyboardStep = 5;

    /**
     * ♿ **ARIA:** A number that will be used to multiply the `keyboardStep` when the `Shift` key
     * is held down and the slider value is changed by pressing `LeftArrow` or `RightArrow`.
     *
     * @type {number}
     */
    this.shiftKeyMultiplier = 2;

    /**
     * The amount of milliseconds to throttle the slider thumb during `mousemove` / `touchmove`
     * events.
     *
     * @type {number}
     */
    this.throttle = 0;

    /**
     * The amount of milliseconds to throttle user seeking events being dispatched.
     *
     * @type {number}
     */
    this.userSeekingThrottle = 150;

    // State
    /**
     * @protected
     * @type {number}
     */
    this.currentTimePercentage = 0;
    /**
     * @protected
     * @type {boolean}
     */
    this.isPointerInsideScrubber = false;
    /**
     * @protected
     * @type {boolean}
     */
    this.isDraggingThumb = false;

    // Context Consumers
    /**
     * @protected
     * @type {number}
     */
    this.mediaCurrentTime = mediaContext.currentTime.initialValue;
    /**
     * @protected
     * @type {number}
     */
    this.mediaDuration = 0;
    /**
     * @protected
     * @type {boolean}
     */
    this.mediaPaused = mediaContext.paused.initialValue;
    /**
     * @protected
     * @type {boolean}
     */
    this.mediaSeeking = mediaContext.seeking.initialValue;
    /**
     * @protected
     * @type {number}
     */
    this.mediaSeekableAmount = mediaContext.seekableAmount.initialValue;

    // Context Providers
    /**
     * @protected
     * @type {boolean}
     */
    this.isPreviewShowing = false;
    /**
     * @protected
     * @type {number}
     */
    this.previewTime = 0;
  }

  // -------------------------------------------------------------------------------------------
  // Properties
  // -------------------------------------------------------------------------------------------

  /** @type {import('lit').PropertyDeclarations} */
  static get properties() {
    return {
      // Properties
      disabled: { type: Boolean, reflect: true },
      hidden: { type: Boolean, reflect: true },
      label: { attribute: 'label', reflect: true },
      noPreviewClamp: { type: Boolean, attribute: 'no-preview-clamp' },
      noPreviewTrack: { type: Boolean, attribute: 'no-preview-track' },
      orientation: { reflect: true },
      pauseWhileDragging: { type: Boolean, attribute: 'pause-while-dragging' },
      previewTimeThrottle: { type: Number, attribute: 'preview-time-throttle' },
      progressLabel: { attribute: 'progress-label' },
      progressText: { attribute: 'progress-text' },
      keyboardStep: { type: Number, attribute: 'keyboard-step' },
      shiftKeyMultiplier: { type: Number, attribute: 'shift-key-multiplier' },
      throttle: { type: Number },
      userSeekingThrottle: { type: Number, attribute: 'user-seeking-throttle' },
      // State
      isPointerInsideScrubber: { state: true },
      isDraggingThumb: { state: true },
      previewTime: { state: true },
      currentTimePercentage: { state: true }
    };
  }

  /** @type {import('../../../foundation/context/types').ContextProviderDeclarations} */
  static get contextProviders() {
    return {
      isPreviewShowing: scrubberContext.preview.showing,
      previewTime: scrubberContext.preview.time
    };
  }

  /** @type {import('../../../foundation/context/types').ContextConsumerDeclarations} */
  static get contextConsumers() {
    return {
      mediaCurrentTime: mediaContext.currentTime,
      mediaDuration: {
        context: mediaContext.duration,
        transform: (d) => (d >= 0 ? d : 0)
      },
      mediaPaused: mediaContext.paused,
      mediaSeeking: mediaContext.seeking,
      mediaSeekableAmount: mediaContext.seekableAmount
    };
  }

  // -------------------------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------------------------

  connectedCallback() {
    super.connectedCallback();
    this.initThrottles();
  }

  /** @param {import('lit').PropertyValues} changedProperties */
  update(changedProperties) {
    if (
      changedProperties.has('mediaCurrentTime') ||
      changedProperties.has('mediaDuration')
    ) {
      this.updateCurrentTime();
    }

    if (
      changedProperties.has('previewTimeThrottle') ||
      changedProperties.has('userSeekingThrottle')
    ) {
      this.initThrottles();
    }

    if (changedProperties.has('disabled') && this.disabled) {
      this.isPointerInsideScrubber = false;
      this.isDraggingThumb = false;
      this.hidePreview();
    }

    super.update(changedProperties);
  }

  disconnectedCallback() {
    this.destroyThrottles();
    super.disconnectedCallback();
  }

  // -------------------------------------------------------------------------------------------
  // Media Request Events
  // -------------------------------------------------------------------------------------------

  /**
   * @protected
   * @readonly
   */
  remoteControl = new MediaRemoteControl(this);

  /**
   * @protected
   * @param {Event} event
   */
  dispatchUserSeekingEvent(event) {
    if (!this.isInteractive) return;
    this.remoteControl.seeking(this.previewTime, event);
  }

  /**
   * @protected
   * @param {number} percent
   * @param {Event} event
   */
  dispatchUserSeeked(percent, event) {
    const seekTo = this.mediaDuration * (percent / 100);
    this.remoteControl.seek(seekTo, event);
  }

  // -------------------------------------------------------------------------------------------
  // Render (Root)
  // -------------------------------------------------------------------------------------------

  render() {
    return this.renderScrubber();
  }

  // -------------------------------------------------------------------------------------------
  // Scrubber
  // -------------------------------------------------------------------------------------------

  /**
   * @protected
   * @readonly
   * @type {import('lit/directives/ref').Ref<HTMLDivElement>}
   */
  rootRef = createRef();

  /**
   * The component's root element.
   *
   * @type {HTMLDivElement}
   */
  get rootElement() {
    return /** @type {HTMLDivElement} */ (this.rootRef.value);
  }

  /**
   * @protected
   * @returns {import('lit').TemplateResult}
   */
  renderScrubber() {
    return html`
      <div
        id="root"
        part=${this.getScrubberPartAttr()}
        style=${styleMap(this.getScrubberStyleMap())}
        @pointerenter=${this.handleScrubberPointerEnter}
        @pointerleave=${this.handleScrubberPointerLeave}
        @pointermove=${this.handleScrubberPointerMove}
        ?hidden=${this.hidden}
        ${ref(this.rootRef)}
      >
        ${this.renderSlider()}${this.renderDefaultSlot()}${this.renderPreviewSlot()}
      </div>
    `;
  }

  /**
   * @protected
   * @returns {string}
   */
  getScrubberPartAttr() {
    return 'root';
  }

  /**
   * @protected
   * @returns {import('lit/directives/style-map').StyleInfo}
   */
  getScrubberStyleMap() {
    const currentTime = this.mediaDuration * (this.currentTimePercentage / 100);

    return {
      '--vds-scrubber-current-time': String(currentTime),
      '--vds-scrubber-seekable': String(this.mediaSeekableAmount),
      '--vds-scrubber-duration': String(this.mediaDuration)
    };
  }

  /**
   * @protected
   * @param {PointerEvent} event
   * @returns {Promise<void>}
   */
  async handleScrubberPointerEnter(event) {
    if (this.disabled) return;
    this.isPointerInsideScrubber = true;
    this.showPreview(event);
  }

  /**
   * @protected
   * @param {PointerEvent} event
   * @returns {Promise<void>}
   */
  async handleScrubberPointerLeave(event) {
    this.isPointerInsideScrubber = false;
    this.hidePreview(event);
  }

  /**
   * @protected
   * @param {PointerEvent} event
   */
  handleScrubberPointerMove(event) {
    if (this.disabled) return;
    this.updatePreviewPosition(event);
  }

  /**
   * @protected
   * @returns {import('lit').TemplateResult}
   */
  renderDefaultSlot() {
    return html`<slot></slot>`;
  }

  // -------------------------------------------------------------------------------------------
  // Progress
  // -------------------------------------------------------------------------------------------

  /**
   * @protected
   * @readonly
   * @type {import('lit/directives/ref').Ref<HTMLProgressElement>}
   */
  progressRef = createRef();

  /**
   * Returns the underlying `<progress>` element.
   *
   * @type {HTMLProgressElement}
   */
  get progressElement() {
    return /** @type {HTMLProgressElement} */ (this.progressRef.value);
  }

  /**
   * @protected
   * @returns {import('lit').TemplateResult}
   */
  renderProgress() {
    const seekablePercentage =
      this.mediaDuration > 0
        ? (this.mediaSeekableAmount / this.mediaDuration) * 100
        : 0;

    const value = round(seekablePercentage, 2);
    const valueText = `${value}%`;

    return html`
      <div
        id="progress"
        role="progressbar"
        part=${this.getProgressPartAttr()}
        ?hidden=${this.hidden}
        aria-label=${this.progressLabel}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow=${value}
        aria-valuetext=${valueText}
        ${ref(this.progressRef)}
      >
        ${this.renderProgressSlot()}
      </div>
    `;
  }

  /**
   * @protected
   * @returns {string}
   */
  getProgressPartAttr() {
    return 'progress';
  }

  /**
   * @protected
   * @returns {import('lit').TemplateResult}
   */
  renderProgressSlot() {
    return html`<slot name="progress"></slot>`;
  }

  // -------------------------------------------------------------------------------------------
  // Slider
  // -------------------------------------------------------------------------------------------

  /**
   * @protected
   * @readonly
   * @type {import('lit/directives/ref').Ref<SliderElement>}
   */
  sliderRef = createRef();

  /**
   * Returns the underlying `vds-slider` component.
   *
   * @type {SliderElement}
   */
  get sliderElement() {
    return /** @type {SliderElement} */ (this.sliderRef.value);
  }

  /**
   * Whether the user is seeking by either hovering over the scrubber or by dragging the thumb.
   *
   * @type {boolean}
   */
  get isInteractive() {
    return this.isPointerInsideScrubber || this.isDraggingThumb;
  }

  /**
   * @protected
   * @returns {import('lit').TemplateResult}
   */
  renderSlider() {
    const step =
      this.mediaDuration > 0
        ? (this.step / this.mediaDuration) * 100
        : this.step;

    const keyboardStep =
      this.mediaDuration > 0
        ? (this.keyboardStep / this.mediaDuration) * 100
        : this.keyboardStep;

    return html`
      <vds-slider
        id="slider"
        label=${ifNonEmpty(this.label)}
        min="0"
        max="100"
        value=${this.currentTimePercentage}
        step=${step}
        keyboard-step=${keyboardStep}
        shift-key-multiplier=${this.shiftKeyMultiplier}
        part=${this.getSliderPartAttr()}
        orientation=${this.orientation}
        throttle=${this.throttle}
        value-text=${this.getSliderProgressText()}
        @vds-slider-value-change=${this.handleSliderValueChange}
        @vds-slider-drag-start=${this.handleSliderDragStart}
        @vds-slider-drag-end=${this.handleSliderDragEnd}
        exportparts=${this.getSliderExportPartsAttr()}
        ?hidden=${this.hidden}
        ?disabled=${this.disabled}
        ${ref(this.sliderRef)}
      >
        ${this.renderSliderChildren()}
      </vds-slider>
    `;
  }

  /**
   * @protected
   * @returns {string}
   */
  getSliderPartAttr() {
    return 'slider';
  }

  /**
   * @protected
   * @returns {string}
   */
  getSliderExportPartsAttr() {
    // Take all slider parts and re-export with `slider` prefix (eg: `root` => `slider-root`).
    return SliderElement.parts
      .map((part) => `${part}: slider-${part}`)
      .join(', ');
  }

  /**
   * @protected
   * @returns {string}
   */
  getSliderProgressText() {
    const currentTime =
      this.mediaDuration > 0
        ? this.mediaDuration * (this.currentTimePercentage / 100)
        : 0;

    return this.progressText
      .replace('{currentTime}', formatSpokenTime(currentTime))
      .replace('{duration}', formatSpokenTime(this.mediaDuration));
  }

  /**
   * @protected
   * @returns {import('lit').TemplateResult}
   */
  renderSliderChildren() {
    return html`
      <slot name="slider"></slot>
      ${this.renderProgress()} ${this.renderPreviewTrack()}
    `;
  }

  /**
   * @protected
   * @param {SliderValueChangeEvent} event
   * @returns {Promise<void>}
   */
  async handleSliderValueChange(event) {
    this.currentTimePercentage = event.detail;

    await this.updatePreviewPosition(event);

    if (!isPointerEvent(event.originalEvent)) {
      this.dispatchUserSeeked(event.detail, event);
    }
  }

  /**
   * @protected
   * @param {SliderDragStartEvent} event
   * @returns {Promise<void>}
   */
  async handleSliderDragStart(event) {
    this.isDraggingThumb = true;
    this.setAttribute('dragging', '');
    this.showPreview(event);
    this.togglePlaybackWhileDragging(event);
  }

  /**
   * @protected
   * @param {SliderDragEndEvent} event
   * @returns {Promise<void>}
   */
  async handleSliderDragEnd(event) {
    this.isDraggingThumb = false;
    this.removeAttribute('dragging');
    this.hidePreview(event);
    this.dispatchUserSeeked(this.currentTimePercentage, event);
    this.togglePlaybackWhileDragging(event);
  }

  /**
   * @protected
   */
  updateCurrentTime() {
    if (this.isDraggingThumb) return;

    const percentage =
      this.mediaDuration > 0
        ? (this.mediaCurrentTime / this.mediaDuration) * 100
        : 0;

    this.currentTimePercentage = clampNumber(0, round(percentage, 5), 100);
  }

  /**
   * @protected
   * @type {boolean}
   */
  wasPlayingBeforeDragStart = false;

  /**
   * @protected
   * @param {Event} event
   */
  togglePlaybackWhileDragging(event) {
    if (!this.pauseWhileDragging) return;

    if (this.isDraggingThumb && !this.mediaPaused) {
      this.wasPlayingBeforeDragStart = true;
      this.remoteControl.pause(event);
    } else if (
      this.wasPlayingBeforeDragStart &&
      !this.isDraggingThumb &&
      this.mediaPaused
    ) {
      this.wasPlayingBeforeDragStart = false;
      this.remoteControl.play(event);
    }
  }

  // -------------------------------------------------------------------------------------------
  // Preview Track Fill
  // -------------------------------------------------------------------------------------------

  /**
   * @protected
   * @readonly
   * @type {import('lit/directives/ref').Ref<HTMLDivElement>}
   */
  previewTrackRef = createRef();

  /**
   * Returns the underlying preview track fill element (`<div>`). This will be `undefined` if
   * you set the `noPreviewTrack` property to true.
   *
   * @type {HTMLDivElement | undefined}
   */
  get previewTrackElement() {
    return this.previewTrackRef.value;
  }

  /**
   * @protected
   * @returns {import('lit').TemplateResult}
   */
  renderPreviewTrack() {
    if (this.noPreviewTrack) return html``;

    return html`
      <div
        id="preview-track"
        part=${this.getPreviewTrackPartAttr()}
        ?hidden=${!this.isInteractive}
        ?disabled=${this.disabled}
      ></div>
    `;
  }

  /**
   * @protected
   * @returns {string}
   */
  getPreviewTrackPartAttr() {
    return clsx('preview-track', 'preview-track-hidden' && !this.isInteractive);
  }

  // -------------------------------------------------------------------------------------------
  // Preview
  // -------------------------------------------------------------------------------------------

  /**
   * @protected
   * @type {HTMLElement | undefined}
   */
  currentPreviewSlotElement;

  /**
   * The element passed in to the `preview` slot.
   *
   * @type {HTMLElement | undefined}
   */
  get previewSlotElement() {
    return this.currentPreviewSlotElement;
  }

  /**
   * @protected
   * @returns {import('lit').TemplateResult}
   */
  renderPreviewSlot() {
    return html`
      <slot
        name="${this.getPreviewSlotName()}"
        @slotchange="${this.handlePreviewSlotChange}"
      ></slot>
    `;
  }

  /**
   * @protected
   * @returns {string}
   */
  getPreviewSlotName() {
    return 'preview';
  }

  /**
   * @protected
   */
  handlePreviewSlotChange() {
    this.currentPreviewSlotElement = /** @type {HTMLElement} */ (
      getSlottedChildren(this, this.getPreviewSlotName())[0]
    );

    if (!isNil(this.currentPreviewSlotElement)) {
      this.currentPreviewSlotElement.style.position = 'absolute';
      this.currentPreviewSlotElement.style.left = '0';
      this.currentPreviewSlotElement.style.zIndex = '90';
      this.currentPreviewSlotElement.style.willChange = 'transform';
      this.hidePreview();
    }
  }

  /**
   * @protected
   * @returns {boolean}
   */
  isCurrentPreviewHidden() {
    return this.currentPreviewSlotElement?.hasAttribute('hidden') ?? true;
  }

  /**
   * @protected
   * @type {number | undefined}
   */
  showPreviewTimeout;

  /**
   * @protected
   * @param {Event} event
   */
  showPreview(event) {
    window.clearTimeout(this.showPreviewTimeout);

    if (
      this.disabled ||
      isNil(this.currentPreviewSlotElement) ||
      !this.isInteractive ||
      (this.isInteractive && !this.isCurrentPreviewHidden())
    ) {
      return;
    }

    this.showPreviewTimeout = window.setTimeout(
      async () => {
        this.isPreviewShowing = true;
        this.currentPreviewSlotElement?.removeAttribute('hidden');
        await raf();
        await this.updatePreviewPosition(event);
        await this.updateComplete;
        this.setAttribute('previewing', '');
        this.dispatchEvent(
          new ScrubberPreviewShowEvent({ originalEvent: event })
        );
      },
      this.isDraggingThumb ? 150 : 0
    );

    this.requestUpdate();
  }

  /**
   * @protected
   * @param {Event | undefined} [event]
   * @returns {Promise<void>}
   */
  async hidePreview(event) {
    window.clearTimeout(this.showPreviewTimeout);

    if (
      this.isInteractive ||
      (!this.isInteractive && this.isCurrentPreviewHidden())
    ) {
      return;
    }

    if (!isUndefined(event)) {
      this.updatePreviewPosition(event);
      await this.updateComplete;
    }

    this.isPreviewShowing = false;
    this.removeAttribute('previewing');
    this.currentPreviewSlotElement?.setAttribute('hidden', '');
    this.dispatchEvent(new ScrubberPreviewHideEvent({ originalEvent: event }));
    this.requestUpdate();
  }

  /**
   * @protected
   * @param {Event} event
   */
  dispatchPreviewTimeChangeEvent(event) {
    if (!this.isInteractive) return;
    this.mediaSeekingRequestThrottle?.(event);
    this.dispatchEvent(
      new ScrubberPreviewTimeUpdateEvent({
        detail: this.previewTime,
        originalEvent: event
      })
    );
  }

  /**
   * @protected
   * @param {number} thumbPosition
   * @returns {number}
   */
  calcPercentageOfMediaDurationOnThumb(thumbPosition) {
    const trackRect = this.sliderElement.trackElement.getBoundingClientRect();
    const percentage =
      (100 / trackRect.width) * (thumbPosition - trackRect.left);
    return clampNumber(0, percentage, 100);
  }

  /**
   * @protected
   * @param {number} durationPercentage
   * @returns {number}
   */
  calcPreviewXPosition(durationPercentage) {
    const rootRect = this.rootElement.getBoundingClientRect();

    const previewRectWidth =
      this.currentPreviewSlotElement?.getBoundingClientRect().width ?? 0;

    // Margin on slider usually represents (thumb width / 2) so thumb is contained when on edge.
    const sliderXMargin = parseFloat(
      window.getComputedStyle(this.sliderElement.rootElement).marginLeft
    );

    const left =
      (durationPercentage / 100) * rootRect.width - previewRectWidth / 2;

    const rightLimit = rootRect.width - previewRectWidth - sliderXMargin;

    return this.noPreviewClamp
      ? left
      : clampNumber(sliderXMargin, left, rightLimit);
  }

  /**
   * @protected
   * @param {number} time
   * @param {Event} event
   */
  updatePreviewTime(time, event) {
    this.previewTime = clampNumber(0, round(time, 5), this.mediaDuration);

    this.style.setProperty(
      '--vds-scrubber-preview-time',
      String(this.previewTime)
    );

    this.previewTimeChangeThrottle?.(event);
  }

  /**
   * @protected
   * @type {number}
   */
  previewPositionRafId = 0;

  /**
   * @protected
   * @param {Event} event
   * @returns {Promise<void>}
   */
  async updatePreviewPosition(event) {
    window.cancelAnimationFrame(this.previewPositionRafId);

    this.previewPositionRafId = await raf(() => {
      const originalEvent = isVdsEvent(event) ? event.originalEvent : event;

      if (isPointerEvent(originalEvent)) {
        const percent = this.calcPercentageOfMediaDurationOnThumb(
          originalEvent.clientX
        );

        const previewTime = (percent / 100) * this.mediaDuration;

        this.updatePreviewTime(previewTime, event);

        if (!isNil(this.currentPreviewSlotElement)) {
          const xPos = this.calcPreviewXPosition(percent);
          this.currentPreviewSlotElement.style.transform = `translateX(${xPos}px)`;
        }
      }
    });
  }

  // -------------------------------------------------------------------------------------------
  // Throttles
  // -------------------------------------------------------------------------------------------

  /**
   * @protected
   * @type {import('../../../utils/timing').ThrottledFunction<[event: Event]> | undefined}
   */
  previewTimeChangeThrottle;

  /**
   * @protected
   * @type {import('../../../utils/timing').ThrottledFunction<[event: Event]> | undefined}
   */
  mediaSeekingRequestThrottle;

  /**
   * @protected
   */
  initThrottles() {
    this.destroyThrottles();

    this.previewTimeChangeThrottle = throttle(
      this.dispatchPreviewTimeChangeEvent.bind(this),
      this.previewTimeThrottle
    );

    this.mediaSeekingRequestThrottle = throttle(
      this.dispatchUserSeekingEvent.bind(this),
      this.userSeekingThrottle
    );
  }

  /**
   * @protected
   */
  destroyThrottles() {
    this.previewTimeChangeThrottle?.cancel();
    this.previewTimeChangeThrottle = undefined;
    this.mediaSeekingRequestThrottle?.cancel();
    this.mediaSeekingRequestThrottle = undefined;
  }
}

export const SCRUBBER_ELEMENT_STORYBOOK_ARG_TYPES = {
  // Properties
  disabled: SLIDER_ELEMENT_STORYBOOK_ARG_TYPES.disabled,
  hidden: SLIDER_ELEMENT_STORYBOOK_ARG_TYPES.hidden,
  noPreviewClamp: {
    control: StorybookControlType.Boolean,
    defaultValue: false
  },
  noPreviewTrack: {
    control: StorybookControlType.Boolean,
    defaultValue: false
  },
  orientation: SLIDER_ELEMENT_STORYBOOK_ARG_TYPES.orientation,
  pauseWhileDragging: {
    control: StorybookControlType.Boolean,
    defaultValue: false
  },
  previewTimeThrottle: {
    control: StorybookControlType.Number,
    defaultValue: 30
  },
  progressLabel: {
    control: StorybookControlType.Text,
    defaultValue: 'Amount seekable'
  },
  progressText: {
    control: StorybookControlType.Text,
    defaultValue: '{currentTime} out of {duration}'
  },
  label: {
    control: StorybookControlType.Text,
    defaultValue: 'Time scrubber'
  },
  step: {
    control: StorybookControlType.Number,
    defaultValue: 0.5
  },
  keyboardStep: {
    control: StorybookControlType.Number,
    defaultValue: 5
  },
  shiftKeyMultiplier: {
    control: StorybookControlType.Number,
    defaultValue: 2
  },
  throttle: { control: StorybookControlType.Number, defaultValue: 0 },
  userSeekingThrottle: {
    control: StorybookControlType.Number,
    defaultValue: 150
  },
  // Scrubber Actions
  onScrubberPreviewShow: storybookAction(ScrubberPreviewShowEvent.TYPE),
  onScrubberPreviewHide: storybookAction(ScrubberPreviewHideEvent.TYPE),
  onScrubberPreviewTimeUpdate: storybookAction(
    ScrubberPreviewTimeUpdateEvent.TYPE
  ),
  // Media Properties
  mediaCurrentTime: {
    control: StorybookControlType.Number,
    defaultValue: 1000
  },
  mediaDuration: { control: StorybookControlType.Number, defaultValue: 3600 },
  mediaPaused: { control: StorybookControlType.Boolean, defaultValue: true },
  mediaSeekableAmount: {
    control: StorybookControlType.Number,
    defaultValue: 1800
  },
  // Media Request Actions
  onPlayRequest: storybookAction(PlayRequestEvent.TYPE),
  onPauseRequest: storybookAction(PauseRequestEvent.TYPE),
  onSeekRequest: storybookAction(SeekRequestEvent.TYPE),
  onSeekingRequest: storybookAction(SeekingRequestEvent.TYPE)
};
