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

console.log(`[build] Static root published: ${basename(projectRoot)}`)
