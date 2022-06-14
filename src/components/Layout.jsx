import React from 'react'
import * as rb from 'react-bootstrap'
import { Outlet } from 'react-router-dom'

const Col = ({ variant, children }) => {
  if (variant === 'wide') {
    return <rb.Col>{children}</rb.Col>
  }

  return (
    <rb.Col md={10} lg={8} xl={6}>
      {children}
    </rb.Col>
  )
}

const Layout = ({ variant }) => {
  return (
    <rb.Row className="justify-content-center">
      <Col variant={variant}>
        <Outlet />
      </Col>
    </rb.Row>
  )
}

export default Layout
