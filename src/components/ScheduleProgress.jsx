import React from 'react'
import styles from './ScheduleProgress.module.css'

const scheduleToSteps = (schedule) => {
  schedule = [
    [0, 0, 8, 'INTERNAL', 363.52, 16, 1],
    [1, 0.5748023323401029, 9, 'INTERNAL', 59.15, 16, 1],
    [1, 0, 9, 'INTERNAL', 59.89, 16, 1],
    [2, 0.5743766347092694, 8, 'INTERNAL', 14.61, 16, 1],
    [2, 0, 10, 'bcrt1qavv7j2a8staeyj4mp7l46a25u02f4xeler2ngp', 47.85, 16, 1],
    [3, 0.8201219196908677, 9, 'INTERNAL', 7.26, 16, 1],
    [3, 0, 10, 'bcrt1qz5hs2dfq29xnmt6lg68cewqhmam4qchxkrayyz', 220.48, 16, 1],
    [4, 0, 9, 'bcrt1qz336g7kzzhqskzc5k0rsgvxu4l52a8gzkulz4v', 3.48, 16, 1],
  ]

  const completed = schedule.reduce((acc, tx) => (acc += tx[6] === 1 ? 1 : 0), 0)
  const totalWaitTime = schedule.reduce((acc, tx) => acc + tx[4] * 60, 0)
  const txs = schedule.map((tx) => {
    let width = ((tx[4] * 60) / totalWaitTime) * 100

    return { width: Math.max(width, 10) }
  })

  return {
    totalWaitTime: totalWaitTime,
    completedTxs: completed,
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
      <div className={styles['progress']} style={{ minHeight: '2rem' }}>
        <div className={styles['progress-track']}></div>
        {stepsJsx}
      </div>
      <div className={[styles['text'], 'text-secondary'].join(' ')}>
        <div>
          {steps.completedTxs < steps.txs.length ? (
            <>
              <div>
                Currently waiting for transaction {steps.completedTxs + 1} of {steps.txs.length} to complete.
              </div>
              <div>
                The estimated duration for all transactions to complete is at least{' '}
                {Math.ceil(steps.totalWaitTime / 60)} minutes.
              </div>
            </>
          ) : (
            <div>All transactions completed successfully. Please be patient. The scheduler will stop soon.</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ScheduleProgress
