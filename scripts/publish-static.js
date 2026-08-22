import { cpSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const distRoot = join(projectRoot, 'dist')

if (!existsSync(join(distRoot, 'index.html'))) {
  console.error('[build] dist/index.html is missing')
  process.exit(1)
}

const publishedAssets = join(projectRoot, 'assets')
if (existsSync(publishedAssets)) {
  for (const file of readdirSync(publishedAssets)) {
    if (/^index-.*\.(css|js)$/.test(file)) {
      rmSync(join(publishedAssets, file))
    }
  }
}

for (const entry of readdirSync(distRoot)) {
  const source = join(distRoot, entry)
  const target = join(projectRoot, entry)

  if (statSync(source).isDirectory()) {
    mkdirSync(target, { recursive: true })
    cpSync(source, target, { recursive: true, force: true })
  } else {
    copyFileSync(source, target)
  }
}

for (const route of ['referenzen', 'admin', 'admin/login', 'admin/anfragen', 'admin/referenzen', 'admin/einstellungen', 'admin/einstellungen/schnittstellen', 'admin/einstellungen/benutzer', 'admin/einstellungen/kalender', 'admin/termin-neu', 'admin/terminakten', 'admin/kunden']) {
  const routeRoot = join(projectRoot, route)
  mkdirSync(routeRoot, { recursive: true })
  const routeIndex = join(routeRoot, 'index.html')
  copyFileSync(join(distRoot, 'index.html'), routeIndex)
  let html = readFileSync(routeIndex, 'utf8')
  if (route === 'referenzen') {
    html = html
      .replace('Tattoo Einbeck | Tattoo Sfumato – Realistic, Microrealism & Fineline', 'Tattoo Referenzen aus Einbeck | Tattoo Sfumato')
      .replace('https://tattoosfumato.de/"', 'https://tattoosfumato.de/referenzen/"')
      .replace('Tattoo Sfumato – dein Tattoo-Studio in Einbeck für Realistic, Microrealism und Fineline. Individuelle Tattoos in familiärer Atmosphäre.', 'Tattoo-Referenzen von Tattoo Sfumato in Einbeck: Realistic, Microrealism und Fineline. Entdecke ausgewählte Arbeiten aus unserem Studio.')
  } else if (route.startsWith('admin')) {
    html = html.replace('content="index,follow,max-image-preview:large"', 'content="noindex,nofollow,noarchive"')
  }
  writeFileSync(routeIndex, html)
}

console.log(`[build] Static root published: ${basename(projectRoot)}`)
