import type { NavPlanRow, NavPlanRowKind } from '../types/planning'
import { springTeachingContactHours } from './subjectSchedule'

export type NavPlanClassification = {
  kind: NavPlanRowKind
  label: string
}

export type { NavPlanRowKind }

export const NAV_PLAN_KIND_LABELS: Record<NavPlanRowKind, string> = {
  schedule: 'У тижневий розклад',
  practice: 'Практика',
  coursework: 'Курсова (КР)',
  course_project: 'Курсовий проект (КП)',
  supervision: 'Керівництво',
  diploma: 'Диплом / ДПА / ДКК',
  consultation: 'Консультації',
  unknown: 'Без назви',
}

const PRACTICE_RE =
  /навчальн.*практик|виробнич.*практик|педагогічн.*практик|ознайомлювальн.*практик|переддипломн.*практик|демонтажно.*практик|слюсарн.*практик|професійн.*практик|\bpractic(?:e|um)\b/i

const SUPERVISION_RE = /керівництв|кер\.?\s*п|\bsupervis/i

const DIPLOMA_RE = /диплом|дпа|дкк|\bdiploma\b|\bthesis\b|\bdpa\b|\bdkk\b/i

const COURSE_PROJECT_RE =
  /курсов(?:ий|ого)?\s*проект|\([^)]*\b(кп|cp|kp)\b[^)]*\)|(?:^|[\s(])(?:кп|cp|kp)(?:[\s,)])/i

const COURSEWORK_RE =
  /курсов(?:а|і|ий|ого)?(?:\s|$)|\([^)]*\b(кр|cr|cw|kr)\b[^)]*\)|(?:^|[\s(])(?:кр|cr|cw|kr)(?:[\s,)])/i

const CONSULTATION_RE = /консульт|\bconsult/i

/** Латиниця + кирилиця в дужках і як окремі позначки. */
const PAREN_EXCLUDE_RE = /\([^)]*\b(кп|кр|дп|cp|cr|cw|kr|kp|dp)\b[^)]*\)/i

function isCourseProject(subject: string): boolean {
  return COURSE_PROJECT_RE.test(subject) || /\(\s*кп\b/i.test(subject)
}

function isCoursework(subject: string): boolean {
  if (isCourseProject(subject)) return false
  return COURSEWORK_RE.test(subject) || PAREN_EXCLUDE_RE.test(subject)
}

export function classifyNavPlanSubject(subject: string): NavPlanClassification {
  const s = subject.trim()
  if (!s) return { kind: 'unknown', label: NAV_PLAN_KIND_LABELS.unknown }

  if (PRACTICE_RE.test(s)) return { kind: 'practice', label: NAV_PLAN_KIND_LABELS.practice }
  if (SUPERVISION_RE.test(s)) return { kind: 'supervision', label: NAV_PLAN_KIND_LABELS.supervision }
  if (DIPLOMA_RE.test(s)) return { kind: 'diploma', label: NAV_PLAN_KIND_LABELS.diploma }
  if (isCourseProject(s)) return { kind: 'course_project', label: NAV_PLAN_KIND_LABELS.course_project }
  if (isCoursework(s)) return { kind: 'coursework', label: NAV_PLAN_KIND_LABELS.coursework }
  if (CONSULTATION_RE.test(s) && !/\b(лекці|практ|лаб)\b/i.test(s)) {
    return { kind: 'consultation', label: NAV_PLAN_KIND_LABELS.consultation }
  }

  return { kind: 'schedule', label: NAV_PLAN_KIND_LABELS.schedule }
}

/** Класифікація з урахуванням назви та колонок годин. */
export function classifyNavPlanRow(row: NavPlanRow): NavPlanClassification {
  const bySubject = classifyNavPlanSubject(row.subject)
  if (bySubject.kind !== 'schedule') return bySubject

  const springTeaching = springTeachingContactHours(row)
  if (row.springCoursework > 0 && springTeaching === 0) {
    return { kind: 'coursework', label: 'КР (лише колонка курсових)' }
  }
  if (row.springSupervised > 0 && springTeaching === 0 && row.springCoursework === 0) {
    return { kind: 'supervision', label: 'Керівництво (колонка)' }
  }
  if ((row.springDpa > 0 || row.springDkk > 0) && springTeaching === 0) {
    return { kind: 'diploma', label: 'ДПА/ДКК (колонка)' }
  }
  if (row.springConsult > 0 && springTeaching === 0 && row.hoursSpring <= row.springConsult) {
    return { kind: 'consultation', label: 'Консультації (колонка)' }
  }

  return bySubject
}

export function isSchedulableNavPlanRow(row: NavPlanRow): boolean {
  return classifyNavPlanRow(row).kind === 'schedule'
}

export function isSchedulableSubject(subject: string): boolean {
  return classifyNavPlanSubject(subject).kind === 'schedule'
}

export function summarizeNavPlanByKind(rows: NavPlanRow[]): Record<NavPlanRowKind, number> {
  const counts: Record<NavPlanRowKind, number> = {
    schedule: 0,
    practice: 0,
    coursework: 0,
    course_project: 0,
    supervision: 0,
    diploma: 0,
    consultation: 0,
    unknown: 0,
  }
  for (const row of rows) {
    counts[row.planKind ?? classifyNavPlanRow(row).kind] += 1
  }
  return counts
}

export const EXCLUDED_NAV_PLAN_KINDS: NavPlanRowKind[] = [
  'practice',
  'coursework',
  'course_project',
  'supervision',
  'diploma',
  'consultation',
  'unknown',
]

export function isExcludedNavPlanKind(kind: NavPlanRowKind): boolean {
  return kind !== 'schedule'
}
