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

setTimeout(() => {
  console.log('%cWarning!', 'color:oklch(0.577 0.245 27.325);font-size:48px;font-weight:bold;')
  console.log(
    "%cYou opened the browser console, a developer tool. Don't enter or paste code you do not understand. Never share your seed phrase or any other info with anyone. If someone told you to do this, it is very likely a scam.",
    'color:oklch(0.777 0.245 27.325);font-size:16px;',
  )
}, 2_100)

createRoot(document.querySelector('#root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
