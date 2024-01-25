import { useEffect, useRef, useState } from 'react'
import MnemonicWordInput from './MnemonicWordInput'

interface MnemonicPhraseInputProps {
  columns?: number
  mnemonicPhrase: MnemonicPhrase
  isDisabled?: (index: number) => boolean
  isValid?: (index: number) => boolean
  onChange: (value: MnemonicPhrase) => void
}

export default function MnemonicPhraseInput({
  columns = 3,
  mnemonicPhrase,
  isDisabled,
  isValid,
  onChange,
}: MnemonicPhraseInputProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRefs = useRef<HTMLInputElement[]>([])

  useEffect(() => {
    if (activeIndex < mnemonicPhrase.length && isValid && isValid(activeIndex)) {
      const nextIndex = activeIndex + 1
      setActiveIndex(nextIndex)

      if (inputRefs.current[nextIndex]) {
        inputRefs.current[nextIndex].focus()
      }
    }
  }, [mnemonicPhrase, activeIndex, isValid])

  return (
    <div className="container slashed-zeroes p-0">
      {mnemonicPhrase.map((_, outerIndex) => {
        if (outerIndex % columns !== 0) return null

        const wordGroup = mnemonicPhrase.slice(outerIndex, Math.min(outerIndex + columns, mnemonicPhrase.length))

        return (
          <div className="row mb-4" key={outerIndex}>
            {wordGroup.map((givenWord, innerIndex) => {
              const wordIndex = outerIndex + innerIndex
              const isCurrentActive = wordIndex === activeIndex
              return (
                <div className="col" key={wordIndex}>
                  <MnemonicWordInput
                    forwardRef={(el: HTMLInputElement) => (inputRefs.current[wordIndex] = el)}
                    index={wordIndex}
                    value={givenWord}
                    setValue={(value, i) => {
                      const newPhrase = mnemonicPhrase.map((old, index) => (index === i ? value : old))
                      onChange(newPhrase)
                    }}
                    isValid={isValid ? isValid(wordIndex) : undefined}
                    disabled={isDisabled ? isDisabled(wordIndex) : undefined}
                    onFocus={() => setActiveIndex(wordIndex)}
                    autoFocus={isCurrentActive}
                  />
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
