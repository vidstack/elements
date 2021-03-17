import { TIME_STORYBOOK_ARG_TYPES } from '../time';
import { TimeCurrentFakeProps, TimeCurrentProps } from './time-current.types';

export type TimeCurrentStorybookArgs = {
  [P in keyof (TimeCurrentProps & TimeCurrentFakeProps)]: unknown;
} & {
  duration: undefined;
};

export const TIME_CURRENT_STORYBOOK_ARG_TYPES: TimeCurrentStorybookArgs = {
  ...TIME_STORYBOOK_ARG_TYPES,
  duration: undefined,
  fakeCurrentTime: {
    control: 'number',
    defaultValue: 3750,
  },
};
