export interface Account {
  account: string // e.g. "0", "1", etc.
  account_balance: string // balance in btc, e.g. "148.88887469"
  branches: Branch[]
}

export interface Branch {
  branch: string // string of 'type', 'derivation', 'xpub' with tab as seperator, e.g. "external addresses\tm/84'/1'/0'/0\ttpubDE..."
  balance: string // in btc, e.g.	"150.00000000"
  entries: BranchEntry[]
}

export interface BranchEntry {
  hd_path: string // e.g.	"m/84'/1'/0'/0/0"
  address: string // e.g.	"bcrt1q9z4gzzqsks27p0jt40uhhc2gpl2e52gxk5982v"
  amount: string // in btc, e.g.	"150.00000000"
  status: string // e.g. "new",	"used", etc.
  label: string
  extradata: string
}
