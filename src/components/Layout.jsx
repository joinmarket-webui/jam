import React from 'react'
import { Outlet } from 'react-router-dom'
import Row from 'react-bootstrap/Row'
import RBCol from 'react-bootstrap/Col'

const Col = ({ variant, children }) => {
  if (variant === 'wide') {
    return <RBCol>{children}</RBCol>
  }

  if (variant === 'narrow') {
    return (
      <RBCol xs={10} sm={8} md={6} lg={4}>
        {children}
      </RBCol>
    )
  }

  return (
    <RBCol md={10} lg={8} xl={6}>
      {children}
    </RBCol>
  )
}

const Layout = ({ variant }) => {
  return (
    <Row className="justify-content-center">
      <Col variant={variant}>
        <Outlet />
      </Col>
    </Row>
  )
}

export default Layout
