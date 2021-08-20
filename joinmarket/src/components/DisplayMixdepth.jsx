import React from 'react'
import { Button } from './Button'
import { BrowserRouter as Router, Link, Route ,Switch} from 'react-router-dom';
const DisplayMixdepth = ({walletInfo}) => {
    return (
        <div>
            Total Balance: {walletInfo.balance}
            <p></p>
            Mixdepth 0: {walletInfo[0]} 
            
            <Link to="/payment?mixdepth=0">Send Funds </Link>
              
            <Link to="/receive">Receive Funds</Link>
            <p></p>
            <p></p>
            Mixdepth 1: {walletInfo[1]}
            <Link to="/payment">Send Funds </Link>
              
            <Link to="/receive">Receive Funds</Link>
            <p></p>
            <p></p>
            Mixdepth 2: {walletInfo[2]}
            <Link to="/payment">Send Funds </Link>
              
              <Link to="/receive">Receive Funds</Link>
            <p></p>
            <p></p>
            Mixdepth 3: {walletInfo[3]}
            <Link to="/payment">Send Funds </Link>
              
            <Link to="/receive">Receive Funds</Link>

            <p></p>
            <p></p>
            Mixdepth 4: {walletInfo[4]}
            <Link to="/payment">Send Funds </Link>
              
            <Link to="/receive">Receive Funds</Link>
            <p></p>
            <p></p>
        </div>
    )
}

export default DisplayMixdepth
