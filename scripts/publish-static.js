import { cpSync, copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
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

for (const route of ['admin', 'admin/anfragen', 'admin/referenzen', 'admin/einstellungen', 'admin/termin-neu', 'admin/terminakten', 'admin/kunden']) {
  const routeRoot = join(projectRoot, route)
  mkdirSync(routeRoot, { recursive: true })
  copyFileSync(join(distRoot, 'index.html'), join(routeRoot, 'index.html'))
}

console.log(`[build] Static root published: ${basename(projectRoot)}`)
