import { describe, it, expect } from 'vitest';
import { addressparser } from '../../src/addressparser';

describe('addressparser advanced', () => {
  it('parses address with comment fallback to display name', () => {
    const res = addressparser('"Display" (Remark) <user@example.com>');
    expect(res[0].address).toBe('user@example.com');
    expect(res[0].name).toMatch(/Display/);
  });

  it('derives address from bare text when no angle brackets', () => {
    const res = addressparser('Some Person person@example.com Extra');
    expect(res[0].address).toBe('person@example.com');
    expect(res[0].name).toMatch(/Some Person/);
  });

  it('handles multiple possible addresses keeping only first as address', () => {
    const res = addressparser('Alpha beta@example.com gamma@example.com');
    expect(res[0].address).toBe('beta@example.com');
    expect(res.length).toBe(1);
  });

  it('parses group with members and following standalone', () => {
    const str = 'Group: Alice <alice@ex.com>, Bob <bob@ex.com>; Charlie <charlie@ex.com>';
    const res = addressparser(str);
    expect(res.length).toBe(2);
    const group = res[0] as any;
    expect(group.name).toBe('Group');
    expect(Array.isArray(group.group)).toBe(true);
    expect(group.group).toHaveLength(2);
    expect(group.group[0].address).toBe('alice@ex.com');
    expect(res[1].address).toBe('charlie@ex.com');
  });

  it('flattens nested group when flatten option used', () => {
    const str = 'Friends: One <one@ex.com>, Two <two@ex.com>; Three <three@ex.com>';
    const flat = addressparser(str, { flatten: true });
    expect(flat.map(a => a.address)).toEqual(expect.arrayContaining(['one@ex.com', 'two@ex.com', 'three@ex.com']));
  });

  it('treats semicolon as delimiter outside group', () => {
    const res = addressparser('One <one@a.com>; Two <two@a.com>');
    expect(res.length).toBe(2);
  });

  it('handles quoted name with comma', () => {
    const res = addressparser('"Last, First" <lf@example.com>');
    expect(res[0].address).toBe('lf@example.com');
    expect(res[0].name).toBe('Last, First');
  });

  it('escapes backslash inside quoted name', () => {
    const res = addressparser('"Escaped \\\\" Quote" <esc@example.com>');
    expect(res[0].address).toMatch(/esc@example.com/);
  });

  it('unquoted name containing stray < before address', () => {
    const res = addressparser('Broken < Name <broken@example.com>');
    expect(res[0].address).toBe('broken@example.com');
  });
});
