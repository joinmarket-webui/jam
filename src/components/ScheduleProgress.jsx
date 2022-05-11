import React from 'react'
import styles from './ScheduleProgress.module.css'

const ScheduleProgress = ({ schedule }) => {
  const steps = {
    completed: 1,
    txs: [
      { label: '1', width: '20' },
      { label: '2', width: '10' },
      { label: '3', width: '30' },
      { label: '4', width: '40' },
    ],
  }

  const stepsJsx = steps.txs.map((step, i) => {
    let classes = [styles['progress-step']]

    if (i === 0) {
      classes.push(styles['is-first'])
    }

    if (step.width) {
      classes.push(styles[`width-${step.width}`])
    }

    if (steps.completed > i) {
      classes.push(styles['is-complete'])
    }

    if (steps.completed === i) {
      classes.push(styles['is-active'])
    }

    if (steps.txs.length - 1 === i) {
      classes.push(styles['is-last'])
    }

    return <div key={i} className={classes.join(' ')}></div>
  })

  return (
    <div className="d-flex flex-column gap-3">
      <div className={styles['progress']}>
        <div className={styles['progress-track']}></div>
        {stepsJsx}
      </div>
      <div className={[styles['text'], 'text-secondary'].join(' ')}>
        In Progress: Transaction {steps.completed} of {steps.txs.length}
      </div>
    </div>
  )
}

export default ScheduleProgress
