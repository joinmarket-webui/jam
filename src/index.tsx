import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './components/App'
import { SettingsProvider } from './context/SettingsContext'
import { WebsocketProvider } from './context/WebsocketContext'
import { ServiceInfoProvider } from './context/ServiceInfoContext'
import { WalletProvider } from './context/WalletContext'
import { ServiceConfigProvider } from './context/ServiceConfigContext'

import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import './i18n/config'

const container = document.getElementById('root')
const root = createRoot(container!)
root.render(
  <StrictMode>
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
  </StrictMode>,
)
