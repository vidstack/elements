import { storybookAction, StorybookControl } from '@base/storybook/index';

export const MEDIA_CONTAINER_ELEMENT_STORYBOOK_ARG_TYPES = {
  aspectRatio: { control: StorybookControl.Text },
  onMediaContainerConnect: storybookAction('vds-media-container-connect')
};
