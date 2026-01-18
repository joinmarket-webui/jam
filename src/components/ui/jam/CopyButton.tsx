import { useState, useEffect, useRef, type PropsWithChildren, type ReactNode } from 'react'
import type { Milliseconds } from '@/types/global'

const copyToClipboardFallback = (
  inputField: HTMLInputElement,
  errorMessage = 'Cannot copy value to clipboard',
): Promise<boolean> =>
  new Promise((resolve, reject) => {
    inputField.select()
    const success = document.execCommand && document.execCommand('copy')
    inputField.blur()
    if (success) {
      resolve(success)
    } else {
      reject(new Error(errorMessage))
    }
  })

const copyToClipboard = async (
  text: string,
  fallbackInputField: HTMLInputElement,
  errorMessage?: string,
): Promise<boolean> => {
  // The `navigator.clipboard` API might not be available, e.g. on sites served over HTTP.
  if (!navigator.clipboard) {
    return copyToClipboardFallback(fallbackInputField)
  }

  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (e) {
    if (fallbackInputField) {
      return copyToClipboardFallback(fallbackInputField, errorMessage)
    } else {
      throw e
    }
  }
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
        type="button"
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
  successTextTimeout?: Milliseconds
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

    let timer = setTimeout(() => {
      setShowValueCopiedConfirmation(true)
      timer = setTimeout(() => {
        setShowValueCopiedConfirmation(false)
      }, successTextTimeout)
    }, 4)

    return () => clearTimeout(timer)
  }, [valueCopiedFlag, successTextTimeout])

  return (
    <Copyable
      {...props}
      disabled={disabled}
      className={className}
      value={value}
      onError={onError}
      onSuccess={() => {
        setValueCopiedFlag((current) => current + 1)
        if (onSuccess !== undefined) {
          onSuccess()
        }
      }}
    >
      <div className="d-flex align-items-center justify-content-center">
        {showValueCopiedConfirmation ? successText : text}
      </div>
    </Copyable>
  )
}
