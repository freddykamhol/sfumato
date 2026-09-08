import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { performance } from 'node:perf_hooks'
import { previouslyProposedSlots } from '../proposal-history.js'
import { proposalExpired } from '../customer-workflows.js'

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8')
const current = source.slice(source.indexOf('const berlinPartsFormatter='), source.indexOf('const xmlEscape=')) + '\n' + source.split('\n').find(line => line.startsWith('const berlinDateFromParts='))
const before = readFileSync(new URL('./fixtures/scheduler-before.txt', import.meta.url), 'utf8')
const fixedNow = new Date('2029-12-01T12:00:00Z').getTime()
class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [fixedNow])) } static now() { return fixedNow } }
function scheduler(code, requests, imports = []) {
  const context = { Date: FixedDate, Intl, requestCache: requests, calendarImportCache: new Map([['test', { events: imports }]]), previouslyProposedSlots, proposalExpired }
  return runInNewContext(`${code}\n({ findAvailableProposalSlots, validateAppointmentSlot })`, context)
}
const settings = () => ({ absences: [], guestArtistPeriods: [], calendar: { hours: Array.from({ length: 7 }, () => ({ enabled: true, start: '10:00', end: '18:00' })), beforeMinutes: 30, afterMinutes: 30, overtimeHours: 2, rules: [] } })
const request = () => ({ id: 'REQ-test', name: 'Test Kunde', email: 'test@example.test', style: 'Fineline', proposalTimePreference: 'any', proposals: [] })
const plain = value => JSON.parse(JSON.stringify(value))

test('Beschleunigte Suche liefert dieselben Slots und Regelhinweise wie die vorherige Version', () => {
  const cases = []
  for (const preference of ['any', 'morning', 'midday', 'afternoon']) {
    const entry = { ...request(), proposalTimePreference: preference }, config = settings()
    config.absences = [{ start: '2030-03-25', end: '2030-03-26', type: 'urlaub' }, { start: '2030-03-27', end: '2030-03-28', type: 'krank' }]
    entry.proposals = [{ id: 'old', sentAt: '2029-11-01', cancelledAt: '2029-11-10', slots: ['2030-03-29T09:00:00Z'] }]
    cases.push({ entry, settings: config, appointments: [], durationHours: 4, after: '2030-03-24T12:00:00Z' })
  }
  const guest = { ...request(), appointmentLocationId: 'guest', lastOfDay: true }, guestSettings = settings()
  guestSettings.guestArtistPeriods = [{ id: 'guest', start: '2030-10-24', end: '2030-11-10', startTime: '12:00', endTime: '18:00' }]
  guestSettings.calendar.rules = [{ type: 'weekday', value: 1, label: 'Montags gesperrt' }, { type: 'time', value: '13:00', operator: 'before' }]
  cases.push({ entry: guest, settings: guestSettings, appointments: [{ id: 'last', clientName: 'Tagesabschluss', start: '2030-10-25T13:00:00Z', end: '2030-10-25T15:00:00Z', lastOfDay: true }], durationHours: 2, after: '2030-10-23T12:00:00Z' })
  const earliest = settings(); earliest.calendar.newAppointmentsFrom = '2030-01-05'; earliest.calendar.rules = [{ type: 'lead', value: 35 }]
  cases.push({ entry: request(), settings: earliest, appointments: [], durationHours: 1, after: '2030-01-01T12:00:00Z', weekday: '2' })
  for (const data of cases) {
    const other = { id: 'OTHER', name: 'Andere Kundin', proposals: [{ id: 'reserved', sentAt: new Date().toISOString(), slots: ['2030-03-29T09:00:00Z'], duration: 4 }] }
    const requests = [data.entry, other], imports = [{ id: 'import', source: 'calendar-import', status: 'Blockiert', start: '2030-03-30T09:00:00Z', end: '2030-03-30T17:00:00Z' }]
    assert.deepEqual(plain(scheduler(current, requests, imports).findAvailableProposalSlots(data)), plain(scheduler(before, requests, imports).findAvailableProposalSlots(data)))
  }
})

test('Laufzeitvergleich mit belegtem Kalender; Verfügbarkeit wird bei jeder Suche neu geprüft', t => {
  const entry = request(), config = settings(), appointments = Array.from({ length: 24 }, (_, index) => ({ id: `APT-${index}`, clientName: `Kunde ${index}`, start: new Date(Date.UTC(2030, 0, index + 2, 8)).toISOString(), end: new Date(Date.UTC(2030, 0, index + 2, 19)).toISOString() }))
  const data = { entry, settings: config, appointments, after: '2030-01-01T12:00:00Z', durationHours: 4 }
  const legacy = scheduler(before, [entry]), optimized = scheduler(current, [entry])
  let start = performance.now(); const expected = legacy.findAvailableProposalSlots(data); const oldMs = performance.now() - start
  start = performance.now(); const result = optimized.findAvailableProposalSlots(data); const newMs = performance.now() - start
  assert.deepEqual(plain(result), plain(expected))
  t.diagnostic(`24 belegte Tage: vorher ${oldMs.toFixed(1)} ms, nachher ${newMs.toFixed(1)} ms, Faktor ${(oldMs / newMs).toFixed(1)}`)
  // No timing assertion: loaded CI machines should not create flaky test failures.
  const first = result.slots[0]
  appointments.push({ id: 'new-booking', start: first, end: new Date(new Date(first).getTime() + 4 * 3600000).toISOString() })
  assert.ok(!optimized.findAvailableProposalSlots(data).slots.includes(first))
})
