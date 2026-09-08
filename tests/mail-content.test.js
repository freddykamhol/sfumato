import test from 'node:test'
import assert from 'node:assert/strict'
import { mailText } from '../mail-content.js'
import { renderMailMessage } from '../src/mail-view.js'

test('HTML replies retain paragraphs, entities and quoted mail without markup', () => {
  const result = mailText('<html><head><style>body{color:red}</style></head><body>Hallo Leon,<div><br></div><div>Der Link funktioniert nicht &amp; ich habe Fragen.</div><div>Ich bringe Bilder.</div><blockquote>Am Sonntag schrieb das Studio:<p>Hier sind Termine.</p></blockquote><script>alert(1)</script></body></html>')
  assert.match(result, /Hallo Leon,\n/)
  assert.match(result, /nicht & ich/)
  assert.match(result, /\nIch bringe Bilder/)
  assert.doesNotMatch(result, /<div|color:red|alert\(1\)/)
  const view = renderMailMessage(result)
  assert.match(view, /<details/)
  assert.ok(view.indexOf('Ich bringe Bilder') < view.indexOf('<details'))
})

test('previously damaged Apple Mail is recovered only for display', () => {
  const stored = 'html class=”apple-mail-supports-explicit-dark-mode”headmeta http-equiv=”content-type” content=”text/html; charset=utf-8”/headbody dir=”auto”Hallo Leon,divbrdivder Link funktioniert leider nicht./divdivbr/divdivIch bringe Bilder und brauche Beratung./divdivbrblockquote type=”cite”Am Sonntag schrieb das Studio:brbr/blockquote/div/body/html'
  const result = mailText(stored, { legacy: true })
  assert.match(result, /Hallo Leon,\n\nder Link funktioniert leider nicht\./)
  assert.match(result, /Ich bringe Bilder und brauche Beratung\./)
  assert.doesNotMatch(result, /apple-mail|http-equiv|\/div|divder/)
  assert.match(renderMailMessage(result), /<details/)
  assert.equal(mailText(stored), stored)
})

test('plain mail preserves line breaks, quotes and comparison signs safely', () => {
  const text = 'Hallo,\n\n"klein" < 5 & groß > 3\nViele Grüße'
  assert.equal(mailText(text), text)
  assert.equal(mailText(text, { legacy: true }), text)
  const view = renderMailMessage('<img src=x onerror=alert(1)>\nHallo')
  assert.doesNotMatch(view, /<img/)
  assert.match(view, /&lt;img/)
  assert.doesNotMatch(view, /<details/)
})
