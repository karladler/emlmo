import type { ReadedEmlJson } from '../interface';

/**
 * When Content-Disposition: inline is present, body parts are parsed as attachments
 * instead of being used for html/text. Move inline text/html into result.
 * @see https://github.com/MQpeng/eml-parse-js/issues/52
 */
export function fixInlineBodyContent(eml: ReadedEmlJson): ReadedEmlJson {
  if (!eml.attachments?.length) return eml;

  const htmlAttachment = eml.attachments.find(
    (a) => a.inline === true && a.contentType.startsWith('text/html'),
  );
  const textAttachment = eml.attachments.find(
    (a) => a.inline === true && a.contentType.startsWith('text/plain'),
  );

  if (htmlAttachment && !eml.html) {
    if (htmlAttachment.data) {
      eml.html =
        typeof htmlAttachment.data === 'string'
          ? htmlAttachment.data
          : new TextDecoder().decode(htmlAttachment.data);
    } else if (htmlAttachment.data64) {
      try {
        eml.html = atob(htmlAttachment.data64);
      } catch {
        eml.html = htmlAttachment.data64;
      }
    }
  }

  if (textAttachment && !eml.text) {
    if (textAttachment.data) {
      eml.text =
        typeof textAttachment.data === 'string'
          ? textAttachment.data
          : new TextDecoder().decode(textAttachment.data);
    } else if (textAttachment.data64) {
      try {
        eml.text = atob(textAttachment.data64);
      } catch {
        eml.text = textAttachment.data64;
      }
    }
  }

  if (htmlAttachment || textAttachment) {
    eml.attachments = eml.attachments.filter((a) => a !== htmlAttachment && a !== textAttachment);
  }

  return eml;
}
