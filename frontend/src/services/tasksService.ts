import type { TaskInput, TaskLists } from '@/types/tasks'
import { api } from './api'

export async function getTaskLists(): Promise<TaskLists> {
  const { data } = await api.get<TaskLists>('/tasks')
  return data
}

export async function createTask(input: TaskInput): Promise<TaskLists> {
  const { data } = await api.post<TaskLists>('/tasks', input)
  return data
}

export async function updateTask(id: string, input: Partial<TaskInput>): Promise<TaskLists> {
  const { data } = await api.patch<TaskLists>(`/tasks/${id}`, input)
  return data
}

export async function deleteTask(id: string): Promise<TaskLists> {
  const { data } = await api.delete<TaskLists>(`/tasks/${id}`)
  return data
}

export async function completeTask(id: string): Promise<TaskLists> {
  const { data } = await api.post<TaskLists>(`/tasks/${id}/complete`)
  return data
}

export async function undoCompleteTask(id: string): Promise<TaskLists> {
  const { data } = await api.delete<TaskLists>(`/tasks/${id}/complete`)
  return data
}
