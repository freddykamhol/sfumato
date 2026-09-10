import test from 'node:test'
import assert from 'node:assert/strict'
import { proposalMailText, earliestProposalNotice } from '../customer-workflows.js'
import { sendBookingRequest } from '../src/booking-request.js'
import { matchesOverview } from '../src/overview-filters.js'
import { previouslyProposedSlots, releaseOpenProposals } from '../proposal-history.js'

test('Neue Vorschläge geben nur offene Blöcke der betroffenen Anfrage frei', () => {
  const entry = { proposals: [{ id: 'main', kind: 'main' }, { id: 'consultation', kind: 'consultation' }, { id: 'move', kind: 'reschedule' }, { id: 'booked', selectedSlot: '2030-01-01' }, { id: 'cancelled', cancelledAt: 'old' }] }
  releaseOpenProposals(entry, { at: 'now', replacementId: 'new' })
  assert.ok(entry.proposals.slice(0, 3).every(batch => batch.cancelledAt === 'now' && batch.supersededBy === 'new'))
  assert.deepEqual(entry.proposals[3], { id: 'booked', selectedSlot: '2030-01-01' })
  assert.deepEqual(entry.proposals[4], { id: 'cancelled', cancelledAt: 'old' })
})

test('Neue Projektvorschläge lassen andere Projekte und Buchungen unberührt', () => {
  const entry={proposals:[{id:'p1-old',projectId:'p1'},{id:'p2-open',projectId:'p2'},{id:'p1-booked',projectId:'p1',selectedSlot:'2030-01-01'}]}
  releaseOpenProposals(entry,{at:'now',replacementId:'p1-new',projectId:'p1'})
  assert.equal(entry.proposals[0].cancelledAt,'now')
  assert.equal(entry.proposals[0].supersededBy,'p1-new')
  assert.equal(entry.proposals[1].cancelledAt,undefined)
  assert.equal(entry.proposals[2].cancelledAt,undefined)
})

test('Live-Filter kombinieren Suchwörter, Anfrageart und Status', () => {
  const values = { requestType: 'touchup', status: 'In Klärung' }
  assert.equal(matchesOverview('Müller, Arm, Nachstechen', 'muller arm', values, { requestType: 'touchup', status: 'In Klärung' }), true)
  assert.equal(matchesOverview('Müller, Arm, Nachstechen', '', values, { requestType: 'new' }), false)
  assert.equal(matchesOverview('Müller, Arm, Nachstechen', 'be in', values, {}), false)
  assert.equal(matchesOverview('Müller, Arm, Nachstechen', '', values, { requestType: '', status: '' }), true)
})

test('Vorschlagshistorie umfasst abgelaufene Blöcke, andere Anfragen desselben Kunden und gleiche Zeitpunkte in anderen Zeitzonen', () => {
  const entry = { id: 'one', email: 'kunde@example.test', proposedSlotHistory: ['2030-01-12T10:00:00Z'], proposals: [{ cancelledAt: '2029-01-01', slots: ['2030-01-13T11:00:00+01:00'] }] }
  const history = previouslyProposedSlots(entry, [{ id: 'two', email: ' KUNDE@example.test ', proposals: [{ slots: ['2030-01-14T10:00:00Z'] }] }, { id: 'other', email: 'other@example.test', proposals: [{ slots: ['2030-01-15T10:00:00Z'] }] }])
  assert.equal(history.size, 3)
  assert.ok(history.has(new Date('2030-01-13T10:00:00Z').getTime()))
  assert.ok(history.has(new Date('2030-01-14T10:00:00Z').getTime()))
  assert.equal(history.has(new Date('2030-01-15T10:00:00Z').getTime()), false)
})

test('Alle Vorschlagsmails enthalten den Hinweis auf die nächstmöglichen Termine ohne doppelte Hinweise', () => {
  for (const label of ['Termin auswählen', 'Neuen Termin auswählen', 'Termin auswählen oder neue Vorschläge anfordern', 'Neue Termine anfordern']) {
    const text = proposalMailText('Hallo, hier sind deine Termine.', 'https://tattoosfumato.de/terminvorschlaege?token=test', label)
    assert.ok(text.includes(earliestProposalNotice))
    assert.match(text, /von Rückfragen nach einem früheren Termin ab/)
    assert.equal(proposalMailText(text, 'https://tattoosfumato.de/terminvorschlaege?token=test', label), text)
  }
  assert.equal(proposalMailText('Bilder bitte', '/bilder-hochladen?token=test', 'Bilder hochladen'), 'Bilder bitte')
  assert.ok(proposalMailText('Hier sind drei neue Terminvorschläge:\n• Montag', '', '').includes(earliestProposalNotice))
  const reminder = proposalMailText('Dein Link läuft morgen ab.', '/terminvorschlaege?token=test', 'Termin auswählen oder neue Vorschläge anfordern')
  assert.ok(!reminder.includes('7 Tage'))
})

test('Anfrage gilt nur nach einer bestätigten Speicherung als erfolgreich', async () => {
  const payload = { name: 'Test', idea: 'Motiv' }
  for (const response of [new Response('Serverfehler', { status: 500 }), new Response('{}', { status: 200 }), new Response(JSON.stringify({ error: 'Bild fehlt.' }), { status: 400 })]) {
    await assert.rejects(sendBookingRequest(payload, async () => response))
    assert.deepEqual(payload, { name: 'Test', idea: 'Motiv' })
  }
  const entry = await sendBookingRequest(payload, async () => new Response(JSON.stringify({ id: 'REQ-saved', ...payload }), { status: 201 }))
  assert.equal(entry.id, 'REQ-saved')
})
