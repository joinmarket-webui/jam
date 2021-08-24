import React from 'react'
import { Button } from './Button'
import { BrowserRouter as Router, Link, Route ,Switch} from 'react-router-dom';

const DisplayMixdepth = ({walletInfo}) => {
    return (
        <div>
            Total Balance: {walletInfo.balance}
            <p></p>
            Account 0: {walletInfo[0]} 
            
            <span> <Link to={{pathname:"/payment", state: { account_no: '0' }}}>Send Funds </Link> </span>
              
            <span><Link to="/receive">Receive Funds</Link></span>
            <p></p>
            <p></p>
            Account 1: {walletInfo[1]}
            <Link to={{pathname:"/payment", state: { account_no: '1' }}}>Send Funds </Link>
              
            <Link to="/receive">Receive Funds</Link>
            <p></p>
            <p></p>
            Account 2: {walletInfo[2]}
            <Link to={{pathname:"/payment", state: { account_no: '2' }}}>Send Funds </Link>
              
              <Link to="/receive">Receive Funds</Link>
            <p></p>
            <p></p>
            Account 3: {walletInfo[3]}
            <Link to={{pathname:"/payment", state: { account_no: '3' }}}>Send Funds </Link>
              
            <Link to="/receive">Receive Funds</Link>

            <p></p>
            <p></p>
            Account 4: {walletInfo[4]}
            <Link to={{pathname:"/payment", state: { account_no: '4' }}}>Send Funds </Link>
              
            <Link to="/receive">Receive Funds</Link>
            <p></p>
            <p></p>
        </div>
    )
}

export default DisplayMixdepth
