import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const source = fileURLToPath(new URL('../index.source.html', import.meta.url))
const target = fileURLToPath(new URL('../index.html', import.meta.url))

copyFileSync(source, target)
const html = readFileSync(target, 'utf8').replace('<meta name="theme-color" content="#0b0b0b">', '<meta name="theme-color" content="#0b0b0b"><link rel="icon" href="/favicon.svg" type="image/svg+xml">').replaceAll('/studio-hero.webp', '/studiohero.webp')
writeFileSync(target, html)
console.log('[build] Source index prepared')
