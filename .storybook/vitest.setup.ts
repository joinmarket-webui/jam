//import * as a11yAddonAnnotations from '@storybook/addon-a11y/preview'
import { setProjectAnnotations } from '@storybook/react-vite'
import * as projectAnnotations from './preview'

// This is an important step to apply the right configuration when testing your stories.
// More info at: https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest#setprojectannotations
const annotations = [
  /* Note: disable a11yAddonAnnotations for update to vite 8, re-enable when possible! */
  /* (last check 2026-06-17, vite v8.0.16, storybook v10.4.6) */
  /* a11yAddonAnnotations, */
  projectAnnotations,
]
setProjectAnnotations(annotations)
