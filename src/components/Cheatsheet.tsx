import React, { PropsWithChildren } from 'react'
import * as rb from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import { routes } from '../constants/routes'

interface CheatsheetProps {
  show: boolean
  onHide: () => void
}

type NumberedProps = {
  number: number
  className?: string
}

function Numbered({ number }: { number: number }) {
  return <div className="numbered">{number}</div>
}

function ListItem({ number, children, ...props }: PropsWithChildren<NumberedProps>) {
  return (
    <rb.Stack className={`cheatsheet-list-item ${props.className || ''}`} direction="horizontal" gap={3}>
      <Numbered number={number} />
      <rb.Stack gap={0}>{children}</rb.Stack>
    </rb.Stack>
  )
}

export default function Cheatsheet({ show = false, onHide }: CheatsheetProps) {
  const { t } = useTranslation()

  return (
    <rb.Offcanvas className="cheatsheet" show={show} onHide={onHide} placement="bottom">
      <rb.Offcanvas.Header closeButton>
        <rb.Stack>
          <rb.Offcanvas.Title>{t('cheatsheet.title')}</rb.Offcanvas.Title>
          <div className="small text-secondary">
            <Trans i18nKey="cheatsheet.description">
              Follow the steps below to increase your financial privacy. It is advisable to switch from{' '}
              <a
                href="https://github.com/openoms/bitcoin-tutorials/blob/master/joinmarket/joinmarket_private_flow.md#the-maker-role"
                target="_blank"
                rel="noopener noreferrer"
              >
                earning as a maker
              </a>{' '}
              to{' '}
              <a
                href="https://github.com/openoms/bitcoin-tutorials/blob/master/joinmarket/joinmarket_private_flow.md#the-taker-role"
                target="_blank"
                rel="noopener noreferrer"
              >
                sending as a taker
              </a>{' '}
              back and forth.{' '}
              <a
                href="https://github.com/openoms/bitcoin-tutorials/blob/master/joinmarket/joinmarket_private_flow.md#a-private-flow-through-joinmarket"
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn more.
              </a>
            </Trans>
          </div>
        </rb.Stack>
      </rb.Offcanvas.Header>
      <rb.Offcanvas.Body>
        <rb.Stack className="mb-4" gap={4}>
          <ListItem number={1}>
            <h6>
              <Trans i18nKey="cheatsheet.item_1.title">
                <Link to={routes.receive}>Fund</Link> your wallet.
              </Trans>
            </h6>
            <div className="small text-secondary">{t('cheatsheet.item_1.description')}</div>
          </ListItem>
          <ListItem number={2}>
            <h6>
              <Trans i18nKey="cheatsheet.item_2.title">
                <Link to={routes.send}>Send</Link> a collaborative transaction to yourself.
              </Trans>
            </h6>
            <div className="small text-secondary">{t('cheatsheet.item_2.description')}</div>
          </ListItem>
          <ListItem number={3} className="upcoming-feature">
            <h6>
              <Trans i18nKey="cheatsheet.item_3.title">
                Optional: <Link to={routes.earn}>Lock</Link> funds in a fidelity bond.
              </Trans>
            </h6>
            <div className="small text-secondary">
              {t('cheatsheet.item_3.description')}
              <br />
              {/* the following phrase is intentionally not translated because it will be removed soon */}
              <strong>Feature not implemented yet. Coming soon!</strong>
            </div>
          </ListItem>
          <ListItem number={4}>
            <h6>
              <Trans i18nKey="cheatsheet.item_4.title">
                <Link to={routes.earn}>Earn</Link> yield by providing liquidity.
              </Trans>
            </h6>
            <div className="small text-secondary">{t('cheatsheet.item_4.description')}</div>
          </ListItem>
          <ListItem number={5}>
            <h6>
              <Trans i18nKey="cheatsheet.item_5.title">
                <Link to={routes.send}>Schedule</Link> transactions.
              </Trans>
            </h6>
            <div className="small text-secondary">{t('cheatsheet.item_5.description')}</div>
          </ListItem>
          <ListItem number={6}>
            <h6>{t('cheatsheet.item_6.title')}</h6>
            <div className="small text-secondary">
              <Trans i18nKey="cheatsheet.item_6.description">
                Still confused?{' '}
                <a
                  href="https://github.com/openoms/bitcoin-tutorials/blob/master/joinmarket/joinmarket_private_flow.md#a-private-flow-through-joinmarket"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Dig into the documentation
                </a>
                .
              </Trans>
            </div>
          </ListItem>
        </rb.Stack>
      </rb.Offcanvas.Body>
    </rb.Offcanvas>
  )
}
