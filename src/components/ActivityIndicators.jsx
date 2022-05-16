import React from 'react'
import Sprite from './Sprite'

function ActivityIndicator({ isOn, children }) {
  return (
    <span className={`activity-indicator ${isOn ? 'activity-indicator-on' : 'activity-indicator-off'}`}>
      {children}
    </span>
  )
}

export function JoiningIndicator({ isOn, size = 30, className, ...props }) {
  return (
    <span className="joining-indicator">
      <ActivityIndicator isOn={isOn}>
        {isOn && <Sprite symbol="joining" width={size} height={size} className={`p-1 ${className || ''}`} {...props} />}
      </ActivityIndicator>
    </span>
  )
}

export function TabActivityIndicator({ isOn }) {
  return (
    <span className="earn-indicator">
      <ActivityIndicator isOn={isOn} />
    </span>
  )
}
