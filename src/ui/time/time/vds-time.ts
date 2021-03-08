import { LIB_PREFIX } from '../../../shared/constants';
import { safelyDefineCustomElement } from '../../../utils/dom';
import { Time } from './Time';

export const TIME_TAG_NAME = `${LIB_PREFIX}-time`;

safelyDefineCustomElement(TIME_TAG_NAME, Time);

declare global {
  interface HTMLElementTagNameMap {
    'vds-time': Time;
  }
}
