import type { PrintScheduleDocument, PrintWeekRow } from '../types/documents'
import type { EnrichedEntry, Group, ScheduleEntry, ScheduleMeta } from '../types/schedule'
import { clusterEntries } from './scheduleClusters'
import { slotLabel, slotToDayPeriod } from './slots'

export function buildPrintWeekRows(
  entries: ScheduleEntry[],
  groups: Group[],
  meta: ScheduleMeta,
  mode: 'group' | 'teacher',
): Array<{ day: string; rows: PrintWeekRow[] }> {
  const groupById = new Map(groups.map((g) => [g.id, g]))
  const enriched = entries as EnrichedEntry[]

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
        }
      })
      .sort((a, b) => a.period - b.period)

    return { day, rows }
  })
}

export function downloadJsonFile(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function printScheduleDocumentHtml(doc: PrintScheduleDocument): void {
  const rowsHtml = doc.weeks
    .map(
      ({ day, rows }) => `
      <section class="day-block">
        <h3>${day}</h3>
        ${
          rows.length === 0
            ? '<p class="empty">—</p>'
            : `<table>
                <thead><tr><th>Слот</th>${doc.kind === 'teacher' ? '<th>Група</th>' : '<th>Викладач</th>'}<th>Предмет</th><th>Ауд.</th></tr></thead>
                <tbody>
                  ${rows
                    .map(
                      (row) => `<tr>
                        <td>${row.slot}${row.parallel ? ' · поділ' : ''}</td>
                        <td>${doc.kind === 'teacher' ? row.groupCode : row.teacher}</td>
                        <td>${row.subject}</td>
                        <td>${row.room}</td>
                      </tr>`,
                    )
                    .join('')}
                </tbody>
              </table>`
        }
      </section>`,
    )
    .join('')

  const html = `<!doctype html>
<html lang="uk"><head><meta charset="utf-8"><title>${doc.title}</title>
<style>
  body { font-family: Segoe UI, Arial, sans-serif; margin: 24px; color: #111; }
  h1 { margin: 0 0 6px; font-size: 1.35rem; }
  .meta { color: #555; font-size: 0.9rem; margin-bottom: 20px; }
  .day-block { break-inside: avoid; margin-bottom: 18px; }
  h3 { margin: 0 0 8px; font-size: 1rem; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f3f4f6; }
  .empty { color: #888; }
  @media print { body { margin: 12mm; } }
</style></head>
<body>
  <h1>${doc.title}</h1>
  <div class="meta">
    ${doc.kind === 'group' ? 'Група' : 'Викладач'}: <strong>${doc.targetName}</strong> ·
    збережено ${new Date(doc.savedAt).toLocaleString('uk-UA')} · ${doc.savedBy}
    ${doc.note ? `<br>Примітка: ${doc.note}` : ''}
  </div>
  ${rowsHtml}
</body></html>`

  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
}
