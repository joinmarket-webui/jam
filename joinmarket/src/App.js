import './App.css';
import { Button } from './components/Button';

function App() {
  var wallet_1 = "sig_1";
  var wallet_2 = "sig_2";
  var wallet_3 = "sig_3";
  return (
    <div className="App">
      <h1>Display Wallet</h1>
      <ul>
        <li>{wallet_1}<Button>unlock</Button></li>
        <li>{wallet_2}<Button>unlock</Button></li>
        <li>{wallet_3}<Button>unlock</Button></li>
      </ul>
      
    </div>
  );
}

export default App;
