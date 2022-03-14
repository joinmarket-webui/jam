import React from 'react'

export default function ActivityIndicator({ isOn }) {
  return <span className={`activity-indicator ${isOn ? 'activity-indicator-on' : 'activity-indicator-off'}`} />
}
