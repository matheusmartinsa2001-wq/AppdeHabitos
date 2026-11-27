/** Espelha `TaskDto` / `TaskListsDto` do backend (`/api/tasks`). */
export interface Task {
  id: string
  title: string
  /** "AAAA-MM-DD" em Brasília; null = sem data. */
  date: string | null
  /** "HH:MM" em Brasília; null = sem horário. */
  time: string | null
  /** Recorrente: dias da semana, 0 (domingo) a 6 (sábado); null = avulsa. */
  repeat: number[] | null
  /** Concluída hoje (recorrente: a ocorrência de hoje). */
  done: boolean
}

export interface TaskLists {
  /** Hoje, em Brasília. */
  day: string
  today: Task[]
  upcoming: Task[]
  overdue: Task[]
  /** Todas as recorrentes ativas, para ver e editar. */
  recurring: Task[]
}

export interface TaskInput {
  title: string
  date: string | null
  time: string | null
  /** null = avulsa. */
  repeat: number[] | null
}

/** Espelha `TasksHistoryDto` (`GET /api/tasks/history`). */
export type TaskDayStatus = 'met' | 'missed' | 'empty' | 'today' | 'none'

export interface TaskHistoryDay {
  day: string
  status: TaskDayStatus
  /** Concluídas nesse dia (todas, inclusive as sem data). */
  completed: number
  /** O que era do dia, com feita ou não. */
  planned: { id: string; title: string; done: boolean }[]
}

export interface TasksHistory {
  month: string
  days: TaskHistoryDay[]
  metDays: number
  evaluatedDays: number
  percent: number | null
  currentStreak: number
  firstDay: string | null
  canGoBack: boolean
  canGoForward: boolean
}
