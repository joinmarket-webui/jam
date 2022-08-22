import { getLogLevel } from './LogOverlay'

describe('getLogLevel', () => {
  it('should get log level correctly', () => {
    expect(getLogLevel('2009-01-03 19:02:10,057 [DEBUG] >>pubmsg !orderbook')).toBe('DEBUG')
    expect(getLogLevel('2009-01-03 19:03:11,045 [INFO] JM daemon setup complete')).toBe('INFO')
    expect(getLogLevel('2009-01-03 19:04:12,152 [WARNING] ERROR not enough liquidity')).toBe('WARNING')
    expect(getLogLevel('2009-01-03 19:05:27,426 [ERROR] We failed to connect')).toBe('ERROR')
  })

  it('should default to log level INFO for log messages not following a pattern', () => {
    expect(getLogLevel('')).toBe('INFO')
    expect(getLogLevel(' ')).toBe('INFO')
    expect(getLogLevel('foo')).toBe('INFO')
    expect(getLogLevel("b'/api/v1/wallet/Satoshi.jmdat/display'")).toBe('INFO')
  })
})
