/// <reference types="mocha" />
import { expect } from 'chai';
import { addressparser } from '../../src/addressparser';

/**
 * Address parser deeper coverage
 */
describe('addressparser advanced', () => {
  it('parses address with comment fallback to display name', () => {
    const res = addressparser('"Display" (Remark) <user@example.com>');
    expect(res[0].address).to.equal('user@example.com');
    // implementation replaces missing text with comment earlier; name becomes Display (Remark removed)
    expect(res[0].name).to.match(/Display/);
  });

  it('derives address from bare text when no angle brackets', () => {
    const res = addressparser('Some Person person@example.com Extra');
    expect(res[0].address).to.equal('person@example.com');
    // Name loses the email token
    expect(res[0].name).to.match(/Some Person/);
  });

  it('handles multiple possible addresses keeping only first as address', () => {
    const res = addressparser('Alpha beta@example.com gamma@example.com');
    expect(res[0].address).to.equal('beta@example.com');
    // second email moved to name text or discarded; ensure no second element created
    expect(res.length).to.equal(1);
  });

  it('parses group with members and following standalone', () => {
    const str = 'Group: Alice <alice@ex.com>, Bob <bob@ex.com>; Charlie <charlie@ex.com>';
    const res = addressparser(str);
    expect(res.length).to.equal(2);
    const group = res[0] as any;
    expect(group.name).to.equal('Group');
    expect(group.group).to.be.an('array').with.length(2);
    expect(group.group[0].address).to.equal('alice@ex.com');
    expect(res[1].address).to.equal('charlie@ex.com');
  });

  it('flattens nested group when flatten option used', () => {
    const str = 'Friends: One <one@ex.com>, Two <two@ex.com>; Three <three@ex.com>';
    const flat = addressparser(str, { flatten: true });
    // Should return all three
    expect(flat.map(a => a.address)).to.include.members(['one@ex.com','two@ex.com','three@ex.com']);
  });

  it('treats semicolon as delimiter outside group', () => {
    const res = addressparser('One <one@a.com>; Two <two@a.com>');
    expect(res.length).to.equal(2);
  });

  it('handles quoted name with comma', () => {
    const res = addressparser('"Last, First" <lf@example.com>');
    expect(res[0].address).to.equal('lf@example.com');
    expect(res[0].name).to.equal('Last, First');
  });

  it('escapes backslash inside quoted name', () => {
    const res = addressparser('"Escaped \\\\" Quote" <esc@example.com>');
  expect(res[0].address).to.match(/esc@example.com/);
  });

  it('unquoted name containing stray < before address', () => {
    const res = addressparser('Broken < Name <broken@example.com>');
    expect(res[0].address).to.equal('broken@example.com');
  });
});
