import { BlocksIcon, TerminalIcon, WalletIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import PageTitle from '@/components/ui/jam/PageTitle'
import { DevBadge } from './DevBadge'

const DEFAULT_BASIC_AUTH = {
  user: 'joinmarket',
  password: 'joinmarket',
}

const LINK_JM_REGTEST_JOINMARKET2 = 'http://localhost:29080'
const LINK_JM_REGTEST_JOINMARKET2_AUTH = DEFAULT_BASIC_AUTH
const LINK_JM_REGTEST_JOINMARKET3 = 'http://localhost:30080'
const LINK_JM_REGTEST_EXPLORER = 'http://localhost:3002'
const LINK_JM_REGTEST_EXPLORER_AUTH = DEFAULT_BASIC_AUTH
const LINK_JM_REGTEST_RPC_TERMINAL = `${LINK_JM_REGTEST_EXPLORER}/rpc-terminal`

export default function DevSetupPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-3 p-4">
      <PageTitle
        title={
          <>
            Development setup <DevBadge />
          </>
        }
        subtitle="Development setup specific information"
      />

      <div className="flex flex-col gap-3">
        <div className="mb-4">
          <h5 className="text-xl font-bold">Test Wallet</h5>
          <div className="my-2 ms-3">
            Name: <span className="font-mono">Satoshi</span>
            <br />
            Password: <span className="font-mono">test</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="mb-4">
          <h5 className="text-xl font-bold">Jam Instances</h5>
          <div>
            <div className="flex items-center gap-2">
              <WalletIcon className="h-4 w-4" />
              <a href={LINK_JM_REGTEST_JOINMARKET2} target="_blank" rel="noopener noreferrer" className="underline">
                jm_regtest_joinmarket2 ({LINK_JM_REGTEST_JOINMARKET2})
              </a>
              <Badge>secondary</Badge>
            </div>

            <div className="my-2 ms-5">
              Basic Authentication
              <br />
              <small>
                User: <span className="font-mono">{LINK_JM_REGTEST_JOINMARKET2_AUTH.user}</span>
                <br />
                Password: <span className="font-mono">{LINK_JM_REGTEST_JOINMARKET2_AUTH.password}</span>
              </small>
            </div>
            <div className="flex items-center gap-2">
              <WalletIcon className="h-4 w-4" />
              <a href={LINK_JM_REGTEST_JOINMARKET3} target="_blank" rel="noopener noreferrer" className="underline">
                jm_regtest_joinmarket3 ({LINK_JM_REGTEST_JOINMARKET3})
              </a>
              <Badge>tertiary</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="mb-4">
          <h5 className="text-xl font-bold">Block Explorer</h5>
          <div>
            {' '}
            <div className="flex items-center gap-2">
              <BlocksIcon className="h-4 w-4" />

              <a href={LINK_JM_REGTEST_EXPLORER} target="_blank" rel="noopener noreferrer" className="underline">
                jm_regtest_explorer ({LINK_JM_REGTEST_EXPLORER})
              </a>
            </div>
            <div className="my-2 ms-5">
              Basic Authentication
              <br />
              <small>
                User: <span className="font-mono">{LINK_JM_REGTEST_EXPLORER_AUTH.user}</span>
                <br />
                Password: <span className="font-mono">{LINK_JM_REGTEST_EXPLORER_AUTH.password}</span>
              </small>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <TerminalIcon className="h-4 w-4" />

              <a href={LINK_JM_REGTEST_RPC_TERMINAL} target="_blank" rel="noopener noreferrer" className="underline">
                Regtest RPC Terminal ({LINK_JM_REGTEST_RPC_TERMINAL})
              </a>
            </div>
            <div className="my-2 ms-5">
              Mine a block, e.g.:
              <pre>generatetoaddress 1 bcrt1qrnz0thqslhxu86th069r9j6y7ldkgs2tzgf5wx</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
