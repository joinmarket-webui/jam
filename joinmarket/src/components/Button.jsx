import React from 'react'
import './Button.css'

export const Button = ({ name, children, type, onClick }) => (
  <button onClick={() => onClick(name)} type={type}>
    {children}
  </button>
)
