import { HDKey } from '@scure/bip32'
import { mnemonicToSeedSync } from '@scure/bip39'
import { describe, it, expect } from 'vitest'
import { DUMMY_SEED_PHRASE } from './utils'
import { convertExtendedPublicKey } from './xpubs'

// from https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki#test-vector-1
const BIP32_TEST_VECTOR_1 = {
  0: 'xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8',
  1: 'xpub68Gmy5EdvgibQVfPdqkBBCHxA5htiqg55crXYuXoQRKfDBFA1WEjWgP6LHhwBZeNK1VTsfTFUHCdrfp1bgwQ9xv5ski8PX9rL2dZXvgGDnw',
}

describe('xpubs', () => {
  it('convert xpub to other formats from BIP32 test vectors', () => {
    const vector0 = BIP32_TEST_VECTOR_1[0]
    const vector1 = BIP32_TEST_VECTOR_1[1]

    expect(convertExtendedPublicKey(vector0, 'xpub')).toBe(
      'xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8',
    )
    expect(convertExtendedPublicKey(vector0, 'ypub')).toBe(
      'ypub6QqdH2c5z7967BioGSfAWFHM1EHzHPBZK7wrND3ZpEWFtzmCqvsD1bgpaE6pSAPkiSKhkuWPCJV6mZTSNMd2tK8xYTcJ48585pZecmSUzWp',
    )
    expect(convertExtendedPublicKey(vector0, 'zpub')).toBe(
      'zpub6jftahH18ngZxUuv6oSniLNrBCSSE1B4EEU59bwTCEt8x6aS6b2mdfLxbS4QS53g85SWWP6wexqeer516433gYpZQoJie2tcMYdJ1SYYYAL',
    )
    expect(convertExtendedPublicKey(vector0, 'tpub')).toBe(
      'tpubD6NzVbkrYhZ4XgiXtGrdW5XDAPFCL9h7we1vwNCpn8tGbBcgfVYjXyhWo4E1xkh56hjod1RhGjxbaTLV3X4FyWuejifB9jusQ46QzG87VKp',
    )
    expect(convertExtendedPublicKey(vector0, 'upub')).toBe(
      'upub57Wa4MvRPNyAhzxKw1WfftuLKMiCWuDZefryEdU2JCzjgbWHqJCxXM4GVQGUSXn55srUm189Mf4uER1BVZxyhNQZ56pbiUoAzvK54VEYrWu',
    )
    expect(convertExtendedPublicKey(vector0, 'vpub')).toBe(
      'vpub5SLqN2bLY4WeZJ9SmNJHsyzqVKreTXD4ZnPC22MugDNcjhKX5xNX9QiQWcE4SSRzVWyHWUihpKRT7hckDGNzVc69wSX2JPcfGeNiT5c2XZy',
    )

    expect(convertExtendedPublicKey(vector1, 'xpub')).toBe(
      'xpub68Gmy5EdvgibQVfPdqkBBCHxA5htiqg55crXYuXoQRKfDBFA1WEjWgP6LHhwBZeNK1VTsfTFUHCdrfp1bgwQ9xv5ski8PX9rL2dZXvgGDnw',
    )
    expect(convertExtendedPublicKey(vector1, 'ypub')).toBe(
      'ypub6T73GjuZ5NG5FnrWUCXoPHPTL3rLfTfZzjNkLJRgnRhYGH4PGAQJ8k3EMVfXBUJHiecGd93ovwZBjxRaKPMQxCbgk6QYyRyLbkhCvXJ8PtA',
    )
    expect(convertExtendedPublicKey(vector1, 'zpub')).toBe(
      'zpub6mwJaQaUE3oZ763dJZKRbNUxW1znc5f4uqty7hKaAS5RKNscWpZrkohNNhd7BNxD8Hj5NceNPbujdF3935mRkSHHcS6yZLnpsUkrK1XoMLr',
    )
    expect(convertExtendedPublicKey(vector1, 'tpub')).toBe(
      'tpubD8eQVK4Kdxg3gHrF62jGP7dKVCoYiEB8dFSpuTawkL5YxTus5j5pf83vaKnii4bc6v2NVEy81P2gYrJczYne3QNNwMTS53p5uzDyHvnw2jm',
    )
    expect(convertExtendedPublicKey(vector1, 'upub')).toBe(
      'upub59mz45DtUe69rc638mPJYw1SeBGYtyhaLHHsCir9GQC23soUFXk3eVQgGfqBBqgc6693dEfa6J8zCoyKSbhMmFsHGjcrdnhPWrSdN8uUxKb',
    )
    expect(convertExtendedPublicKey(vector1, 'vpub')).toBe(
      'vpub5UcFMjtodKddhuH9y8Avm26wp9Qzqbh5FPp5z7k2eQZu6ychWBucGZ4pHsnmBkLXVjFrNiG8YxVY66atAJ7NZVYt95KHDhWsnaWGkhF4DrT',
    )
  })

  it('convert xpub to other formats and back from BIP32 test vectors', () => {
    const vector0 = BIP32_TEST_VECTOR_1[0]

    expect(
      [vector0]
        .map((it) => convertExtendedPublicKey(it, 'xpub'))
        .map((it) => convertExtendedPublicKey(it, 'ypub'))
        .map((it) => convertExtendedPublicKey(it, 'Ypub'))
        .map((it) => convertExtendedPublicKey(it, 'zpub'))
        .map((it) => convertExtendedPublicKey(it, 'Zpub'))
        .map((it) => convertExtendedPublicKey(it, 'tpub'))
        .map((it) => convertExtendedPublicKey(it, 'upub'))
        .map((it) => convertExtendedPublicKey(it, 'Upub'))
        .map((it) => convertExtendedPublicKey(it, 'vpub'))
        .map((it) => convertExtendedPublicKey(it, 'Vpub'))
        .map((it) => convertExtendedPublicKey(it, 'xpub'))[0],
    ).toBe(vector0)
  })

  it('convert xpub to zpub from dummy seed phrase', () => {
    const seed = mnemonicToSeedSync(DUMMY_SEED_PHRASE.join(' '))
    const root = HDKey.fromMasterSeed(seed)
    const xpub32_0 = root.derive(`m/44'/0'/0'`).publicExtendedKey
    const xpub84_0 = root.derive(`m/84'/0'/0'`).publicExtendedKey
    const xpub84_4 = root.derive(`m/84'/0'/4'`).publicExtendedKey

    expect(xpub32_0, 'sanity check').toBe(
      'xpub6BosfCnifzxcFwrSzQiqu2DBVTshkCXacvNsWGYJVVhhawA7d4R5WSWGFNbi8Aw6ZRc1brxMyWMzG3DSSSSoekkudhUd9yLb6qx39T9nMdj',
    )
    expect(xpub84_0, 'sanity check').toBe(
      'xpub6CatWdiZiodmUeTDp8LT5or8nmbKNcuyvz7WyksVFkKB4RHwCD3XyuvPEbvqAQY3rAPshWcMLoP2fMFMKHPJ4ZeZXYVUhLv1VMrjPC7PW6V',
    )
    expect(xpub84_4, 'sanity check').toBe(
      'xpub6CatWdiZiodmeXswr13Gd5aNtNqr2UHCBEsCoL3eEFVaM7n8kY5kS4daaP83gWQncmzL3Wzt79mEiLix6XZs6XQmGcQNeQ4HcjfVTn9TuXE',
    )

    expect(convertExtendedPublicKey(xpub32_0, 'zpub')).toBe(
      'zpub6qUQGY8YyN3ZxYEgf8J6KCQBqQAbdSWaT9RK54L5FWTTh8na8NkCkZpYHnWt7zEwNhqd6p9Utq562cSZsqGqFE87NNsUKnyZeJ5KvbhfC8E',
    )
    expect(convertExtendedPublicKey(xpub84_0, 'zpub')).toBe(
      'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs',
    )
    expect(convertExtendedPublicKey(xpub84_4, 'zpub')).toBe(
      'zpub6rFR7y4Q2AijM8GBWicX3FmPEK8juiGC1TueN7qQzGFLTKQbFrQsgBwrco3DgKidS4DwYUC12UULUux5XvPtgzmy1HoDpDhGABnnEyBQzsL',
    )
  })
})
