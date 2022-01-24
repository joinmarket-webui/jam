import React from 'react'
import { useEffect, useState } from 'react'
import * as rb from 'react-bootstrap'

const OFFERTYPE_REL = 'sw0reloffer'
const OFFERTYPE_ABS = 'sw0absoffer'

export default function Earn({ currentWallet, makerRunning }) {
  const [validated, setValidated] = useState(false)
  const [alert, setAlert] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)
  const [offertype, setOffertype] = useState(window.localStorage.getItem('jm-offertype') || OFFERTYPE_REL)
  const [feeRel, setFeeRel] = useState(parseFloat(window.localStorage.getItem('jm-feeRel')) || 0.0003)
  const [feeAbs, setFeeAbs] = useState(parseInt(window.localStorage.getItem('jm-feeAbs'), 10) || 250)
  const [minsize, setMinsize] = useState(parseInt(window.localStorage.getItem('jm-minsize'), 10) || 100000)

  const setAndPersistOffertype = value => {
    setOffertype(value)
    window.localStorage.setItem('jm-offertype', value)
  }

  const setAndPersistFeeRel = value => {
    setFeeRel(value)
    window.localStorage.setItem('jm-feeRel', value)
  }

  const setAndPersistFeeAbs = value => {
    setFeeAbs(value)
    window.localStorage.setItem('jm-feeAbs', value)
  }

  const setAndPersistMinsize = value => {
    setMinsize(value)
    window.localStorage.setItem('jm-minsize', value)
  }

  const startMakerService = async (cjfee_a, cjfee_r, ordertype, minsize) => {
    const { name, token } = currentWallet
    const opts = {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        txfee: 0,
        cjfee_a,
        cjfee_r,
        ordertype,
        minsize
      })
    }

    setAlert(null)
    setIsSending(true)
    setIsWaiting(false)
    try {
      const res = await fetch(`/api/v1/wallet/${name}/maker/start`, opts)

      if (res.ok) {
        // FIXME: Right now there is no response data to check if maker got started
        // https://github.com/JoinMarket-Org/joinmarket-clientserver/issues/1120
        setAlert({ variant: 'success', message: 'The service is starting.' })
        setIsWaiting(true)
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

  useEffect(() => {
    setIsWaiting(false)
    setAlert(null)
  }, [makerRunning]);

  const stopMakerService = async () => {
    const { name, token } = currentWallet
    const opts = {
      headers: { 'Authorization': `Bearer ${token}` }
    }

    setAlert(null)
    setIsSending(true)
    setIsWaiting(false)
    try {
      const res = await fetch(`/api/v1/wallet/${name}/maker/stop`, opts)

      if (res.ok) {
        // FIXME: Right now there is no response data to check if maker got stopped
        // https://github.com/JoinMarket-Org/joinmarket-clientserver/issues/1120
        setAlert({ variant: 'success', message: 'The service is stopping.' })
        setIsWaiting(true)
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
        await startMakerService(feeAbs, feeRel, offertype, minsize)
      } else {
        await stopMakerService()
      }
    }
  }

  const isRelOffer = offertype === OFFERTYPE_REL

  return (
    <rb.Form onSubmit={onSubmit} validated={validated} noValidate>
      <h1>Earn</h1>
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      <p>Service {makerRunning ? 'running' : 'not running'}.</p>
      {!makerRunning && !isWaiting &&
        <>
          <rb.Form.Group className="mb-3" controlId="offertype">
            <rb.Form.Check type="switch" label="Relative offer" checked={isRelOffer} onChange={(e) => setAndPersistOffertype(e.target.checked ? OFFERTYPE_REL : OFFERTYPE_ABS)} />
          </rb.Form.Group>
          {isRelOffer
            ? <rb.Form.Group className="mb-3" controlId="feeRel">
                <rb.Form.Label>Relative Fee (percent)</rb.Form.Label>
                <rb.Form.Control type="number" name="feeRel" required step={0.0001} value={feeRel} min={0} max={0.1} style={{ width: '16ch' }} onChange={(e) => setAndPersistFeeRel(e.target.value)} />
                <rb.Form.Control.Feedback type="invalid">Please provide a relative fee.</rb.Form.Control.Feedback>
              </rb.Form.Group>
            : <rb.Form.Group className="mb-3" controlId="feeAbs">
                <rb.Form.Label>Absolute Fee in SATS</rb.Form.Label>
                <rb.Form.Control type="number" name="feeAbs" required step={1} value={feeAbs} min={0} style={{ width: '16ch' }} onChange={(e) => setAndPersistFeeAbs(e.target.value)} />
                <rb.Form.Control.Feedback type="invalid">Please provide an absolute fee.</rb.Form.Control.Feedback>
              </rb.Form.Group>}
          <rb.Form.Group className="mb-3" controlId="minsize">
            <rb.Form.Label>Minimum amount in SATS</rb.Form.Label>
            <rb.Form.Control type="number" name="minsize" required step={1000} value={minsize} min={0} style={{ width: '16ch' }} onChange={(e) => setAndPersistMinsize(e.target.value)} />
            <rb.Form.Control.Feedback type="invalid">Please provide a minimum amount.</rb.Form.Control.Feedback>
          </rb.Form.Group>
        </>}
      <rb.Button variant="dark" type="submit" disabled={isSending}>
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
