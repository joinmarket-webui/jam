import React from 'react'
import * as rb from 'react-bootstrap'
import { walletDisplayName } from '../utils'
import Balance from './Balance'

export default function WalletPreview({ wallet }) {
  return (
    <div className="d-flex align-items-center">
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <mask id="path-1-inside-1_650_163" fill="white">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M19.6 23H23C24.1046 23 25 22.1046 25 21V9C25 7.89543 24.1046 7 23 7H19.6C20.7046 7 21.6 7.89543 21.6 9V21C21.6 22.1046 20.7046 23 19.6 23Z"
          />
        </mask>
        <path
          d="M23 22H19.6V24H23V22ZM24 21C24 21.5523 23.5523 22 23 22V24C24.6568 24 26 22.6569 26 21H24ZM24 9V21H26V9H24ZM23 8C23.5523 8 24 8.44772 24 9H26C26 7.34314 24.6568 6 23 6V8ZM19.6 8H23V6H19.6V8ZM19.6 8C20.1523 8 20.6 8.44772 20.6 9H22.6C22.6 7.34315 21.2568 6 19.6 6V8ZM20.6 9V21H22.6V9H20.6ZM20.6 21C20.6 21.5523 20.1523 22 19.6 22V24C21.2568 24 22.6 22.6569 22.6 21H20.6Z"
          fill="black"
          mask="url(#path-1-inside-1_650_163)"
        />
        <rect x="5.5" y="7.5" width="16.6" height="15" rx="1.5" stroke="black" />
        <circle cx="9.59999" cy="14.8" r="1.4" stroke="black" strokeWidth="0.8" />
      </svg>
      <div style={{ fontSize: '14px' }} className="d-flex flex-column ms-2">
        <div className="fw-normal">{walletDisplayName(wallet.name)}</div>
        <div>
          <Balance value="0.00167930" unit="BTC" showBalance="true" />
        </div>
      </div>
    </div>
  )
}
