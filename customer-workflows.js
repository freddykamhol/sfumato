import { randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export const DAY = 86400000
export const proposalExpiresAt = batch => new Date(batch.linkIssuedAt || batch.sentAt).getTime() + 7 * DAY
export const proposalExpired = (batch, now = Date.now()) => !(proposalExpiresAt(batch) > now)
export const sameToken = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length > 0 && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b))
export function savedCustomerToken(entry, path, params, token) {
  if (!token) return false
  return (entry?.emails || []).filter(mail => mail.direction === 'outbound').some(mail =>
    (String(mail.text || '').match(/https?:\/\/[^\s<>"']+/g) || []).some(link => {
      try {
        const url = new URL(link)
        return url.pathname === path && Object.entries(params).every(([key, value]) => url.searchParams.get(key) === value) && sameToken(url.searchParams.get('token'), token)
      } catch { return false }
    }))
}
export function persistentSecret(directory, configured) {
  if (configured) return configured
  mkdirSync(directory, { recursive: true })
  const path = join(directory, 'application-secret')
  try { writeFileSync(path, randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o600 }) } catch (error) { if (error.code !== 'EEXIST') throw error }
  const secret = readFileSync(path, 'utf8').trim()
  if (!secret) throw new Error('Der gespeicherte Anwendungsschlüssel ist leer.')
  return secret
}

// Apply only this workflow's changes to the latest entry. SMTP and image processing
// may take seconds; an administrator can edit or book the request in that time.
function mergeChanges(before, after, current) {
  if (JSON.stringify(before) === JSON.stringify(after)) return current
  if (Array.isArray(before) && Array.isArray(after) && Array.isArray(current)) {
    const key = value => value?.id || value?.url || JSON.stringify(value)
    const prior = new Map(before.map(item => [key(item), item])), next = new Map(after.map(item => [key(item), item]))
    const result = current.filter(item => !prior.has(key(item)) || next.has(key(item))).map(item => prior.has(key(item)) && next.has(key(item)) ? mergeChanges(prior.get(key(item)), next.get(key(item)), item) : item)
    const present = new Set(result.map(key))
    for (const item of after) if (!prior.has(key(item)) && !present.has(key(item))) { result.push(item); present.add(key(item)) }
    return result
  }
  if (before && after && current && typeof before === 'object' && typeof after === 'object' && typeof current === 'object' && !Array.isArray(after)) {
    const result = { ...current }
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (!(key in after)) { if (JSON.stringify(current[key]) === JSON.stringify(before[key])) delete result[key] }
      else if (!(key in before)) result[key] = Array.isArray(after[key]) && Array.isArray(current[key]) ? mergeChanges([], after[key], current[key]) : after[key]
      else result[key] = mergeChanges(before[key], after[key], current[key])
    }
    return result
  }
  return JSON.stringify(current) === JSON.stringify(before) || current === undefined ? after : current
}

export function customerWorkflows(deps) {
  const { saveRequests, readSettings, readAppointments, readImportedCalendarEvents, findAvailableProposalSlots, validateAppointmentSlot, sendRequestMail, proposalToken, htmlEscape: esc, uploadsDirectory, referenceWebp } = deps
  const snapshots = new WeakMap()
  const readRequests = async () => { const entries = await deps.readRequests(); for (const entry of entries) snapshots.set(entry, structuredClone(entry)); return entries }
  const locks = new Set()
  const publicUrl = () => String(process.env.PUBLIC_URL || 'https://tattoosfumato.de').replace(/\/$/, '')
  const tokenFor = (entry, batch) => batch.linkToken || proposalToken(entry.id, batch.id)
  const valid = (entry, batch, token) => sameToken(tokenFor(entry, batch), token) || (!batch.linkToken && savedCustomerToken(entry, '/terminvorschlaege', { anfrage: entry.id, batch: batch.id }, token))
  const urlFor = (entry, batch) => `${publicUrl()}/terminvorschlaege?${new URLSearchParams({ anfrage: entry.id, batch: batch.id, token: tokenFor(entry, batch) })}`
  const completed = (entry, batch) => Boolean(batch.selectedSlot || (batch.kind !== 'reschedule' && (batch.kind === 'consultation' ? entry.consultationAppointmentId : entry.bookedAppointmentId)))
  const logMail = (entry, sent) => { entry.emails = [...(entry.emails || []), { id: `MAIL-${randomBytes(12).toString('hex')}`, direction: 'outbound', to: entry.email, ...sent, createdAt: new Date().toISOString() }].slice(-200) }
  const event = (entry, title, text = '') => { entry.timeline = [...(entry.timeline || []), { title, text, createdAt: new Date().toISOString() }].slice(-200) }
  const page = (title, content) => `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)} · Tattoo Sfumato</title><style>*{box-sizing:border-box}body{margin:0;background:#10110f;color:#eee9df;font:16px Arial;min-height:100dvh;display:grid;place-items:center;padding:24px}main{width:min(620px,100%);padding:32px;background:#171815;border:1px solid #353630;border-radius:12px}h1{font:36px Georgia}p{line-height:1.7;color:#ccc}button{padding:16px;border:0;border-radius:6px;background:#eee9df;color:#171815;font-weight:bold;cursor:pointer}label{display:block;margin:24px 0}a{color:inherit}input[type=file]{max-width:100%}</style></head><body><main><small>TATTOO · SFUMATO</small><h1>${esc(title)}</h1>${content}</main></body></html>`
  const sendHtml = (res, html, status = 200) => { res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY', 'X-Content-Type-Options': 'nosniff' }); res.end(html) }
  const json = (res, data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)) }
  async function body(req, limit = 16000) {
    let value = '', bytes = 0
    for await (const chunk of req) { bytes += chunk.length; if (bytes > limit) throw new Error('Die Anfrage ist zu groß.'); value += chunk }
    return value
  }
  const form = (entryId, batchId, token, action, label) => `<form method="post" action="/terminvorschlaege"><input type="hidden" name="anfrage" value="${esc(entryId)}"><input type="hidden" name="batch" value="${esc(batchId)}"><input type="hidden" name="token" value="${esc(token)}"><button name="action" value="${action}">${label}</button></form>`
  async function persistEntry(entry) {
    const current = await readRequests(), index = current.findIndex(item => item.id === entry.id)
    if (index < 0) throw new Error('Diese Anfrage wurde gelöscht.')
    current[index] = mergeChanges(snapshots.get(entry) || {}, entry, current[index])
    await saveRequests(current)
    snapshots.set(entry, structuredClone(entry))
  }
  async function sendProposal(entry, batch, reminder = false) {
    const slots = batch.slots.map(slot => `• ${new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', dateStyle: 'full', timeStyle: 'short' }).format(new Date(slot))} Uhr`).join('\n')
    const text = reminder
      ? `Hallo ${entry.name?.split(/\s+/)[0] || ''},\n\ndeine Terminauswahl läuft morgen ab. Bitte entscheide dich für einen der drei Termine oder fordere über den Link neue Terminvorschläge an.\n\n${slots}`
      : `Hallo ${entry.name?.split(/\s+/)[0] || ''},\n\nhier sind deine Terminvorschläge:\n\n${slots}\n\nDies sind die frühestmöglichen Termine, die wir dir unter Berücksichtigung deiner Wünsche und der benötigten Zeit anbieten können. Bei einem erneut gesendeten Link bleiben die bereits vorgeschlagenen Termine unverändert.\n\nDer Link ist 7 Tage gültig. Bitte wähle in dieser Zeit einen Termin verbindlich aus oder fordere neue Terminvorschläge an. Nach Ablauf werden die reservierten Zeiten wieder freigegeben.`
    const sent = await sendRequestMail({ requestEntry: entry, to: entry.email, subject: reminder ? 'Erinnerung: Bitte wähle deinen Termin' : 'Deine Terminvorschläge – 7 Tage gültig', text, actionUrl: urlFor(entry, batch), actionLabel: 'Termin auswählen oder neue Vorschläge anfordern' })
    logMail(entry, sent)
    return sent
  }
  async function resend(entry, batch) {
    if (completed(entry, batch) || batch.cancelledAt) throw new Error('Dieser Vorschlagsblock ist bereits abgeschlossen. Bitte neue Vorschläge erstellen.')
    if (!batch.slots?.length) throw new Error('Dieser Block enthält keine Terminvorschläge.')
    const [appointments, settings] = await Promise.all([readAppointments(), readSettings()])
    await readImportedCalendarEvents(settings)
    for (const slot of batch.slots || []) {
      const start = new Date(slot), end = new Date(start.getTime() + (Number(batch.durationMinutes) || Number(batch.duration || 4) * 60) * 60000)
      if (!Number.isFinite(start.getTime()) || start <= new Date() || validateAppointmentSlot({ start, end, appointments, settings, excludeId: batch.appointmentId || '', label: `${entry.name} ${entry.style}` }).some(w => w.startsWith('SPERRE:'))) throw new Error('Diese Termine sind nicht mehr verfügbar. Bitte neue Termine anfordern oder erstellen.')
    }
    const next = { ...batch, linkToken: randomBytes(32).toString('base64url'), linkIssuedAt: new Date().toISOString(), reminderSentAt: null }
    await sendProposal(entry, next)
    Object.assign(batch, next)
    event(entry, 'Vorschlagslink neu generiert und gesendet')
    await persistEntry(entry)
  }
  async function requestNew(entry, batch) {
    if (completed(entry, batch)) return 'Für diese Vorschläge wurde bereits ein Termin gebucht.'
    if (batch.newProposalsRequestedAt) return 'Neue Terminvorschläge wurden bereits angefordert.'
    const settings = await readSettings(), now = new Date().toISOString()
    batch.newProposalsRequestedAt = now; batch.cancelledAt = now
    // Release the previous reservations before searching or attempting delivery.
    entry.status = 'Neu'; delete entry.readAt; entry.activityAt = now
    event(entry, 'Neue Terminvorschläge angefragt', 'Kunde bittet um neue Termine.')
    await persistEntry(entry)
    if (settings.calendar?.autoNewProposals) {
      const appointments = await readAppointments()
      await readImportedCalendarEvents(settings)
      const durationMinutes = Number(batch.durationMinutes) || Number(batch.duration || 4) * 60
      const after = new Date(Math.max(Date.now(), ...(batch.slots || []).map(slot => new Date(slot).getTime())))
      const { slots } = findAvailableProposalSlots({ entry, durationHours: durationMinutes / 60, after, appointments, settings })
      if (slots.length === 3) {
        const next = { id: `PROP-${randomBytes(12).toString('hex')}`, sentAt: now, linkIssuedAt: now, linkToken: randomBytes(32).toString('base64url'), kind: batch.kind || 'main', consultationType: batch.consultationType, appointmentId: batch.appointmentId, duration: durationMinutes / 60, durationMinutes, slots, automaticallyGenerated: true }
        try {
          await sendProposal(entry, next)
          entry.proposals = [...(entry.proposals || []), next]
          entry.status = next.kind === 'consultation' ? 'Beratung' : 'In Klärung'
          event(entry, 'Neue Terminvorschläge automatisch gesendet')
          await persistEntry(entry)
          return 'Drei neue Terminvorschläge wurden dir per E-Mail gesendet.'
        } catch (error) { event(entry, 'Automatischer Vorschlagsversand fehlgeschlagen', error.message); await persistEntry(entry) }
      }
    }
    return 'Deine Anfrage ist wieder beim Studio eingegangen. Wir senden dir neue Terminvorschläge.'
  }
  async function publicProposal(req, res, suppliedInput) {
    const input = suppliedInput || (req.method === 'POST' ? new URLSearchParams(await body(req)) : new URL(req.url, 'http://localhost').searchParams)
    const id = input.get('anfrage') || '', batchId = input.get('batch') || '', token = input.get('token') || ''
    const requests = await readRequests(), entry = requests.find(item => item.id === id), batch = entry?.proposals?.find(item => item.id === batchId)
    const authenticated = entry && batch && valid(entry, batch, token)
    if (req.method === 'GET') {
      if (!authenticated) { sendHtml(res, page('Link ungültig', `<p>Du kannst dir einen neuen Link an die in deiner Anfrage hinterlegte E-Mail-Adresse senden lassen. Die bisherigen Vorschläge bleiben dabei unverändert, sofern die Termine noch verfügbar sind.</p>${form(id, batchId, token, 'resend', 'Neuen Link generieren und senden')}`)); return true }
      if (completed(entry, batch)) { sendHtml(res, page('Termin bereits gebucht', '<p>Für diese Vorschläge wurde bereits ein Termin gebucht. Du findest die Einzelheiten in deiner Buchungsbestätigung.</p>')); return true }
      if (batch.cancelledAt || proposalExpired(batch)) { sendHtml(res, page('Terminvorschläge abgelaufen', `<p>Diese Terminauswahl ist nicht mehr verfügbar. Fordere hier neue Termine an.</p>${form(id, batchId, token, 'new', 'Neue Termine anfordern')}`)); return true }
      return false
    }
    const action = input.get('action') || 'book'
    // The existing booking handler consumes its own body; dispatch booking outside this handler.
    if (!['resend', 'new'].includes(action)) return { input, authenticated, entry, batch }
    if (!entry || !batch || (action === 'new' && !authenticated)) { sendHtml(res, page('Link erneuern', `<p>Falls eine passende Anfrage vorhanden ist, senden wir den Link ausschließlich an die dort hinterlegte E-Mail-Adresse.</p>${form(id, batchId, token, 'resend', 'Neuen Link generieren und senden')}`)); return true }
    if (locks.has(id)) throw new Error('Die Anfrage wird gerade verarbeitet. Bitte versuche es gleich erneut.')
    locks.add(id)
    try {
      if (action === 'resend') {
        if (Date.now() - new Date(batch.lastRecoveryAt || 0).getTime() > 15 * 60000) {
          batch.lastRecoveryAt = new Date().toISOString()
          await persistEntry(entry)
          try { await resend(entry, batch) } catch {
            // Recovery never displays a usable bearer token to an unauthenticated caller.
            const sent = await sendRequestMail({ requestEntry: entry, to: entry.email, subject: 'Bitte fordere neue Terminvorschläge an', text: 'Deine bisherigen Vorschläge sind nicht mehr verfügbar. Über den folgenden persönlichen Link kannst du neue Termine anfordern.', actionUrl: urlFor(entry, batch), actionLabel: 'Neue Termine anfordern' })
            logMail(entry, sent); await persistEntry(entry)
          }
        }
        sendHtml(res, page('E-Mail angefordert', '<p>Falls eine passende Anfrage vorhanden ist, erhältst du eine E-Mail an deine hinterlegte Adresse. Bitte prüfe auch deinen Spam-Ordner.</p>'))
      } else sendHtml(res, page('Neue Termine angefordert', `<p>${esc(await requestNew(entry, batch))}</p>`))
    } finally { locks.delete(id) }
    return true
  }
  const uploadPage = () => page('Bilder nachreichen', `<p>Lade Bilder zu deiner Idee oder Referenzbilder hoch. Maximal 5 Bilder, jeweils 10 MB (JPG, PNG oder WebP).</p><form id="upload"><label>Bilder auswählen<input required type="file" name="images" accept="image/jpeg,image/png,image/webp" multiple></label><label><input required type="checkbox" name="consent"> Ich stimme der Verarbeitung meiner Bilder zur Bearbeitung meiner Anfrage gemäß der <a href="/datenschutz/" target="_blank" rel="noopener">Datenschutzerklärung</a> zu.</label><button>Bilder hochladen und senden</button><p role="status"></p></form><script>document.querySelector('form').onsubmit=async e=>{e.preventDefault();const f=e.target,b=f.querySelector('button'),m=f.querySelector('[role=status]');b.disabled=true;try{const files=[...f.images.files];if(!files.length||files.length>5||files.some(x=>x.size>10000000))throw Error('Bitte 1 bis 5 Bilder mit jeweils maximal 10 MB auswählen.');const references=await Promise.all(files.map(file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve({name:file.name,data:r.result});r.onerror=reject;r.readAsDataURL(file)})));const response=await fetch(location.href,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({references,consent:f.consent.checked})}),result=await response.json();if(!response.ok)throw Error(result.error);f.innerHTML='<p>Danke! Deine Bilder sind eingegangen und wurden deiner Anfrage zugeordnet.</p>'}catch(error){m.textContent=error.message;b.disabled=false}};</script>`)
  async function upload(req, res) {
    const params = new URL(req.url, 'http://localhost').searchParams, id = params.get('anfrage'), token = params.get('token')
    const entry = (await readRequests()).find(item => item.id === id)
    if (!entry || !sameToken(entry.imageUpload?.token, token) || new Date(entry.imageUpload.expiresAt) <= new Date() || entry.imageUpload.usedAt) {
      if (req.method === 'POST') json(res, { error: 'Dieser Upload-Link ist nicht mehr verfügbar. Bitte beim Studio einen neuen Link anfordern.' }, 410)
      else sendHtml(res, page('Upload-Link nicht verfügbar', '<p>Bitte antworte auf die E-Mail des Studios und bitte um einen neuen Upload-Link.</p>'), 410)
      return
    }
    if (req.method === 'GET') { sendHtml(res, uploadPage()); return }
    if (req.method !== 'POST') { json(res, { error: 'Methode nicht erlaubt.' }, 405); return }
    if (locks.has(id)) throw new Error('Die Anfrage wird gerade verarbeitet.')
    locks.add(id)
    try {
      const input = JSON.parse(await body(req, 70000000))
      if (input.consent !== true) throw new Error('Bitte der Verarbeitung deiner Bilder zustimmen.')
      if (!Array.isArray(input.references) || !input.references.length || input.references.length > 5) throw new Error('Bitte 1 bis 5 Bilder hochladen.')
      const additions = []
      for (const reference of input.references) {
        const match = String(reference.data || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/)
        if (!match) throw new Error('Bitte nur JPG, PNG oder WebP hochladen.')
        const buffer = Buffer.from(match[2], 'base64')
        if (buffer.length > 10000000) throw new Error('Ein Bild überschreitet 10 MB.')
        additions.push({ name: String(reference.name || 'Referenz').replace(/[<>"']/g, '').slice(0, 180), content: await referenceWebp(buffer), filename: `${randomBytes(16).toString('hex')}.webp` })
      }
      await mkdir(join(uploadsDirectory, id), { recursive: true })
      const now = new Date().toISOString()
      for (const file of additions) await writeFile(join(uploadsDirectory, id, file.filename), file.content)
      entry.references = [...(entry.references || []), ...additions.map(file => ({ name: file.name, url: `/api/uploads/${id}/${file.filename}`, type: 'image/webp', size: file.content.length, uploadedAt: now, consentAt: now }))]
      entry.imageUpload.usedAt = now; entry.activityAt = now; delete entry.readAt
      event(entry, 'Bilder vom Kunden nachgereicht', `${additions.length} Bilder zur Anfrage hinzugefügt; Datenschutz-Zustimmung erteilt.`)
      await persistEntry(entry)
      json(res, { uploaded: additions.length })
    } catch (error) { json(res, { error: error.message }, 400) } finally { locks.delete(id) }
  }
  async function admin(req, res, pathname) {
    if (!['/api/proposals/resend', '/api/requests/request-images'].includes(pathname) || req.method !== 'POST') return false
    try {
      const input = JSON.parse(await body(req)), entry = (await readRequests()).find(item => item.id === input.requestId)
      if (!entry?.email) throw new Error('Anfrage mit E-Mail-Adresse nicht gefunden.')
      if (locks.has(entry.id)) throw new Error('Die Anfrage wird gerade verarbeitet.')
      locks.add(entry.id)
      try {
        if (pathname === '/api/proposals/resend') {
          const batch = entry.proposals?.find(item => item.id === input.batchId)
          if (!batch) throw new Error('Vorschlagsblock nicht gefunden.')
          await resend(entry, batch)
        } else {
          const upload = { token: randomBytes(32).toString('base64url'), expiresAt: new Date(Date.now() + 30 * DAY).toISOString() }
          const sent = await sendRequestMail({ requestEntry: entry, to: entry.email, subject: 'Bitte ergänze Bilder zu deiner Tattoo-Anfrage', text: `Hallo ${entry.name?.split(/\s+/)[0] || ''},\n\nbitte lade noch Bilder zu deiner Idee oder passende Referenzbilder hoch, damit wir deine Anfrage besser einschätzen können. Über deinen persönlichen Link kannst du bis zu fünf Bilder sicher nachreichen. Sie werden direkt deiner bestehenden Anfrage zugeordnet. Der Upload-Link ist 30 Tage gültig und kann einmal verwendet werden.`, actionUrl: `${publicUrl()}/bilder-hochladen?${new URLSearchParams({ anfrage: entry.id, token: upload.token })}`, actionLabel: 'Bilder hochladen und senden' })
          entry.imageUpload = upload; logMail(entry, sent); event(entry, 'Bilder angefordert'); await persistEntry(entry)
        }
        json(res, { entry })
      } finally { locks.delete(entry.id) }
    } catch (error) { json(res, { error: error.message }, 400) }
    return true
  }
  let running = false
  async function reminders() {
    if (running) return { running: true, failed: 0 }
    running = true
    let sent = 0, failed = 0
    try {
      for (const entry of await readRequests()) {
        if (locks.has(entry.id)) continue
        locks.add(entry.id)
        try {
          for (const batch of entry.proposals || []) {
            if (completed(entry, batch) || batch.cancelledAt || batch.reminderSentAt || proposalExpired(batch) || Date.now() < proposalExpiresAt(batch) - DAY) continue
            await sendProposal(entry, batch, true)
            batch.reminderSentAt = new Date().toISOString(); event(entry, 'Erinnerung zur Terminauswahl gesendet'); await persistEntry(entry)
            sent++
          }
        } catch (error) { failed++; console.error('[proposal-reminder]', error.message) } finally { locks.delete(entry.id) }
      }
    } finally { running = false }
    return { sent, failed }
  }
  return { publicProposal, upload, admin, reminders, valid, tokenFor, page, sendHtml, form }
}
