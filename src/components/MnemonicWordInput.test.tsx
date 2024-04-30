import { render, screen } from '../testUtils'
import { Bip39MnemonicWordInput, MnemonicWordInputProps } from './MnemonicWordInput'

const NOOP = () => {}

describe('<Bip39MnemonicWordInput />', () => {
  const validBip39MnemonicWord = 'abandon'
  const invalidBip39MnemonicWord = 'not a bip39 word!'

  const setup = (props: MnemonicWordInputProps) => {
    render(<Bip39MnemonicWordInput {...props} />)
  }

  it('should render without errors', async () => {
    setup({ index: 0, value: '', setValue: NOOP })

    expect(await screen.findByTestId('mnemonic-word-input')).toBeVisible()
  })

  it('should report if input is NOT included in the BIP-39 wordlist', async () => {
    setup({ index: 0, value: invalidBip39MnemonicWord, setValue: NOOP })

    const input = await screen.findByTestId('mnemonic-word-input')
    expect(input).toBeVisible()
    expect(input).toHaveClass('is-invalid')
    expect(input).not.toHaveClass('is-valid')
  })

  it('should report if input IS INCLUDED in the BIP-39 wordlist', async () => {
    setup({ index: 0, value: validBip39MnemonicWord, setValue: NOOP })

    const input = await screen.findByTestId('mnemonic-word-input')
    expect(input).toBeVisible()
    expect(input).toHaveClass('is-valid')
    expect(input).not.toHaveClass('is-invalid')
  })
})
