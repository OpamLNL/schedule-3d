import { normalizeGroupCode } from './normalize'

export type ParsedGroupCode = {
  code: string
  specialty: string
  course: number
  subgroup: number
}

export function parseGroupCode(raw: string): ParsedGroupCode {
  const code = normalizeGroupCode(raw)

  const tailMatch = code.match(/^(.+?)[-]?(\d)(\d)$/)
  if (tailMatch) {
    return {
      code,
      specialty: tailMatch[1].replace(/-/g, ''),
      course: Number.parseInt(tailMatch[2], 10),
      subgroup: Number.parseInt(tailMatch[3], 10),
    }
  }

  const knMatch = code.match(/^([A-ZА-ЯІЇЄҐ]{1,6})(\d)(\d)$/)
  if (knMatch) {
    return {
      code,
      specialty: knMatch[1],
      course: Number.parseInt(knMatch[2], 10),
      subgroup: Number.parseInt(knMatch[3], 10),
    }
  }

  const digit = code.match(/\d/)?.[0]
  return {
    code,
    specialty: code.replace(/[\d-]/g, '').slice(0, 6) || code.slice(0, 2),
    course: digit ? Number.parseInt(digit, 10) : 1,
    subgroup: 1,
  }
}

/** 2–3 курс: непарна підгрупа — дистанційно, парна — очно (аудиторії не перетинаються). */
export function isRemoteGroup(code: string, course: number): boolean {
  if (course !== 2 && course !== 3) return false
  const { subgroup } = parseGroupCode(code)
  return subgroup % 2 === 1
}

export function effectiveShift(course: number, groupShift: 1 | 2): 1 | 2 {
  if (course === 2 || course === 3) return 2
  return groupShift
}
