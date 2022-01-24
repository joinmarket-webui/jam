import React, { useState, useEffect } from 'react'
import styles from './Balance.module.css'
import { BTC, SATS, btcToSats, satsToBtc } from '../utils'
import { IoEyeOff } from 'react-icons/io5';

const UNIT_HIDDEN = 'UNIT_HIDDEN'

export default function Balance({ value, unit, showBalance = false }) {
  const [unitMode, setUnitMode] = useState(showBalance ? unit : UNIT_HIDDEN)

  useEffect(() => {
    setUnitMode(showBalance ? unit : UNIT_HIDDEN)
  }, [showBalance, unit])

  if (unitMode === UNIT_HIDDEN) {
    return (
      <span className={styles.balance}>
        <span className={styles.text}>*****</span>
        &nbsp;
        <IoEyeOff className={styles.icon}/>
      </span>
    )
  }

  const isSats = value === parseInt(value)
  const isBTC = !isSats && typeof(value) === 'string' && value.indexOf('.') > -1

  if (isBTC && unitMode === BTC) return (<span className={styles.balance}>{BTC}{value}</span>)
  if (isBTC && unitMode === SATS) return (<span className={styles.balance}>{btcToSats(value)} {SATS}</span>)
  if (isSats && unitMode === SATS) return (<span className={styles.balance}>{value} {SATS} </span>)
  if (isSats && unitMode === BTC) return (<span className={styles.balance}>{BTC}{satsToBtc(value)}</span>)

  return (
    <span className={styles.balance}>{value} {unit}</span>
  )
}
