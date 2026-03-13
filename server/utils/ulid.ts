const CROCKFORD_CHARS = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

export function generateUlid(): string {
  const timestamp = Date.now()
  let timestampStr = ''
  let remaining = timestamp
  for (let index = 9; index >= 0; index--) {
    timestampStr = CROCKFORD_CHARS[remaining % 32] + timestampStr
    remaining = Math.floor(remaining / 32)
  }

  const randomBytes = new Uint8Array(16)
  crypto.getRandomValues(randomBytes)
  let randomStr = ''
  for (const byte of randomBytes) {
    randomStr += CROCKFORD_CHARS[byte % 32]
  }

  return timestampStr + randomStr
}
