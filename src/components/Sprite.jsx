import React from 'react'

export default function Sprite({ symbol, className, ...props }) {
  return (
    <svg role="img" className={`d-inline-block sprite sprite-${symbol}${className ? ` ${className}` : ''}`} {...props}>
      <use href={`${window.JM.PUBLIC_PATH}/sprite.svg#${symbol}`}></use>
    </svg>
  )
}
