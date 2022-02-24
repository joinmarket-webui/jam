import React from 'react'
import { useEffect, useState } from 'react'
import * as rb from 'react-bootstrap'
import { useSettings } from '../context/SettingsContext'
import Sprite from './Sprite'
import PageTitle from './PageTitle'
import ToggleSwitch from './ToggleSwitch'
import * as Api from '../libs/JmWalletApi'

const OFFERTYPE_REL = 'sw0reloffer'
const OFFERTYPE_ABS = 'sw0absoffer'

const YieldgenReport = ({ lines, maxAmountOfRows = 25 }) => {
  const settings = useSettings()

  const empty = !lines || lines.length < 2
  const headers = empty ? [] : lines[0].split(',')

  const linesWithoutHeader = empty
    ? []
    : lines
        .slice(1, lines.length)
        .map((line) => line.split(','))
        .reverse()

  const visibleLines = linesWithoutHeader.slice(0, maxAmountOfRows)

  return (
    <div className="mt-2 mb-3">
      {empty && <rb.Alert variant="info">The report is empty.</rb.Alert>}
      {!empty && (
        <>
          <rb.Table striped bordered hover variant={settings.theme} responsive>
            <thead>
              <tr>
                {headers.map((name, index) => (
                  <th key={`header_${index}`}>{name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleLines.map((line, trIndex) => (
                <tr key={`tr_${trIndex}`}>
                  {line.map((val, tdIndex) => (
                    <td key={`td_${tdIndex}`}>{val}</td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                {headers.map((name, index) => (
                  <th key={`footer_${index}`}>{name}</th>
                ))}
              </tr>
            </tfoot>
          </rb.Table>
          <div className="mt-1 d-flex justify-content-end">
            <small>
              Showing {visibleLines.length} of {linesWithoutHeader.length} entries
            </small>
          </div>
        </>
      )}
    </div>
  )
}

export default function Earn({ currentWallet, coinjoinInProcess, makerRunning }) {
  const settings = useSettings()
  const [validated, setValidated] = useState(false)
  const [alert, setAlert] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)
  const [isReportLoading, setIsReportLoading] = useState(false)
  const [isShowReport, setIsShowReport] = useState(false)
  const [offertype, setOffertype] = useState(
    (settings.useAdvancedWalletMode && window.localStorage.getItem('jm-offertype')) || OFFERTYPE_REL
  )
  const [feeRel, setFeeRel] = useState(parseFloat(window.localStorage.getItem('jm-feeRel')) || 0.000_3)
  const [feeAbs, setFeeAbs] = useState(parseInt(window.localStorage.getItem('jm-feeAbs'), 10) || 250)
  const [minsize, setMinsize] = useState(parseInt(window.localStorage.getItem('jm-minsize'), 10) || 100_000)
  const [yieldgenReportLines, setYieldgenReportLines] = useState([])

  const feeRelPercentageMin = 0.0
  const feeRelPercentageMax = 10.0
  const feeRelPercentageStep = 0.0001

  const percentageToFactor = (val, precision = 6) => {
    // Value cannot just be divided
    // e.g. ✗ 0.0027 / 100 == 0.000027000000000000002
    // but: ✓ Number((0.0027 / 100).toFixed(6)) = 0.000027
    return Number((val / 100).toFixed(precision))
  }

  const factorToPercentage = (val, precision = 6) => {
    // Value cannot just be divided
    // e.g. ✗ 0.000027 * 100 == 0.0026999999999999997
    // but: ✓ Number((0.000027 * 100).toFixed(6)) = 0.0027
    return Number((val * 100).toFixed(precision))
  }

  const setAndPersistOffertype = (value) => {
    setOffertype(value)
    window.localStorage.setItem('jm-offertype', value)
  }

  const setAndPersistFeeRel = (value) => {
    setFeeRel(value)
    window.localStorage.setItem('jm-feeRel', value)
  }

  const setAndPersistFeeAbs = (value) => {
    setFeeAbs(value)
    window.localStorage.setItem('jm-feeAbs', value)
  }

  const setAndPersistMinsize = (value) => {
    setMinsize(value)
    window.localStorage.setItem('jm-minsize', value)
  }

  const startMakerService = async (cjfee_a, cjfee_r, ordertype, minsize) => {
    const { name: walletName, token } = currentWallet

    setAlert(null)
    setIsSending(true)
    setIsWaiting(false)
    try {
      const res = await Api.postMakerStart(
        { walletName, token },
        {
          cjfee_a,
          cjfee_r,
          ordertype,
          minsize,
        }
      )

      if (res.ok) {
        // FIXME: Right now there is no response data to check if maker got started
        // https://github.com/JoinMarket-Org/joinmarket-clientserver/issues/1120
        setAlert({ variant: 'success', message: 'Service is starting.' })
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

    if (makerRunning) {
      setAlert({ variant: 'success', message: 'Service is running.' })
    } else {
      setAlert(null)
    }
  }, [makerRunning])

  useEffect(() => {
    if (!isShowReport) return

    const abortCtrl = new AbortController()
    setIsReportLoading(true)

    Api.getYieldgenReport({ signal: abortCtrl.signal })
      .then((res) => {
        if (res.ok) return res.json()
        // 404 is returned till the maker is started at least once
        if (res.status === 404) return {}
        return Promise.reject(new Error(res.message || 'Failed to load yield generator report.'))
      })
      .then((data) => setYieldgenReportLines(data.yigen_data))
      .catch((err) => {
        console.log(`Error while loading yield generator`, err)
      })
      // show the loader a little longer to avoid flickering
      .then((_) => new Promise((r) => setTimeout(r, 200)))
      .finally(() => setIsReportLoading(false))

    return () => abortCtrl.abort()
  }, [makerRunning, isShowReport])

  const stopMakerService = async () => {
    const { name: walletName, token } = currentWallet

    setAlert(null)
    setIsSending(true)
    setIsWaiting(false)
    try {
      const res = await Api.getMakerStop({ walletName, token })

      if (res.ok) {
        // FIXME: Right now there is no response data to check if maker got stopped
        // https://github.com/JoinMarket-Org/joinmarket-clientserver/issues/1120
        setAlert({ variant: 'success', message: 'Service is stopping.' })
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
    <div className="earn">
      <rb.Row>
        <rb.Col>
          <PageTitle
            title="Earn bitcoin"
            subtitle="By making your bitcoin available for others, you help them improve their privacy and can also earn a yield."
          />

          <rb.Fade in={coinjoinInProcess} mountOnEnter={true} unmountOnExit={true}>
            <div className="mb-4 p-3 border border-1 rounded">
              <small className="text-secondary">A collaborative transaction is currently in progress.</small>
            </div>
          </rb.Fade>

          {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}

          {!coinjoinInProcess && (
            <rb.Form onSubmit={onSubmit} validated={validated} noValidate>
              {!makerRunning && !isWaiting && (
                <>
                  {settings.useAdvancedWalletMode && (
                    <rb.Form.Group className="mb-3" controlId="offertype">
                      <ToggleSwitch
                        label="Relative offer"
                        initialValue={isRelOffer}
                        onToggle={(isToggled) => setAndPersistOffertype(isToggled ? OFFERTYPE_REL : OFFERTYPE_ABS)}
                      />
                    </rb.Form.Group>
                  )}
                  {isRelOffer ? (
                    <rb.Form.Group className="mb-3" controlId="feeRel">
                      <rb.Form.Label className="mb-0">
                        Relative fee {feeRel !== '' && `(${factorToPercentage(feeRel)}%)`}
                      </rb.Form.Label>
                      <div className="mb-2">
                        <rb.Form.Text className="text-secondary">
                          As a percentage of the amounts you help others with improved privacy.
                        </rb.Form.Text>
                      </div>
                      <rb.Form.Control
                        type="number"
                        name="feeRel"
                        value={factorToPercentage(feeRel)}
                        className="slashed-zeroes"
                        min={feeRelPercentageMin}
                        max={feeRelPercentageMax}
                        step={feeRelPercentageStep}
                        required
                        onChange={(e) => setAndPersistFeeRel(percentageToFactor(e.target.value))}
                      />
                      <rb.Form.Control.Feedback type="invalid">
                        Please provide a relative fee between {feeRelPercentageMin}% and {feeRelPercentageMax}%.
                      </rb.Form.Control.Feedback>
                    </rb.Form.Group>
                  ) : (
                    <rb.Form.Group className="mb-3" controlId="feeAbs">
                      <rb.Form.Label className="mb-0">Absolute fee in sats</rb.Form.Label>
                      <div className="mb-2">
                        <rb.Form.Text className="text-secondary">
                          An absolute amount you get for helping others to improve their privacy.
                        </rb.Form.Text>
                      </div>
                      <rb.Form.Control
                        type="number"
                        name="feeAbs"
                        value={feeAbs}
                        className="slashed-zeroes"
                        min={0}
                        step={1}
                        required
                        onChange={(e) => setAndPersistFeeAbs(e.target.value)}
                      />
                      <rb.Form.Control.Feedback type="invalid">
                        Please provide an absolute fee.
                      </rb.Form.Control.Feedback>
                    </rb.Form.Group>
                  )}
                  {settings.useAdvancedWalletMode && (
                    <rb.Form.Group className="mb-3" controlId="minsize">
                      <rb.Form.Label>Minimum amount in sats</rb.Form.Label>
                      <rb.Form.Control
                        type="number"
                        name="minsize"
                        value={minsize}
                        className="slashed-zeroes"
                        min={0}
                        step={1000}
                        required
                        onChange={(e) => setAndPersistMinsize(e.target.value)}
                      />
                      <rb.Form.Control.Feedback type="invalid">
                        Please provide a minimum amount.
                      </rb.Form.Control.Feedback>
                    </rb.Form.Group>
                  )}
                </>
              )}

              <rb.Button variant="dark" type="submit" disabled={isSending || isWaiting}>
                {isSending ? (
                  <>
                    <rb.Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    {makerRunning === true ? 'Stopping' : 'Starting'}
                  </>
                ) : makerRunning === true ? (
                  'Stop'
                ) : (
                  'Start'
                )}
              </rb.Button>
            </rb.Form>
          )}
        </rb.Col>
      </rb.Row>

      {settings.useAdvancedWalletMode && (
        <rb.Row className="mt-5 mb-3">
          <rb.Col>
            <rb.Button
              variant="outline-dark"
              className="border-0 mb-2 d-inline-flex align-items-center"
              onClick={(e) => {
                e.preventDefault()
                setIsShowReport(!isShowReport)
              }}
            >
              <Sprite symbol={isShowReport ? 'hide' : 'show'} width="24" height="24" className="me-2" />
              {isShowReport ? 'Hide' : 'Show'} report
              {isReportLoading && (
                <rb.Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="ms-2 me-1"
                />
              )}
            </rb.Button>
          </rb.Col>
          <rb.Fade in={isShowReport} mountOnEnter={true} unmountOnExit={true}>
            <rb.Col md={12}>
              <YieldgenReport lines={yieldgenReportLines} />
            </rb.Col>
          </rb.Fade>
        </rb.Row>
      )}
    </div>
  )
}
