import { describe, it, expect } from 'vitest';
import { addressparser } from '../../src/addressparser';

describe('addressparser uncovered code paths', () => {
  describe('comment fallback to text when no text exists', () => {
    it('should use comment as text when no text but comment exists in group', () => {
      const result = addressparser('Group: (comment only);');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Group');
      expect((result[0] as any).group).toBeDefined();
      expect(Array.isArray((result[0] as any).group)).toBe(true);
    });

    it('should use comment as text when no text but comment exists in regular address', () => {
      const result = addressparser('(Only Comment) <email@test.com>');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Only Comment');
      expect(result[0].address).toBe('email@test.com');
    });
  });

  describe('multiple address handling', () => {
    it('should keep only first address and move others to text when multiple addresses found', () => {
      const input = 'John Doe first@test.com second@test.com third@test.com';
      const result = addressparser(input);
      expect(result).toHaveLength(1);
      expect(result[0].address).toBe('first@test.com');
      expect(result[0].name).toContain('second@test.com');
      expect(result[0].name).toContain('third@test.com');
    });
  });

  describe('group with no address handling', () => {
    it('should return empty array when group has no address', () => {
      const result = addressparser('EmptyGroup: ;');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('EmptyGroup');
      expect((result[0] as any).group).toEqual([]);
    });
  });

  describe('address and name deduplication', () => {
    it('should clear name when address equals name and contains @', () => {
      const result = addressparser('test@example.com test@example.com');
      expect(result).toHaveLength(1);
      expect(result[0].address).toBe('test@example.com');
      expect(result[0].name).toBe('');
    });

    it('should clear address when name equals address and contains no @', () => {
      const result = addressparser('plaintext');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('plaintext');
      expect(result[0].address).toBe('');
    });
  });

  describe('email detection from text fallback', () => {
    it('should extract email from text when no explicit address found', () => {
      const result = addressparser('Contact person valid@email.com for info');
      expect(result).toHaveLength(1);
      expect(result[0].address).toBe('valid@email.com');
      expect(result[0].name).toBe('Contact person for info');
    });

    it('should handle regex replacement when no address initially found', () => {
      const input = 'Some text with email@domain.com embedded';
      const result = addressparser(input);
      expect(result).toHaveLength(1);
      expect(result[0].address).toBe('email@domain.com');
    });
  });
});
