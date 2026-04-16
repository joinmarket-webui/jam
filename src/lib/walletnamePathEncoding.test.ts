import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const sourceDirectory = path.resolve(currentDirectory, '..')

const walletnamePreEncoding = /walletname\s*:\s*encodeURIComponent\s*\(/

const collectSourceFiles = (directoryPath: string): string[] => {
  const children = readdirSync(directoryPath)
  return children.flatMap((name) => {
    const absolute = path.join(directoryPath, name)
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
    const files = collectSourceFiles(sourceDirectory)
    const offenders = files
      .filter((filePath) => walletnamePreEncoding.test(readFileSync(filePath, 'utf8')))
      .map((filePath) => path.relative(sourceDirectory, filePath))

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
