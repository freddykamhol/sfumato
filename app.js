import { createHmac, timingSafeEqual } from 'node:crypto'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const port = Number(process.env.PORT) || 3000
const sitePassword = process.env.DEMO_PASSWORD || 'Sfumato2026'
const cookieName = 'sfumato_site_auth'
const authToken = createHmac('sha256', sitePassword).update('sfumato-site-access').digest('hex')
const dataDirectory = join(root, 'data')
const requestsFile = join(dataDirectory, 'requests.json')
const appointmentsFile = join(dataDirectory, 'appointments.json')
const customerNotesFile = join(dataDirectory, 'customer-notes.json')
const uploadsDirectory = join(dataDirectory, 'uploads')

const readRequests = async () => {
  try { return JSON.parse(await readFile(requestsFile, 'utf8')) }
  catch (error) { if (error.code === 'ENOENT') return []; throw error }
}
const saveRequests = async requests => {
  await mkdir(dataDirectory, { recursive: true })
  await writeFile(requestsFile, JSON.stringify(requests, null, 2), 'utf8')
}
const readAppointments = async () => {
  try { return JSON.parse(await readFile(appointmentsFile, 'utf8')) }
  catch (error) { if (error.code === 'ENOENT') return []; throw error }
}
const saveAppointments = async appointments => {
  await mkdir(dataDirectory, { recursive: true })
  await writeFile(appointmentsFile, JSON.stringify(appointments, null, 2), 'utf8')
}
const readCustomerNotes = async () => {
  try { return JSON.parse(await readFile(customerNotesFile, 'utf8')) }
  catch (error) { if (error.code === 'ENOENT') return []; throw error }
}
const saveCustomerNotes = async notes => {
  await mkdir(dataDirectory, { recursive: true })
  await writeFile(customerNotesFile, JSON.stringify(notes, null, 2), 'utf8')
}
const cleanText = (value, max = 1000) => String(value || '').replace(/[<>]/g, '').trim().slice(0, max)
const sendJson = (response, status, payload) => {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(payload))
}

const loginPage = error => `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#0d0e0c"><title>Geschützter Bereich | Tattoo Sfumato</title>
<style>*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:28px;background:radial-gradient(circle at 78% 22%,#7e292248,transparent 35%),#0d0e0c;color:#f3efe7;font-family:Arial,sans-serif}.card{width:min(100%,520px);min-height:min(680px,calc(100dvh - 56px));padding:42px 46px;border:1px solid #33342f;background:#0f100ed9;display:flex;flex-direction:column;box-shadow:0 35px 90px #0006}.brand{font-size:12px;font-weight:700;letter-spacing:.24em}.brand i{color:#a93d34;font-style:normal}.copy{margin:auto 0 42px}.eyebrow{color:#aaa69c;font-size:8px;font-weight:700;letter-spacing:.22em}h1{margin:24px 0 18px;font-family:Georgia,serif;font-size:58px;font-weight:400;line-height:.98;letter-spacing:-.04em}h1 em{color:#a93d34;font-weight:400}p{margin:0;color:#aaa79f;font-size:13px;line-height:1.7}label{display:block;margin-bottom:8px;color:#aaa69c;font-size:8px;font-weight:700;letter-spacing:.18em}.input{border-bottom:1px solid #5a5a54}.input:focus-within{border-color:#b64a40}input{width:100%;height:52px;padding:0;border:0;outline:0;background:transparent;color:#fff;font-size:17px;letter-spacing:.06em}button{width:100%;height:54px;margin-top:14px;border:0;background:#f0ece4;color:#11120f;font-size:10px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;cursor:pointer}button:hover{background:#b6463d;color:#fff}.error{margin:10px 0 0;color:#df7168;font-size:11px}.footer{margin-top:30px;color:#666860;font-size:7px;font-weight:700;letter-spacing:.2em}@media(max-width:600px){body{padding:0}.card{min-height:100dvh;padding:30px 24px;border:0}h1{font-size:48px}}</style></head>
<body><main class="card"><div class="brand">TATTOO <i>·</i> SFUMATO</div><div class="copy"><div class="eyebrow">GESCHÜTZTER BEREICH</div><h1>Willkommen bei<br><em>Sfumato.</em></h1><p>Diese Seite ist derzeit nur mit Passwort zugänglich.</p></div><form method="post" action="/login"><label for="password">PASSWORT</label><div class="input"><input id="password" name="password" type="password" autocomplete="current-password" autofocus required></div>${error ? '<div class="error" role="alert">Das Passwort ist nicht korrekt.</div>' : ''}<button type="submit">Seite betreten →</button></form><div class="footer">TATTOO SFUMATO · EINBECK</div></main></body></html>`

const hasValidCookie = request => {
  const cookie = request.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`))
  const supplied = cookie?.slice(cookieName.length + 1) || ''
  const expectedBuffer = Buffer.from(authToken)
  const suppliedBuffer = Buffer.from(supplied)
  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer)
}

const passwordsMatch = supplied => {
  const expectedBuffer = Buffer.from(sitePassword)
  const suppliedBuffer = Buffer.from(supplied)
  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer)
}

const mimeTypes = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2',
}

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)

  if (pathname === '/health') {
    response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
    response.end('ok')
    return
  }

  if (pathname === '/login' && request.method === 'POST') {
    let body = ''
    request.on('data', chunk => { if (body.length < 4096) body += chunk })
    request.on('end', () => {
      const password = new URLSearchParams(body).get('password') || ''
      if (passwordsMatch(password)) {
        const secure = request.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''
        response.writeHead(303, {
          Location: '/',
          'Set-Cookie': [
            `${cookieName}=${authToken}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${secure}`,
            `sfumato_site_client=1; SameSite=Strict; Path=/; Max-Age=86400${secure}`,
          ],
          'Cache-Control': 'no-store',
        })
        response.end()
      } else {
        response.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
        response.end(loginPage(true))
      }
    })
    return
  }

  if (!hasValidCookie(request)) {
    response.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
    response.end(loginPage(false))
    return
  }

  if (pathname === '/api/requests' && request.method === 'GET') {
    readRequests().then(requests => sendJson(response, 200, requests)).catch(() => sendJson(response, 500, { error: 'Anfragen konnten nicht geladen werden.' }))
    return
  }

  if (pathname === '/api/appointments' && request.method === 'GET') {
    readAppointments().then(appointments => sendJson(response, 200, appointments)).catch(() => sendJson(response, 500, { error: 'Termine konnten nicht geladen werden.' }))
    return
  }

  if (pathname === '/api/customer-notes' && request.method === 'GET') {
    readCustomerNotes().then(notes => sendJson(response, 200, notes)).catch(() => sendJson(response, 500, { error: 'Kundennotizen konnten nicht geladen werden.' }))
    return
  }

  if (pathname === '/api/customer-notes' && request.method === 'POST') {
    let body = ''
    request.on('data', chunk => { if (body.length < 100000) body += chunk })
    request.on('end', async () => {
      try {
        const input = JSON.parse(body)
        const allowedCategories = ['Allgemein','Motiv & Stil','Gesundheit','Vorbereitung','Nachsorge','Zahlung']
        const allowedRelevance = ['normal','wichtig','kritisch']
        const entry = { id: `NOTE-${Date.now().toString(36).toUpperCase()}`, customerKey: cleanText(input.customerKey, 220).toLowerCase(), category: allowedCategories.includes(input.category) ? input.category : 'Allgemein', relevance: allowedRelevance.includes(input.relevance) ? input.relevance : 'normal', text: cleanText(input.text, 4000), createdAt: new Date().toISOString() }
        if (!entry.customerKey || !entry.text) return sendJson(response, 400, { error: 'Kunde und Notiztext werden benötigt.' })
        const notes = await readCustomerNotes(); notes.unshift(entry); await saveCustomerNotes(notes.slice(0, 5000)); sendJson(response, 201, entry)
      } catch { sendJson(response, 400, { error: 'Kundennotiz konnte nicht gespeichert werden.' }) }
    })
    return
  }

  if (pathname === '/api/appointments' && request.method === 'POST') {
    let body = ''
    request.on('data', chunk => { if (body.length < 100000) body += chunk })
    request.on('end', async () => {
      try {
        const input = JSON.parse(body)
        const start = new Date(input.start), end = new Date(input.end)
        if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return sendJson(response, 400, { error: 'Ungültiger Terminzeitraum.' })
        const entry = { id: `APT-${Date.now().toString(36).toUpperCase()}`, clientName: cleanText(input.clientName, 120), email: cleanText(input.email, 180), phone: cleanText(input.phone, 60), style: cleanText(input.style, 80), placement: cleanText(input.placement, 160), notes: cleanText(input.notes, 4000), requestId: cleanText(input.requestId, 80), source: cleanText(input.source, 30) || 'studio', start: start.toISOString(), end: end.toISOString(), createdAt: new Date().toISOString() }
        if (!entry.clientName) return sendJson(response, 400, { error: 'Kundenname fehlt.' })
        const appointments = await readAppointments(); appointments.push(entry); await saveAppointments(appointments); sendJson(response, 201, entry)
      } catch { sendJson(response, 400, { error: 'Termin konnte nicht gespeichert werden.' }) }
    })
    return
  }

  const readRequestMatch = pathname.match(/^\/api\/requests\/([^/]+)\/read$/)
  if (readRequestMatch && request.method === 'PATCH') {
    readRequests().then(async requests => {
      const requestEntry = requests.find(entry => entry.id === decodeURIComponent(readRequestMatch[1]))
      if (!requestEntry) return sendJson(response, 404, { error: 'Anfrage nicht gefunden.' })
      requestEntry.readAt = requestEntry.readAt || new Date().toISOString()
      await saveRequests(requests)
      sendJson(response, 200, { id: requestEntry.id, readAt: requestEntry.readAt })
    }).catch(() => sendJson(response, 500, { error: 'Lesestatus konnte nicht gespeichert werden.' }))
    return
  }

  if (pathname === '/api/requests' && request.method === 'POST') {
    let body = ''
    let tooLarge = false
    request.on('data', chunk => {
      if (!tooLarge) body += chunk
      if (body.length > 75000000) tooLarge = true
    })
    request.on('end', async () => {
      if (tooLarge) return sendJson(response, 413, { error: 'Anfrage ist zu groß.' })
      try {
        const input = JSON.parse(body)
        const requestId = `LT-${Date.now().toString().slice(-7)}`
        const references = []
        const incomingReferences = Array.isArray(input.references) ? input.references.slice(0, 5) : []
        if (incomingReferences.length) await mkdir(join(uploadsDirectory, requestId), { recursive: true })
        for (const [index, reference] of incomingReferences.entries()) {
          const match = String(reference.data || '').match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/)
          if (!match) continue
          const buffer = Buffer.from(match[2], 'base64')
          if (buffer.length > 10000000) continue
          const extension = match[1] === 'image/jpeg' ? '.jpg' : match[1] === 'image/png' ? '.png' : '.webp'
          const filename = `${String(index + 1).padStart(2, '0')}${extension}`
          await writeFile(join(uploadsDirectory, requestId, filename), buffer)
          references.push({ name: cleanText(reference.name, 180) || filename, url: `/api/uploads/${requestId}/${filename}`, type: match[1] })
        }
        const entry = {
          id: requestId,
          name: cleanText(input.name, 120), email: cleanText(input.email, 180), phone: cleanText(input.phone, 60),
          style: cleanText(input.style, 80) || 'Nicht angegeben', placement: cleanText(input.placement, 160),
          size: cleanText(input.size, 80), idea: cleanText(input.idea, 4000),
          consultation: Boolean(input.consultation), consultationType: cleanText(input.consultationType, 30),
          references, date: new Date().toISOString(), status: 'Neu', source: 'form',
        }
        if (!entry.name || !entry.email || !entry.placement || !entry.size || !entry.idea) return sendJson(response, 400, { error: 'Bitte alle Pflichtfelder ausfüllen.' })
        const requests = await readRequests()
        requests.unshift(entry)
        await saveRequests(requests.slice(0, 1000))
        sendJson(response, 201, entry)
      } catch { sendJson(response, 400, { error: 'Anfrage konnte nicht verarbeitet werden.' }) }
    })
    return
  }

  if (pathname.startsWith('/api/uploads/') && request.method === 'GET') {
    const uploadPath = normalize(pathname.slice('/api/uploads/'.length)).replace(/^([/\\])+/, '')
    const filePath = join(uploadsDirectory, uploadPath)
    if (relative(uploadsDirectory, filePath).startsWith('..') || !existsSync(filePath) || statSync(filePath).isDirectory()) return sendJson(response, 404, { error: 'Bild nicht gefunden.' })
    const extension = extname(filePath).toLowerCase()
    response.writeHead(200, { 'Content-Type': mimeTypes[extension] || 'application/octet-stream', 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' })
    createReadStream(filePath).pipe(response)
    return
  }

  const relativePath = normalize(pathname).replace(/^([/\\])+/, '')
  let filePath = join(root, relativePath || 'index.html')
  const escapedRoot = relative(root, filePath).startsWith('..')
  if (escapedRoot || !existsSync(filePath) || statSync(filePath).isDirectory()) filePath = join(root, 'index.html')

  const extension = extname(filePath).toLowerCase()
  response.writeHead(200, {
    'Content-Type': mimeTypes[extension] || 'application/octet-stream',
    'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  })
  if (request.method === 'HEAD') response.end()
  else createReadStream(filePath).pipe(response)
}).listen(port, '0.0.0.0', () => console.log(`Sfumato site running on port ${port}`))
