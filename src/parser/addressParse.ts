import { addressparser } from '../lib/addressparser';
import type { EmailAddress } from '../interface';
import { unquoteString } from './contentDecode';

export function getEmailAddress(rawStr: string): EmailAddress | EmailAddress[] | null {
  const raw = unquoteString(rawStr);
  const parseList = addressparser(raw);
  const list = parseList.map((v) => ({ name: v.name, email: v.address }) as EmailAddress);

  if (list.length === 0) return null;

  if (list.length === 1) return list[0];

  return list;
}
