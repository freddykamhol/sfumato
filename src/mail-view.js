export const escapeMail = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))

export function renderMailMessage(value) {
  const text = String(value || '').trim() || 'Keine weitere Nachricht vorhanden.'
  const quote = /(?:^|\n)(?=>|Am .{5,180}schrieb.{0,180}:|On .{5,180}wrote:|-{2,}\s*(?:Original Message|Ursprüngliche Nachricht))/im.exec(text)
  const index = quote?.index ?? -1
  const body = index > 0 ? text.slice(0, index).trim() : text
  const history = index > 0 ? text.slice(index).trim() : ''
  return `<div class="mail-readable-body">${escapeMail(body)}</div>${history ? `<details class="mail-quoted-history"><summary>Zitierte Nachricht anzeigen</summary><div class="mail-readable-body">${escapeMail(history)}</div></details>` : ''}`
}
