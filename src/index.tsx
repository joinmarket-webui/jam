import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './components/App'
import { SettingsProvider } from './context/SettingsContext'
import { WebsocketProvider } from './context/WebsocketContext'
import { ServiceInfoProvider } from './context/ServiceInfoContext'
import { WalletProvider } from './context/WalletContext'
import { ServiceConfigProvider } from './context/ServiceConfigContext'
import { isDevMode } from './constants/debugFeatures'

import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import './i18n/config'

const ENBALE_STRICT_MODE = isDevMode()

const container = document.getElementById('root')
const root = createRoot(container!)
root.render(
  (() => {
    const children = (
      <SettingsProvider>
        <WalletProvider>
          <ServiceConfigProvider>
            <WebsocketProvider>
              <ServiceInfoProvider>
                <App />
              </ServiceInfoProvider>
            </WebsocketProvider>
          </ServiceConfigProvider>
        </WalletProvider>
      </SettingsProvider>
    )

    return ENBALE_STRICT_MODE ? <StrictMode>{children}</StrictMode> : children
  })(),
)
