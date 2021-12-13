import React from 'react'

export const Button = ({ name, children, type, onClick }) => (
  <button onClick={() => onClick(name)} type={type}>
    {children}
  </button>
)
