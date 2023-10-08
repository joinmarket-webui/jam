import { ReactNode, PropsWithChildren, useState, useEffect, useRef } from 'react'

const copyToClipboard = (
  text: string,
  fallbackInputField: HTMLInputElement,
  errorMessage?: string,
): Promise<boolean> => {
  const copyToClipboardFallback = (
    inputField: HTMLInputElement,
    errorMessage = 'Cannot copy value to clipboard',
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
  disabled?: boolean
}

function Copyable({
  value,
  onSuccess,
  onError,
  className,
  children,
  disabled,
  ...props
}: PropsWithChildren<CopyableProps>) {
  const valueFallbackInputRef = useRef(null)

  return (
    <>
      <button
        {...props}
        disabled={disabled}
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
  text: ReactNode
  successText?: ReactNode
  successTextTimeout?: number
  disabled?: boolean
}

export function CopyButton({
  value,
  onSuccess,
  onError,
  text,
  successText = text,
  successTextTimeout = 1_500,
  className,
  disabled,
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
      disabled={disabled}
      className={`btn ${className || ''}`}
      value={value}
      onError={onError}
      onSuccess={() => {
        setValueCopiedFlag((current) => current + 1)
        onSuccess && onSuccess()
      }}
    >
      <div className="d-flex align-items-center justify-content-center">
        {showValueCopiedConfirmation ? successText : text}
      </div>
    </Copyable>
  )
}
