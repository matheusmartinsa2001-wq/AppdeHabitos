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
