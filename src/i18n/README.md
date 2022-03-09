# Translating Jam

We use [Transifex](https://www.transifex.com/joinmarket/jam/) for managing Jam's translations.

## For Developers

Our source language, i.e. the language we develop in, is English.
If you add text to the app, make sure not to use plain language in source files.
Instead add any strings to the English translation file:

```
src/i18n/locales/en/translation.json
```

Then, use the `i18next-react` [translation hook](https://react.i18next.com/latest/usetranslation-hook) in source files.
Don't worry about other languages.

### Example

Source File:

```jsx
// src/components/Hello.jsx

import React from 'react'
import { useTranslation } from 'react-i18next'

export default function HelloComponent() {
  const { t } = useTranslation()

  return <h1>{t('hello.heading')}</h1>
}
```

Translation file:

```json
// src/i18n/locales/en/translation.json

{
  "hello": {
    "heading": "Hello, world!"
  }
}
```

### Background

Transifex [is connected with our GitHub repo](https://docs.transifex.com/transifex-github-integrations/github-tx-ui).
Whenever new translation strings land on `master` (e.g. when being added as part of a new feature in a PR), [Transifex](https://www.transifex.com/joinmarket/jam/) will automatically add those new strings to the Transifex web app.
Whenever translations on Transifex are done and reviewed, Transifex will open a PR on GitHub to integrate newly translated texts into the app.

### Adding a new Language

To add a new language:

1. [Add it](https://docs.transifex.com/projects/adding-and-removing-project-languages) on [Transifex](https://www.transifex.com/joinmarket/jam/languages/).
1. Trigger a [manual sync](https://docs.transifex.com/transifex-github-integrations/github-tx-ui#manual-sync) from Transifex to GitHub.
1. Transifex will open a pull request. On this branch, add the new language in `src/i18n/languages.js`. For example, when adding `de`:

```js
import en from './locales/en/translation.json'
import de from './locales/de/translation.json' // This file should have been created by Transifex in the PR.

const languages = [
  {
    key: 'en',
    description: 'English',
    translation: en,
  },
  {
    key: 'de',
    description: 'Deutsch',
    translation: de,
  },
]
```

## Translators

Let us know [on Telegram](https://t.me/JoinMarketWebUI) or [GitHub](https://github.com/joinmarket-webui/joinmarket-webui/issues/new) if you would like to help out translating!
