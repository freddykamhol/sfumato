import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root=fileURLToPath(new URL('..',import.meta.url))
const directory=join(root,'tmp')
await mkdir(directory,{recursive:true})
await writeFile(join(directory,'restart.txt'),new Date().toISOString(),'utf8')
console.log('[deploy] Passenger-Neustart angefordert.')
