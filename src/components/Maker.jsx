import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useGlobal } from 'reactn'
import * as rb from 'react-bootstrap'
import { serialize } from '../utils'

export default function Maker({ currentWallet }) {
  const [validated, setValidated] = useState(false)
  const [alert, setAlert] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const [makerStarted] = useGlobal('makerStarted')
  const navigate = useNavigate()

  const startMakerService = async (txfee, cjfee_a, cjfee_r, ordertype, minsize) => {
    const { name, token } = currentWallet
    setAlert(null)
    setIsSending(true)
    try {
      const res = await fetch(`/api/v1/wallet/${name}/maker/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          txfee,
          cjfee_a,
          cjfee_r,
          ordertype,
          minsize
        })
      })

      if (res.ok) {
        const data = await res.json()
        console.log(data)
        setAlert({ variant: 'success', message: 'Maker started.' })
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
    setAlert(null)
    setIsSending(true)
    try {
      const res = await fetch(`/api/v1/wallet/${name}/maker/stop`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      })

      if (res.ok) {
        const data = await res.json()
        console.log(data)
        setAlert({ variant: 'success', message: 'Maker stopped.' })
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
      if (makerStarted === false) {
        const { cjfeeRel } = serialize(form)
        await startMakerService(0, 0, cjfeeRel, 'sw0reloffer', 1000)
      } else {
        await stopMakerService()
      }
      form.reset()
      navigate('/wallet')
    }
  }

  return (
    <rb.Form onSubmit={onSubmit} validated={validated} noValidate>
      <h1>Maker Service</h1>
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      {makerStarted === false &&
        <rb.Form.Group className="mb-3" controlId="cjfeeRel">
          <rb.Form.Label>Relative Coinjoin Fee</rb.Form.Label>
          <rb.Form.Control name="cjfeeRel" required />
          <rb.Form.Control.Feedback type="invalid">Please provide an account.</rb.Form.Control.Feedback>
        </rb.Form.Group>}
      <rb.Button variant="primary" type="submit" disabled={isSending}>
        {isSending
          ? <>
            <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
            {makerStarted === 'true' ? 'Stopping' : 'Starting'}
          </>
          : makerStarted === 'true' ? 'Stop' : 'Start'}
      </rb.Button>
    </rb.Form>
  )
}
