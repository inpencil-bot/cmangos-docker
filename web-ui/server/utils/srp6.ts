// SRP6a implementation for CMaNGOS (Classic/TBC — SRP6v2)
// Reference parameters from RFC 5054 / CMaNGOS realmd

const N_HEX = '894B645E89E1535BBDAD5B8B290650530801B18EBFBF5E8FAB3C82872A3E9BB7'
const G_HEX = '07'

export const N = BigInt('0x' + N_HEX)
export const g = BigInt('0x' + G_HEX)

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function reverseBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(bytes.slice().reverse())
}

async function sha1(data: Uint8Array): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest('SHA-1', data)
  return new Uint8Array(buf)
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const c = new Uint8Array(a.length + b.length)
  c.set(a, 0)
  c.set(b, a.length)
  return c
}

function stringToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

/**
 * Generate a random 32-byte salt as a hex string.
 */
export function generateSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return bytesToHex(bytes)
}

/**
 * Compute the SRP6 verifier for CMaNGOS realmd.account.
 *
 * CMaNGOS quirks (observed in core source):
 * - username is uppercased
 * - salt bytes are reversed before use in the hash
 * - the resulting verifier bytes are reversed (little-endian) for DB storage
 *
 * Returns the verifier as a 64-char hex string (little-endian in DB terms).
 */
export async function generateVerifier(
  username: string,
  password: string,
  saltHex: string
): Promise<string> {
  const userUpper = username.toUpperCase()
  const passUpper = password.toUpperCase()

  const salt = hexToBytes(saltHex)
  const saltReversed = reverseBytes(salt)

  const h1 = await sha1(stringToBytes(userUpper + ':' + passUpper))
  const x = await sha1(concatBytes(saltReversed, h1))

  const xInt = BigInt('0x' + bytesToHex(x))
  const vInt = modPow(g, xInt, N)

  const vBytes = hexToBytes(vInt.toString(16).padStart(64, '0'))
  const vReversed = reverseBytes(vBytes)

  return bytesToHex(vReversed)
}

/**
 * Modular exponentiation: (base^exp) mod mod
 */
function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n
  let b = base % mod
  let e = exp
  while (e > 0n) {
    if (e & 1n) {
      result = (result * b) % mod
    }
    b = (b * b) % mod
    e = e >> 1n
  }
  return result
}
