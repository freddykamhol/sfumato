import { readFile } from 'node:fs/promises'
import { createHmac } from 'node:crypto'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const directory = process.env.DATA_DIRECTORY ? resolve(process.env.DATA_DIRECTORY) : join(root, 'data')
const secret = process.env.ADMIN_SESSION_SECRET || process.env.DEMO_PASSWORD || (await readFile(join(directory, 'application-secret'), 'utf8')).trim()
if (!secret) throw new Error('Anwendungsschlüssel fehlt. Die aktualisierte Anwendung muss zuerst gestartet werden.')
const token = createHmac('sha256', secret).update('proposal-reminders').digest('hex')
const base = String(process.env.PUBLIC_URL || 'https://tattoosfumato.de').replace(/\/$/, '')
const response = await fetch(`${base}/_internal/proposal-reminders`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(120000), redirect: 'error' })
if (!response.ok) throw new Error(`Erinnerungsprüfung fehlgeschlagen (HTTP ${response.status}).`)
console.log('Terminerinnerungen geprüft.')
