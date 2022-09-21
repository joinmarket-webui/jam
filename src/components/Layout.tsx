import { PropsWithChildren } from 'react'
import * as rb from 'react-bootstrap'
import { Outlet } from 'react-router-dom'

type LayoutVariant = 'wide' | undefined

interface ColProps {
  variant: LayoutVariant
}

const Col = ({ variant, children }: PropsWithChildren<ColProps>) => {
  if (variant === 'wide') {
    return <rb.Col>{children}</rb.Col>
  }

  return (
    <rb.Col md={10} lg={8} xl={6}>
      {children}
    </rb.Col>
  )
}

interface LayoutProps {
  variant: LayoutVariant
}

const Layout = ({ variant }: LayoutProps) => {
  return (
    <rb.Row className="justify-content-center">
      <Col variant={variant}>
        <Outlet />
      </Col>
    </rb.Row>
  )
}

export default Layout
