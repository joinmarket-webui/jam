import Sprite from './Sprite'
import PageTitle from './PageTitle'

const LINK_JM_REGTEST_JOINMARKET2 = 'http://localhost:29080'
const LINK_JM_REGTEST_JOINMARKET2_AUTH = {
  user: 'joinmarket',
  password: 'joinmarket',
}
const LINK_JM_REGTEST_JOINMARKET3 = 'http://localhost:30080'
const LINK_JM_REGTEST_EXPLORER = 'http://localhost:3002'
const LINK_JM_REGTEST_EXPLORER_AUTH = {
  user: 'joinmarket',
  password: 'joinmarket',
}
const LINK_JM_REGTEST_RPC_TERMINAL = 'http://localhost:3002/rpc-terminal'

export default function DevSetupPage() {
  return (
    <div className="">
      <PageTitle title="Development setup" subtitle="" />
      <div className="d-flex flex-column gap-3">
        <div className="mb-4">
          <h5>Test Wallet</h5>
          <div className="ms-3 my-2">
            Name: <code>Satoshi</code>
            <br />
            Password: <code>test</code>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h5>Jam Instances</h5>
        <div>
          <div className="d-flex align-items-center">
            <Sprite symbol="logo" width="24" height="24" className="me-2" />
            <a href={LINK_JM_REGTEST_JOINMARKET2} target="_blank" rel="noopener noreferrer" className="link-dark">
              jm_regtest_joinmarket2 ({LINK_JM_REGTEST_JOINMARKET2})
            </a>
            <span className="badge rounded-pill bg-primary ms-2">secondary</span>
          </div>

          <div className="ms-5 my-2">
            Basic Authentication
            <br />
            <small>
              User: <code>{LINK_JM_REGTEST_JOINMARKET2_AUTH.user}</code>
              <br />
              Password: <code>{LINK_JM_REGTEST_JOINMARKET2_AUTH.password}</code>
            </small>
          </div>
          <div className="d-flex align-items-center">
            <Sprite symbol="logo" width="24" height="24" className="me-2" />
            <a href={LINK_JM_REGTEST_JOINMARKET3} target="_blank" rel="noopener noreferrer" className="link-dark">
              jm_regtest_joinmarket3 ({LINK_JM_REGTEST_JOINMARKET3})
            </a>
            <span className="badge rounded-pill bg-success ms-2">tertiary</span>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h5>Block Explorer</h5>
        <div>
          {' '}
          <div className="d-flex align-items-center">
            <Sprite symbol="block" width="24" height="24" className="me-2" />

            <a href={LINK_JM_REGTEST_EXPLORER} target="_blank" rel="noopener noreferrer" className="link-dark">
              jm_regtest_explorer ({LINK_JM_REGTEST_EXPLORER})
            </a>
          </div>
          <div className="ms-5 my-2">
            Basic Authentication
            <br />
            <small>
              User: <code>{LINK_JM_REGTEST_EXPLORER_AUTH.user}</code>
              <br />
              Password: <code>{LINK_JM_REGTEST_EXPLORER_AUTH.password}</code>
            </small>
          </div>
        </div>
        <div>
          <div className="d-flex align-items-center">
            <Sprite symbol="console" width="24" height="24" className="me-2" />

            <a href={LINK_JM_REGTEST_RPC_TERMINAL} target="_blank" rel="noopener noreferrer" className="link-dark">
              Regtest RPC Terminal ({LINK_JM_REGTEST_RPC_TERMINAL})
            </a>
          </div>
          <div className="ms-5 my-2">
            Mine a block, e.g.:
            <pre>generatetoaddress 1 bcrt1qrnz0thqslhxu86th069r9j6y7ldkgs2tzgf5wx</pre>
          </div>
        </div>
      </div>
    </div>
  )
}
