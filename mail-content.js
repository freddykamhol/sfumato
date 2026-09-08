import { convert } from 'html-to-text'

// Older versions removed angle brackets before storing HTML mail. Only attempt
// recovery with a strong document signature; keep the stored original intact.
export function recoverLegacyMail(value) {
  if (!/^\s*html\s+(?:class|xmlns)[=\s]/i.test(value)) return value
  const tags = 'html|head|meta|body|div|br|blockquote|table|tbody|tr|td|span|h[1-6]|p|a'
  const attributes = '(?:\\s+[\\w:-]+=[”"’\'][^”"’\']*[”"’\'])+'
  const opening = `(?:${tags})${attributes}\\s*/?|div|(?:html|head|body|tbody|tr|td|br)(?=html|head|meta|body|div|br|blockquote|table|tbody|tr|td|[A-ZÄÖÜ/]|$)`
  return value.replace(new RegExp(`(/(?:${tags}))|(${opening})`, 'g'), (match, closing) => {
    if (closing) return `<${closing}>`
    return `<${match.replace(/[”“]/g, '"').replace(/[‘’]/g, "'")}>`
  })
}

export function mailText(value, { legacy = false } = {}) {
  let text = String(value || '')
  if (legacy) text = recoverLegacyMail(text)
  if (/<(?:html|body|div|p|br|table|blockquote|span|a|head)\b[^>]*>/i.test(text)) {
    text = convert(text, { wordwrap: false, selectors: [
      { selector: 'img', format: 'skip' },
      { selector: 'a', options: { hideLinkHrefIfSameAsText: true } },
      { selector: 'h1', options: { uppercase: false } }
    ] })
  }
  return text.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 50000)
}
