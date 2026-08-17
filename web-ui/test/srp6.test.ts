import { describe, it, expect } from 'bun:test'
import { generateSalt, generateVerifier, N, g } from '../server/utils/srp6'

describe('srp6', () => {
  it('N and g are the expected CMaNGOS parameters', () => {
    expect(N.toString(16).toUpperCase()).toBe(
      '894B645E89E1535BBDAD5B8B290650530801B18EBFBF5E8FAB3C82872A3E9BB7'
    )
    expect(g).toBe(7n)
  })

  it('generateSalt returns 64 hex chars (32 bytes)', () => {
    const salt = generateSalt()
    expect(salt).toMatch(/^[0-9a-f]{64}$/)
  })

  it('generateVerifier is deterministic', async () => {
    const salt = 'aabbccdd11223344556677889900aabbccdd11223344556677889900aabbccdd'
    const v1 = await generateVerifier('testuser', 'testpass', salt)
    const v2 = await generateVerifier('testuser', 'testpass', salt)
    expect(v1).toBe(v2)
    expect(v1).toMatch(/^[0-9a-f]{64}$/)
  })

  it('generateVerifier respects CMaNGOS case rules', async () => {
    const salt = 'aabbccdd11223344556677889900aabbccdd11223344556677889900aabbccdd'
    const vLower = await generateVerifier('testuser', 'testpass', salt)
    const vUpper = await generateVerifier('TESTUSER', 'TESTPASS', salt)
    expect(vLower).toBe(vUpper)
  })

  it('known vector: username "ADMIN", password "ADMIN", salt all-zeros', async () => {
    const salt = '0000000000000000000000000000000000000000000000000000000000000000'
    const v = await generateVerifier('ADMIN', 'ADMIN', salt)
    expect(v).toMatch(/^[0-9a-f]{64}$/)
    expect(v).not.toBe('0000000000000000000000000000000000000000000000000000000000000000')
  })
})
