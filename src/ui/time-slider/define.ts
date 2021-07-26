import {
  TIME_SLIDER_ELEMENT_TAG_NAME,
  TimeSliderElement
} from './TimeSliderElement';

window.customElements.define(TIME_SLIDER_ELEMENT_TAG_NAME, TimeSliderElement);

declare global {
  interface HTMLElementTagNameMap {
    [TIME_SLIDER_ELEMENT_TAG_NAME]: TimeSliderElement;
  }
}
