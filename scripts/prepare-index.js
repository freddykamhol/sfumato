import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const source = fileURLToPath(new URL('../index.source.html', import.meta.url))
const target = fileURLToPath(new URL('../index.html', import.meta.url))

copyFileSync(source, target)
const html = readFileSync(target, 'utf8').replace('<meta name="theme-color" content="#0b0b0b">', '<meta name="theme-color" content="#0b0b0b"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">').replaceAll('/studio-hero.webp', '/studiohero.webp').replaceAll('+49 1573 4408549', '+49 178 3258987')
writeFileSync(target, html)
console.log('[build] Source index prepared')
