/** Espelha `TaskDto` / `TaskListsDto` do backend (`/api/tasks`). */
export interface Task {
  id: string
  title: string
  /** "AAAA-MM-DD" em Brasília; null = sem data. */
  date: string | null
  /** "HH:MM" em Brasília; null = sem horário. */
  time: string | null
  /** Nas listas, só aparecem as concluídas hoje. */
  done: boolean
}

export interface TaskLists {
  /** Hoje, em Brasília. */
  day: string
  today: Task[]
  upcoming: Task[]
  overdue: Task[]
}

export interface TaskInput {
  title: string
  date: string | null
  time: string | null
}
