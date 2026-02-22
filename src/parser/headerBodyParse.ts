import { getBoundary } from '../utils';
import type { Options, BoundaryRawData, BoundaryConvertedData, BoundaryHeaders } from '../interface';

const verbose = false;

export interface Boundary {
  boundary: string;
  lines?: string[];
  part?: PartRecursive;
}

export interface PartRecursive {
  headers?: Record<string, string | string[]>;
  body?: string | Boundary[];
}

export function parseRecursive(
  lines: string[],
  start: number,
  parent: PartRecursive,
  options: Options,
): PartRecursive {
  let boundary: Boundary | null = null;
  let lastHeaderName = '';
  let findBoundary = '';
  let insideBody = false;
  let insideBoundary = false;
  let isMultiHeader = false;
  let isMultipart = false;
  let checkedForCt = false;
  let ctInBody = false;

  parent.headers = {};

  function complete(b: Boundary): void {
    b.part = {};
    parseRecursive(b.lines!, 0, b.part, options);
    delete b.lines;
  }

  for (let i = start; i < lines.length; i++) {
    const line = lines[i];

    if (!insideBody) {
      if (line === '') {
        insideBody = true;

        if (options?.headersOnly) break;

        const ct = parent.headers['Content-Type'] || parent.headers['Content-type'];

        if (!ct || typeof ct !== 'string') {
          if (checkedForCt) {
            insideBody = !ctInBody;
          } else {
            checkedForCt = true;
            const lineClone = Array.from(lines);
            const string = lineClone.splice(i).join('\r\n');
            const trimmed = string.trim();

            if (trimmed.indexOf('Content-Type') === 0 || trimmed.indexOf('Content-type') === 0) {
              insideBody = false;
              ctInBody = true;
            } else {
              console.warn('Warning: undefined Content-Type');
            }
          }
        } else if (/^multipart\//.test(ct)) {
          const b = getBoundary(ct);

          if (b?.length) {
            findBoundary = b;
            isMultipart = true;
            parent.body = [];
          } else if (verbose) {
            console.warn(`Multipart without boundary! ${ct.replace(/\r?\n/g, ' ')}`);
          }
        }
        continue;
      }

      const folded = /^\s+([^\r\n]+)/.exec(line);

      if (folded) {
        const raw = parent.headers[lastHeaderName];

        if (isMultiHeader && Array.isArray(raw)) {
          raw[raw.length - 1] += `\r\n${folded[1]}`;
        } else {
          const prev = Array.isArray(raw) ? raw[raw.length - 1] : (raw as string);
          parent.headers[lastHeaderName] = `${prev}\r\n${folded[1]}`;
        }
        continue;
      }

      const header = /^([\w\d-]+):\s*([^\r\n]*)/i.exec(line);

      if (header) {
        lastHeaderName = header[1];
        const existing = parent.headers[lastHeaderName];

        if (existing !== undefined && existing !== null) {
          isMultiHeader = true;
          const arr = typeof existing === 'string' ? [existing] : existing;
          arr.push(header[2]);
          parent.headers[lastHeaderName] = arr;
        } else {
          isMultiHeader = false;
          parent.headers[lastHeaderName] = header[2];
        }
        continue;
      }
    } else {
      if (isMultipart) {
        const isStart = line.indexOf(`--${findBoundary}`) === 0 && line.indexOf(`--${findBoundary}--`) !== 0;

        if (isStart) {
          insideBoundary = true;

          if (boundary?.lines) complete(boundary);
          const m = /^--([^\r\n]+)(\r?\n)?$/.exec(line)!;
          const newBoundary: Boundary = { boundary: m[1], lines: [] };

          if (Array.isArray(parent.body)) parent.body.push(newBoundary);
          boundary = newBoundary;

          if (verbose) console.log(`Found boundary: ${boundary.boundary}`);
          continue;
        }

        if (insideBoundary) {
          if (boundary?.boundary && lines[i - 1] === '' && line.indexOf(`--${findBoundary}--`) === 0) {
            insideBoundary = false;
            complete(boundary);
            continue;
          }

          if (boundary?.boundary && line.indexOf(`--${findBoundary}--`) === 0) continue;
          boundary?.lines?.push(line);
        }
      } else {
        parent.body = lines.splice(i).join('\r\n');
        break;
      }
    }
  }

  if (Array.isArray(parent.body) && parent.body.length > 0) {
    const last = parent.body[parent.body.length - 1];

    if (last?.lines) complete(last);
  }

  return parent;
}

export function completeBoundary(boundary: BoundaryRawData): BoundaryConvertedData | null {
  if (!boundary?.boundary) return null;
  const lines = boundary.lines || [];
  const result: BoundaryConvertedData = {
    boundary: boundary.boundary,
    part: { headers: { 'Content-Type': '' } as BoundaryHeaders, body: '' },
  };
  let lastHeaderName = '';
  let insideBody = false;
  let childBoundary: BoundaryRawData | undefined;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];

    if (!insideBody) {
      if (line === '') {
        insideBody = true;
        continue;
      }
      const match = /^([\w\d-]+):\s*([^\r\n]*)/i.exec(line);

      if (match) {
        lastHeaderName = match[1];
        result.part.headers[lastHeaderName] = match[2];
        continue;
      }
      const lineMatch = /^\s+([^\r\n]+)/.exec(line);

      if (lineMatch) {
        result.part.headers[lastHeaderName] += `\r\n${lineMatch[1]}`;
        continue;
      }
    } else {
      const match = /^--([^\r\n]+)(\r?\n)?$/.exec(line);
      const ctHeader = result.part.headers['Content-Type'] || result.part.headers['Content-type'];
      const childBoundaryStr = getBoundary(
        typeof ctHeader === 'string' ? ctHeader : Array.isArray(ctHeader) ? ctHeader[0] ?? '' : '',
      );

      if (match && line.indexOf(`--${childBoundaryStr}`) === 0 && !childBoundary) {
        childBoundary = { boundary: match[1], lines: [] };
        continue;
      }

      if (childBoundary?.boundary) {
        if (lines[index - 1] === '' && line.indexOf(`--${childBoundary.boundary}`) === 0) {
          const child = completeBoundary(childBoundary);

          if (child) {
            if (Array.isArray(result.part.body)) {
              result.part.body.push(child);
            } else {
              result.part.body = [child];
            }
          } else {
            result.part.body = childBoundary.lines.join('\r\n');
          }

          if (lines[index + 1]) {
            childBoundary.lines = [];
            continue;
          }

          if (line.indexOf(`--${childBoundary.boundary}--`) === 0 && lines[index + 1] === '') {
            childBoundary = undefined;
            break;
          }
        }
        childBoundary.lines.push(line);
      } else {
        result.part.body = lines.splice(index).join('\r\n');
        break;
      }
    }
  }

  return result;
}
