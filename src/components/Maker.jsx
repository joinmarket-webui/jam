import React from 'react'
import { useState } from 'react'
import * as rb from 'react-bootstrap'
import { serialize } from '../utils'

export default function Maker({ currentWallet, makerRunning }) {
  const [validated, setValidated] = useState(false)
  const [alert, setAlert] = useState(null)
  const [isSending, setIsSending] = useState(false)

  const startMakerService = async (txfee, cjfee_a, cjfee_r, ordertype, minsize) => {
    const { name, token } = currentWallet
    const opts = {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        txfee,
        cjfee_a,
        cjfee_r,
        ordertype,
        minsize
      })
    }

    setAlert(null)
    setIsSending(true)
    try {
      const res = await fetch(`/api/v1/wallet/${name}/maker/start`, opts)

      if (res.ok) {
        // FIXME: Right now there is no response data to check if maker is running
        // const data = await res.json()
        // console.log(data)
        // setAlert({ variant: 'success', message: 'Maker started.' })
      } else {
        const { message } = await res.json()
        setAlert({ variant: 'danger', message })
      }
    } catch (e) {
      setAlert({ variant: 'danger', message: e.message })
    } finally {
      setIsSending(false)
    }
  }

  const stopMakerService = async () => {
    const { name, token } = currentWallet
    const opts = {
      headers: { 'Authorization': `Bearer ${token}` }
    }

    setAlert(null)
    setIsSending(true)
    try {
      const res = await fetch(`/api/v1/wallet/${name}/maker/stop`, opts)

      if (res.ok) {
        // FIXME: Right now there is no response data to check if maker got stopped
        // const data = await res.json()
        // console.log(data)
        // setAlert({ variant: 'success', message: 'Maker stopped.' })
      } else {
        const { message } = await res.json()
        setAlert({ variant: 'danger', message })
      }
    } catch (e) {
      setAlert({ variant: 'danger', message: e.message })
    } finally {
      setIsSending(false)
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()

    const form = e.currentTarget
    const isValid = form.checkValidity()
    setValidated(true)

    if (isValid) {
      if (makerRunning === false) {
        const { cjfeeRel } = serialize(form)
        await startMakerService(0, 0, cjfeeRel, 'sw0reloffer', 1000)
      } else {
        await stopMakerService()
      }
    }
  }

  return (
    <rb.Form onSubmit={onSubmit} validated={validated} noValidate>
      <h1>Maker Service</h1>
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      {makerRunning === false &&
        <rb.Form.Group className="mb-3" controlId="cjfeeRel">
          <rb.Form.Label>Relative Coinjoin Fee</rb.Form.Label>
          <rb.Form.Control name="cjfeeRel" required />
          <rb.Form.Control.Feedback type="invalid">Please provide an account.</rb.Form.Control.Feedback>
        </rb.Form.Group>}
      <rb.Button variant="primary" type="submit" disabled={isSending}>
        {isSending
          ? <>
            <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
            {makerRunning === true ? 'Stopping' : 'Starting'}
          </>
          : makerRunning === true ? 'Stop' : 'Start'}
      </rb.Button>
    </rb.Form>
  )
}
