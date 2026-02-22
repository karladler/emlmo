import { describe, it, expect } from 'vitest'
import { parseEml } from '../../src/index'

function crlf(lines: string[]) { return `${lines.join('\r\n')  }\r\n` }

describe('parseRecursive body parsing', () => {
  it('parses single-part text/plain body as string', () => {
    const eml = crlf([
      'Subject: Single',
      'Content-Type: text/plain; charset="utf-8"',
      '',
      'Hello body line',
    ])
    const parsed: any = parseEml(eml)
    expect(parsed.body).toBe('Hello body line\r\n')
  })

  it('parses multipart mixed into body array with two parts', () => {
    const b = 'BASIC'
    const eml = crlf([
      'Subject: Multi',
      `Content-Type: multipart/mixed; boundary="${b}"`,
      '',
      `--${b}`,
      'Content-Type: text/plain',
      '',
      'PartOne',
      `--${b}`,
      'Content-Type: text/html',
      '',
      '<p>PartTwo</p>',
      `--${b}--`,
      '',
    ])
    const parsed: any = parseEml(eml)
    expect(Array.isArray(parsed.body)).toBe(true)
    expect(parsed.body).toHaveLength(2)
    const [p1, p2] = parsed.body
    expect(p1.part.headers['Content-Type']).toMatch(/text\/plain/)
    expect(p1.part.body).toBe('PartOne')
    expect(p2.part.headers['Content-Type']).toMatch(/text\/html/)
    expect(p2.part.body).toBe('<p>PartTwo</p>\r\n\r\n')
  })

  it('accepts boundary line not preceded by blank line (edge case)', () => {
    const b = 'EDGE'
    const eml = crlf([
      'Subject: EdgeBoundary',
      `Content-Type: multipart/mixed; boundary="${b}"`,
      '',
      `--${  b}`,
      'Content-Type: text/plain',
      '',
      'EdgePart',
      `--${  b  }--`,
      '',
    ])
    const parsed: any = parseEml(eml)
    expect(parsed.body[0].part.body).toBe('EdgePart\r\n\r\n')
  })

  it('parses nested multipart (mixed -> alternative)', () => {
    const outer = 'OUTER1'
    const inner = 'INNER1'
    const eml = crlf([
      'Subject: Nested',
      `Content-Type: multipart/mixed; boundary="${outer}"`,
      '',
      `--${outer}`,
      `Content-Type: multipart/alternative; boundary="${inner}"`,
      '',
      `--${inner}`,
      'Content-Type: text/plain',
      '',
      'AltPlain',
      `--${inner}`,
      'Content-Type: text/html',
      '',
      '<b>AltHtml</b>',
      `--${inner}--`,
      `--${outer}--`,
      '',
    ])
    const parsed: any = parseEml(eml)
    const innerBoundary = parsed.body[0].part.body
    expect(Array.isArray(innerBoundary)).toBe(true)
    expect(innerBoundary[0].part.body).toBe('AltPlain')
    expect(innerBoundary[1].part.body).toBe('<b>AltHtml</b>\r\n\r\n')
  })

  it('handles content-type appearing after initial body blank line (ctInBody)', () => {
    const eml = crlf([
      'Subject: CTInBody',
      '',
      'Content-Type: text/plain; charset="utf-8"',
      '',
      'LateDefined',
    ])
    const parsed: any = parseEml(eml)
    expect(parsed.headers['Content-Type']).toMatch(/text\/plain/)
    expect(parsed.body).toBe('LateDefined\r\n')
  })

  it('treats multipart without boundary parameter as single string body', () => {
    const eml = crlf([
      'Subject: NoBoundaryAttr',
      'Content-Type: multipart/mixed',
      '',
      'Just text not really multipart',
    ])
    const parsed: any = parseEml(eml)
    expect(parsed.body).toBe('Just text not really multipart\r\n')
  })

  it('completes last boundary when closing marker is missing', () => {
    const b = 'UNFIN'
    const eml = crlf([
      'Subject: Unfinished',
      `Content-Type: multipart/mixed; boundary="${b}"`,
      '',
      `--${b}`,
      'Content-Type: text/plain',
      '',
      'Halfway',
    ])
    const parsed: any = parseEml(eml)
    expect(parsed.body[0].boundary).toBe(b)
    expect(parsed.body[0].part.body).toBe('Halfway\r\n')
  })

  it('aggregates duplicate headers into array', () => {
    const eml = crlf([
      'Subject: MultiHead',
      'Received: one',
      'Received: two',
      'Content-Type: text/plain',
      '',
      'Line',
    ])
    const parsed: any = parseEml(eml)
    expect(Array.isArray(parsed.headers.Received)).toBe(true)
    expect(parsed.headers.Received).toHaveLength(2)
  })

  it('parses folded long header value before body', () => {
    const eml = crlf([
      'Subject: Folded',
      'Content-Type: text/plain; charset="utf-8"',
      'X-Long: first part',
      '  second part',
      '  third part',
      '',
      'FoldedBody',
    ])
    const parsed: any = parseEml(eml)
    expect(parsed.headers['X-Long']).toBe('first part\r\nsecond part\r\nthird part')
    expect(parsed.body).toBe('FoldedBody\r\n')
  })
})
