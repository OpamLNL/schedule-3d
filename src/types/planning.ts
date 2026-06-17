/** Категорія рядка навплану після нормалізації. */
export type NavPlanRowKind =
  | 'schedule'
  | 'practice'
  | 'coursework'
  | 'course_project'
  | 'supervision'
  | 'diploma'
  | 'consultation'
  | 'unknown'

export type NavPlanRow = {
  id: string
  subject: string
  subjectNorm: string
  teacher: string
  /** Категорія після нормалізації навплану */
  planKind: NavPlanRowKind
  planKindLabel: string
  hoursTotal: number
  hoursCourse: number
  hoursSelf: number
  fallLectures: number
  fallPractical: number
  fallLab: number
  fallCoursework: number
  fallConsult: number
  fallCredits: number
  fallExams: number
  hoursFall: number
  springLectures: number
  springPractical: number
  springLab: number
  springCoursework: number
  springConsult: number
  springSupervised: number
  springCredits: number
  springExams: number
  springDpa: number
  springDkk: number
  hoursSpring: number
  groupCode: string
  budget: number
  extraBudget: number
}

export type GroupRow = {
  id: string
  code: string
  weeksFall: number
  weeksSpring: number
  room: string
  shift: 1 | 2
}

export type RoomRuleRow = {
  id: string
  subject: string
  teacher: string
  room: string
}

export type TeacherPrefRow = {
  id: string
  teacher: string
  rule: string
}

export type SubjectPrefRow = {
  id: string
  groupCode: string
  subject: string
  rule: string
}

export type RuleTemplate = {
  code: string
  label: string
  hint?: string
}

export type PlanningStore = {
  navPlan: NavPlanRow[]
  groups: GroupRow[]
  roomRules: RoomRuleRow[]
  teacherPrefs: TeacherPrefRow[]
  subjectPrefs: SubjectPrefRow[]
  navPlanSource?: string
  navPlanColumnsVersion?: number
  updatedAt?: string
}

export type NavPlanKindFilter = 'all' | 'schedule' | 'excluded' | NavPlanRowKind

export type NavPlanFilters = {
  query: string
  groupCode: string
  subject: string
  teacher: string
  onlyWithTeacher: boolean
  /** Викладка: усі / лише пари / виключені / конкретна категорія */
  planKind: NavPlanKindFilter
  /** «є» / «немає» або порожньо = усі */
  exams: string
  credits: string
  lectures: string
  hoursTotalMin: string
  hoursTotalMax: string
}
