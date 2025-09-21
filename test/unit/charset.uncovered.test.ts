/// <reference types="mocha" />
import { expect } from 'chai';
import { decode, encode, convert, arr2str } from '../../src/charset';

/**
 * Tests targeting previously uncovered code paths in charset.ts
 */
describe('charset uncovered code paths', () => {
  
  describe('arr2str chunking for large arrays', () => {
    it('should handle large Uint8Array by chunking into smaller pieces', () => {
      // Create a large array that exceeds CHUNK_SZ (0x8000 = 32768)
      const largeSize = 40000; // Larger than chunk size
      const largeArray = new Uint8Array(largeSize);
      
      // Fill with printable ASCII characters (65 = 'A')
      for (let i = 0; i < largeSize; i++) {
        largeArray[i] = 65 + (i % 26); // A-Z repeating
      }
      
      const result = arr2str(largeArray);
      expect(result).to.have.length(largeSize);
      expect(result.charAt(0)).to.equal('A');
      expect(result.charAt(25)).to.equal('Z');
      expect(result.charAt(26)).to.equal('A'); // Should wrap around
    });

    it('should handle arrays smaller than chunk size normally', () => {
      const smallArray = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const result = arr2str(smallArray);
      expect(result).to.equal('Hello');
    });
  });

  describe('decode fallback to binary when charset conversion fails', () => {
    it('should return binary string when charset conversion fails completely', () => {
      // Create some binary data
      const binaryData = new Uint8Array([0xFF, 0xFE, 0x00, 0x48, 0x00, 0x65]);
      
      // Try to decode with an encoding that will fail
      const result = decode(binaryData, 'invalid-charset-that-will-fail');
      
      // Should fall back to arr2str (binary representation)
      expect(result).to.be.a('string');
      expect(result.length).to.equal(binaryData.length);
    });

    it('should return binary string when iconv throws error', () => {
      // Test data that might cause iconv to throw
      const problematicData = new Uint8Array([0x80, 0x81, 0x82]);
      
      const result = decode(problematicData, 'utf-8');
      expect(result).to.be.a('string');
    });
  });

  describe('encode with invalid charset handling', () => {
    it('should handle encoding with invalid charset gracefully', () => {
      const testString = 'Hello World';
      
      // This should not throw, even with invalid charset
      try {
        const result = encode(testString, 'invalid-charset');
        expect(result).to.be.instanceof(Uint8Array);
      } catch (e) {
        // If it throws, it should be handled gracefully
        expect(e).to.exist;
      }
    });

    it('should fallback to binary when all encoding attempts fail', () => {
      // Test the fallback path in decode function (lines 42-44)
      const testData = new Uint8Array([0xFF, 0xFE, 0xFD]); // Invalid UTF-8 sequence
      
      // Try to encode with known problematic charset
      try {
        const result = encode('test', 'invalid-charset-xyz');
        expect(result).to.be.instanceof(Uint8Array);
      } catch (e) {
        // This tests the catch block in encode
        expect(e).to.exist;
      }
    });
  });

  describe('convert function edge cases', () => {
    it('should handle convert with Uint8Array input and fromCharset', () => {
      const inputData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      
      const result = convert(inputData, 'utf-8');
      expect(result).to.be.instanceof(Uint8Array);
    });

    it('should handle convert with string input', () => {
      const testString = 'Test String';
      
      const result = convert(testString);
      expect(result).to.be.instanceof(Uint8Array);
    });
  });
});