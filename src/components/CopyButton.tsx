import React, { PropsWithChildren } from 'react'
import { useState, useEffect } from 'react'
import Sprite from './Sprite'
import { CopyableProps, Copyable } from './Copyable'

interface CopyButtonProps extends CopyableProps {}

export function CopyButton({ value, onSuccess, onError, children, ...props }: PropsWithChildren<CopyButtonProps>) {
  return (
    <Copyable
      value={value}
      onSuccess={onSuccess}
      onError={onError}
      className="btn"
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
  successText: string
  successTextTimeout: number
}

export function CopyButtonWithConfirmation({
  value,
  onSuccess,
  onError,
  text,
  successText = text,
  successTextTimeout = 1_500,
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
      onSuccess={() => {
        setValueCopiedFlag((current) => current + 1)
        onSuccess && onSuccess()
      }}
      onError={onError}
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
