import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { WalletProvider } from './context/WalletContext'
import { ServiceInfoProvider } from './context/ServiceInfoContext'
import { ServiceConfigProvider } from './context/ServiceConfigContext'
// @ts-ignore
import { SettingsProvider } from './context/SettingsContext'
// @ts-ignore
import { WebsocketProvider } from './context/WebsocketContext'
import i18n from './i18n/testConfig'

const AllTheProviders = ({ children }: { children: React.ReactElement }) => {
  return (
    <React.StrictMode>
      <I18nextProvider i18n={i18n}>
        <SettingsProvider>
          <WalletProvider>
            <ServiceConfigProvider>
              <WebsocketProvider>
                <ServiceInfoProvider>{children}</ServiceInfoProvider>
              </WebsocketProvider>
            </ServiceConfigProvider>
          </WalletProvider>
        </SettingsProvider>
      </I18nextProvider>
    </React.StrictMode>
  )
}

const customRender = (ui: React.ReactElement, options?: RenderOptions) =>
  render(ui, { wrapper: AllTheProviders, ...options })

// re-export everything
export * from '@testing-library/react'

// override render method
export { customRender as render }
