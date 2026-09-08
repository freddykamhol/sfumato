import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createHmac } from 'node:crypto'
import { customerWorkflows, DAY, persistentSecret, proposalExpired, savedCustomerToken } from '../customer-workflows.js'

const iso = days => new Date(Date.now() + days * DAY).toISOString()
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
function fixture(overrides = {}) {
  let entries = [{ id: 'REQ-test', name: 'Test Kunde', email: 'customer@example.test', date: iso(-10), proposals: [{ id: 'PROP-test', sentAt: iso(-2), slots: [iso(20), iso(21), iso(22)], duration: 2 }] }]
  const mails = [], settings = { calendar: { autoNewProposals: false } }
  const deps = { readRequests: async () => structuredClone(entries), saveRequests: async value => { entries = structuredClone(value) }, readSettings: async () => structuredClone(settings), readAppointments: async () => [], readImportedCalendarEvents: async () => [], findAvailableProposalSlots: () => ({ slots: [iso(30), iso(31), iso(32)] }), validateAppointmentSlot: () => [], sendRequestMail: async mail => { mails.push(mail); return { text: `${mail.text}\n${mail.actionUrl}`, subject: mail.subject, messageId: 'test' } }, proposalToken: (id, batch) => `signed-${id}-${batch}`, htmlEscape: text => String(text).replaceAll('<', '&lt;').replaceAll('"', '&quot;'), ...overrides }
  const workflows = customerWorkflows(deps)
  return { workflows, mails, settings, get entries() { return entries }, set entries(value) { entries = value } }
}
function response() { return { status: 200, text: '', writeHead(status, headers) { this.status = status; this.headers = headers }, end(text = '') { this.text = text } } }
const request = (url, data, method = 'POST') => Object.assign(Readable.from(data ? [Buffer.from(JSON.stringify(data))] : []), { url, method })
const input = (action, token = 'signed-REQ-test-PROP-test') => new URLSearchParams({ anfrage: 'REQ-test', batch: 'PROP-test', token, action })

test('Schlüssel bleibt nach Neustarts gleich; konfigurierte Schlüssel haben Vorrang', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'sfumato-secret-')); t.after(() => rm(dir, { recursive: true, force: true }))
  const first = await persistentSecret(dir)
  assert.equal(await persistentSecret(dir), first)
  assert.equal(await persistentSecret(dir, 'existing-secret'), 'existing-secret')
})

test('Alte Links werden ausschließlich aus gespeicherten ausgehenden E-Mails erkannt', () => {
  const f = fixture(), entry = f.entries[0], batch = entry.proposals[0]
  entry.emails = [{ direction: 'outbound', text: 'Termin: https://tattoosfumato.de/terminverwaltung?termin=APT-old&token=old-management Link: https://tattoosfumato.de/terminvorschlaege?anfrage=REQ-test&batch=PROP-test&token=old-proposal' }]
  assert.equal(savedCustomerToken(entry, '/terminverwaltung', { termin: 'APT-old' }, 'old-management'), true)
  assert.equal(savedCustomerToken(entry, '/terminverwaltung', { termin: 'APT-other' }, 'old-management'), false)
  assert.equal(f.workflows.valid(entry, batch, 'old-proposal'), true)
  batch.linkToken = 'renewed'
  assert.equal(f.workflows.valid(entry, batch, 'old-proposal'), false)
  entry.emails[0].direction = 'inbound'
  assert.equal(savedCustomerToken(entry, '/terminverwaltung', { termin: 'APT-old' }, 'old-management'), false)
})

test('Erneuter Versand erhält Slots, rotiert Token und beginnt neue sieben Tage', async () => {
  const f = fixture(), old = structuredClone(f.entries[0].proposals[0]), res = response()
  await f.workflows.admin(request('/api/proposals/resend', { requestId: 'REQ-test', batchId: 'PROP-test' }), res, '/api/proposals/resend')
  assert.equal(res.status, 200)
  const batch = f.entries[0].proposals[0]
  assert.deepEqual(batch.slots, old.slots)
  assert.equal(f.workflows.valid(f.entries[0], batch, 'signed-REQ-test-PROP-test'), false)
  assert.equal(f.workflows.valid(f.entries[0], batch, batch.linkToken), true)
  assert.equal(proposalExpired(batch, new Date(batch.linkIssuedAt).getTime() + 7 * DAY - 1), false)
  assert.equal(proposalExpired(batch, new Date(batch.linkIssuedAt).getTime() + 7 * DAY), true)
  assert.match(f.mails[0].text, /frühestmöglichen/)
})

test('Ungültige Links erlauben nur Versand an hinterlegte Adresse und begrenzen Wiederholungen', async () => {
  const f = fixture(), res = response()
  await f.workflows.publicProposal({ method: 'POST' }, res, input('resend', 'invalid'))
  assert.equal(f.mails.length, 1)
  assert.equal(f.mails[0].to, 'customer@example.test')
  assert.ok(!res.text.includes(f.entries[0].proposals[0].linkToken))
  await f.workflows.publicProposal({ method: 'POST' }, response(), input('resend', 'invalid'))
  assert.equal(f.mails.length, 1)
})

test('Erinnerung genau ab Tag sechs, einmalig, ohne Verlängerung und nicht für erledigte Blöcke', async () => {
  const f = fixture()
  f.entries[0].proposals[0].sentAt = iso(-6.1)
  f.entries[0].proposals.push({ ...f.entries[0].proposals[0], id: 'expired', sentAt: iso(-8) }, { ...f.entries[0].proposals[0], id: 'selected', selectedSlot: iso(20) })
  const sentAt = f.entries[0].proposals[0].sentAt
  await f.workflows.reminders(); await f.workflows.reminders()
  assert.equal(f.mails.length, 1)
  assert.match(f.mails[0].text, /morgen ab/)
  assert.equal(f.entries[0].proposals[0].sentAt, sentAt)
  assert.ok(f.entries[0].proposals[0].reminderSentAt)
})

test('Abgelaufene Auswahl bietet neue Termine an; manuell und automatisch einschließlich Verschiebung', async () => {
  for (const automatic of [false, true]) {
    const f = fixture(); f.settings.calendar.autoNewProposals = automatic
    f.entries[0].proposals[0].sentAt = iso(-8)
    f.entries[0].proposals[0].kind = 'reschedule'; f.entries[0].proposals[0].appointmentId = 'APT-original'
    const res = response()
    await f.workflows.publicProposal({ method: 'GET', url: `/terminvorschlaege?${input('new')}` }, res)
    assert.match(res.text, /Neue Termine anfordern/)
    await f.workflows.publicProposal({ method: 'POST' }, response(), input('new'))
    assert.ok(f.entries[0].proposals[0].cancelledAt)
    assert.equal(f.entries[0].status, automatic ? 'In Klärung' : 'Neu')
    if (automatic) assert.equal(f.entries[0].proposals[1].appointmentId, 'APT-original')
    await f.workflows.publicProposal({ method: 'POST' }, response(), input('new'))
    assert.equal(f.mails.length, automatic ? 1 : 0)
  }
})

test('Kundenwunsch gibt alle offenen Vorschläge dieser Anfrage frei, aber keine anderen Anfragen', async () => {
  const f = fixture()
  f.entries[0].proposals.push({ ...f.entries[0].proposals[0], id: 'second-open' }, { id: 'booked', selectedSlot: iso(20) })
  const other = { ...structuredClone(f.entries[0]), id: 'another-request' }
  f.entries.push(other)
  await f.workflows.publicProposal({ method: 'POST' }, response(), input('new'))
  assert.ok(f.entries[0].proposals.slice(0, 2).every(batch => batch.cancelledAt && batch.newProposalsRequestedAt))
  assert.ok(!f.entries[0].proposals[2].cancelledAt)
  assert.deepEqual(f.entries[1], other)
})

test('SMTP-Fehler beim Erneuern lässt bisherigen Link gültig', async () => {
  const f = fixture({ sendRequestMail: async () => { throw new Error('SMTP offline') } }), res = response()
  await f.workflows.admin(request('', { requestId: 'REQ-test', batchId: 'PROP-test' }), res, '/api/proposals/resend')
  assert.equal(res.status, 400)
  assert.equal(f.workflows.valid(f.entries[0], f.entries[0].proposals[0], 'signed-REQ-test-PROP-test'), true)
})

test('Erinnerungsversand überschreibt keine parallele Bearbeitung oder Buchung und belebt gelöschte Anfragen nicht wieder', async () => {
  let f
  f = fixture({ sendRequestMail: async () => {
    f.entries[0].status = 'Bestätigt'
    f.entries[0].proposals[0].selectedSlot = iso(20)
    f.entries[0].emails = [{ id: 'parallel', text: 'Parallele Nachricht' }]
    return { text: 'Erinnerung', subject: 'Erinnerung' }
  } })
  f.entries[0].proposals[0].sentAt = iso(-6.1)
  await f.workflows.reminders()
  assert.equal(f.entries[0].status, 'Bestätigt')
  assert.ok(f.entries[0].proposals[0].selectedSlot)
  assert.ok(f.entries[0].proposals[0].reminderSentAt)
  assert.equal(f.entries[0].emails.length, 2)
  const g = fixture({ sendRequestMail: async () => { g.entries = []; return { text: 'sent' } } }), res = response()
  await g.workflows.admin(request('', { requestId: 'REQ-test', batchId: 'PROP-test' }), res, '/api/proposals/resend')
  assert.equal(res.status, 400)
  assert.deepEqual(g.entries, [])
})

test('Bilder nachreichen verlangt Zustimmung, ordnet Dateien zu und verhindert Wiederverwendung', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'sfumato-upload-')); t.after(() => rm(dir, { recursive: true, force: true }))
  const f = fixture({ uploadsDirectory: dir, referenceWebp: async buffer => buffer }), res = response()
  await f.workflows.admin(request('', { requestId: 'REQ-test' }), res, '/api/requests/request-images')
  assert.equal(res.status, 200)
  const url = f.mails[0].actionUrl
  const rejected = response()
  await f.workflows.upload(request(url, { references: [{ name: 'Bild.png', data: png }], consent: false }), rejected)
  assert.equal(rejected.status, 400)
  const uploaded = response()
  await f.workflows.upload(request(url, { references: [{ name: 'Bild.png', data: png }], consent: true }), uploaded)
  assert.equal(uploaded.status, 200)
  assert.equal(f.entries[0].references.length, 1)
  assert.match(f.entries[0].references[0].url, /^\/api\/uploads\/REQ-test\/.+\.webp$/)
  assert.ok(f.entries[0].references[0].consentAt)
  const reused = response(); await f.workflows.upload(request(url, null, 'GET'), reused)
  assert.equal(reused.status, 410)
})

test('HTTP: Nachstechen, mehrere Abwesenheiten, abgelaufene Links und Freigabe beim Löschen', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'sfumato-http-')), port = 41000 + Math.floor(Math.random() * 2000), base = `http://127.0.0.1:${port}`
  // Passenger's CommonJS loader must be able to require the ESM startup file.
  const child = spawn(process.execPath, ['-e', "require('nodemailer').createTransport = () => ({ sendMail: async () => ({ messageId: 'test-mail' }) }); require('./app.js')"], { env: { ...process.env, PORT: String(port), DATA_DIRECTORY: dir, ADMIN_INITIAL_PASSWORD: 'test-password', ADMIN_SESSION_SECRET: 'test-secret', PUBLIC_URL: base }, stdio: 'ignore' })
  t.after(async () => { child.kill(); await once(child, 'exit'); await rm(dir, { recursive: true, force: true }) })
  let ready = false
  for (let n = 0; n < 100; n++) { try { if ((await fetch(`${base}/health`)).ok) { ready = true; break } } catch {} await new Promise(resolve => setTimeout(resolve, 100)) }
  assert.ok(ready)
  assert.equal((await fetch(`${base}/_internal/proposal-reminders`, { method: 'POST' })).status, 401)
  const reminderToken = createHmac('sha256', 'test-secret').update('proposal-reminders').digest('hex')
  assert.equal((await fetch(`${base}/_internal/proposal-reminders`, { method: 'POST', headers: { Authorization: `Bearer ${reminderToken}` } })).status, 200)
  const login = await fetch(`${base}/admin/login`, { method: 'POST', redirect: 'manual', body: new URLSearchParams({ username: 'admin', password: 'test-password' }) })
  const headers = { Cookie: login.headers.get('set-cookie').split(';')[0], 'Content-Type': 'application/json' }
  const payload = { name: 'HTTP Kunde', email: 'test@example.test', phone: '1234', placement: 'Arm', size: '10', requestType: 'touchup', idea: '' }
  assert.equal((await fetch(`${base}/api/requests`, { method: 'POST', headers, body: JSON.stringify(payload) })).status, 400)
  const created = await fetch(`${base}/api/requests`, { method: 'POST', headers, body: JSON.stringify({ ...payload, references: [{ name: 'Tattoo.png', data: png }] }) })
  assert.equal(created.status, 201); const entry = await created.json()
  const settings = await (await fetch(`${base}/api/settings`, { headers })).json()
  settings.calendar.hours = Array.from({ length: 7 }, () => ({ enabled: true, start: '10:00', end: '18:00' }))
  settings.absences = [{ start: '2030-01-01', end: '2030-01-03', type: 'urlaub' }, { start: '2030-01-04', end: '2030-01-10', type: 'krank' }]
  assert.equal((await fetch(`${base}/api/settings`, { method: 'PUT', headers, body: JSON.stringify(settings) })).status, 200)
  const available = await (await fetch(`${base}/api/proposals/available?${new URLSearchParams({ requestId: entry.id, after: '2029-12-31T12:00:00Z', durationHours: '1' })}`, { headers })).json()
  assert.equal(available.slots.length, 3)
  assert.ok(available.slots.every(slot => slot.slice(0, 10) > '2030-01-10'))
  const batch = { id: 'PROP-http', sentAt: iso(-1), linkToken: 'test-link-token', duration: 1, slots: available.slots }
  assert.equal((await fetch(`${base}/api/requests/${entry.id}`, { method: 'PATCH', headers, body: JSON.stringify({ proposals: [batch] }) })).status, 200)
  assert.equal((await (await fetch(`${base}/api/availability-blocks`, { headers })).json()).length, 3)
  const regenerated = await (await fetch(`${base}/api/proposals/available?${new URLSearchParams({ requestId: entry.id, after: '2029-12-31T12:00:00Z', durationHours: '1' })}`, { headers })).json()
  assert.equal(regenerated.slots.length, 3)
  assert.ok(regenerated.slots.every(slot => !batch.slots.includes(slot)))
  const duplicateSend = await fetch(`${base}/api/proposals/send`, { method: 'POST', headers, body: JSON.stringify({ requestId: entry.id, duration: 1, slots: batch.slots, override: true }) })
  assert.equal(duplicateSend.status, 409)
  assert.match((await duplicateSend.json()).error, /bereits/)
  const link = `${base}/terminvorschlaege?${new URLSearchParams({ anfrage: entry.id, batch: batch.id, token: batch.linkToken })}`
  assert.match(await (await fetch(link)).text(), /Wähle deinen Termin/)
  batch.sentAt = iso(-8)
  await fetch(`${base}/api/requests/${entry.id}`, { method: 'PATCH', headers, body: JSON.stringify({ proposals: [batch] }) })
  assert.match(await (await fetch(link)).text(), /Neue Termine anfordern/)
  const attempt = await fetch(`${base}/terminvorschlaege`, { method: 'POST', body: new URLSearchParams({ anfrage: entry.id, batch: batch.id, token: batch.linkToken, action: 'book', slot: '0' }) })
  assert.equal(attempt.status, 410)
  await fetch(`${base}/api/requests/${entry.id}`, { method: 'PATCH', headers, body: JSON.stringify({ proposals: [] }) })
  const afterHistoryRemoval = await (await fetch(`${base}/api/proposals/available?${new URLSearchParams({ requestId: entry.id, after: '2029-12-31T12:00:00Z', durationHours: '1' })}`, { headers })).json()
  assert.ok(afterHistoryRemoval.slots.every(slot => !batch.slots.includes(slot)))
  batch.sentAt = iso(-1)
  await fetch(`${base}/api/requests/${entry.id}`, { method: 'PATCH', headers, body: JSON.stringify({ proposals: [batch] }) })
  const otherResponse = await fetch(`${base}/api/requests`, { method: 'POST', headers, body: JSON.stringify({ ...payload, references: [{ name: 'Tattoo.png', data: png }] }) })
  const other = await otherResponse.json()
  const otherBatch = { ...batch, id: 'PROP-other-request', slots: ['2030-03-01T10:00:00Z', '2030-03-02T10:00:00Z', '2030-03-03T10:00:00Z'] }
  await fetch(`${base}/api/requests/${other.id}`, { method: 'PATCH', headers, body: JSON.stringify({ proposals: [otherBatch] }) })
  const replacement = { requestId: entry.id, duration: 1, slots: ['2030-02-01T10:00:00Z', '2030-02-02T10:00:00Z', '2030-02-03T10:00:00Z'], override: true }
  // An unsuccessful send must keep the old reservations in place.
  const failedSend = await fetch(`${base}/api/proposals/send`, { method: 'POST', headers, body: JSON.stringify(replacement) })
  assert.equal(failedSend.status, 502)
  const afterFailure = await (await fetch(`${base}/api/requests`, { headers })).json()
  assert.ok(!afterFailure.find(item => item.id === entry.id).proposals[0].cancelledAt)
  settings.integrations.smtp = { enabled: true, host: 'test.invalid', user: 'test@example.test', password: 'test', from: 'test@example.test' }
  await fetch(`${base}/api/settings`, { method: 'PUT', headers, body: JSON.stringify(settings) })
  const sentResponse = await fetch(`${base}/api/proposals/send`, { method: 'POST', headers, body: JSON.stringify(replacement) })
  assert.equal(sentResponse.status, 201)
  const sent = await sentResponse.json()
  assert.equal(sent.proposals[0].supersededBy, sent.batch.id)
  assert.ok(sent.proposals[0].cancelledAt)
  assert.ok(!sent.proposals[1].cancelledAt)
  const afterSend = await (await fetch(`${base}/api/requests`, { headers })).json()
  assert.deepEqual(afterSend.find(item => item.id === other.id).proposals, [otherBatch])
  assert.match(await (await fetch(link)).text(), /Diese Vorschläge wurden ersetzt/)
  const oldClick = await fetch(`${base}/terminvorschlaege`, { method: 'POST', body: new URLSearchParams({ anfrage: entry.id, batch: batch.id, token: batch.linkToken, action: 'new' }) })
  assert.match(await oldClick.text(), /bereits neue Vorschläge versendet/)
  const blocks = await (await fetch(`${base}/api/availability-blocks`, { headers })).json()
  assert.deepEqual(blocks.filter(item => item.requestId === entry.id).map(item => item.start), replacement.slots.map(slot => new Date(slot).toISOString()))
  assert.equal(blocks.filter(item => item.requestId === other.id).length, 3)
  await fetch(`${base}/api/requests/${entry.id}`, { method: 'DELETE', headers })
  assert.equal((await (await fetch(`${base}/api/availability-blocks`, { headers })).json()).filter(item => item.requestId === entry.id).length, 0)
  assert.equal((await fetch(`${base}/data/application-secret`)).status, 404)
})
