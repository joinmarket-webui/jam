import React from 'react'
import ReactDOM from 'react-dom'
// @ts-ignore
import App from './components/App'
// @ts-ignore
import { SettingsProvider } from './context/SettingsContext'
// @ts-ignore
import { WebsocketProvider } from './context/WebsocketContext'
import { ServiceInfoProvider } from './context/ServiceInfoContext'
import { WalletProvider } from './context/WalletContext'
import { ServiceConfigProvider } from './context/ServiceConfigContext'

import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import './i18n/config'

ReactDOM.render(
  <React.StrictMode>
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
  </React.StrictMode>,
  document.getElementById('root'),
)
