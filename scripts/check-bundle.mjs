// Verifica, após `vite build`, os orçamentos de bundle (docs/ARQUITETURA_TECNICA.md §4)
// e garante que o código do admin NÃO entra no carregamento inicial do site público.
import { readFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const DIST = 'dist'
const MANIFEST = join(DIST, '.vite', 'manifest.json')
const KB = 1024
const BUDGETS = { public: 120 * KB, admin: 150 * KB }

if (!existsSync(MANIFEST)) {
  console.error('Manifesto não encontrado. Rode `npm run build` antes.')
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
const gz = (file) => gzipSync(readFileSync(join(DIST, file))).length

/** Fecho das importações estáticas a partir de uma chave do manifesto. */
function staticClosure(key, seen = new Set()) {
  if (seen.has(key)) return seen
  seen.add(key)
  for (const dep of manifest[key]?.imports ?? []) staticClosure(dep, seen)
  return seen
}

function sizeOf(keys) {
  let js = 0
  let css = 0
  for (const key of keys) {
    const chunk = manifest[key]
    if (!chunk) continue
    if (chunk.file.endsWith('.js')) js += gz(chunk.file)
    for (const c of chunk.css ?? []) css += gz(c)
  }
  return { js, css }
}

const entryKey = Object.keys(manifest).find((k) => manifest[k].isEntry)
const publicKeys = staticClosure(entryKey)

const leaked = [...publicKeys].filter((k) => /^src\/(admin|modules)\//.test(manifest[k].src ?? k))
const adminKey = Object.keys(manifest).find((k) => k.endsWith('src/admin/AdminRoot.tsx'))
const adminKeys = adminKey ? [...staticClosure(adminKey)].filter((k) => !publicKeys.has(k)) : []

const pub = sizeOf(publicKeys)
const adm = sizeOf(adminKeys)
const fmt = (n) => `${(n / KB).toFixed(1)} kB`
let failed = false

console.log(`Público (inicial): JS ${fmt(pub.js)} gzip · CSS ${fmt(pub.css)} gzip · orçamento JS ${fmt(BUDGETS.public)}`)
console.log(`Admin (base):      JS ${fmt(adm.js)} gzip · CSS ${fmt(adm.css)} gzip · orçamento JS ${fmt(BUDGETS.admin)}`)

if (pub.js > BUDGETS.public) {
  console.error('✖ Bundle público acima do orçamento.')
  failed = true
}
if (adm.js > BUDGETS.admin) {
  console.error('✖ Bundle base do admin acima do orçamento.')
  failed = true
}
if (leaked.length) {
  console.error('✖ Código do admin no carregamento inicial do site público:', leaked)
  failed = true
}
if (!adminKey) {
  console.error('✖ Chunk do admin não encontrado — o lazy loading de /admin quebrou?')
  failed = true
}

// O manifesto só serve para esta checagem; não deve ser publicado na hospedagem.
rmSync(join(DIST, '.vite'), { recursive: true, force: true })

if (failed) process.exit(1)
console.log('✔ Orçamentos respeitados e admin isolado do bundle público.')
