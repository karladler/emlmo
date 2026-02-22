import { describe, it, expect } from 'vitest';
import { parseEml } from '../../src/index';

function crlf(lines: string[]) { return `${lines.join('\r\n')  }\r\n`; }

describe('parseRecursive edge/error branches', () => {
  it('handles message with missing Content-Type (warn path)', () => {
    const eml = crlf([
      'Subject: NoCT',
      '',
      'Hello',
    ]);
    const parsed: any = parseEml(eml);
    expect(parsed.headers.Subject).toBe('NoCT');
    expect(parsed.headers['Content-Type']).toBeUndefined();
    expect(parsed.body).toBe('Hello\r\n');
  });

  it('detects Content-Type line appearing after initial blank line', () => {
    const eml = crlf([
      'Subject: CTLater',
      '',
      'Content-Type: text/plain; charset="utf-8"',
      '',
      'Late body',
    ]);
    const parsed: any = parseEml(eml);
    expect(parsed.headers.Subject).toBe('CTLater');
    expect(parsed.headers['Content-Type']).toMatch(/text\/plain/);
    expect(parsed.body).toBe('Late body\r\n');
  });

  it('handles multipart without boundary attribute (no array body)', () => {
    const eml = crlf([
      'Subject: MPNoBoundary',
      'Content-Type: multipart/mixed',
      '',
      'Part 1 line',
    ]);
    const parsed: any = parseEml(eml);
    expect(parsed.headers['Content-Type']).toBe('multipart/mixed');
    expect(parsed.body).toBe('Part 1 line\r\n');
  });

  it('finalizes last boundary when closing marker missing', () => {
    const eml = crlf([
      'Subject: Incomplete',
      'Content-Type: multipart/mixed; boundary="BINC"',
      '',
      '--BINC',
      'Content-Type: text/plain',
      '',
      'Hello part',
    ]);
    const parsed: any = parseEml(eml);
    expect(Array.isArray(parsed.body)).toBe(true);
    const first = parsed.body[0];
    expect(first.boundary).toBe('BINC');
    expect(first.part.body).toBe('Hello part\r\n');
  });

  it('collects duplicate headers into array', () => {
    const eml = crlf([
      'Subject: Duplicate',
      'X-Test: one',
      'X-Test: two',
      'Content-Type: text/plain',
      '',
      'Body',
    ]);
    const parsed: any = parseEml(eml);
    expect(parsed.headers.Subject).toBe('Duplicate');
    expect(parsed.headers['X-Test']).toBeInstanceOf(Array);
    expect(parsed.headers['X-Test']).toHaveLength(2);
    expect(parsed.headers['X-Test'][0]).toBe('one');
    expect(parsed.headers['X-Test'][1]).toBe('two');
  });
});
