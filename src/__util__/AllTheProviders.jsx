import { BrowserRouter } from 'react-router-dom'

import { SettingsProvider } from '../context/SettingsContext'
import { WalletProvider } from '../context/WalletContext'
import { WebsocketProvider } from '../context/WebsocketContext'

export const AllTheProviders = ({ children }) => {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <WalletProvider>
          <WebsocketProvider>{children}</WebsocketProvider>
        </WalletProvider>
      </SettingsProvider>
    </BrowserRouter>
  )
}
