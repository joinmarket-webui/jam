import React, { PropsWithChildren } from 'react'
import * as rb from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import { routes } from '../constants/routes'
import Sprite from './Sprite'
import styles from './Cheatsheet.module.css'

interface CheatsheetProps {
  show: boolean
  onHide: () => void
}

type NumberedProps = {
  number: number | 'last'
  className?: string
}

function Numbered({ number }: NumberedProps) {
  return (
    <div className={styles.numbered}>
      {number === 'last' ? (
        <>
          <Sprite symbol="checkmark" width="24" height="24" />
        </>
      ) : (
        <>{number}</>
      )}
    </div>
  )
}

function ListItem({ number, children, ...props }: PropsWithChildren<NumberedProps>) {
  return (
    <rb.Stack className={`${styles['cheatsheet-list-item']} ${props.className || ''}`} direction="horizontal" gap={3}>
      <Numbered number={number} />
      <rb.Stack gap={0}>{children}</rb.Stack>
    </rb.Stack>
  )
}

export default function Cheatsheet({ show = false, onHide }: CheatsheetProps) {
  const { t } = useTranslation()

  return (
    <rb.Offcanvas className={styles.cheatsheet} show={show} onHide={onHide} placement="bottom" onClick={onHide}>
      <rb.Offcanvas.Header>
        <rb.Stack>
          <rb.Offcanvas.Title>{t('cheatsheet.title')}</rb.Offcanvas.Title>
          <div className="small text-secondary">
            <Trans i18nKey="cheatsheet.description">
              Follow the steps below to increase your financial privacy. It is advisable to switch from{' '}
              <a href="https://jamdocs.org/glossary/#maker" target="_blank" rel="noopener noreferrer">
                earning as a maker
              </a>{' '}
              to{' '}
              <a href="https://jamdocs.org/glossary/#taker" target="_blank" rel="noopener noreferrer">
                sending as a taker
              </a>{' '}
              back and forth.{' '}
              <a href="https://jamdocs.org/interface/00-cheatsheet/" target="_blank" rel="noopener noreferrer">
                Learn more.
              </a>
            </Trans>
          </div>
        </rb.Stack>
        <rb.Button variant="link" className="unstyled p-0 mb-auto" onClick={onHide}>
          <Sprite symbol="cancel" width="32" height="32" />
        </rb.Button>
      </rb.Offcanvas.Header>
      <rb.Offcanvas.Body>
        <rb.Stack className="mb-4" gap={4}>
          <ListItem number={1}>
            <h6>
              <Trans i18nKey="cheatsheet.receive.title">
                <Link to={routes.receive}>Fund</Link> your wallet.
              </Trans>
            </h6>
            <div className="small text-secondary">{t('cheatsheet.receive.description')}</div>
          </ListItem>
          <ListItem number={2}>
            <h6>
              <Trans i18nKey="cheatsheet.send.title">
                <Link to={routes.send}>Send</Link> a collaborative transaction to another jar.
              </Trans>
            </h6>
            <div className="small text-secondary">{t('cheatsheet.send.description')}</div>
          </ListItem>
          <ListItem number={3}>
            <h6>
              <Trans i18nKey="cheatsheet.bond.title">
                Optional: <Link to={routes.earn}>Lock</Link> funds in a fidelity bond.
              </Trans>
            </h6>
            <div className="small text-secondary">{t('cheatsheet.bond.description')}</div>
          </ListItem>
          <ListItem number={4}>
            <h6>
              <Trans i18nKey="cheatsheet.earn.title">
                <Link to={routes.earn}>Earn</Link> sats by providing liquidity.
              </Trans>
            </h6>
            <div className="small text-secondary">{t('cheatsheet.earn.description')}</div>
          </ListItem>
          <ListItem number={5}>
            <h6>
              <Trans i18nKey="cheatsheet.schedule.title">
                Schedule <Link to={routes.jam}>sweep</Link> transactions to empty your wallet.
              </Trans>
            </h6>
            <div className="small text-secondary">{t('cheatsheet.schedule.description')}</div>
          </ListItem>
          <ListItem number={'last'}>
            <h6>{t('cheatsheet.repeat.title')}</h6>
            <div className="small text-secondary">
              <Trans i18nKey="cheatsheet.repeat.description">
                Still confused?{' '}
                <a href="https://jamdocs.org/interface/00-cheatsheet/" target="_blank" rel="noopener noreferrer">
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
