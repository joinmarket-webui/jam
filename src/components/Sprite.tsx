import React from 'react'

interface SpriteProps extends React.SVGProps<SVGSVGElement> {
  symbol: string
  className?: string
}

export default function Sprite({ symbol, className, ...props }: SpriteProps) {
  return (
    <svg role="img" className={`d-inline-block sprite sprite-${symbol}${className ? ` ${className}` : ''}`} {...props}>
      <use href={`${window.JM.PUBLIC_PATH}/sprite.svg#${symbol}`}></use>
    </svg>
  )
}
