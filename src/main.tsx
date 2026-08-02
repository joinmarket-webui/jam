import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/App.tsx'
import '@/i18n/config'
import { JAM_REPO_URL } from './constants/jam'
import './index.css'

console.debug(
  `%c/${'*'.repeat(42)}
* Thanks for testing! Please report anything that looks off.
* Found a bug? Open an issue at ${JAM_REPO_URL}/issues/new?labels=bug&template=bug_report.md
*
* This message should be dropped from preview/prod builds.
* Use the above link and open a bug report if you see this message outside development builds.
${'*'.repeat(42)}/`,
  'color:#e2b86a;font-size:14px;',
)

createRoot(document.querySelector('#root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
