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
    <rb.Col lg={10} xl={10} xxl={8}>
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
