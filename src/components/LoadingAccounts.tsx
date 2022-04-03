import * as rb from 'react-bootstrap'

interface LoadingAccountsProps {
  amount?: number
}

export function LoadingAccounts({ amount = 1 }: LoadingAccountsProps) {
  return (
    <div>
      {[...new Array(amount)].map((a, index) => (
        <rb.Placeholder key={index} as="div" animation="glow" style={{ marginBottom: 6 }}>
          <rb.Placeholder xs={12} style={{ height: '3.3rem' }} />
        </rb.Placeholder>
      ))}
    </div>
  )
}
