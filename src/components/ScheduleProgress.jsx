import React from 'react'
import * as rb from 'react-bootstrap'
import styles from './ScheduleProgress.module.css'

const scheduleToSteps = (schedule) => {
  // Example Schedule:
  //
  // schedule = [
  //   [0, 0, 8, 'INTERNAL', 363.52, 16, 1],
  //   [1, 0.5748023323401029, 9, 'INTERNAL', 59.15, 16, 1],
  //   [1, 0, 9, 'INTERNAL', 59.89, 16, 1],
  //   [2, 0.5743766347092694, 8, 'INTERNAL', 14.61, 16, 1],
  //   [2, 0, 10, 'bcrt1qavv7j2a8staeyj4mp7l46a25u02f4xeler2ngp', 47.85, 16, 1],
  //   [3, 0.8201219196908677, 9, 'INTERNAL', 7.26, 16, 1],
  //   [3, 0, 10, 'bcrt1qz5hs2dfq29xnmt6lg68cewqhmam4qchxkrayyz', 220.48, 16, 0],
  //   [4, 0, 9, 'bcrt1qz336g7kzzhqskzc5k0rsgvxu4l52a8gzkulz4v', 3.48, 16, 0],
  // ]
  //
  // Each array represents a scheduled transaction with the following parameters:
  //
  // Index 0: Source mixdepth.
  // Index 1: Amount. Either a decimal (0.0<x<1.0) representing what proportion of the coins in the mixdepth are to be spent. If 0, a sweep is performed.
  // Index 2: Number of counterparties requested.
  // Index 3: Destination address. Either an external Bitcoin address, or "INTERNAL" meaning an address from the next mixdepth.
  // Index 4: Waittime. A decimal value in minutes to wait, after confirmation of this transaction, before continuing to the next.
  // Index 5: Rounding. How many significant figures to round the coinjoin amount to. A rounding value of `16` means no rounding.
  // Index 6: Completion flag. 0 until the transaction is seen on the network. At that point it is changed to the <txid>. Then changes to 1 when tx is confirmed.
  //
  // See: https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/master/scripts/sample-schedule-for-testnet

  // Count how many tx are compelted already.
  const numCompleted = schedule.reduce((acc, tx) => (acc += tx[6] === 1 ? 1 : 0), 0)
  // Calculate total wait time. Ignores the last element since there's no reason in waiting after the last element completed.
  // This is a lower bound estimate for the time the whole scheduler run will take since it doesn't take into account the time
  // it takes to find and talk to makers and wait for tx confirmations on the timechain.
  const totalWaitTime = schedule.slice(0, schedule.length - 1).reduce((acc, tx) => acc + tx[4] * 60, 0)
  // Distribute the tx's on the progress bar relative to the waittime after the previous tx completes.
  const txs = schedule.map((tx, i) => {
    const minWidth = 8

    if (i === 0) {
      return { width: minWidth }
    }

    const proportionalWidth = ((schedule[i - 1][4] * 60) / totalWaitTime) * 100

    return { width: Math.max(proportionalWidth, minWidth) }
  })

  return {
    totalWaitTime: totalWaitTime,
    completedTxs: numCompleted,
    txs: txs,
  }
}

const ScheduleProgress = ({ schedule }) => {
  const steps = scheduleToSteps(schedule)

  const stepsJsx = steps.txs.map((step, i) => {
    let classes = [styles['progress-step']]

    if (i === 0) {
      classes.push(styles['is-first'])
    }

    if (steps.completedTxs > i) {
      classes.push(styles['is-complete'])
    }

    if (steps.completedTxs === i) {
      classes.push(styles['is-active'])
    }

    if (steps.txs.length - 1 === i) {
      classes.push(styles['is-last'])
    }

    return <div key={i} style={{ width: `${step.width}%` }} className={classes.join(' ')}></div>
  })

  return (
    <div className="d-flex flex-column gap-3">
      <div>
        <p className="mb-1">
          Currently running a schedule of <strong>{steps.txs.length}</strong> transactions over{' '}
          <strong>{Math.ceil(steps.totalWaitTime / 60 / 60)}</strong> hours.
        </p>
        <p className={['text-secondary', styles['text-small']].join(' ')}>
          This time estimate does not take into account the time spent talking to counterparties and waiting for
          transactions to get confirmed on the time chain. It is a lower bound estimate. The actual time for processing
          the whole schedule will likely be longer.
        </p>
      </div>
      <div className={styles['schedule-progress']}>
        <div className={styles['progress-container']}>
          <div className={styles['progress-track']}></div>
          {stepsJsx}
        </div>
      </div>
      <div className={[styles['text'], 'text-secondary'].join(' ')}>
        <div>
          {steps.completedTxs < steps.txs.length ? (
            <>
              <div>
                <rb.Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="ms-1 me-2"
                />
                Waiting for transaction <strong>{steps.completedTxs + 1}</strong> of <strong>{steps.txs.length}</strong>{' '}
                to process...
              </div>
            </>
          ) : (
            <div>
              <rb.Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="ms-1 me-2"
              />
              All transactions completed successfully. The scheduler will stop soon.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ScheduleProgress
