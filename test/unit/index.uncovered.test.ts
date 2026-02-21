import { describe, it, expect } from 'vitest';
import { readEml, parseEml, buildEml } from '../../src/index';

function crlf(lines: string[]) { return lines.join('\r\n') + '\r\n'; }

describe('index.ts uncovered code paths', () => {
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
        'Test message'
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
        'Test message'
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
        '--test-boundary--'
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
        '--outer--'
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
        '--test--'
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
        '--test--'
      ]);

      const result: any = readEml(eml);
      expect(result).toBeDefined();
    });
  });

  describe('buildEml error handling', () => {
    it('should handle data without headers gracefully', () => {
      const invalidData = {
        subject: 'Test',
        from: 'test@example.com'
      };

      const result = buildEml(invalidData as any);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain('headers');
    });

    it('should handle string input for build function', () => {
      const emlString = crlf([
        'Subject: Test',
        'From: test@example.com',
        'Content-Type: text/plain',
        '',
        'Test content'
      ]);

      const result = buildEml(emlString);
      expect(result).toBeDefined();
    });
  });
});
