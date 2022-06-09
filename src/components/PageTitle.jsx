import React from 'react'
import Sprite from './Sprite'

export default function PageTitle({ title, subtitle, success = false, center = false }) {
  return (
    <div className={`mb-4 ${center && 'text-center'}`}>
      {success && (
        <div className={`mb-2 ${center && 'd-flex align-items-center justify-content-center'}`}>
          <div
            className="d-flex align-items-center justify-content-center"
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
        </div>
      )}
      <div style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '0.5rem' }}>{title}</div>
      {subtitle && <p className="text-secondary">{subtitle}</p>}
    </div>
  )
}
