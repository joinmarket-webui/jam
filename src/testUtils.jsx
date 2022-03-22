import React from 'react'
import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import { SettingsProvider } from './context/SettingsContext'
import { WalletProvider } from './context/WalletContext'
import { WebsocketProvider } from './context/WebsocketContext'
import { ServiceInfoProvider } from './context/ServiceInfoContext'
import i18n from './i18n/testConfig'

const AllTheProviders = ({ children }) => {
  return (
    <React.StrictMode>
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <SettingsProvider>
            <WalletProvider>
              <WebsocketProvider>
                <ServiceInfoProvider>{children}</ServiceInfoProvider>
              </WebsocketProvider>
            </WalletProvider>
          </SettingsProvider>
        </I18nextProvider>
      </BrowserRouter>
    </React.StrictMode>
  )
}

const customRender = (ui, options) => render(ui, { wrapper: AllTheProviders, ...options })

// re-export everything
export * from '@testing-library/react'

// override render method
export { customRender as render }
