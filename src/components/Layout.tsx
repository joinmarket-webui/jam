import { PropsWithChildren } from 'react'
import * as rb from 'react-bootstrap'

type LayoutVariant = 'wide' | ''

interface ColProps {
  variant?: LayoutVariant
}

const Col = ({ variant, children }: PropsWithChildren<ColProps>) => {
  if (variant === 'wide') {
    return <rb.Col>{children}</rb.Col>
  }

  return (
    <rb.Col md={12} lg={10} xl={8} xxl={6}>
      {children}
    </rb.Col>
  )
}

interface LayoutProps {
  variant?: LayoutVariant
}

const Layout = ({ variant, children }: PropsWithChildren<LayoutProps>) => {
  return (
    <rb.Row className="justify-content-center">
      <Col variant={variant}>{children}</Col>
    </rb.Row>
  )
}

export default Layout
