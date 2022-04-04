import React, { PropsWithChildren } from 'react'
import * as rb from 'react-bootstrap'

interface CheatsheetProps {
  show: boolean
  onHide(): () => void
}

type NumberedProps = {
  number: number
}

function Numbered({ number }: { number: number }) {
  return <div className="numbered">{number}</div>
}

function ListItem({ number, children }: PropsWithChildren<NumberedProps>) {
  return (
    <rb.Stack className="cheatsheet-list-item" direction="horizontal" gap={3}>
      <Numbered number={number} />
      <rb.Stack gap={0}>{children}</rb.Stack>
    </rb.Stack>
  )
}

export default function Cheatsheet({ show = false, onHide }: CheatsheetProps) {
  return (
    <rb.Offcanvas className="cheatsheet" show={show} onHide={onHide} placement="bottom">
      <rb.Offcanvas.Header>
        <rb.Stack>
          <rb.Offcanvas.Title>The Cheatsheet</rb.Offcanvas.Title>
          <div className="text-secondary">
            This is one valid way to add random noise to your coins by switching from earning as a maker to sending as a
            taker back and forth. Learn more.
          </div>
        </rb.Stack>
      </rb.Offcanvas.Header>
      <rb.Offcanvas.Body>
        <rb.Stack className="mb-4" gap={4}>
          <ListItem number={1}>
            <h6>Fund your wallet first.</h6>
            <div className="small text-secondary">Deposit your coins - nothing new here.</div>
          </ListItem>
          <ListItem number={2}>
            <h6>Send first collaborative transaction to yourself.</h6>
            <div className="small text-secondary">Sweep everything to your own wallet again, but privately.</div>
          </ListItem>
          <ListItem number={3}>
            <h6>Provide liquidity and earn yield.</h6>
            <div className="small text-secondary">The longer, the better. Time is money.</div>
          </ListItem>
          <ListItem number={4}>
            <h6>Lock funds in a fidelity bond. (advanced)</h6>
            <div className="small text-secondary">Optional - but gives higher chances to be chosen.</div>
          </ListItem>
          <ListItem number={5}>
            <h6>Consolidate your levels.</h6>
            <div className="small text-secondary">Do a collabroative transaction from one level to another.</div>
          </ListItem>
          <ListItem number={6}>
            <h6>Time to earn again - YIELD!</h6>
            <div className="small text-secondary">Optional - by switching back and forth you add more noise.</div>
          </ListItem>
          <ListItem number={7}>
            <h6>Sweep out your wallet completely.</h6>
            <div className="small text-secondary">Your coins should be very private by now - move them out.</div>
          </ListItem>
          <ListItem number={8}>
            <h6>Go to step one and repeat.</h6>
            <div className="small text-secondary">Now you know.</div>
          </ListItem>
        </rb.Stack>
      </rb.Offcanvas.Body>
    </rb.Offcanvas>
  )
}
