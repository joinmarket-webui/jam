import { mnemonicToSeedSync } from '@scure/bip39'
import { describe, it, expect } from 'vitest'
import { deriveAccountXpub } from './bip32'
import { DUMMY_SEED_PHRASE } from './utils'

describe('deriveAccountXpub', () => {
  it('should derive account xpubs', () => {
    const seed = mnemonicToSeedSync(DUMMY_SEED_PHRASE.join(' '))

    const xpub32_0 = deriveAccountXpub(seed, `m/44'/0'/0'`)
    const xpub84_0 = deriveAccountXpub(seed, `m/84'/0'/0'`)
    const xpub84_4 = deriveAccountXpub(seed, `m/84'/0'/4'`)

    expect(xpub32_0).toBe(
      'xpub6BosfCnifzxcFwrSzQiqu2DBVTshkCXacvNsWGYJVVhhawA7d4R5WSWGFNbi8Aw6ZRc1brxMyWMzG3DSSSSoekkudhUd9yLb6qx39T9nMdj',
    )
    expect(xpub84_0).toBe(
      'xpub6CatWdiZiodmUeTDp8LT5or8nmbKNcuyvz7WyksVFkKB4RHwCD3XyuvPEbvqAQY3rAPshWcMLoP2fMFMKHPJ4ZeZXYVUhLv1VMrjPC7PW6V',
    )
    expect(xpub84_4).toBe(
      'xpub6CatWdiZiodmeXswr13Gd5aNtNqr2UHCBEsCoL3eEFVaM7n8kY5kS4daaP83gWQncmzL3Wzt79mEiLix6XZs6XQmGcQNeQ4HcjfVTn9TuXE',
    )
  })
})
