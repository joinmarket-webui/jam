import React, { useState, useRef, useEffect, useMemo } from 'react'
import * as rb from 'react-bootstrap'
import classnames from 'classnames/bind'
import styles from './Jar.module.css'
import Sprite from '../Sprite'
import Balance from '../Balance'
import { useSettings } from '../../context/SettingsContext'

const cx = classnames.bind(styles)

type JarFillLevel = 0 | 1 | 2 | 3

interface JarProps {
  index: number
  balance: string
  fillLevel: JarFillLevel
  isOpen?: boolean
}

interface SelectableJarProps {
  isSelectable: boolean
  isSelected: boolean
  onClick: () => void
}

interface TooltipJarProps {
  tooltipText: string
  onClick: () => void
}

/** Classifies the account balance into one of four groups:
 *
 * - More than half of the total balance
 * - More than a quarter of the total balance
 * - Not empty
 * - Empty
 */
const calculateFillLevel = (accountBalance: number, totalBalance: number): JarFillLevel => {
  if (accountBalance > totalBalance / 2) return 3
  if (accountBalance > totalBalance / 4) return 2
  if (accountBalance > 0) return 1

  return 0
}

/**
 * A jar with index and balance.
 */
const Jar = ({ index, balance, fillLevel, isOpen = false }: JarProps) => {
  const settings = useSettings()

  const jarSymbol = useMemo(() => {
    switch (fillLevel) {
      case 1:
        return isOpen ? 'jar-open-fill-25' : 'jar-closed-fill-25'
      case 2:
        return isOpen ? 'jar-open-fill-50' : 'jar-closed-fill-50'
      case 3:
        return isOpen ? 'jar-open-fill-75' : 'jar-closed-fill-75'
      default:
        return isOpen ? 'jar-open-empty' : 'jar-closed-empty'
    }
  }, [fillLevel, isOpen])

  return (
    <div className={styles.jarContainer}>
      <Sprite className={styles.jarSprite} symbol={jarSymbol} width="32px" height="48px" />
      <div className={styles.jarIndex}>{'#' + index}</div>
      <div className={styles.jarBalance}>
        <Balance valueString={balance} convertToUnit={settings.unit} showBalance={settings.showBalance} />
      </div>
    </div>
  )
}

/**
 * A jar with index, balance, and a radio-style selection button.
 */
const SelectableJar = ({
  index,
  balance,
  fillLevel,
  isSelectable,
  isSelected,
  onClick,
}: JarProps & SelectableJarProps) => {
  return (
    <div
      className={cx('selectableJarContainer', {
        selectable: isSelectable,
        selected: isSelected,
      })}
      onClick={() => isSelectable && onClick()}
    >
      <Jar index={index} balance={balance} fillLevel={fillLevel} />
      <div className={styles.selectionCircle}></div>
    </div>
  )
}

/**
 * A jar with index, balance, and a tooltip.
 * The jar symbol opens on hover.
 */
const OpenableJar = ({ index, balance, fillLevel, tooltipText, onClick }: JarProps & TooltipJarProps) => {
  const [jarIsOpen, setJarIsOpen] = useState(false)

  const tooltipTarget = useRef(null)
  const onMouseOver = () => setJarIsOpen(true)
  const onMouseOut = () => setJarIsOpen(false)

  return (
    <div
      ref={tooltipTarget}
      className={styles.tooltipJarContainer}
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
      onClick={onClick}
    >
      <rb.Overlay
        target={tooltipTarget.current}
        show={jarIsOpen}
        placement="top"
        popperConfig={{
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, 5],
              },
            },
          ],
        }}
      >
        {(props) => <rb.Tooltip {...props}>{tooltipText}</rb.Tooltip>}
      </rb.Overlay>
      <Jar index={index} balance={balance} fillLevel={fillLevel} isOpen={jarIsOpen} />
    </div>
  )
}

export { calculateFillLevel, SelectableJar, OpenableJar }
