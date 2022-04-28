import React, { PropsWithChildren, useRef } from 'react'

// @ts-ignore
import { copyToClipboard } from '../utils'

export interface CopyableProps {
  value: string
  onSuccess?: () => void
  onError?: (e: Error) => void
  className?: string
}

export function Copyable({
  value,
  onSuccess,
  onError,
  className,
  children,
  ...props
}: PropsWithChildren<CopyableProps>) {
  const valueFallbackInputRef = useRef(null)

  return (
    <>
      <div
        className={className}
        {...props}
        onClick={() => copyToClipboard(value, valueFallbackInputRef.current).then(onSuccess, onError)}
      >
        {children}
      </div>
      <input
        readOnly
        aria-hidden
        ref={valueFallbackInputRef}
        value={value}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
        }}
      />
    </>
  )
}
