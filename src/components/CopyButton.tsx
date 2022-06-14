import React, { PropsWithChildren, useState, useEffect, useRef } from 'react'
import Sprite from './Sprite'

const copyToClipboard = (
  text: string,
  fallbackInputField: HTMLInputElement,
  errorMessage?: string
): Promise<boolean> => {
  const copyToClipboardFallback = (
    inputField: HTMLInputElement,
    errorMessage = 'Cannot copy value to clipboard'
  ): Promise<boolean> =>
    new Promise((resolve, reject) => {
      inputField.select()
      const success = document.execCommand && document.execCommand('copy')
      inputField.blur()
      success ? resolve(success) : reject(new Error(errorMessage))
    })

  // The `navigator.clipboard` API might not be available, e.g. on sites served over HTTP.
  if (!navigator.clipboard) {
    return copyToClipboardFallback(fallbackInputField)
  }

  return navigator.clipboard
    .writeText(text)
    .then(() => true)
    .catch((e: Error) => {
      if (fallbackInputField) {
        return copyToClipboardFallback(fallbackInputField, errorMessage)
      } else {
        throw e
      }
    })
}

interface CopyableProps {
  value: string
  onSuccess?: () => void
  onError?: (e: Error) => void
  className?: string
}

function Copyable({ value, onSuccess, onError, className, children, ...props }: PropsWithChildren<CopyableProps>) {
  const valueFallbackInputRef = useRef(null)

  return (
    <>
      <button
        {...props}
        className={className}
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

interface CopyButtonProps extends CopyableProps {
  text: React.ReactNode | string
  successText?: React.ReactNode | string
  successTextTimeout?: number
  showSprites?: boolean
}

export function CopyButton({
  value,
  onSuccess,
  onError,
  text,
  successText = text,
  successTextTimeout = 1_500,
  className,
  showSprites = true,
  ...props
}: CopyButtonProps) {
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
    <Copyable
      {...props}
      className={`btn ${className || ''}`}
      value={value}
      onError={onError}
      onSuccess={() => {
        setValueCopiedFlag((current) => current + 1)
        onSuccess && onSuccess()
      }}
    >
      <div className="d-flex align-items-center justify-content-center">
        {showSprites && (
          <>
            {showValueCopiedConfirmation ? (
              <Sprite color="green" symbol="checkmark" className="me-1" width="20" height="20" />
            ) : (
              <Sprite symbol="copy" className="me-1" width="20" height="20" />
            )}
          </>
        )}
        <>{showValueCopiedConfirmation ? successText : text}</>
      </div>
    </Copyable>
  )
}
