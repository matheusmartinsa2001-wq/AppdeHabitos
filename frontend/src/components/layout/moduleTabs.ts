/** Uma aba da barra inferior de um módulo. */
export type ShellTab = { to: string; label: string }

/** Abas do módulo Água. A primeira é a tela inicial do módulo. */
export const WATER_TABS: readonly ShellTab[] = [
  { to: '/agua', label: 'Hoje' },
  { to: '/agua/historico', label: 'Histórico' },
  { to: '/agua/configuracao', label: 'Ajustes' },
]

/** Abas do módulo Tarefas. */
export const TASKS_TABS: readonly ShellTab[] = [
  { to: '/tarefas', label: 'Tarefas' },
  { to: '/tarefas/historico', label: 'Histórico' },
  { to: '/tarefas/ajustes', label: 'Ajustes' },
]
