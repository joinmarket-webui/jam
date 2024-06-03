import { useState, useMemo, useRef } from 'react'
import * as rb from 'react-bootstrap'
import classnamesBind from 'classnames/bind'
import { useSettings } from '../../context/SettingsContext'
import { AmountSats } from '../../libs/JmWalletApi'
import Sprite from '../Sprite'
import Balance from '../Balance'
import styles from './Jar.module.css'

const classNames = classnamesBind.bind(styles)

type JarFillLevel = 0 | 1 | 2 | 3

export type JarProps = {
  index: JarIndex
  balance: AmountSats
  frozenBalance: AmountSats
  fillLevel: JarFillLevel
  isOpen?: boolean
  size?: 'sm' | 'lg'
}

export type SelectableJarProps = JarProps & {
  tooltipText?: string
  isOpen?: boolean
  isSelectable: boolean
  isSelected: boolean
  variant?: 'default' | 'warning'
  onClick: (index: JarIndex) => void
}
type showingUTXOS = { index: String; show: boolean }
export type SelectableSendJarProps = JarProps & {
  tooltipText: string
  isSelectable: boolean
  isSelected: boolean
  variant?: 'default' | 'warning'
  showingUTXOS: showingUTXOS
  setshowingUTXOS: (val: showingUTXOS) => void
  onClick: (index: JarIndex) => void
}

export type SelectableSendJarProps = JarProps & {
  tooltipText: string
  isSelectable: boolean
  isSelected: boolean
  variant?: 'default' | 'warning'
  showingUTXOS: showingUTXOS
  setshowingUTXOS: (val: showingUTXOS) => void
  onClick: (index: JarIndex) => void
}

export type OpenableJarProps = Omit<JarProps, 'isOpen'> & {
  tooltipText: string
  onClick: () => void
}

/**
 * Classifies the account balance into one of four groups:
 *
 * - More than half of the total balance
 * - More than a quarter of the total balance
 * - Not empty
 * - Empty
 */
const jarFillLevel = (jarBalance: AmountSats, totalBalance: AmountSats): JarFillLevel => {
  if (totalBalance === 0) return 0
  if (jarBalance > totalBalance / 2) return 3
  if (jarBalance > totalBalance / 4) return 2
  if (jarBalance > 0) return 1

  return 0
}

const jarName = (index: JarIndex) => {
  switch (index) {
    case 0:
      return 'Apricot'
    case 1:
      return 'Blueberry'
    case 2:
      return 'Cherry'
    case 3:
      return 'Date'
    case 4:
      return 'Elderberry'
    default:
      return 'Jam'
  }
}

const jarInitial = (index: JarIndex) => {
  switch (index) {
    case 0:
      return 'A'
    case 1:
      return 'B'
    case 2:
      return 'C'
    case 3:
      return 'D'
    case 4:
      return 'E'
    default:
      return 'X'
  }
}

/**
 * A jar with index and balance.
 */
const Jar = ({ index, balance, frozenBalance, fillLevel, isOpen = false, size }: JarProps) => {
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

  const flavorStyle = useMemo(() => {
    switch (index) {
      case 0:
        return styles.apricotJam
      case 1:
        return styles.blueberryJam
      case 2:
        return styles.cherryJam
      case 3:
        return styles.dateJam
      case 4:
        return styles.elderberryJam
      default:
        return styles.neutralJam
    }
  }, [index])

  const flavorName = jarName(index)

  return (
    <div className={`${styles.jarContainer} jar-container-hook`}>
      <Sprite
        className={`${styles.jarSprite} ${flavorStyle}`}
        symbol={jarSymbol}
        width={size === 'lg' ? '48px' : '32px'}
        height={size === 'lg' ? '72px' : '48px'}
      />
      <div className={`${styles.jarInfoContainer} jar-info-container-hook`}>
        <div className={styles.jarIndex}>{flavorName}</div>
        <div className={`${styles.jarBalance} jar-balance-container-hook`}>
          <Balance valueString={balance.toString()} convertToUnit={settings.unit} showBalance={settings.showBalance} />
        </div>
        <div className={`${styles.jarBalance} ${styles.frozen} jar-balance-container-hook`}>
          {frozenBalance > 0 && (
            <Balance
              valueString={frozenBalance.toString()}
              convertToUnit={settings.unit}
              showBalance={settings.showBalance}
              frozen={true}
              showSymbol={false}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * A jar with index, balance, and a radio-style selection button.
 */
const SelectableJar = ({
  tooltipText,
  isOpen = false,
  isSelectable,
  isSelected,
  onClick,
  index,
  variant = 'default',
  ...jarProps
}: SelectableJarProps) => {
  const target = useRef(null)
  return (
    <div
      className={classNames('selectableJarContainer', {
        selectable: isSelectable,
        selected: isSelected,
      })}
      onClick={() => isSelectable && onClick(index)}
      ref={target}
    >
      <Jar index={index} {...jarProps} isOpen={isOpen && isSelected && isSelectable} />
      <div className="d-flex justify-content-center align-items-center gap-1 mt-2 position-relative">
        <input
          type="radio"
          checked={isSelected}
          onChange={() => isSelectable && onClick(index)}
          className={styles.selectionCircle}
          disabled={!isSelectable}
        />
        {variant === 'warning' && (
          <div className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning text-dark p-0">
            <Sprite symbol="warn" width="20" height="20" />
          </div>
        )}
      </div>
      {isOpen && isSelectable && (
        <rb.Overlay target={target.current} show={isSelected} placement={'top-start'}>
          {(props) => (
            <rb.Tooltip {...props} className={styles.customTooltip}>
              {tooltipText}
            </rb.Tooltip>
          )}
        </rb.Overlay>
      )}
    </div>
  )
}

/**
 * A jar with index, balance, and a tooltip.
 * The jar symbol opens on hover.
 */
const OpenableJar = ({ tooltipText, onClick, ...jarProps }: OpenableJarProps) => {
  const [jarIsOpen, setJarIsOpen] = useState(false)
  const onMouseOver = () => setJarIsOpen(true)
  const onMouseOut = () => setJarIsOpen(false)

  return (
    <div onMouseOver={onMouseOver} onMouseOut={onMouseOut}>
      <rb.OverlayTrigger
        popperConfig={{
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, 10],
              },
            },
          ],
        }}
        overlay={(props) => <rb.Tooltip {...props}>{tooltipText}</rb.Tooltip>}
      >
        <div
          tabIndex={0}
          className={styles.tooltipJarContainer}
          onClick={onClick}
          onKeyDown={(e) => e.key === 'Enter' && onClick()}
        >
          <Jar {...jarProps} isOpen={jarIsOpen} />
        </div>
      </rb.OverlayTrigger>
    </div>
  )
}

<<<<<<< HEAD
export { SelectableJar, OpenableJar, jarName, jarInitial, jarFillLevel }
=======
const SelectableSendJar = ({
  tooltipText,
  isSelectable,
  isSelected,
  onClick,
  index,
  variant = 'default',
  ...jarProps
}: SelectableSendJarProps) => {
  const [jarIsOpen, setJarIsOpen] = useState(false)
  const onMouseOver = () => setJarIsOpen(true)
  const onMouseOut = () => setJarIsOpen(false)

  return (
    <div onClick={() => isSelectable && onClick(index)} onMouseOver={onMouseOver} onMouseOut={onMouseOut}>
      <rb.OverlayTrigger
        popperConfig={{
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, 10],
              },
            },
          ],
        }}
        overlay={(props) => {
          return isSelectable ? <rb.Tooltip {...props}>{tooltipText}</rb.Tooltip> : <></>
        }}
      >
        <div
          className={classNames('selectableJarContainer', {
            selectable: isSelectable,
            selected: isSelected,
          })}
        >
          <Jar index={index} {...jarProps} isOpen={jarIsOpen && isSelectable} />
          <div className={'d-flex justify-content-center align-items-center gap-1 mt-2 position-relative'}>
            <input type="radio" checked={isSelected} className={styles.selectionCircle} disabled={!isSelectable} />
            {variant === 'warning' && (
              <div className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning text-dark p-0 ">
                <Sprite symbol="warn" width="20" height="20" />
              </div>
            )}
          </div>
        </div>
      </rb.OverlayTrigger>
    </div>
  )
}

export { SelectableSendJar, SelectableJar, OpenableJar, jarName, jarInitial, jarFillLevel }
>>>>>>> 162d89e (minor bug fixing)
