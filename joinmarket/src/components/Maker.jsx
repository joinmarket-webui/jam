import React from 'react'
import { useHistory } from 'react-router-dom'
import { useState } from 'react'
import { useGlobal } from 'reactn'

export default function Maker({ onStart, onStop }) {
  const [cjfeeRel, setCjfeerel] = useState('')
  const [makerStarted] = useGlobal('makerStarted')
  const [setSubmitVal] = useState('Start Maker Service')
  const history = useHistory()

  const onSubmit = (e) => {
    e.preventDefault()

    if (makerStarted === false) {
      if (!cjfeeRel) {
        return alert('Please add details')
      }

      onStart(0, 0, cjfeeRel, 'sw0reloffer', 1000)
      setCjfeerel('')
      alert('Attempting to start the yield generator. Check the status bar for updates.')

      setSubmitVal('Stop Maker Service')
    } else {
      onStop()
      setSubmitVal('Start Maker Service')
    }
    history.push('/wallets/current')
  }

  return (
    <form onSubmit={onSubmit}>
      <h1>Maker Service</h1>
      { makerStarted === false
        ? <label>
            Relative Coinjoin Fee
            <input type="text" name="cjfee_r" value={cjfeeRel} onChange={(e) => setCjfeerel(e.target.value)} />
          </label>
        : null
      }
      <p></p>
      <input type="submit" value={makerStarted === 'true' ? 'Stop Maker Service' : 'Start Maker Service'} />
    </form>
  )
}
