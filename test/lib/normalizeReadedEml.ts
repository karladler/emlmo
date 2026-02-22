/**
 * Normalizes ReadedEmlJson (from our impl or eml-parse-js) to a stable,
 * JSON-serializable shape for comparison. Both parsers use compatible types.
 */
export interface NormalizedReadedEml {
  date: string;
  subject: string;
  from: { name: string; email: string }[];
  to: { name: string; email: string }[];
  cc?: { name: string; email: string }[];
  headers: Record<string, unknown>;
  multipartAlternative?: { 'Content-Type': string };
  text?: string;
  textheaders?: Record<string, unknown>;
  html?: string;
  htmlheaders?: Record<string, unknown>;
  attachments?: NormalizedAttachment[];
  data?: string;
}

export interface NormalizedAttachment {
  name: string;
  contentType: string;
  inline: boolean;
  data64: string;
  filename?: string;
  mimeType?: string;
  id?: string;
  cid?: string;
}

type EmailLike = { name?: string; email?: string } | null | undefined
type EmailLikeArray = EmailLike | EmailLike[]

function toAddressList(val: EmailLikeArray): { name: string; email: string }[] {
  if (val == null) return []
  const arr = Array.isArray(val) ? val : [val]
  const list = arr
    .filter((a): a is { name?: string; email?: string } => a != null)
    .map(a => ({ name: String(a?.name ?? ''), email: String(a?.email ?? '') }))
  list.sort((a, b) => a.email.localeCompare(b.email))

  return list
}

function normalizeDate(val: unknown): string {
  if (val instanceof Date) return val.toISOString()

  if (typeof val === 'string') return val

  return String(val ?? '')
}

function normalizeHeaders(headers: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!headers || typeof headers !== 'object') return {}
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(headers)) {
    out[k.toLowerCase()] = v
  }

  return out
}

function normalizeAttachment(a: Record<string, unknown>): NormalizedAttachment {
  return {
    name: String(a.name ?? ''),
    contentType: String(a.contentType ?? ''),
    inline: Boolean(a.inline),
    data64: String(a.data64 ?? ''),
    filename: a.filename != null ? String(a.filename) : undefined,
    mimeType: a.mimeType != null ? String(a.mimeType) : undefined,
    id: a.id != null ? String(a.id) : undefined,
    cid: a.cid != null ? String(a.cid) : undefined,
  }
}

function attachmentSortKey(a: NormalizedAttachment): string {
  return `${a.name}\t${a.cid ?? ''}\t${a.id ?? ''}`
}

export function normalizeReadedEml(obj: Record<string, unknown>): NormalizedReadedEml {
  const attachments = Array.isArray(obj.attachments) ? obj.attachments : []
  const normalizedAttachments = attachments
    .map((a: Record<string, unknown>) => normalizeAttachment(a))
    .sort((x, y) => attachmentSortKey(x).localeCompare(attachmentSortKey(y)))

  const result: NormalizedReadedEml = {
    date: normalizeDate(obj.date),
    subject: String(obj.subject ?? ''),
    from: toAddressList(obj.from as EmailLikeArray),
    to: toAddressList(obj.to as EmailLikeArray),
    headers: normalizeHeaders(obj.headers as Record<string, unknown>),
    data: obj.data != null ? String(obj.data) : undefined,
  }
  const collapseWhitespace = (s: string) => s.replace(/\s+/g, ' ').trimEnd()
  const collapseHtmlWhitespace = (s: string) =>
    collapseWhitespace(s).replace(/\s*>\s*</g, '><')

  if (obj.text != null) result.text = collapseWhitespace(String(obj.text))

  if (obj.html != null) result.html = collapseHtmlWhitespace(String(obj.html))

  if (obj.cc !== undefined && obj.cc !== null) {
    result.cc = toAddressList(obj.cc as EmailLikeArray)
  }

  if (obj.multipartAlternative != null && typeof obj.multipartAlternative === 'object') {
    result.multipartAlternative = obj.multipartAlternative as { 'Content-Type': string }
  }

  if (obj.textheaders != null && typeof obj.textheaders === 'object') {
    result.textheaders = normalizeHeaders(obj.textheaders as Record<string, unknown>)
  }

  if (obj.htmlheaders != null && typeof obj.htmlheaders === 'object') {
    result.htmlheaders = normalizeHeaders(obj.htmlheaders as Record<string, unknown>)
  }

  if (normalizedAttachments.length > 0) {
    result.attachments = normalizedAttachments
  }

  return result
}
