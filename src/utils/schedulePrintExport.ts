import type { PrintScheduleDocument, PrintWeekRow } from '../types/documents'
import type { EnrichedEntry, Group, ScheduleEntry, ScheduleMeta } from '../types/schedule'
import { enrichEntries } from './conflicts'
import { clusterEntries } from './scheduleClusters'
import { slotLabel, slotToDayPeriod } from './slots'

export function buildPrintWeekRows(
  entries: ScheduleEntry[],
  groups: Group[],
  meta: ScheduleMeta,
  mode: 'group' | 'teacher',
): Array<{ day: string; rows: PrintWeekRow[] }> {
  const groupById = new Map(groups.map((g) => [g.id, g]))
  const enriched = enrichEntries(entries) as EnrichedEntry[]
  const conflictIds = new Set(enriched.filter((e) => e.conflict !== 'none').map((e) => e.id))

  return meta.days.map((day) => {
    const dayEntries = enriched.filter((entry) => slotToDayPeriod(entry.slotId, meta).day === day)

    if (mode === 'group') {
      const rows = clusterEntries(dayEntries)
        .map((cluster) => {
          const { period } = slotToDayPeriod(cluster.primary.slotId, meta)
          return {
            slot: slotLabel(cluster.primary.slotId, meta),
            period,
            subject: cluster.subject,
            teacher: cluster.teachers.join(' · '),
            room: cluster.rooms.join(' · '),
            groupCode: groupById.get(cluster.primary.groupId)?.code ?? '?',
            parallel: cluster.parallel,
            teachers: cluster.teachers,
            hasConflict: cluster.entries.some((entry) => conflictIds.has(entry.id)),
          }
        })
        .sort((a, b) => a.period - b.period)
      return { day, rows }
    }

    const rows = dayEntries
      .map((entry) => {
        const { period } = slotToDayPeriod(entry.slotId, meta)
        return {
          slot: slotLabel(entry.slotId, meta),
          period,
          subject: entry.subject,
          teacher: entry.teacher,
          room: entry.room,
          groupCode: groupById.get(entry.groupId)?.code ?? '?',
          parallel: false,
          hasConflict: conflictIds.has(entry.id),
        }
      })
      .sort((a, b) => a.period - b.period)

    return { day, rows }
  })
}

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function shortSubject(subject: string, max = 42): string {
  const trimmed = subject.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}

function buildSubjectSummary(doc: PrintScheduleDocument): Array<{ subject: string; tags: string[] }> {
  const map = new Map<string, Set<string>>()

  for (const { rows } of doc.weeks) {
    for (const row of rows) {
      const key = row.subject.trim()
      if (!key) continue
      const tag = doc.kind === 'teacher' ? row.groupCode : row.teacher
      const set = map.get(key) ?? new Set<string>()
      set.add(tag)
      map.set(key, set)
    }
  }

  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'uk'))
    .map(([subject, tags]) => ({
      subject: shortSubject(subject, 48),
      tags: [...tags].sort((a, b) => a.localeCompare(b, 'uk')),
    }))
}

function renderLessonRow(doc: PrintScheduleDocument, row: PrintWeekRow & { hasConflict?: boolean }): string {
  const secondary =
    doc.kind === 'teacher'
      ? `<span class="tag group">${escapeHtml(row.groupCode)}</span>`
      : `<span class="tag teacher">${escapeHtml(row.teacher)}</span>`

  return `<li class="lesson${row.hasConflict ? ' conflict' : ''}${row.parallel ? ' parallel' : ''}">
    <div class="lesson-top">
      <span class="slot">${escapeHtml(row.slot)}${row.parallel ? ' · поділ' : ''}</span>
      ${secondary}
    </div>
    <div class="subject" title="${escapeHtml(row.subject)}">${escapeHtml(shortSubject(row.subject))}</div>
    <div class="room">${escapeHtml(row.room)}</div>
  </li>`
}

export function buildPrintScheduleHtml(doc: PrintScheduleDocument): string {
  const savedAt = new Date(doc.savedAt).toLocaleString('uk-UA')
  const subjectSummary = buildSubjectSummary(doc)
  const totalLessons = doc.weeks.reduce((sum, day) => sum + day.rows.length, 0)
  const kindLabel = doc.kind === 'group' ? 'Група' : 'Викладач'

  const gridHtml = doc.weeks
    .map(
      ({ day, rows }) => `<section class="day-col">
        <h2>${escapeHtml(day)}</h2>
        ${
          rows.length === 0
            ? '<p class="empty">—</p>'
            : `<ul class="lessons">${rows.map((row) => renderLessonRow(doc, row)).join('')}</ul>`
        }
      </section>`,
    )
    .join('')

  const summaryHtml =
    subjectSummary.length > 0
      ? `<section class="subjects">
          <h3>Предмети</h3>
          <div class="chips">
            ${subjectSummary
              .map(
                ({ subject, tags }) =>
                  `<div class="chip"><span class="chip-name">${escapeHtml(subject)}</span><span class="chip-tags">${tags.map((t) => `<span>${escapeHtml(t)}</span>`).join('')}</span></div>`,
              )
              .join('')}
          </div>
        </section>`
      : ''

  return `<!doctype html>
<html lang="uk">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(doc.title)}</title>
  <style>
    :root {
      --ink: #111827;
      --muted: #6b7280;
      --line: #d1d5db;
      --panel: #f9fafb;
      --accent: #2563eb;
      --warn: #dc2626;
      --warn-bg: #fef2f2;
      --parallel: #059669;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      font-family: "Segoe UI", system-ui, sans-serif;
      font-size: 11pt;
      background: #fff;
    }
    .print-doc { padding: 14mm 12mm 10mm; }
    .print-header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      border-bottom: 2px solid var(--ink);
      padding-bottom: 10px;
      margin-bottom: 14px;
    }
    h1 {
      margin: 0 0 4px;
      font-size: 1.45rem;
      line-height: 1.2;
    }
    .meta {
      margin: 0;
      color: var(--muted);
      font-size: 0.88rem;
      line-height: 1.45;
    }
    .meta strong { color: var(--ink); }
    .stats {
      text-align: right;
      font-size: 0.82rem;
      color: var(--muted);
      white-space: nowrap;
    }
    .stats strong {
      display: block;
      font-size: 1.1rem;
      color: var(--ink);
    }
    .week-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
      align-items: start;
    }
    .day-col {
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .day-col h2 {
      margin: 0;
      padding: 7px 8px;
      font-size: 0.82rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: var(--panel);
      border-bottom: 1px solid var(--line);
    }
    .lessons {
      list-style: none;
      margin: 0;
      padding: 6px;
      display: grid;
      gap: 6px;
    }
    .lesson {
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 6px 7px;
      background: #fff;
    }
    .lesson.conflict {
      border-color: var(--warn);
      background: var(--warn-bg);
    }
    .lesson.parallel { border-left: 3px solid var(--parallel); }
    .lesson-top {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      align-items: center;
      margin-bottom: 4px;
    }
    .slot {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--accent);
      letter-spacing: 0.02em;
    }
    .tag {
      font-size: 0.68rem;
      padding: 1px 5px;
      border-radius: 999px;
      border: 1px solid var(--line);
      background: var(--panel);
    }
    .tag.group { border-color: #c4b5fd; background: #f5f3ff; }
    .tag.teacher { border-color: #93c5fd; background: #eff6ff; }
    .subject {
      font-size: 0.78rem;
      font-weight: 600;
      line-height: 1.25;
      margin-bottom: 3px;
    }
    .room {
      font-size: 0.72rem;
      color: var(--muted);
    }
    .empty {
      margin: 0;
      padding: 12px 8px;
      color: var(--muted);
      text-align: center;
    }
    .subjects {
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px solid var(--line);
      break-inside: avoid;
    }
    .subjects h3 {
      margin: 0 0 8px;
      font-size: 0.85rem;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .chip {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 4px 6px;
      align-items: center;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 0.72rem;
      background: var(--panel);
    }
    .chip-name { font-weight: 600; }
    .chip-tags span {
      padding: 0 4px;
      border-radius: 4px;
      background: #fff;
      border: 1px solid var(--line);
    }
    .print-footer {
      margin-top: 10px;
      font-size: 0.72rem;
      color: var(--muted);
      text-align: center;
    }
    @page { size: A4 landscape; margin: 8mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .print-doc { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="print-doc">
    <header class="print-header">
      <div>
        <h1>${escapeHtml(doc.title)}</h1>
        <p class="meta">
          ${kindLabel}: <strong>${escapeHtml(doc.targetName)}</strong><br>
          Весняний семестр · ${escapeHtml(doc.meta.sourceFile || 'розклад')} · ${savedAt} · ${escapeHtml(doc.savedBy)}
          ${doc.note ? `<br>Примітка: ${escapeHtml(doc.note)}` : ''}
        </p>
      </div>
      <div class="stats">
        <strong>${totalLessons} ${totalLessons === 1 ? 'пара' : totalLessons < 5 ? 'пари' : 'пар'}</strong>
        на тиждень
      </div>
    </header>
    <div class="week-grid">${gridHtml}</div>
    ${summaryHtml}
    <footer class="print-footer">Згенеровано в schedule-3d · ${savedAt}</footer>
  </div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.focus(); window.print(); }, 150);
    });
  </script>
</body>
</html>`
}

function printHtmlInHiddenFrame(html: string): void {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const frameDoc = iframe.contentDocument ?? iframe.contentWindow?.document
  if (!frameDoc) {
    iframe.remove()
    return
  }

  frameDoc.open()
  frameDoc.write(html.replace(/<script[\s\S]*?<\/script>/gi, ''))
  frameDoc.close()

  const printFrame = () => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    window.setTimeout(() => iframe.remove(), 1500)
  }

  iframe.onload = printFrame
  window.setTimeout(printFrame, 300)
}

export function printScheduleDocumentHtml(doc: PrintScheduleDocument): void {
  const html = buildPrintScheduleHtml(doc)
  const win = window.open('', '_blank', 'noopener,noreferrer')
  if (!win) {
    printHtmlInHiddenFrame(html)
    return
  }

  win.document.open()
  win.document.write(html)
  win.document.close()
}

export function createPrintScheduleDocument(
  schedule: { meta: ScheduleMeta; groups: Group[] },
  kind: 'group' | 'teacher',
  targetName: string,
  title: string,
  entries: ScheduleEntry[],
  savedBy: string,
  note?: string,
): PrintScheduleDocument {
  return {
    id: 'print-preview',
    kind,
    targetName,
    title,
    savedAt: new Date().toISOString(),
    savedBy,
    note: note?.trim() || undefined,
    meta: schedule.meta,
    entries: structuredClone(entries),
    weeks: buildPrintWeekRows(entries, schedule.groups, schedule.meta, kind),
  }
}

function triggerTextDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function downloadJsonFile(data: unknown, filename: string): void {
  triggerTextDownload(JSON.stringify(data, null, 2), filename, 'application/json;charset=utf-8')
}

/** Той самий вміст, що JSON, але з розширенням .txt — Android частіше бачить такий файл. */
export function downloadTextFile(data: unknown, filename: string): void {
  triggerTextDownload(JSON.stringify(data, null, 2), filename, 'text/plain;charset=utf-8')
}
