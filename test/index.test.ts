import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { readEml } from '../src/index';
import type { ReadedEmlJson } from '../src/interface';

function crlf(lines: string[]) { return `${lines.join('\r\n')  }\r\n`; }

function readEmlForTest(filepath: string, encoding: BufferEncoding = 'utf-8'): ReadedEmlJson {
  const src = join(__dirname, filepath);
  const eml = readFileSync(src, encoding);
  const result = readEml(eml);

  if (typeof result === 'string' || result instanceof Error) throw new Error(String(result));

  return result;
}

describe('readEml should decode', () => {
  it('to and from correctly', () => {
    const readEmlJson = readEmlForTest('./fixtures/smallEmail.eml');
    expect(readEmlJson.from).toBeDefined();
    const from = Array.isArray(readEmlJson.from) ? readEmlJson.from[0] : readEmlJson.from;
    const to = Array.isArray(readEmlJson.to) ? readEmlJson.to[0] : readEmlJson.to;
    expect(from?.name).toBe('Nobody there');
    expect(from?.email).toBe('dummyEmail@emailClient.com');
    expect(to?.name).toBe('Nobody here');
    expect(to?.email).toBe('dummyEmail2@emailClient.com');
  });

  it('to and from correctly(#40)', () => {
    const readEmlJson = readEmlForTest('./fixtures/spam.eml');
    const from = Array.isArray(readEmlJson.from) ? readEmlJson.from[0] : readEmlJson.from;
    const to = Array.isArray(readEmlJson.to) ? readEmlJson.to[0] : readEmlJson.to;
    expect(from?.name).toBe('Matilda, Klein');
    expect(from?.email).toBe('noreply@guide-des-vins-de-bourgogne.fr');
    expect(to?.name).toBe('');
    expect(to?.email).toBe('leon.struck@web.de');
  });

  it('cc recepient', () => {
    const readEmlJson = readEmlForTest('./fixtures/multipleRecipientsEmail.eml');
    expect(readEmlJson.cc).toBeDefined();
    const cc = Array.isArray(readEmlJson.cc) ? readEmlJson.cc[0] : readEmlJson.cc;
    expect(cc?.email).toBe('dummyOutlookEmail2@outlook.com');
  });

  it('multiple recipients', () => {
    const readEmlJson = readEmlForTest('./fixtures/multipleRecipientsEmail.eml');
    const to = readEmlJson.to;
    expect(Array.isArray(to)).toBe(true);
    expect(to).toHaveLength(2);
    expect(to![0].email).toBe('dummyOutlookEmail@outlook.com');
    expect(to![1].email).toBe('dummyGmailEmail@gmail.com');
  });

  it('subjects with spaces correctly', () => {
    const readEmlJson = readEmlForTest('./fixtures/smallEmail.eml');
    expect(readEmlJson.subject).toBe('Off-The-Beaten-Path Trails You\'ve Never Heard Of!  🌏');
    expect(readEmlJson.text?.trim()).toBe('A small body with _underscores.');
    expect(readEmlJson.html).toContain('A small body with _underscores');
  });

  it('headers with line breaks correctly', () => {
    const readEmlJson = readEmlForTest('./fixtures/lineBreakInHeader.eml');
    expect(readEmlJson.headers.Date).toBe('Thu, 29 Sep 2022 12:22:20 +0100');
    expect(readEmlJson.headers['Message-ID']).toBe(
      '\r\n<CAGFso0R6WbMomMx6mFFJzt_wiL8wRm3sN0YQwXz12Ugbt72XSw@mail.gmail.com>',
    );
    expect(readEmlJson.date).toEqual(new Date('Thu, 29 Sep 2022 12:22:20 +0100'));
  });

  it('attachments', () => {
    const readEmlJson = readEmlForTest('./fixtures/emailWithAttachments.eml');
    expect(readEmlJson.attachments).toHaveLength(2);
    expect(readEmlJson.attachments![0].name).toBe('Smalltextfile.txt');
    expect(readEmlJson.attachments![1].name).toBe('Smalltextfile2.txt');
  });

  it('inline attachments', () => {
    const readEmlJson = readEmlForTest('./fixtures/inlineAttachment.eml');
    expect(readEmlJson.attachments).toHaveLength(1);
    expect(readEmlJson.attachments![0].name).toBe('image.png');
  });

  it('base64 encoded text and html body', () => {
    const readEmlJson = readEmlForTest('./fixtures/unicode.eml');
    expect(readEmlJson.text).toContain('コピーボタンをクリックすると');
    expect(readEmlJson.html).toContain('コピーボタンをクリックすると');
  });

  it('has the same textual content by text and html', () => {
    const readEmlJson = readEmlForTest('./fixtures/emailWithAttachments.eml');
    expect(readEmlJson.html).toContain('Little body');
    expect(readEmlJson.text).toContain('Little body');
  });

  it('should decode email with line break in between content type and rest of headers', () => {
    const readEmlJson = readEmlForTest('./fixtures/emailWithSeperateContentType.eml');
    expect(readEmlJson.text).toContain('This is a test');
    expect(readEmlJson.html).toContain('This is a test');
  });

  it('should decode mhtml with separator that is surrounded by "--"', () => {
    const readEmlJson = readEmlForTest('./fixtures/savedWebpage.mhtml');
    expect(readEmlJson.text).toBeUndefined();
    expect(readEmlJson.html).toContain(
      'The URI of an MHTML aggregate is not the same as the URI of its root',
    );
  });
});

describe('readEml CC header variations', () => {
  it('should process CC header (capital letters) when present', () => {
    const eml = crlf([
      'From: sender@example.com',
      'To: recipient@example.com',
      'CC: cc1@example.com, cc2@example.com',
      'Subject: Test CC',
      'Message-ID: <test@example.com>',
      'Date: Fri, 21 Feb 2025 10:00:00 +0000',
      'Content-Type: text/plain',
      '',
      'Test message',
    ]);

    const result: any = readEml(eml);
    expect(result).toBeDefined();
    expect(result.headers).toBeDefined();
    expect(result.headers.CC).toBeDefined();
  });

  it('should process Cc header (mixed case) when present', () => {
    const eml = crlf([
      'From: sender@example.com',
      'To: recipient@example.com',
      'Cc: cc_mixed@example.com',
      'Subject: Test Cc mixed case',
      'Message-ID: <test@example.com>',
      'Date: Fri, 21 Feb 2025 10:00:00 +0000',
      'Content-Type: text/plain',
      '',
      'Test message',
    ]);

    const result: any = readEml(eml);
    expect(result).toBeDefined();
    expect(result.headers).toBeDefined();
    expect(result.headers.Cc).toBeDefined();
  });
});

describe('readEml error handling for non-string input', () => {
  it('should return error when input is neither string nor object', () => {
    const result = readEml(123 as any);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('Missing EML file content!');
  });

  it('should handle callbacks with error for invalid input', () => {
    return new Promise<void>((resolve, reject) => {
      readEml(null as any, (error, data) => {
        try {
          expect(typeof error).toBe('string');
          expect(error).toBe('no data');
          expect(data).toBeUndefined();
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  });
});

describe('boundary processing edge cases', () => {
  it('should handle undefined boundary part gracefully', () => {
    const eml = crlf([
      'Content-Type: multipart/mixed; boundary="test-boundary"',
      'Subject: Test malformed boundary',
      '',
      '--test-boundary',
      'Content-Type: text/plain',
      '',
      'Valid part',
      '--test-boundary',
      '--test-boundary--',
    ]);

    const result: any = readEml(eml);
    expect(result).toBeDefined();
    expect(result.text).toBeDefined();
  });

  it('should handle multipart alternative detection and storage', () => {
    const eml = crlf([
      'Content-Type: multipart/mixed; boundary="outer"',
      'Subject: Test nested multipart',
      '',
      '--outer',
      'Content-Type: multipart/alternative; boundary="inner"',
      '',
      '--inner',
      'Content-Type: text/plain',
      '',
      'Plain text version',
      '--inner',
      'Content-Type: text/html',
      '',
      '<p>HTML version</p>',
      '--inner--',
      '--outer--',
    ]);

    const result: any = readEml(eml);
    expect(result.multipartAlternative).toBeDefined();
    expect(result.multipartAlternative['Content-Type']).toContain('multipart/alternative');
  });

  it('should handle string boundary blocks in nested multipart', () => {
    const eml = crlf([
      'Content-Type: multipart/mixed; boundary="test"',
      '',
      '--test',
      'Content-Type: multipart/alternative; boundary="alt"',
      '',
      '--alt',
      'Content-Type: text/plain',
      '',
      'String content in nested structure',
      '--alt--',
      '--test--',
    ]);

    const result: any = readEml(eml);
    expect(result).toBeDefined();
    expect(result.text).toBeDefined();
  });
});

describe('verbose logging paths', () => {
  it('should handle undefined boundary part with verbose logging', () => {
    const eml = crlf([
      'Content-Type: multipart/mixed; boundary="test"',
      '',
      '--test',
      '--test--',
    ]);

    const result: any = readEml(eml);
    expect(result).toBeDefined();
  });
});

