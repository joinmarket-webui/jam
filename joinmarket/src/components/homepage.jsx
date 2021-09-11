import React from 'react'
import * as rb from 'react-bootstrap'
import './Homepage.css'
import { BrowserRouter as Router, Link, Route ,Switch} from 'react-router-dom';
import {BeautifulQuestions,SunnyMorning,SignalNoise,Thursday} from 'moving-letters'


const Homepage = () => {
    
    return (
        <>
        
      <div className="showcase-container">
        <h1 class="main-title" id="home">Joinmarket</h1>
        
      </div>
           
        <rb.Container className = "container1">
        
            <rb.Row>
            
                <rb.Col className = "column">
                <div class="text-center">
                    <Link to="/create"  className="btn btn-primary">Create Wallet</Link>
                    </div>
                </rb.Col>
                
                <rb.Col className = "column">
                    <Link to="/showWallets"  className="btn btn-primary">Show Wallets</Link>
                </rb.Col>
            </rb.Row>
        </rb.Container>
        
        </>
    )
}

export default Homepage
