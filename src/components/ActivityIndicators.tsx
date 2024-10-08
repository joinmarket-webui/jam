import { PropsWithChildren } from 'react'
import classNames from 'classnames'
import Sprite from './Sprite'

interface ActivityIndicatorProps {
  isOn: boolean
}

function ActivityIndicator({ isOn, children }: PropsWithChildren<ActivityIndicatorProps>) {
  return (
    <span className={`activity-indicator ${isOn ? 'activity-indicator-on' : 'activity-indicator-off'}`}>
      {children}
    </span>
  )
}

interface JoiningIndicatorProps {
  isOn: boolean
  size?: number
  title?: string
  className?: string
}

export function JoiningIndicator({ isOn, size = 32, className = '', ...props }: JoiningIndicatorProps) {
  return (
    <span className="joining-indicator">
      <ActivityIndicator isOn={isOn}>
        {isOn && <Sprite symbol="mixed" width={size} height={size} className={`${className}`} {...props} />}
      </ActivityIndicator>
    </span>
  )
}

interface TabActivityIndicatorProps {
  isOn: boolean
  className?: string
}

export function TabActivityIndicator({ isOn, className }: TabActivityIndicatorProps) {
  return (
    <span className={classNames('earn-indicator', className)}>
      <ActivityIndicator isOn={isOn} />
    </span>
  )
}
