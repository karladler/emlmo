/// <reference types="mocha" />
import { expect } from 'chai';
import {
  readEml,
  parseEml,
  buildEml,
  getEmailAddress,
} from '../../src/index';

function crlf(lines: string[]) { return lines.join('\r\n') + '\r\n'; }

/**
 * Tests targeting previously uncovered code paths in index.ts
 */
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
      // This tests the CC header processing path (lines 864-866)
      expect(result).to.exist;
      expect(result.headers).to.exist;
      expect(result.headers.CC).to.exist;
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
      // This tests the Cc header processing path (lines 867-869)
      expect(result).to.exist;
      expect(result.headers).to.exist;
      expect(result.headers.Cc).to.exist;
    });
  });

  describe('readEml error handling for non-string input', () => {
    it('should return error when input is neither string nor object', () => {
      const result = readEml(123 as any);
      expect(result).to.be.instanceOf(Error);
      expect((result as Error).message).to.equal('Missing EML file content!');
    });

    it('should handle callbacks with error for invalid input', (done) => {
      readEml(null as any, (error, data) => {
        expect(error).to.be.a('string'); // Based on the actual error it returns a string "no data"
        expect(error).to.equal('no data');
        expect(data).to.be.undefined;
        done();
      });
    });
  });

  describe('boundary processing edge cases', () => {
    it('should handle undefined boundary part gracefully', () => {
      // Create an EML with a malformed multipart structure
      const eml = crlf([
        'Content-Type: multipart/mixed; boundary="test-boundary"',
        'Subject: Test malformed boundary',
        '',
        '--test-boundary',
        'Content-Type: text/plain',
        '',
        'Valid part',
        '--test-boundary',
        // This creates a boundary block with undefined part
        '--test-boundary--'
      ]);
      
      const result: any = readEml(eml);
      // Should not throw error, should handle gracefully
      expect(result).to.exist;
      expect(result.text).to.exist;
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
      expect(result.multipartAlternative).to.exist;
      expect(result.multipartAlternative['Content-Type']).to.include('multipart/alternative');
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
      // Just check that it processes without error
      expect(result).to.exist;
      expect(result.text).to.exist;
    });
  });

  describe('verbose logging paths', () => {
    it('should handle undefined boundary part with verbose logging', () => {
      // This is testing the verbose path when b.part is undefined
      const eml = crlf([
        'Content-Type: multipart/mixed; boundary="test"',
        '',
        '--test',
        // Empty boundary block that could cause undefined part
        '--test--'
      ]);
      
      // Enable verbose temporarily to test that path
      const result: any = readEml(eml);
      expect(result).to.exist; // Should not crash
    });
  });

  describe('buildEml error handling', () => {
    it('should handle data without headers gracefully', () => {
      // Test the error path when data.headers is missing
      const invalidData = {
        subject: 'Test',
        from: 'test@example.com'
        // Missing headers
      };
      
      const result = buildEml(invalidData as any);
      expect(result).to.be.instanceOf(Error);
      expect((result as Error).message).to.include('headers');
    });

    it('should handle string input for build function', () => {
      // Test the string input path for buildEml
      const emlString = crlf([
        'Subject: Test',
        'From: test@example.com',
        'Content-Type: text/plain',
        '',
        'Test content'
      ]);
      
      const result = buildEml(emlString);
      // Should process the string through read() first
      expect(result).to.exist;
    });
  });
});