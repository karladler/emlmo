import { describe, it, expect } from 'vitest'
import { addressparser, Tokenizer } from '../../src/lib/addressparser'

describe('addressparser advanced', () => {
  it('parses address with comment fallback to display name', () => {
    const res = addressparser('"Display" (Remark) <user@example.com>')
    expect(res[0].address).toBe('user@example.com')
    expect(res[0].name).toMatch(/Display/)
  })

  it('derives address from bare text when no angle brackets', () => {
    const res = addressparser('Some Person person@example.com Extra')
    expect(res[0].address).toBe('person@example.com')
    expect(res[0].name).toMatch(/Some Person/)
  })

  it('handles multiple possible addresses keeping only first as address', () => {
    const res = addressparser('Alpha beta@example.com gamma@example.com')
    expect(res[0].address).toBe('beta@example.com')
    expect(res.length).toBe(1)
  })

  it('parses group with members and following standalone', () => {
    const str = 'Group: Alice <alice@ex.com>, Bob <bob@ex.com>; Charlie <charlie@ex.com>'
    const res = addressparser(str)
    expect(res.length).toBe(2)
    const group = res[0] as any
    expect(group.name).toBe('Group')
    expect(Array.isArray(group.group)).toBe(true)
    expect(group.group).toHaveLength(2)
    expect(group.group[0].address).toBe('alice@ex.com')
    expect(res[1].address).toBe('charlie@ex.com')
  })

  it('flattens nested group when flatten option used', () => {
    const str = 'Friends: One <one@ex.com>, Two <two@ex.com>; Three <three@ex.com>'
    const flat = addressparser(str, { flatten: true })
    expect(flat.map(a => a.address)).toEqual(expect.arrayContaining(['one@ex.com', 'two@ex.com', 'three@ex.com']))
  })

  it('treats semicolon as delimiter outside group', () => {
    const res = addressparser('One <one@a.com>; Two <two@a.com>')
    expect(res.length).toBe(2)
  })

  it('handles quoted name with comma', () => {
    const res = addressparser('"Last, First" <lf@example.com>')
    expect(res[0].address).toBe('lf@example.com')
    expect(res[0].name).toBe('Last, First')
  })

  it('escapes backslash inside quoted name', () => {
    const res = addressparser('"Escaped \\\\" Quote" <esc@example.com>')
    expect(res[0].address).toMatch(/esc@example.com/)
  })

  it('unquoted name containing stray < before address', () => {
    const res = addressparser('Broken < Name <broken@example.com>')
    expect(res[0].address).toBe('broken@example.com')
  })
})

describe('addressparser edge inputs', () => {
  it('returns empty array for empty string', () => {
    expect(addressparser('')).toEqual([])
  })

  it('coerces non-string to string', () => {
    expect(addressparser(null as any)).toEqual([])
    expect(addressparser(undefined as any)).toEqual([])
  })

  it('returns empty array for only commas/semicolons and spaces', () => {
    expect(addressparser('  ,  ;  ,  ')).toEqual([])
  })

  it('handles single comma-delimited addresses', () => {
    const res = addressparser('a@x.com, b@y.com')
    expect(res).toHaveLength(2)
    expect(res[0].address).toBe('a@x.com')
    expect(res[1].address).toBe('b@y.com')
  })
})

describe('addressparser name vs address normalization', () => {
  it('pure email only: sets name to empty', () => {
    const res = addressparser('foo@bar.com')
    expect(res[0].address).toBe('foo@bar.com')
    expect(res[0].name).toBe('')
  })

  it('pure text without @: sets address to empty', () => {
    const res = addressparser('Just a Name')
    expect(res[0].address).toBe('')
    expect(res[0].name).toBe('Just a Name')
  })

  it('angle-bracket form: name and address distinct', () => {
    const res = addressparser('Display Name <disp@example.com>')
    expect(res[0].address).toBe('disp@example.com')
    expect(res[0].name).toBe('Display Name')
  })
})

describe('addressparser comments', () => {
  it('comment only as display name when no text', () => {
    const res = addressparser('(Comment Only) <user@example.com>')
    expect(res[0].address).toBe('user@example.com')
    expect(res[0].name).toBe('Comment Only')
  })

  it('text preferred over comment when both present', () => {
    const res = addressparser('Real Name (comment) <u@e.com>')
    expect(res[0].name).toMatch(/Real Name/)
    expect(res[0].address).toBe('u@e.com')
  })
})

describe('addressparser email extraction from text', () => {
  it('extracts email from end of text', () => {
    const res = addressparser('Person person@example.com')
    expect(res[0].address).toBe('person@example.com')
    expect(res[0].name).toBe('Person')
  })

  it('extracts email from middle via regex when no exact match', () => {
    const res = addressparser('Prefix person@example.com Suffix')
    expect(res[0].address).toBe('person@example.com')
    expect(res[0].name).toMatch(/Prefix/)
    expect(res[0].name).toMatch(/Suffix/)
  })

  it('handles email with multiple @ by taking first match', () => {
    const res = addressparser('Local@part@domain.com')
    expect(res[0].address).toBeDefined()
    expect(res[0].address).toMatch(/@/)
  })
})

describe('addressparser groups', () => {
  it('group with single member', () => {
    const res = addressparser('Solo: One <one@ex.com>;')
    expect(res).toHaveLength(1)
    const g = res[0] as any
    expect(g.name).toBe('Solo')
    expect(g.group).toHaveLength(1)
    expect(g.group[0].address).toBe('one@ex.com')
  })

  it('empty group list', () => {
    const res = addressparser('Empty: ;')
    expect(res).toHaveLength(1)
    const g = res[0] as any
    expect(g.name).toBe('Empty')
    expect(g.group).toEqual([])
  })

  it('flatten with no groups returns same addresses', () => {
    const str = 'A <a@x.com>, B <b@x.com>'
    const flat = addressparser(str, { flatten: true })
    expect(flat).toHaveLength(2)
    expect(flat[0].address).toBe('a@x.com')
    expect(flat[1].address).toBe('b@x.com')
  })
})

describe('addressparser newlines and whitespace', () => {
  it('newline in display name becomes space', () => {
    const res = addressparser('Line1\nLine2 <u@e.com>')
    expect(res[0].address).toBe('u@e.com')
    expect(res[0].name).toMatch(/\s/)
    expect(res[0].name).toMatch(/Line1/)
    expect(res[0].name).toMatch(/Line2/)
  })

  it('tab in input is preserved in text', () => {
    const res = addressparser('Tab\tHere <u@e.com>')
    expect(res[0].address).toBe('u@e.com')
    expect(res[0].name).toContain('Tab')
    expect(res[0].name).toContain('Here')
  })
})

describe('Tokenizer', () => {
  it('tokenizes quoted string and operators', () => {
    const t = new Tokenizer('"a" <b@c>')
    const tokens = t.tokenize()
    const types = tokens.map(x => ({ type: x.type, value: x.value }))
    expect(types).toContainEqual({ type: 'operator', value: '"' })
    expect(types).toContainEqual({ type: 'text', value: 'a' })
    expect(types).toContainEqual({ type: 'operator', value: '<' })
    expect(types).toContainEqual({ type: 'text', value: 'b@c' })
    expect(types).toContainEqual({ type: 'operator', value: '>' })
  })

  it('treats comma and semicolon as delimiters', () => {
    const t = new Tokenizer('a, b; c')
    const tokens = t.tokenize()
    expect(tokens.filter(x => x.type === 'operator').map(x => x.value)).toEqual(
      expect.arrayContaining([',', ';']),
    )
  })

  it('empty string yields no tokens', () => {
    const t = new Tokenizer('')
    expect(t.tokenize()).toEqual([])
  })

  it('trims token values', () => {
    const t = new Tokenizer('  x  <  y@z  >  ')
    const tokens = t.tokenize()
    const textTokens = tokens.filter(x => x.type === 'text')
    expect(textTokens.every(x => x.value === x.value.trim())).toBe(true)
  })
})

describe('addressparser control characters', () => {
  it('skips control bytes below 0x21 (except space and tab)', () => {
    const ctrl1 = String.fromCharCode(1)
    const ctrl2 = String.fromCharCode(2)
    const res = addressparser(`Name ${ctrl1}${ctrl2} <user@example.com>`)
    expect(res[0].address).toBe('user@example.com')
    expect(res[0].name).not.toContain(ctrl1)
    expect(res[0].name).not.toContain(ctrl2)
  })
})

describe('comment fallback to text when no text exists', () => {
  it('should use comment as text when no text but comment exists in group', () => {
    const result = addressparser('Group: (comment only);')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Group')
    expect((result[0] as any).group).toBeDefined()
    expect(Array.isArray((result[0] as any).group)).toBe(true)
  })

  it('should use comment as text when no text but comment exists in regular address', () => {
    const result = addressparser('(Only Comment) <email@test.com>')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Only Comment')
    expect(result[0].address).toBe('email@test.com')
  })
})

describe('multiple address handling', () => {
  it('should keep only first address and move others to text when multiple addresses found', () => {
    const input = 'John Doe first@test.com second@test.com third@test.com'
    const result = addressparser(input)
    expect(result).toHaveLength(1)
    expect(result[0].address).toBe('first@test.com')
    expect(result[0].name).toContain('second@test.com')
    expect(result[0].name).toContain('third@test.com')
  })
})

describe('group with no address handling', () => {
  it('should return empty array when group has no address', () => {
    const result = addressparser('EmptyGroup: ;')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('EmptyGroup')
    expect((result[0] as any).group).toEqual([])
  })
})

describe('address and name deduplication', () => {
  it('should clear name when address equals name and contains @', () => {
    const result = addressparser('test@example.com test@example.com')
    expect(result).toHaveLength(1)
    expect(result[0].address).toBe('test@example.com')
    expect(result[0].name).toBe('')
  })

  it('should clear address when name equals address and contains no @', () => {
    const result = addressparser('plaintext')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('plaintext')
    expect(result[0].address).toBe('')
  })
})

describe('email detection from text fallback', () => {
  it('should extract email from text when no explicit address found', () => {
    const result = addressparser('Contact person valid@email.com for info')
    expect(result).toHaveLength(1)
    expect(result[0].address).toBe('valid@email.com')
    expect(result[0].name).toBe('Contact person for info')
  })

  it('should handle regex replacement when no address initially found', () => {
    const input = 'Some text with email@domain.com embedded'
    const result = addressparser(input)
    expect(result).toHaveLength(1)
    expect(result[0].address).toBe('email@domain.com')
  })
})
