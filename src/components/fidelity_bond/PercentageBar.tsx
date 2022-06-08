import React from 'react'
import styles from './PercentageBar.module.css'

interface PercentageBarProps {
  percentage: number
  highlight?: boolean
}

const PercentageBar = ({ percentage, highlight = false }: PercentageBarProps) => {
  // unfortunately, setting the width via data prop does not work:`width: attr(data-percentage)`.
  // hence, workaround is to set it via "style" prop.
  return (
    <div
      style={{ width: `${percentage.toFixed(2)}%` }}
      className={`${styles['percentage-bar']} ${highlight ? styles['highlight'] : ''}`}
    ></div>
  )
}

export default PercentageBar
