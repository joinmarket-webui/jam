import React, { useState, useEffect } from 'react'
import styles from './Balance.module.css'
import { BTC, SATS, btcToSats, satsToBtc } from '../utils'
import { IoEyeOff } from 'react-icons/io5';

const UNIT_MODE_BTC = 0
const UNIT_MODE_SATS = 1
const UNIT_MODE_HIDDEN = 2

const getUnitMode = (unit, showBalance) => {
  if (!showBalance) return UNIT_MODE_HIDDEN
  return unit === SATS ? UNIT_MODE_SATS : UNIT_MODE_BTC
}

export default function Balance({ value, unit, showBalance = false }) {
  const [unitMode, setUnitMode] = useState(getUnitMode(unit, showBalance))

  useEffect(() => {
    setUnitMode(getUnitMode(unit, showBalance))
  }, [unit, showBalance])

  if (unitMode === UNIT_MODE_HIDDEN) {
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

  const btcSymbol = '\u20BF'
  const satSymbol = <span className={styles['satoshi-symbol']}>S</span>

  if (isBTC && unitMode === UNIT_MODE_BTC)
    return <span className={styles.balance}>{btcSymbol}{value}</span>
  if (isBTC && unitMode === UNIT_MODE_SATS)
    return <span>{satSymbol}<span className={styles.balance}>{btcToSats(value)}</span></span>
  if (isSats && unitMode === UNIT_MODE_SATS)
    return <span>{satSymbol}<span className={styles.balance}>{value}</span></span>
  if (isSats && unitMode === UNIT_MODE_BTC)
    return <span className={styles.balance}>{btcSymbol}{satsToBtc(value)}</span>

  // Something unexpected happened. Simply render the props.
  return <span className={styles.balance}>{value} {unit}</span>
}
