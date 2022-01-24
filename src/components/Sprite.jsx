import React from 'react'

export default function Sprite({ symbol, className, ...props}) {
  return (
    <svg role="img" className={`sprite sprite-${symbol} ${className}`} {...props}>
      <use href={`${process.env.PUBLIC_URL}/sprite.svg#${symbol}`}></use>
    </svg>
  )
}
