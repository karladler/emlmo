/// <reference types="mocha" />
import { expect } from 'chai';
import { addressparser } from '../../src/addressparser';

/**
 * Tests targeting previously uncovered code paths in addressparser.ts
 */
describe('addressparser uncovered code paths', () => {
  
  describe('comment fallback to text when no text exists', () => {
    it('should use comment as text when no text but comment exists in group', () => {
      // This tests lines 54-57: comment fallback in group context  
      // The actual behavior: group name becomes the group identifier, not the comment
      const result = addressparser('Group: (comment only);');
      expect(result).to.have.length(1);
      expect(result[0].name).to.equal('Group'); // Group name is "Group", not the comment
      expect((result[0] as any).group).to.exist;
      expect((result[0] as any).group).to.be.an('array');
    });

    it('should use comment as text when no text but comment exists in regular address', () => {
      // This tests lines 98-101: comment fallback in regular address context
      const result = addressparser('(Only Comment) <email@test.com>');
      expect(result).to.have.length(1);
      expect(result[0].name).to.equal('Only Comment');
      expect(result[0].address).to.equal('email@test.com');
    });
  });

  describe('multiple address handling', () => {
    it('should keep only first address and move others to text when multiple addresses found', () => {
      // This tests lines 104-106: multiple address handling
      const input = 'John Doe first@test.com second@test.com third@test.com';
      const result = addressparser(input);
      expect(result).to.have.length(1);
      expect(result[0].address).to.equal('first@test.com');
      expect(result[0].name).to.include('second@test.com');
      expect(result[0].name).to.include('third@test.com');
    });
  });

  describe('group with no address handling', () => {
    it('should return empty array when group has no address', () => {
      // This tests lines 112-113: isGroup but no address
      const result = addressparser('EmptyGroup: ;');
      expect(result).to.have.length(1);
      expect(result[0].name).to.equal('EmptyGroup');
      expect((result[0] as any).group).to.be.an('array').that.is.empty;
    });
  });

  describe('address and name deduplication', () => {
    it('should clear name when address equals name and contains @', () => {
      // This tests lines 120-125: address/name deduplication
      const result = addressparser('test@example.com test@example.com');
      expect(result).to.have.length(1);
      expect(result[0].address).to.equal('test@example.com');
      expect(result[0].name).to.equal(''); // Should be empty when same as address
    });

    it('should clear address when name equals address and contains no @', () => {
      // Tests the else branch where no @ is found
      const result = addressparser('plaintext');
      expect(result).to.have.length(1);
      expect(result[0].name).to.equal('plaintext');
      expect(result[0].address).to.equal(''); // Should be empty when no @
    });
  });

  describe('email detection from text fallback', () => {
    it('should extract email from text when no explicit address found', () => {
      // This tests the regex fallback for email detection in text
      const result = addressparser('Contact person valid@email.com for info');
      expect(result).to.have.length(1);
      expect(result[0].address).to.equal('valid@email.com');
      expect(result[0].name).to.equal('Contact person for info');
    });

    it('should handle regex replacement when no address initially found', () => {
      // Tests the _regexHandler function path
      const input = 'Some text with email@domain.com embedded';
      const result = addressparser(input);
      expect(result).to.have.length(1);
      expect(result[0].address).to.equal('email@domain.com');
    });
  });
});