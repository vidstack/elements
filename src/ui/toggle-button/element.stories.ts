import './define';

import { ifNonEmpty } from '@base/directives/index';
import { storybookAction, StorybookControl } from '@base/storybook/index';
import { html } from 'lit';

import { TOGGLE_BUTTON_ELEMENT_TAG_NAME } from './ToggleButtonElement';

export const TOGGLE_BUTTON_ELEMENT_STORYBOOK_ARG_TYPES = {
  label: { control: StorybookControl.Text },
  describedBy: { control: StorybookControl.Text },
  disabled: { control: StorybookControl.Boolean },
  pressed: { control: StorybookControl.Boolean, defaultValue: false },
  onClick: storybookAction('click'),
  onFocus: storybookAction('focus'),
  onBlur: storybookAction('blur')
};

export default {
  title: 'UI/Controls/Toggle Button',
  component: TOGGLE_BUTTON_ELEMENT_TAG_NAME,
  argTypes: TOGGLE_BUTTON_ELEMENT_STORYBOOK_ARG_TYPES,
  excludeStories: /.*STORYBOOK_ARG_TYPES$/
};

function Template({
  // Properties
  label,
  disabled,
  describedBy,
  pressed,
  // Actions
  onClick,
  onFocus,
  onBlur
}: any) {
  return html`
    <vds-toggle-button
      label=${ifNonEmpty(label)}
      described-by=${ifNonEmpty(describedBy)}
      ?pressed=${pressed}
      ?disabled=${disabled}
      @click=${onClick}
      @focus=${onFocus}
      @blur=${onBlur}
    >
      <div class="pressed">Pressed</div>
      <div class="not-pressed">Not Pressed</div>
    </vds-toggle-button>

    <style>
      vds-toggle-button[pressed] .pressed {
        display: none;
      }

      vds-toggle-button:not([pressed]) .not-pressed {
        display: none;
      }
    </style>
  `;
}

export const ToggleButton = Template.bind({});
