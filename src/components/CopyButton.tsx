import React, { PropsWithChildren, useState, useEffect, useRef } from 'react'
import { copyToClipboard } from '../utils'
import Sprite from './Sprite'

interface CopyableProps {
  value: string
  onSuccess?: () => void
  onError?: (e: Error) => void
  className?: string
}

function Copyable({ value, onError, onSuccess, className, children, ...props }: PropsWithChildren<CopyableProps>) {
  const valueFallbackInputRef = useRef(null)

  return (
    <>
      <button
        className={className}
        {...props}
        onClick={() => copyToClipboard(value, valueFallbackInputRef.current!).then(onSuccess, onError)}
      >
        {children}
      </button>
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

interface CopyButtonProps extends CopyableProps {}

export function CopyButton({ value, onSuccess, onError, children, ...props }: PropsWithChildren<CopyButtonProps>) {
  return (
    <Copyable
      className="btn"
      value={value}
      onError={onError}
      onSuccess={onSuccess}
      data-bs-toggle="tooltip"
      data-bs-placement="left"
      {...props}
    >
      {children}
    </Copyable>
  )
}

interface CopyButtonWithConfirmationProps extends CopyButtonProps {
  text: string
  successText?: string
  successTextTimeout?: number
  disabled?: boolean
}

export function CopyButtonWithConfirmation({
  value,
  onSuccess,
  onError,
  text,
  successText = text,
  successTextTimeout = 1_500,
  ...props
}: CopyButtonWithConfirmationProps) {
  const [showValueCopiedConfirmation, setShowValueCopiedConfirmation] = useState(false)
  const [valueCopiedFlag, setValueCopiedFlag] = useState(0)

  useEffect(() => {
    if (valueCopiedFlag < 1) return

    setShowValueCopiedConfirmation(true)
    const timer = setTimeout(() => {
      setShowValueCopiedConfirmation(false)
    }, successTextTimeout)

    return () => clearTimeout(timer)
  }, [valueCopiedFlag, successTextTimeout])

  return (
    <CopyButton
      className="btn btn-outline-dark"
      value={value}
      onError={onError}
      onSuccess={() => {
        setValueCopiedFlag((current) => current + 1)
        onSuccess && onSuccess()
      }}
      {...props}
    >
      {showValueCopiedConfirmation ? (
        <div className="d-flex justify-content-center align-items-center">
          {successText}
          <Sprite color="green" symbol="checkmark" className="ms-1" width="20" height="20" />
        </div>
      ) : (
        <>{text}</>
      )}
    </CopyButton>
  )
}
