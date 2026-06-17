import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const parentDir = path.resolve(rootDir, '..')

function findXlsxFile() {
  for (const dir of [parentDir, rootDir]) {
    const match = fs.readdirSync(dir).find((name) => name.toLowerCase().endsWith('.xlsx'))
    if (match) return path.join(dir, match)
  }
  throw new Error('Не знайдено .xlsx файл у робочій папці')
}

const resolvedPath = findXlsxFile()
const workbook = XLSX.readFile(resolvedPath)
const sheetName = workbook.SheetNames.includes('2025') ? '2025' : workbook.SheetNames[0]
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' })

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт']
const PERIODS = 8
const TOTAL_SLOTS = DAYS.length * PERIODS
const ROOMS = ['101', '102', '201', '202', '301', '302', '401', '402', '501', '502', '601', '602']
const groupPattern = /([A-ZА-ЯІЇЄҐ]{2,}\d{1,2})/g

function normalizeTeacher(value) {
  const teacher = String(value ?? '').trim()
  if (!teacher || teacher === 'В' || teacher.length < 3) return null
  if (teacher.toLowerCase().includes('прізвище') || teacher.toLowerCase().includes('викладач')) return null
  return teacher.replace(/\s+/g, ' ')
}

function normalizeSubject(value) {
  const subject = String(value ?? '').trim()
  if (!subject || subject.startsWith('РОЗПОДІЛ') || subject.length < 4) return null
  if (/^[\d\s.,]+$/.test(subject)) return null
  return subject.replace(/\*+/g, '').trim()
}

function hashString(input) {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash
}

function pickSlots(seed, count) {
  const slots = new Set()
  let cursor = seed
  while (slots.size < count) {
    slots.add((cursor % TOTAL_SLOTS) + 1)
    cursor = (cursor * 1103515245 + 12345) >>> 0
  }
  return [...slots]
}

const lessons = []
for (const row of rows) {
  const subject = normalizeSubject(row[0])
  const teacher = normalizeTeacher(row[1])
  if (!subject || !teacher) continue
  const groupMatches = [...`${row[0]} ${row[1]}`.matchAll(groupPattern)].map((m) => m[1])
  lessons.push({ subject, teacher, groupCode: groupMatches[0] ?? null })
}

const uniqueGroups = [...new Set(lessons.map((l) => l.groupCode).filter(Boolean))].slice(0, 12)
if (uniqueGroups.length === 0) {
  uniqueGroups.push('ГР1', 'ГР2', 'ГР3', 'ГР4', 'ГР5', 'ГР6', 'ГР7', 'ГР8')
}

const groupsMap = new Map()
uniqueGroups.forEach((code, index) => {
  groupsMap.set(code, {
    id: `g${index + 1}`,
    code,
    name: `Група ${code}`,
    specialty: code.slice(0, 2),
    course: Number.parseInt(code.match(/\d/)?.[0] ?? '1', 10),
    room: ROOMS[index % ROOMS.length],
  })
})

const groupedLessons = new Map()
for (const lesson of lessons) {
  const code = lesson.groupCode && groupsMap.has(lesson.groupCode) ? lesson.groupCode : uniqueGroups[0]
  if (!groupedLessons.has(code)) groupedLessons.set(code, [])
  groupedLessons.get(code).push(lesson)
}

const entries = []
let entryCounter = 0

for (const [groupCode, groupLessons] of groupedLessons.entries()) {
  const group = groupsMap.get(groupCode)
  groupLessons.slice(0, 18).forEach((lesson) => {
    pickSlots(hashString(`${groupCode}-${lesson.subject}-${lesson.teacher}`), 2).forEach((slotId, slotIndex) => {
      entryCounter += 1
      entries.push({
        id: `e${entryCounter}`,
        groupId: group.id,
        slotId,
        subject: lesson.subject.length > 42 ? `${lesson.subject.slice(0, 39)}...` : lesson.subject,
        teacher: lesson.teacher,
        room: slotIndex === 0 ? group.room : ROOMS[(hashString(lesson.teacher) + slotId) % ROOMS.length],
      })
    })
  })
}

if (entries.length > 8) {
  entries[3].slotId = entries[0].slotId
  entries[3].teacher = entries[0].teacher
  entries[7].slotId = entries[1].slotId
  entries[7].room = entries[1].room
}

const output = {
  meta: {
    sourceFile: path.basename(resolvedPath),
    generatedAt: new Date().toISOString(),
    note: 'Демо-розклад згенеровано з навчального плану. Слоти часу розподілено автоматично для перегляду 3D-моделі.',
    days: DAYS,
    periodsPerDay: PERIODS,
    totalSlots: TOTAL_SLOTS,
  },
  groups: [...groupsMap.values()],
  teachers: [...new Set(entries.map((entry) => entry.teacher))].map((name, index) => ({
    id: `t${index + 1}`,
    name,
  })),
  rooms: ROOMS.map((code, index) => ({ id: `r${index + 1}`, code })),
  entries,
}

const outPath = path.join(rootDir, 'src', 'data', 'schedule.json')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8')

console.log(`Імпортовано з: ${resolvedPath}`)
console.log(`Груп: ${output.groups.length}, занять: ${output.entries.length}`)
console.log(`Збережено: ${outPath}`)
