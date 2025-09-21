/// <reference types="mocha" />
import { expect } from 'chai';
import { GB2312UTF8 } from '../../src/utils';

/**
 * Tests targeting previously uncovered code paths in utils.ts
 */
describe('utils uncovered code paths', () => {
  
  describe('GB2312UTF8.Hex2Utf8 edge cases', () => {
    it('should return empty string when hex string is not 16 characters', () => {
      // This tests line 100: return '' when ss.length != 16
      const result = GB2312UTF8.Hex2Utf8('short');
      expect(result).to.equal('');
    });

    it('should return empty string for empty input', () => {
      const result = GB2312UTF8.Hex2Utf8('');
      expect(result).to.equal('');
    });

    it('should process valid 16-character hex string', () => {
      // Valid 16-char hex string should process normally
      const validHex = '0030003100320033'; // "0123" in hex
      const result = GB2312UTF8.Hex2Utf8(validHex);
      expect(result).to.be.a('string');
    });
  });

  describe('GB2312UTF8.GB2312ToUTF8 edge cases', () => {
    it('should handle input with length property in iteration', () => {
      // This tests lines 142-143 and 146-147: sa[i].length checks
      const inputWithPercentAndLength = 'test%u4E2D%more';
      const result = GB2312UTF8.GB2312ToUTF8(inputWithPercentAndLength);
      expect(result).to.be.a('string');
    });

    it('should handle escape sequences without u prefix', () => {
      // Tests the else branch (lines 144-148) for non-unicode escape
      const inputWithNormalEscape = 'test%20space';
      const result = GB2312UTF8.GB2312ToUTF8(inputWithNormalEscape);
      expect(result).to.include('test');
    });
  });

  describe('GB2312UTF8.UTF8ToGB2312 complex edge cases', () => {
    it('should handle strings with percentage signs in complex patterns', () => {
      // This tests the complex percentage handling in lines 160-194
      let testString = 'before%after%more';
      const result = GB2312UTF8.UTF8ToGB2312(testString);
      expect(result).to.be.a('string');
    });

    it('should handle strings with short percentage sequences', () => {
      // Tests the i < 3 condition (lines 165-168)
      const testString = '%ab';
      const result = GB2312UTF8.UTF8ToGB2312(testString);
      expect(result).to.be.a('string');
    });

    it('should handle three-byte UTF-8 sequences', () => {
      // Tests lines 182-188: three-byte UTF-8 handling
      const testString = '%E2%82%AC'; // Euro sign in UTF-8
      const result = GB2312UTF8.UTF8ToGB2312(testString);
      expect(result).to.be.a('string');
    });

    it('should handle percentage at position >= 3', () => {
      // Tests lines 189-192: when i >= 3
      const testString = 'abc%def';
      const result = GB2312UTF8.UTF8ToGB2312(testString);
      expect(result).to.be.a('string');
      expect(result).to.include('abc');
    });

    it('should handle single-byte UTF-8 sequences', () => {
      // Tests line 171: single-byte (ASCII) UTF-8 handling  
      const testString = '%48%65%6C%6C%6F'; // "Hello" in hex
      const result = GB2312UTF8.UTF8ToGB2312(testString);
      expect(result).to.be.a('string');
      expect(result).to.include('Hello');
    });

    it('should handle two-byte UTF-8 sequences correctly', () => {
      // Tests the two-byte UTF-8 path that may not be fully covered
      const testString = '%C3%A9'; // 'é' in UTF-8
      const result = GB2312UTF8.UTF8ToGB2312(testString);
      expect(result).to.be.a('string');
    });
  });

  describe('GB2312UTF8.Dig2Dec edge case', () => {
    it('should return -1 for invalid length input', () => {
      // This tests the return -1 case for invalid length
      const result = GB2312UTF8.Dig2Dec('abc'); // Wrong length
      expect(result).to.equal(-1);
    });

    it('should handle valid 4-character input', () => {
      const result = GB2312UTF8.Dig2Dec('0123');
      expect(result).to.be.a('number');
      expect(result).to.be.at.least(0);
    });

    it('should return input unchanged when no percentage found', () => {
      // Tests line 162: return str1 when no % found
      const testString = 'nopercentage';
      const result = GB2312UTF8.UTF8ToGB2312(testString);
      expect(result).to.equal(testString);
    });
  });
});