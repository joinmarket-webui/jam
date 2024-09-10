import { useCallback, useEffect, useRef, useState } from 'react'
import { Bip39MnemonicWordInput } from './MnemonicWordInput'
import { MNEMONIC_WORDS } from '../constants/bip39words'
import * as rb from 'react-bootstrap'
import { forwardRef } from 'react'
import style from './MnemonicPhraseInput.module.css'

interface MnemonicPhraseInputProps {
  columns?: number
  mnemonicPhrase: MnemonicPhrase
  isDisabled?: (index: number) => boolean
  isValid?: (index: number) => boolean
  onChange: (value: MnemonicPhrase) => void
}

interface MnemonicDropdownProps {
  show: boolean
  words: string[]
  onSelect: (word: string) => void
}

const MnemonicDropdown = forwardRef<HTMLDivElement, MnemonicDropdownProps>(({ show, words, onSelect }, ref) => (
  <rb.Dropdown show={show}>
    <rb.Dropdown.Menu className={`table-responsive ${style.dropdownMenu}`} ref={ref}>
      {words.map((word) => (
        <div className="m-1" key={word}>
          <rb.Dropdown.Item onClick={() => onSelect(word)} className="p-2">
            {word}
          </rb.Dropdown.Item>
        </div>
      ))}
    </rb.Dropdown.Menu>
  </rb.Dropdown>
))

export default function MnemonicPhraseInput({
  columns = 3,
  mnemonicPhrase,
  isDisabled,
  isValid,
  onChange,
}: MnemonicPhraseInputProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRefs = useRef<HTMLInputElement[]>([])
  const [showDropdown, setShowDropdown] = useState<number | null>(null)
  const [filteredWords, setFilteredWords] = useState<string[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  const focusNextInput = useCallback((index: number) => {
    inputRefs.current[index]?.focus()
  }, [])

  useEffect(() => {
    if (activeIndex < mnemonicPhrase.length && isValid && isValid(activeIndex)) {
      const nextIndex = activeIndex + 1
      setActiveIndex(nextIndex)
      setShowDropdown(null)
      focusNextInput(nextIndex)
    }
  }, [mnemonicPhrase, activeIndex, isValid, focusNextInput])

  const updateFilteredWords = useCallback((value: string, index: number) => {
    const matched = value ? MNEMONIC_WORDS.filter((word) => word.startsWith(value)) : []
    setShowDropdown(matched.length > 0 ? index : null)
    setFilteredWords(matched)
  }, [])

  const handleInputChange = useCallback(
    (value: string, index: number, selectWordFromDropdown = false) => {
      const newPhrase = mnemonicPhrase.map((word, i) => (i === index ? value : word))
      onChange(newPhrase)
      updateFilteredWords(value, index)
      if (selectWordFromDropdown) {
        setShowDropdown(null)
        if (!isValid) {
          focusNextInput(index + 1)
        }
      }
    },
    [mnemonicPhrase, onChange, isValid, focusNextInput, updateFilteredWords],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, value: string, wordIndex: number) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (filteredWords.length > 0 && dropdownRef.current) {
          const firstItem = dropdownRef.current.querySelector('.dropdown-item')
          if (firstItem) {
            ;(firstItem as HTMLElement).focus()
          }
        }
      } else if (e.key === 'Enter') {
        const matched = MNEMONIC_WORDS.filter((word) => word.startsWith(value))
        if (matched.length === 1) {
          e.preventDefault()
          handleInputChange(matched[0], wordIndex, true)
        }
      } else if (e.key === 'Tab') {
        const matched = MNEMONIC_WORDS.filter((word) => word.startsWith(value))
        if (matched.length === 1 && value === matched[0]) {
          e.preventDefault()
          focusNextInput(wordIndex + 1)
        }
      }
    },
    [filteredWords, handleInputChange, focusNextInput],
  )

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
                <div
                  className="col"
                  key={wordIndex}
                  onKeyDown={(e) => {
                    handleKeyDown(e, givenWord, wordIndex)
                  }}
                >
                  <Bip39MnemonicWordInput
                    forwardRef={(el: HTMLInputElement) => (inputRefs.current[wordIndex] = el)}
                    index={wordIndex}
                    value={givenWord}
                    setValue={(value) => handleInputChange(value, wordIndex)}
                    isValid={isValid ? isValid(wordIndex) : undefined}
                    disabled={isDisabled ? isDisabled(wordIndex) : undefined}
                    onFocus={() => {
                      setActiveIndex(wordIndex)
                      givenWord && updateFilteredWords(givenWord, wordIndex)
                    }}
                    autoFocus={isCurrentActive}
                  />
                  {filteredWords && (
                    <MnemonicDropdown
                      ref={dropdownRef}
                      show={showDropdown === wordIndex}
                      words={filteredWords}
                      onSelect={(word) => handleInputChange(word, wordIndex, true)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
