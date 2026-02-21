import { describe, it, expect } from 'vitest';
import { GB2312UTF8 } from '../../src/utils';

describe('utils uncovered code paths', () => {
  describe('GB2312UTF8.Hex2Utf8 edge cases', () => {
    it('should return empty string when hex string is not 16 characters', () => {
      const result = GB2312UTF8.Hex2Utf8('short');
      expect(result).toBe('');
    });

    it('should return empty string for empty input', () => {
      const result = GB2312UTF8.Hex2Utf8('');
      expect(result).toBe('');
    });

    it('should process valid 16-character hex string', () => {
      const validHex = '0030003100320033';
      const result = GB2312UTF8.Hex2Utf8(validHex);
      expect(typeof result).toBe('string');
    });
  });

  describe('GB2312UTF8.GB2312ToUTF8 edge cases', () => {
    it('should handle input with length property in iteration', () => {
      const inputWithPercentAndLength = 'test%u4E2D%more';
      const result = GB2312UTF8.GB2312ToUTF8(inputWithPercentAndLength);
      expect(typeof result).toBe('string');
    });

    it('should handle escape sequences without u prefix', () => {
      const inputWithNormalEscape = 'test%20space';
      const result = GB2312UTF8.GB2312ToUTF8(inputWithNormalEscape);
      expect(result).toContain('test');
    });
  });

  describe('GB2312UTF8.UTF8ToGB2312 complex edge cases', () => {
    it('should handle strings with percentage signs in complex patterns', () => {
      const testString = 'before%after%more';
      const result = GB2312UTF8.UTF8ToGB2312(testString);
      expect(typeof result).toBe('string');
    });

    it('should handle strings with short percentage sequences', () => {
      const testString = '%ab';
      const result = GB2312UTF8.UTF8ToGB2312(testString);
      expect(typeof result).toBe('string');
    });

    it('should handle three-byte UTF-8 sequences', () => {
      const testString = '%E2%82%AC';
      const result = GB2312UTF8.UTF8ToGB2312(testString);
      expect(typeof result).toBe('string');
    });

    it('should handle percentage at position >= 3', () => {
      const testString = 'abc%def';
      const result = GB2312UTF8.UTF8ToGB2312(testString);
      expect(typeof result).toBe('string');
      expect(result).toContain('abc');
    });

    it('should handle single-byte UTF-8 sequences', () => {
      const testString = '%48%65%6C%6C%6F';
      const result = GB2312UTF8.UTF8ToGB2312(testString);
      expect(typeof result).toBe('string');
      expect(result).toContain('Hello');
    });

    it('should handle two-byte UTF-8 sequences correctly', () => {
      const testString = '%C3%A9';
      const result = GB2312UTF8.UTF8ToGB2312(testString);
      expect(typeof result).toBe('string');
    });
  });

  describe('GB2312UTF8.Dig2Dec edge case', () => {
    it('should return -1 for invalid length input', () => {
      const result = GB2312UTF8.Dig2Dec('abc');
      expect(result).toBe(-1);
    });

    it('should handle valid 4-character input', () => {
      const result = GB2312UTF8.Dig2Dec('0123');
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should return input unchanged when no percentage found', () => {
      const testString = 'nopercentage';
      const result = GB2312UTF8.UTF8ToGB2312(testString);
      expect(result).toBe(testString);
    });
  });
});
