/* RFC 2047 MIME encoded-word decoder
 * Replaces emailjs-mime-codec with a simpler implementation
 */

export function mimeWordsDecode(input: string): string {
  if (!input || !input.includes('=?')) return input

  const encodedWord = /=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g
  let cleaned = ''
  let lastEnd = 0
  let match: RegExpExecArray | null

  while ((match = encodedWord.exec(input))) {
    const before = input.slice(lastEnd, match.index)
    cleaned += before.replace(/\s+/g, '')
    cleaned += match[0]
    lastEnd = match.index + match[0].length
  }
  cleaned += input.slice(lastEnd)

  const decodeWord = /=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g
  let result = ''
  let resultLastIndex = 0

  while ((match = decodeWord.exec(cleaned))) {
    const [full, charset, encoding, text] = match

    if (!encoding || !charset || !text) {
      throw new Error('Invalid encoding')
    }

    result += cleaned.slice(resultLastIndex, match.index)

    const decoded
      = encoding.toUpperCase() === 'B'
        ? decodeBase64(text, charset)
        : decodeQ(text, charset)

    result += decoded
    resultLastIndex = match.index + full.length
  }

  result += cleaned.slice(resultLastIndex)

  return result
}

function decodeBase64(str: string, charset: string): string {
  const bin = atob(str)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)

  return decodeBytes(bytes, charset)
}

function decodeQ(str: string, charset: string): string {
  str = str.replace(/_/g, ' ')
  const bytes: number[] = []

  for (let i = 0; i < str.length; i++) {
    if (str[i] === '=' && isHex(str[i + 1]) && isHex(str[i + 2])) {
      bytes.push(parseInt(str.substr(i + 1, 2), 16))
      i += 2
    }
    else {
      bytes.push(str.charCodeAt(i))
    }
  }

  return decodeBytes(new Uint8Array(bytes), charset)
}

function decodeBytes(bytes: Uint8Array, charset: string): string {
  charset = normalizeCharset(charset)

  if (charset === 'windows-1252') {
    return decodeWin1252(bytes)
  }

  if (typeof TextDecoder !== 'undefined') {
    try {
      return new TextDecoder(charset).decode(bytes)
    }
    catch {
      console.error('Error decoding bytes', { bytes, charset })
    }
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString(nodeCharset(charset))
  }

  return decodeWin1252(bytes)
}

function normalizeCharset(cs: string): string {
  cs = cs.toLowerCase()

  if (cs === 'iso-8859-1' || cs === 'latin1') return 'windows-1252'

  if (cs === 'shift_jis' || cs === 'sjis') return 'shift-jis'

  return cs
}

function nodeCharset(cs: string): BufferEncoding {
  if (cs === 'windows-1252') return 'latin1'

  if (cs === 'shift-jis') return 'shift_jis' as unknown as BufferEncoding

  return cs as BufferEncoding
}

function decodeWin1252(bytes: Uint8Array): string {
  return new TextDecoder('windows-1252').decode(bytes)
}

function isHex(c?: string) {
  return !!c && /^[0-9A-Fa-f]$/.test(c)
}
