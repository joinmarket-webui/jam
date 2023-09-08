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
  return (
    <div className="container slashed-zeroes p-0">
      {mnemonicPhrase.map((_, outerIndex) => {
        if (outerIndex % columns !== 0) return null

        const wordGroup = mnemonicPhrase.slice(outerIndex, Math.min(outerIndex + columns, mnemonicPhrase.length))

        return (
          <div className="row mb-4" key={outerIndex}>
            {wordGroup.map((givenWord, innerIndex) => {
              const wordIndex = outerIndex + innerIndex
              return (
                <div className="col" key={wordIndex}>
                  <MnemonicWordInput
                    index={wordIndex}
                    value={givenWord}
                    setValue={(value, i) => {
                      const newPhrase = mnemonicPhrase.map((old, index) => (index === i ? value : old))
                      onChange(newPhrase)
                    }}
                    isValid={isValid ? isValid(wordIndex) : undefined}
                    disabled={isDisabled ? isDisabled(wordIndex) : undefined}
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
