import { readdir, readFile, writeFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'docs', 'listing-kodu.txt')

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.idea', '.vercel'])
const LISTING_EXTENSIONS = new Set(['.ts', '.tsx', '.css', '.html', '.js', '.mjs', '.json'])
const SKIP_FILES = new Set(['yarn.lock', 'package-lock.json'])
const TRUNCATE_FILES = new Map([
  ['src/data/schedule.json', 80],
])

function rel(filePath) {
  return filePath.replace(`${ROOT}${path.sep}`, '').replace(/\\/g, '/')
}

async function walk(dir, acc = []) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'uk'))) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      await walk(full, acc)
      continue
    }
    acc.push(full)
  }
  return acc
}

function buildTreeLines(allFiles) {
  const tree = {}
  for (const file of allFiles) {
    const parts = rel(file).split('/')
    let node = tree
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i]
      const isFile = i === parts.length - 1
      if (!node[part]) node[part] = isFile ? null : {}
      if (!isFile) node = node[part]
    }
  }

  const lines = ['schedule-3d/']
  function render(node, prefix = '') {
    const keys = Object.keys(node).sort((a, b) => a.localeCompare(b, 'uk'))
    keys.forEach((key, index) => {
      const last = index === keys.length - 1
      const branch = last ? '└── ' : '├── '
      const childPrefix = last ? '    ' : '│   '
      if (node[key] === null) {
        lines.push(`${prefix}${branch}${key}`)
      } else {
        lines.push(`${prefix}${branch}${key}/`)
        render(node[key], prefix + childPrefix)
      }
    })
  }
  render(tree)
  return lines
}

function padLineNo(n) {
  return String(n).padStart(4, ' ')
}

async function main() {
  const allFiles = await walk(ROOT)
  const treeLines = buildTreeLines(allFiles)

  const listingCandidates = allFiles
    .filter((file) => {
      const name = path.basename(file)
      if (SKIP_FILES.has(name)) return false
      const ext = path.extname(file).toLowerCase()
      if (!LISTING_EXTENSIONS.has(ext)) return false
      return true
    })
    .sort((a, b) => rel(a).localeCompare(rel(b), 'uk'))

  const parts = [
    'ЛІСТИНГ ПРОГРАМНОГО ЗАБЕЗПЕЧЕННЯ',
    'Проєкт: schedule-3d — інтерактивний 3D-інтерфейс для навігації та планування навчального процесу',
    `Дата формування: ${new Date().toLocaleString('uk-UA')}`,
    `Репозиторій: https://github.com/OpamLNL/schedule-3d`,
    '',
    '═══════════════════════════════════════════════════════════════════════════════',
    'РОЗДІЛ 1. ІЄРАРХІЯ ФАЙЛІВ ПРОЄКТУ',
    '(без node_modules, dist, .git, .idea)',
    '═══════════════════════════════════════════════════════════════════════════════',
    '',
    ...treeLines,
    '',
    'Примітки до ієрархії:',
    '  • yarn.lock — файл залежностей (не включено до лістингу коду)',
    '  • src/assets/*, public/* — графічні ресурси (png, svg)',
    '  • docs/*.mmd, docs/*.svg — діаграми документації',
    '',
    '═══════════════════════════════════════════════════════════════════════════════',
    'РОЗДІЛ 2. ЛІСТИНГ ВИХІДНОГО КОДУ',
    `(файли: ${listingCandidates.map(rel).join(', ')})`,
    '═══════════════════════════════════════════════════════════════════════════════',
    '',
  ]

  for (const file of listingCandidates) {
    const relative = rel(file)
    const raw = await readFile(file, 'utf8')
    const lines = raw.replace(/\r\n/g, '\n').split('\n')
    const limit = TRUNCATE_FILES.get(relative)
    const shown = limit ? lines.slice(0, limit) : lines
    const truncated = limit && lines.length > limit

    parts.push('')
    parts.push('─'.repeat(78))
    parts.push(`Файл: ${relative}`)
    parts.push(`Рядків: ${lines.length}${truncated ? ` (показано перші ${limit})` : ''}`)
    parts.push('─'.repeat(78))
    shown.forEach((line, index) => {
      parts.push(`${padLineNo(index + 1)} | ${line}`)
    })
    if (truncated) {
      parts.push(`${padLineNo(limit + 1)} | ... [скорочено, решта ${lines.length - limit} рядків]`)
    }
  }

  parts.push('')
  parts.push('═══════════════════════════════════════════════════════════════════════════════')
  parts.push('Кінець лістингу')
  parts.push('═══════════════════════════════════════════════════════════════════════════════')

  await writeFile(OUT, parts.join('\n'), 'utf8')
  const info = await stat(OUT)
  console.log(`Записано: ${OUT}`)
  console.log(`Розмір: ${(info.size / 1024).toFixed(1)} KB`)
  console.log(`Файлів у лістингу: ${listingCandidates.length}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
