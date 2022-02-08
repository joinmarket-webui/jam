import React from 'react'
import Sprite from './Sprite'

export default function PageTitle({ title, subtitle, success = false }) {
  return (
    <div className="mb-4">
      {success && (
        <div
          className="d-flex align-items-center justify-content-center mb-2"
          style={{
            width: '3rem',
            height: '3rem',
            backgroundColor: 'rgba(39, 174, 96, 1)',
            color: 'white',
            borderRadius: '50%',
          }}
        >
          <Sprite symbol="checkmark" width="24" height="30" />
        </div>
      )}
      <h2>{title}</h2>
      {subtitle && <p className="text-secondary">{subtitle}</p>}
    </div>
  )
}
