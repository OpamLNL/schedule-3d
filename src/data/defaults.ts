import type { GroupRow, RoomRuleRow, SubjectPrefRow, TeacherPrefRow } from '../types/planning'
import { newId } from '../utils/normalize'

export const DEFAULT_GROUPS: GroupRow[] = [
  { id: newId('g'), code: 'КН11', weeksFall: 14, weeksSpring: 18, room: '301', shift: 1 },
  { id: newId('g'), code: 'КН12', weeksFall: 14, weeksSpring: 18, room: '302', shift: 1 },
  { id: newId('g'), code: 'КН13', weeksFall: 14, weeksSpring: 18, room: '304', shift: 1 },
  { id: newId('g'), code: 'КН14', weeksFall: 14, weeksSpring: 18, room: '305', shift: 1 },
  { id: newId('g'), code: 'КН21', weeksFall: 15, weeksSpring: 19, room: '304', shift: 2 },
  { id: newId('g'), code: 'КН22', weeksFall: 15, weeksSpring: 19, room: '302', shift: 2 },
  { id: newId('g'), code: 'КН23', weeksFall: 15, weeksSpring: 19, room: '301', shift: 2 },
  { id: newId('g'), code: 'КН31', weeksFall: 15, weeksSpring: 16, room: '312', shift: 2 },
  { id: newId('g'), code: 'КН32', weeksFall: 15, weeksSpring: 16, room: '327', shift: 2 },
  { id: newId('g'), code: 'КН33', weeksFall: 15, weeksSpring: 16, room: '304', shift: 2 },
  { id: newId('g'), code: 'КН34', weeksFall: 15, weeksSpring: 16, room: '302', shift: 2 },
  { id: newId('g'), code: 'КН41', weeksFall: 15, weeksSpring: 9, room: '327', shift: 1 },
  { id: newId('g'), code: 'КН42', weeksFall: 15, weeksSpring: 9, room: '304', shift: 1 },
  { id: newId('g'), code: 'КН43', weeksFall: 15, weeksSpring: 9, room: '312', shift: 1 },
]

export const DEFAULT_ROOM_RULES: RoomRuleRow[] = [
  { id: newId('rr'), subject: 'Хімія', teacher: 'Качур С.П.', room: 'своя' },
  { id: newId('rr'), subject: 'Хімія', teacher: 'Зубака О.В.', room: 'Хімфак' },
  { id: newId('rr'), subject: 'Фізична культура', teacher: 'Ткач М.С.', room: 'Спортзал' },
]

export const DEFAULT_TEACHER_PREFS: TeacherPrefRow[] = []

export const DEFAULT_SUBJECT_PREFS: SubjectPrefRow[] = [
  { id: newId('sp'), groupCode: 'КН31', subject: 'Об\'єктно-орієнтоване програмування', rule: 'max_1_день' },
]

export const TEACHER_RULE_TEMPLATES = [
  { code: 'не_1', label: 'Не 1-ша пара', hint: 'Без першої пари щодня' },
  { code: 'не_4', label: 'Не 4-та пара', hint: 'Без четвертої пари' },
  { code: 'не_перші', label: 'Не перші 2 пари', hint: 'Пари 1–2 заборонені' },
  { code: 'не_останні', label: 'Не останні 2 пари', hint: 'Пари 7–8 заборонені' },
  { code: 'не_понеділок', label: 'Не понеділок', hint: 'Жодної пари у Пн' },
  { code: 'не_пятниця', label: 'Не п\'ятниця', hint: 'Жодної пари у Пт' },
  { code: 'тільки_зміна_1', label: 'Тільки зміна 1', hint: 'Пари 1–4' },
  { code: 'тільки_зміна_2', label: 'Тільки зміна 2', hint: 'Пари 5–8' },
  { code: 'max_2_день', label: 'Max 2 пари на день', hint: 'Обмеження завантаження викладача' },
  { code: 'max_3_день', label: 'Max 3 пари на день', hint: 'Обмеження завантаження викладача' },
  { code: 'max_5_день', label: 'Max 5 пар на день', hint: 'Обмеження завантаження викладача' },
] as const

export const SUBJECT_RULE_TEMPLATES = [
  { code: 'max_1_день', label: 'Max 1 пара на день', hint: 'Не ставити 2+ пари в один день' },
  { code: 'max_2_день', label: 'Max 2 пари на день', hint: 'Не більше двох пар на день' },
  { code: 'min_1_день_між', label: 'Min 1 день між парами', hint: 'Пари не підряд по днях' },
  { code: 'не_1_день', label: 'Не понеділок', hint: 'Предмет не в Пн' },
  { code: 'не_5_день', label: 'Не п\'ятниця', hint: 'Предмет не в Пт' },
] as const
