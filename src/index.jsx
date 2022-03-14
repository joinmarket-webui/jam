import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter } from 'react-router-dom'
import App from './components/App'
import { SettingsProvider } from './context/SettingsContext'
import { WalletProvider } from './context/WalletContext'
import { WebsocketProvider } from './context/WebsocketContext'
import { SessionInfoProvider } from './context/SessionInfoContext'
import reportWebVitals from './reportWebVitals'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import './i18n/config'

ReactDOM.render(
  <BrowserRouter basename={window.JM.PUBLIC_PATH}>
    <SettingsProvider>
      <WalletProvider>
        <WebsocketProvider>
          <SessionInfoProvider>
            <App />
          </SessionInfoProvider>
        </WebsocketProvider>
      </WalletProvider>
    </SettingsProvider>
  </BrowserRouter>,
  document.getElementById('root')
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
