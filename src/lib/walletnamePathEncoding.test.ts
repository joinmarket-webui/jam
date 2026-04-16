import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const current_dir= dirname(fileURLToPath(import.meta.url))
const src_dir=resolve(current_dir, '..')

const walletname_pre_encoding= /walletname\s*:\s*encodeURIComponent\s*\(/

const collectSourceFiles = (dirPath: string): string[] => {
  const children = readdirSync(dirPath)
  return children.flatMap((name) => {
    const absolute = join(dirPath, name)
    const stats = statSync(absolute)
    if (stats.isDirectory()) {
    return collectSourceFiles(absolute)
    }
    if (!/\.(ts|tsx)$/.test(name) || /\.test\.(ts|tsx)$/.test(name)) {
      return []
    }

    return [absolute]
  })
}

describe('walletname path encoding ownership', () => {
  it('does not manually pre-encode walletname in src callsites', () => {
    const files = collectSourceFiles(src_dir)
    const offenders = files
      .filter((filePath) => walletname_pre_encoding.test(readFileSync(filePath, 'utf8')))
      .map((filePath) => relative(src_dir, filePath))

    expect(offenders).toEqual([])
  })

  it('requires raw walletname values so path params are encoded exactly once', () => {
    const pathTemplate = '/wallet/{walletname}/lock'
    const buildPath = (walletname: string) => {
      return pathTemplate.replace('{walletname}', encodeURIComponent(walletname))
    }
    expect(buildPath('my wallet.jmdat')).toBe('/wallet/my%20wallet.jmdat/lock')
    expect(buildPath('my100%wallet.jmdat')).toBe('/wallet/my100%25wallet.jmdat/lock')
    expect(buildPath('my%20wallet.jmdat')).toBe('/wallet/my%2520wallet.jmdat/lock')
  })
})
