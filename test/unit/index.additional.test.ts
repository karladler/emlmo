import { describe, it, expect } from 'vitest';
import { readEml, parseEml } from '../../src/index';
import { base64Encode } from '../../src/lib/base64';
import { GB2312UTF8 } from '../../src/utils';

function crlf(lines: string[]) { return `${lines.join('\r\n')  }\r\n`; }

describe('index.ts additional coverage', () => {
  describe('_append html base64 heuristic', () => {
    it('decodes pure base64 html when no encoding header present', () => {
      const boundary = 'BHTML';
      const pure = base64Encode('<h1>Hello</h1>');
      const eml = crlf([
        'Subject: HtmlHeuristic',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset="utf-8"',
        '',
        pure,
        `--${boundary}--`,
        '',
      ]);
      const res: any = readEml(eml);
      expect(res.html).toContain('<h1>Hello</h1>');
    });
  });

  describe('attachment name from Content-Type only (no filename in disposition)', () => {
    it('extracts concatenated RFC2231 segments when only in Content-Type', () => {
      const boundary = 'ONLYCT';
      const content = base64Encode('Z');
      const eml = crlf([
        'Subject: OnlyCT',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: application/octet-stream; name*0*="part"; name*1*="Only.txt"',
        'Content-Transfer-Encoding: base64',
        'Content-Disposition: attachment',
        '',
        content,
        `--${boundary}--`,
        '',
      ]);
      const res: any = readEml(eml);
      expect(res.attachments[0].name).toBe('partOnly.txt');
    });
  });

  describe('iso-8859-2 8bit decode path distinct from base case', () => {
    it('decodes 8bit text/plain with iso-8859-2 producing string', () => {
      const boundary = 'ISO8BIT';
      const body = 'PlainISO2';
      const eml = crlf([
        'Subject: ISO8',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset="iso-8859-2"',
        'Content-Transfer-Encoding: 8bit',
        '',
        body,
        `--${boundary}--`,
        '',
      ]);
      const res: any = readEml(eml);
      expect(typeof res.text).toBe('string');
    });
  });

  describe('GB2312UTF8 deeper branches', () => {
    it('Hex2Utf8 returns % sequences on 16-length hex', () => {
      const hex = '0123012301230123';
      const out = (GB2312UTF8 as any).Hex2Utf8(hex);
      expect(out).toMatch(/^%(?:[0-9A-F]{2})%/);
    });
    it('Dec2Dig produces 4-bit string', () => {
      const bits = (GB2312UTF8 as any).Dec2Dig(10);
      expect(bits).toHaveLength(4);
    });
    it('Str2Hex aggregates binary nibble string', () => {
      const strHex = (GB2312UTF8 as any).Str2Hex('0A');
      expect(strHex).toHaveLength(8);
    });
    it('GB2312ToUTF8 handles non-unicode escape segments', () => {
      const out = GB2312UTF8.GB2312ToUTF8('abc%20def');
      expect(typeof out).toBe('string');
    });
  });

  describe('parseEml error path', () => {
    it('returns error when non-string passed', () => {
      const res: any = parseEml({} as any);
      expect(res).toBeInstanceOf(Error);
      expect(res.message).toMatch(/expected to be string/i);
    });
  });
});
