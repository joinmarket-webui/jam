import { useEffect, useRef, useState } from 'react'
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
        <div className="m-1">
          <rb.Dropdown.Item key={word} onClick={() => onSelect(word)} className="p-2">
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
  const [filteredWords, setFilteredWords] = useState<string[] | undefined>(undefined)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeIndex < mnemonicPhrase.length && isValid && isValid(activeIndex)) {
      const nextIndex = activeIndex + 1
      setActiveIndex(nextIndex)

      if (inputRefs.current[nextIndex]) {
        inputRefs.current[nextIndex].focus()
      }
    }
  }, [mnemonicPhrase, activeIndex, isValid])

  const handleInputChange = (value: string, index: number) => {
    const newPhrase = mnemonicPhrase.map((old, i) => (i === index ? value : old))
    onChange(newPhrase)
    handleDropdownValue(value, index)
  }

  const handleDropdownValue = (value: string, index: number) => {
    const matched = value ? MNEMONIC_WORDS.filter((word) => word.startsWith(value)) : []
    if (matched.length > 0) {
      setShowDropdown(index)
      setFilteredWords(matched)
    } else {
      setShowDropdown(null)
      setFilteredWords(undefined)
    }
  }

  const handleSelectWord = (word: string, index: number) => {
    const newPhrase = mnemonicPhrase.map((old, i) => (i === index ? word : old))
    onChange(newPhrase)
    setShowDropdown(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (filteredWords && filteredWords.length > 0 && dropdownRef.current) {
        const firstItem = dropdownRef.current.querySelector('.dropdown-item')
        if (firstItem) {
          ;(firstItem as HTMLElement).focus()
        }
      }
    } else if (e.key === 'Enter') {
      setShowDropdown(null)
    }
  }

  return (
    <div className="container slashed-zeroes p-0">
      {mnemonicPhrase.map((_, outerIndex) => {
        if (outerIndex % columns !== 0) return null

        const wordGroup = mnemonicPhrase.slice(outerIndex, Math.min(outerIndex + columns, mnemonicPhrase.length))

        return (
          <div
            className="row mb-4"
            key={outerIndex}
            onKeyDown={(e) => {
              handleKeyDown(e)
            }}
          >
            {wordGroup.map((givenWord, innerIndex) => {
              const wordIndex = outerIndex + innerIndex
              const isCurrentActive = wordIndex === activeIndex
              return (
                <div className="col" key={wordIndex}>
                  <Bip39MnemonicWordInput
                    forwardRef={(el: HTMLInputElement) => (inputRefs.current[wordIndex] = el)}
                    index={wordIndex}
                    value={givenWord}
                    setValue={(value) => handleInputChange(value, wordIndex)}
                    isValid={isValid ? isValid(wordIndex) : undefined}
                    disabled={isDisabled ? isDisabled(wordIndex) : undefined}
                    onFocus={() => {
                      setActiveIndex(wordIndex)
                      handleDropdownValue(givenWord, wordIndex)
                    }}
                    autoFocus={isCurrentActive}
                  />
                  {filteredWords && (
                    <MnemonicDropdown
                      ref={dropdownRef}
                      show={showDropdown === wordIndex}
                      words={filteredWords}
                      onSelect={(word) => handleSelectWord(word, wordIndex)}
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
