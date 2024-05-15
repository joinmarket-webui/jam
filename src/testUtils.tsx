import { StrictMode, ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { WalletProvider } from './context/WalletContext'
import { ServiceInfoProvider } from './context/ServiceInfoContext'
import { ServiceConfigProvider } from './context/ServiceConfigContext'
import { SettingsProvider } from './context/SettingsContext'
import { WebsocketProvider } from './context/WebsocketContext'
import i18n from './i18n/testConfig'

const AllTheProviders = ({ children }: { children: ReactNode }) => {
  return (
    <StrictMode>
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
    </StrictMode>
  )
}

const customRender = (ui: ReactNode, options?: RenderOptions) => render(ui, { wrapper: AllTheProviders, ...options })

// re-export everything
export * from '@testing-library/react'

// override render method
export { customRender as render }
