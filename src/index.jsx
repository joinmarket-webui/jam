import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter } from 'react-router-dom'
import App from './components/App'
import { SettingsProvider } from './context/SettingsContext'
import { WalletProvider } from './context/WalletContext'
import reportWebVitals from './reportWebVitals'
import 'bootstrap/dist/css/bootstrap.min.css'
import '@ibunker/bitcoin-react/dist/index.css'
import './index.css'

ReactDOM.render(
  <BrowserRouter basename={window.JM.PUBLIC_PATH}>
    <SettingsProvider>
      <WalletProvider>
        <App />
      </WalletProvider>
    </SettingsProvider>
  </BrowserRouter>,
  document.getElementById('root')
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
