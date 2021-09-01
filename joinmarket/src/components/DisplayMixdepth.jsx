import React from 'react'
import { Button } from './Button'
import './DisplayMixdepth.css'
import { BrowserRouter as Router, Link, Route ,Switch} from 'react-router-dom';
import * as rb from 'react-bootstrap'

const DisplayMixdepth = ({walletInfo}) => {

    console.log(walletInfo)
    
    const accounts = []
    
    for (const account_info of walletInfo.accounts){
        accounts.push(account_info)
    }

    console.log(accounts)
   
    return (

        
        <div>
            Total Balance: {walletInfo.total_balance}
            <p></p>
            <rb.Button href="/maker">Maker Service</rb.Button>
            <p></p>
            {accounts.map((account, index) => (
                
                <div key = {index}>
                    
                    <rb.Accordion>
                        <rb.Accordion.Item eventKey={index}>
                            <rb.Accordion.Header>Account {accounts[index].account} Balance: {accounts[index].account_balance} {' '}
                            <div className = "links">
                            <Link to={{pathname:"/payment", state: { account_no: accounts[index].account }}}>Send Funds </Link>{' '}
                            <Link to={{pathname:"/receive", state: { account_no: accounts[index].account }}}>Receive Funds</Link>
                            </div>
                            </rb.Accordion.Header>
                            <rb.Accordion.Body>
                            <rb.Accordion>
                                <rb.Accordion.Item eventKey="0">
                                    <rb.Accordion.Header>External Addresses Balance: {accounts[index].branches[0].balance}</rb.Accordion.Header>
                                    <rb.Accordion.Body>
                                        {accounts[index].branches[0].entries.map((user, i) => (
                                        <div key={i}>
                                        <rb.Accordion>
                                            <rb.Accordion.Item eventKey="0">
                                                <rb.Accordion.Header>{accounts[index].branches[0].entries[i].address} {' '} {accounts[index].branches[0].entries[i].labels} </rb.Accordion.Header>
                                                <rb.Accordion.Body>
                                                    path: {accounts[index].branches[0].entries[i].hd_path} amount: {accounts[index].branches[0].entries[i].amount}
                                                </rb.Accordion.Body>
                                            </rb.Accordion.Item>
                                        </rb.Accordion>
                                        </div>
                                        ))}
                                    </rb.Accordion.Body>
                                </rb.Accordion.Item>  
                                <rb.Accordion.Item eventKey="1">
                                    <rb.Accordion.Header>Internal Addresses Balance: {accounts[index].branches[1].balance}</rb.Accordion.Header>
                                        <rb.Accordion.Body>
                                            {accounts[index].branches[1].entries.map((user, j) => (
                                            <div key={j}>
                                                <rb.Accordion>
                                                    <rb.Accordion.Item eventKey="0">
                                                        <rb.Accordion.Header>{accounts[index].branches[0].entries[j].address} {' '} {accounts[index].branches[0].entries[j].labels} </rb.Accordion.Header>
                                                        <rb.Accordion.Body>
                                                            path: {accounts[index].branches[0].entries[j].hd_path} amount: {accounts[index].branches[0].entries[j].amount}
                                                        </rb.Accordion.Body>
                                                    </rb.Accordion.Item>
                                                </rb.Accordion>
                                            </div>
                                            ))}
                                        </rb.Accordion.Body>
                                </rb.Accordion.Item>
                            </rb.Accordion>
                        </rb.Accordion.Body>
                    </rb.Accordion.Item>
                </rb.Accordion>
                </div>
            ))}
            {/* Account 0: {walletInfo[0]} 
            
            <span> <Link to={{pathname:"/payment", state: { account_no: '0' }}}>Send Funds </Link> </span>
              
            <span><Link to={{pathname:"/receive", state: { account_no: '0' }}}>Receive Funds</Link></span>
            <p></p>
            <p></p>
            Account 1: {walletInfo[1]}
            <Link to={{pathname:"/payment", state: { account_no: '1' }}}>Send Funds </Link>
              
            <Link to={{pathname:"/receive", state: { account_no: '1' }}}>Receive Funds</Link>
            <p></p>
            <p></p>
            Account 2: {walletInfo[2]}
            <Link to={{pathname:"/payment", state: { account_no: '2' }}}>Send Funds </Link>
              
              <Link to={{pathname:"/receive", state: { account_no: '2' }}}>Receive Funds</Link>
            <p></p>
            <p></p>
            Account 3: {walletInfo[3]}
            <Link to={{pathname:"/payment", state: { account_no: '3' }}}>Send Funds </Link>
              
            <Link to={{pathname:"/receive", state: { account_no: '3' }}}>Receive Funds</Link>

            <p></p>
            <p></p>
            Account 4: {walletInfo[4]}
            <Link to={{pathname:"/payment", state: { account_no: '4' }}}>Send Funds </Link>
              
            <Link to={{pathname:"/receive", state: { account_no: '4' }}}>Receive Funds</Link>
            <p></p>
            <p></p> */}
        </div>
    )
}

export default DisplayMixdepth
