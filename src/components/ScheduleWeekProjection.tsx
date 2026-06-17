import type { EnrichedEntry, Group, ScheduleMeta } from '../types/schedule'
import { describeConflictsForEntry, type DescribedConflict } from '../utils/conflicts'
import { clusterEntries, clusterKeyForGroup } from '../utils/scheduleClusters'
import { parallelSubjectKey } from '../utils/parallelSubgroups'
import { slotLabel, slotToDayPeriod } from '../utils/slots'

type ScheduleWeekProjectionProps = {
  title: string
  entries: EnrichedEntry[]
  groups: Group[]
  meta: ScheduleMeta
  /** teacher — показувати групу; group — показувати викладача */
  mode: 'teacher' | 'group'
  /** Очікування з навплану (для порівняння) */
  expectedBySubject?: Array<{
    subject: string
    groups: Array<{ code: string; pairsPerWeek: number }>
  }>
}

function shortSubject(subject: string, max = 28): string {
  const trimmed = subject.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}

function clusterKey(entry: EnrichedEntry): string {
  return `s|${entry.id}`
}

type WeekListItem = {
  key: string
  slot: string
  period: number
  group: string
  teachers: string[]
  subject: string
  fullSubject: string
  rooms: string[]
  hasConflict: boolean
  conflictWith: string[]
  parallel: boolean
}

function formatConflictLine(item: DescribedConflict): string {
  return `[${item.reasonLabel}] ${item.summary}`
}

function uniqueConflictLines(items: DescribedConflict[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of items) {
    const line = formatConflictLine(item)
    if (seen.has(line)) continue
    seen.add(line)
    result.push(line)
  }
  return result
}

function buildWeekListItems(
  dayEntries: EnrichedEntry[],
  meta: ScheduleMeta,
  groupById: Map<string, Group>,
  allEntries: EnrichedEntry[],
): WeekListItem[] {
  return clusterEntries(dayEntries)
    .map((cluster) => {
      const { period } = slotToDayPeriod(cluster.primary.slotId, meta)
      const conflictWith = uniqueConflictLines(
        cluster.entries.flatMap((entry) => describeConflictsForEntry(entry, allEntries, groupById)),
      )
      return {
        key: cluster.key,
        slot: slotLabel(cluster.primary.slotId, meta),
        period,
        group: groupById.get(cluster.primary.groupId)?.code ?? '?',
        teachers: cluster.teachers,
        subject: shortSubject(cluster.subject),
        fullSubject: cluster.subject,
        rooms: cluster.rooms,
        hasConflict: cluster.entries.some((e) => e.conflict !== 'none'),
        conflictWith,
        parallel: cluster.parallel,
      }
    })
    .sort((a, b) => a.period - b.period)
}

export function ScheduleWeekProjection({
  title,
  entries,
  groups,
  meta,
  mode,
  expectedBySubject,
}: ScheduleWeekProjectionProps) {
  const groupById = new Map(groups.map((g) => [g.id, g]))

  const actualBySubject = [...(() => {
    const map = new Map<string, { label: string; groups: Map<string, Set<string>> }>()
    for (const entry of entries) {
      const group = groupById.get(entry.groupId)?.code ?? '?'
      const pKey = parallelSubjectKey(entry.subject)
      if (!map.has(pKey)) {
        map.set(pKey, { label: entry.subject, groups: new Map() })
      }
      const row = map.get(pKey)!
      const slots = row.groups.get(group) ?? new Set<string>()
      slots.add(mode === 'group' ? clusterKeyForGroup(entry) : clusterKey(entry))
      row.groups.set(group, slots)
    }
    return map.values()
  })()]
    .sort((a, b) => b.groups.size - a.groups.size || a.label.localeCompare(b.label, 'uk'))
    .map(({ label, groups }) => ({
      subject: shortSubject(label, 36),
      fullSubject: label,
      tags: [...groups.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], 'uk'))
        .map(([code, slotKeys]) => ({ code, count: slotKeys.size })),
    }))

  const subjectSummary =
    mode === 'teacher' && expectedBySubject && expectedBySubject.length > 0
      ? expectedBySubject.map(({ subject, groups: expectedGroups }) => {
          const actual = actualBySubject.find(
            (item) =>
              item.fullSubject === subject ||
              item.fullSubject.replace(/\*+/g, '') === subject.replace(/\*+/g, ''),
          )
          const tags = expectedGroups.map(({ code, pairsPerWeek }) => {
            const actualCount = actual?.tags.find((t) => t.code === code)?.count ?? 0
            return {
              code,
              label: actualCount >= pairsPerWeek ? `${code}×${pairsPerWeek}` : `${code}×${actualCount}/${pairsPerWeek}`,
              missing: actualCount < pairsPerWeek,
            }
          })
          return {
            subject: shortSubject(subject, 36),
            fullSubject: subject,
            tags,
          }
        })
      : actualBySubject.map(({ subject, fullSubject, tags }) => ({
          subject,
          fullSubject,
          tags: tags.map(({ code, count }) => ({
            code,
            label: count > 1 ? `${code}×${count}` : code,
            missing: false,
          })),
        }))

  const missingFromNavPlan =
    mode === 'teacher' && expectedBySubject
      ? expectedBySubject.flatMap(({ subject, groups: expectedGroups }) =>
          expectedGroups.flatMap(({ code, pairsPerWeek }) => {
            const actual = actualBySubject.find(
              (item) =>
                item.fullSubject === subject ||
                item.fullSubject.replace(/\*+/g, '') === subject.replace(/\*+/g, ''),
            )
            const actualCount = actual?.tags.find((t) => t.code === code)?.count ?? 0
            const missing = pairsPerWeek - actualCount
            if (missing <= 0) return []
            return [{ subject, group: code, missing }]
          }),
        )
      : []

  const byDay = meta.days.map((day) => {
    const dayEntries = entries.filter(
      (entry) => slotToDayPeriod(entry.slotId, meta).day === day,
    )

    if (mode === 'group') {
      return { day, items: buildWeekListItems(dayEntries, meta, groupById, entries) }
    }

    const items = dayEntries
      .sort(
        (a, b) =>
          slotToDayPeriod(a.slotId, meta).period - slotToDayPeriod(b.slotId, meta).period,
      )
      .map((entry) => ({
        key: entry.id,
        slot: slotLabel(entry.slotId, meta),
        period: slotToDayPeriod(entry.slotId, meta).period,
        group: groupById.get(entry.groupId)?.code ?? '?',
        teachers: [entry.teacher],
        subject: shortSubject(entry.subject),
        fullSubject: entry.subject,
        rooms: [entry.room],
        hasConflict: entry.conflict !== 'none',
        conflictWith: describeConflictsForEntry(entry, entries, groupById).map(formatConflictLine),
        parallel: false,
      }))

    return { day, items }
  })

  const total =
    mode === 'group'
      ? new Set(entries.map((entry) => clusterKeyForGroup(entry))).size
      : entries.length

  return (
    <div className="schedule-week-projection" aria-label={`Розклад ${title}`}>
      <div className="schedule-week-head">
        <strong>{title}</strong>
        <span className="muted">
          {total} {total === 1 ? 'пара' : total < 5 ? 'пари' : 'пар'} на тиждень
        </span>
      </div>
      <div className="schedule-week-grid">
        {byDay.map(({ day, items }) => (
          <div key={day} className="schedule-week-col">
            <div className="schedule-week-day">{day}</div>
            {items.length === 0 ? (
              <p className="schedule-week-empty muted">—</p>
            ) : (
              <ul className="schedule-week-list">
                {items.map((item) => (
                  <li
                    key={item.key}
                    className={
                      item.hasConflict
                        ? 'has-conflict'
                        : item.parallel
                          ? 'is-parallel'
                          : undefined
                    }
                  >
                    <span className="schedule-week-slot">{item.slot}</span>
                    {mode === 'teacher' ? (
                      <span className="schedule-week-tag group-tag">{item.group}</span>
                    ) : item.parallel ? (
                      <span className="schedule-week-parallel-badge" title="Паралельні підгрупи">
                        поділ
                      </span>
                    ) : (
                      <span className="schedule-week-tag teacher-tag" title={item.teachers[0]}>
                        {item.teachers[0]}
                      </span>
                    )}
                    <span className="schedule-week-subject" title={item.fullSubject}>
                      {item.subject}
                      {mode === 'group' && item.parallel ? (
                        <span className="schedule-week-teachers-inline" title={item.teachers.join(' · ')}>
                          {' '}
                          · {item.teachers.join(' · ')}
                        </span>
                      ) : null}
                    </span>
                    <span className="schedule-week-room" title={item.rooms.join(' · ')}>
                      {item.rooms.join(' · ')}
                    </span>
                    {item.conflictWith.length > 0 ? (
                      <span className="schedule-week-conflict-with" title={item.conflictWith.join('\n')}>
                        накладка з: {item.conflictWith.join(' · ')}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      {subjectSummary.length > 0 && (
        <>
          <h3 className="schedule-week-subjects-title">Предмети</h3>
          <div className="schedule-week-summary schedule-week-summary-after-grid">
            {subjectSummary.map(({ subject, fullSubject, tags }) => (
              <div key={fullSubject} className="schedule-week-chip" title={fullSubject}>
                <span className="schedule-week-chip-name">{subject}</span>
                <span className="schedule-week-chip-tags">
                  {tags.map(({ code, label, missing }) => (
                    <span key={code} className={missing ? 'missing-pair' : undefined}>
                      {label}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      {missingFromNavPlan.length > 0 && (
        <div className="schedule-week-missing" role="status">
          <strong>Не вмістилось у розклад ({missingFromNavPlan.length}):</strong>
          <ul className="schedule-week-missing-list">
            {missingFromNavPlan.map(({ subject, group, missing }) => (
              <li key={`${group}|${subject}`}>
                <span className="schedule-week-tag group-tag">{group}</span>{' '}
                {shortSubject(subject)} — ще {missing}{' '}
                {missing === 1 ? 'пара' : missing < 5 ? 'пари' : 'пар'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
