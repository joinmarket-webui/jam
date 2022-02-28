// react-testing-library renders your components to document.body,
// this adds jest-dom's custom assertions
import '@testing-library/jest-dom'

global.JM = {
  SETTINGS_STORE_KEY: 'jm-settings',
  THEMES: ['light', 'dark'],
  THEME_ROOT_ATTR: 'data-theme',
}
