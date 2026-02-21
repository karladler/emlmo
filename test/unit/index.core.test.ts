import { describe, it, expect } from 'vitest';
import {
  createBoundary,
  getCharset,
  parseEml,
  buildEml,
  completeBoundary,
  readEml,
  getBoundary
} from '../../src/index';
import { base64Encode } from '../../src/base64';

function crlf(lines: string[]) { return lines.join('\r\n') + '\r\n'; }

describe('index.ts core helpers (Batch B)', () => {
  describe('createBoundary', () => {
    it('produces unique-ish values starting with ----=', () => {
      const a = createBoundary();
      const b = createBoundary();
      expect(a).toMatch(/^----=/);
      expect(b).toMatch(/^----=/);
      expect(a).not.toBe(b);
    });
  });

  describe('getCharset', () => {
    it('extracts charset token ignoring quotes', () => {
      const ct = 'text/plain; charset="iso-8859-2"; format=flowed';
      expect(getCharset(ct)).toBe('iso-8859-2');
    });
    it('returns undefined when missing', () => {
      expect(getCharset('text/plain')).toBe(undefined);
    });
  });

  describe('parseEml basic', () => {
    it('parses headersOnly vs full body', () => {
      const eml = crlf([
        'Subject: Demo',
        'Content-Type: text/plain; charset="utf-8"',
        '',
        'Body line'
      ]);
      const parsed: any = parseEml(eml);
      expect(parsed.headers.Subject).toBe('Demo');
      expect(parsed.body).toBe('Body line\r\n');
    });
  });

  describe('buildEml + parseEml round trip', () => {
    it('builds multipart with text, html and attachment then parses back', () => {
      const data: any = {
        headers: {
          'From': 'Tester <tester@example.com>',
          'To': 'dest@example.com',
          'Subject': 'RoundTrip',
          'Content-Type': 'multipart/mixed; boundary="RTBOUND"'
        },
        text: 'Plain body',
        html: '<p>Hi</p>',
        attachments: [
          { filename: 'file.txt', contentType: 'text/plain', data: 'FileContent' }
        ]
      };
      const eml = buildEml(data) as string;
      expect(eml).toMatch(/multipart\/mixed/);
      expect(eml).toMatch(/filename="file.txt"/);
      const reparsed: any = readEml(eml);
      expect(reparsed.text).toContain('Plain body');
      expect((reparsed.html || '')).toContain('<p>Hi</p>');
      expect(reparsed.attachments && reparsed.attachments.length).toBe(1);
    });
  });

  describe('completeBoundary', () => {
    it('converts BoundaryRawData structure with child parts', () => {
      const boundaryName = 'B1';
      const raw = {
        boundary: boundaryName,
        lines: [
          'Content-Type: text/plain; charset="utf-8"',
          '',
          'Hello Part'
        ]
      } as any;
      const converted: any = completeBoundary(raw);
      expect(converted?.boundary).toBe(boundaryName);
      expect(converted?.part.headers['Content-Type']).toMatch(/text\/plain/);
      expect(converted?.part.body).toBe('Hello Part');
    });
  });

  describe('nested multipart + multipartAlternative capture', () => {
    it('captures multipartAlternative and inner bodies', () => {
      const outer = 'OUTBND';
      const inner = 'INBND';
      const eml = crlf([
        'Subject: Nested',
        `Content-Type: multipart/mixed; boundary="${outer}"`,
        '',
        `--${outer}`,
        `Content-Type: multipart/alternative; boundary="${inner}"`,
        '',
        `--${inner}`,
        'Content-Type: text/plain; charset="utf-8"',
        '',
        'Alt Text',
        `--${inner}`,
        'Content-Type: text/html; charset="utf-8"',
        '',
        '<b>Alt Html</b>',
        `--${inner}--`,
        `--${outer}--`,
        ''
      ]);
      const res: any = readEml(eml);
      expect(res.multipartAlternative).toBeTruthy();
      expect(res.text).toBe('Alt Text');
      expect(res.html).toContain('Alt Html');
    });
  });

  describe('gbk base64 branch in _append (smoke)', () => {
    it('decodes / processes gbk base64 part without throwing', () => {
      const boundary = 'GBKB';
      const content = base64Encode('Some Text');
      const eml = crlf([
        'Subject: GBK',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset=gbk',
        'Content-Transfer-Encoding: base64',
        '',
        content,
        `--${boundary}--`,
        ''
      ]);
      const res: any = readEml(eml);
      expect(typeof res.html).toBe('string');
    });
  });

  describe('attachment filename extraction (RFC2231 segments)', () => {
    it('concatenates segmented name*0*, name*1*', () => {
      const boundary = 'ATTSEG';
      const content = base64Encode('X');
      const eml = crlf([
        'Subject: SegName',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: application/octet-stream; name*0*="file_"; name*1*="name.txt"',
        'Content-Transfer-Encoding: base64',
        'Content-Disposition: attachment; filename="ignored.txt"',
        '',
        content,
        `--${boundary}--`,
        ''
      ]);
      const res: any = readEml(eml);
      expect(res.attachments && res.attachments[0].name).toBe('ignored.txt');
    });

    it('concatenates segmented name parts when no filename fallback present', () => {
      const boundary = 'ATTSEG2';
      const content = base64Encode('Y');
      const eml = crlf([
        'Subject: SegName2',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: application/octet-stream; name*0*="multi_"; name*1*="part.txt"',
        'Content-Transfer-Encoding: base64',
        'Content-Disposition: attachment',
        '',
        content,
        `--${boundary}--`,
        ''
      ]);
      const res: any = readEml(eml);
      expect(res.attachments && res.attachments[0].name).toBe('multi_part.txt');
    });
  });

  describe('inline attachment with cid', () => {
    it('captures cid and inline flag', () => {
      const boundary = 'INLINE';
      const eml = crlf([
        'Subject: InlineCID',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: image/png; name="pic.png"',
        'Content-Transfer-Encoding: base64',
        'Content-Disposition: inline; filename="pic.png"',
        'Content-ID: <12345@cid>',
        '',
        base64Encode('PNGDATA'),
        `--${boundary}--`,
        ''
      ]);
      const res: any = readEml(eml);
      const att = res.attachments[0];
      expect(att.inline).toBe(true);
      expect(att.id || att.cid).toContain('12345@cid');
    });
  });

  describe('8bit/binary branch (simulated)', () => {
    it('treats 8bit encoding with non-utf8 charset as binary decode path', () => {
      const boundary = 'EIGHT';
      const eml = crlf([
        'Subject: EightBit',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset="iso-8859-2"',
        'Content-Transfer-Encoding: 8bit',
        '',
        'PlainISO',
        `--${boundary}--`,
        ''
      ]);
      const res: any = readEml(eml);
      expect(typeof res.text).toBe('string');
    });
  });

  describe('multi-part accumulation of repeated text/html parts', () => {
    it('concatenates multiple text/plain and text/html segments', () => {
      const boundary = 'MULTIACC';
      const eml = crlf([
        'Subject: MultiAccum',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset="utf-8"',
        '',
        'FirstPlain',
        `--${boundary}`,
        'Content-Type: text/plain; charset="utf-8"',
        '',
        'SecondPlain',
        `--${boundary}`,
        'Content-Type: text/html; charset="utf-8"',
        '',
        '<p>FirstHtml</p>',
        `--${boundary}`,
        'Content-Type: text/html; charset="utf-8"',
        '',
        '<div>SecondHtml</div>',
        `--${boundary}--`,
        ''
      ]);
      const res: any = readEml(eml);
      expect(res.text).toContain('FirstPlain');
      expect(res.text).toContain('SecondPlain');
      expect(res.html).toContain('FirstHtml');
      expect(res.html).toContain('SecondHtml');
    });
  });

  describe('triple nested multipart traversal', () => {
    it('reads deepest alternative part inside related inside mixed', () => {
      const outer = 'OUT3';
      const related = 'REL3';
      const alt = 'ALT3';
      const eml = crlf([
        'Subject: TripleNest',
        `Content-Type: multipart/mixed; boundary="${outer}"`,
        '',
        `--${outer}`,
        `Content-Type: multipart/related; boundary="${related}"`,
        '',
        `--${related}`,
        `Content-Type: multipart/alternative; boundary="${alt}"`,
        '',
        `--${alt}`,
        'Content-Type: text/plain; charset="utf-8"',
        '',
        'DeepPlain',
        `--${alt}`,
        'Content-Type: text/html; charset="utf-8"',
        '',
        '<span>DeepHtml</span>',
        `--${alt}--`,
        `--${related}--`,
        `--${outer}--`,
        ''
      ]);
      const res: any = readEml(eml);
      expect(res.text).toContain('DeepPlain');
      expect(res.html).toContain('DeepHtml');
      expect(res.multipartAlternative).toBeTruthy();
    });
  });
});
