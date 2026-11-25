import type { ReminderInput, WaterReminder, WaterSettings } from '@/types/water'
import { api } from './api'

export async function getWaterSettings(): Promise<WaterSettings> {
  const { data } = await api.get<WaterSettings>('/water/settings')
  return data
}

export async function setWaterGoal(goalMl: number): Promise<WaterSettings> {
  const { data } = await api.put<WaterSettings>('/water/goal', { goalMl })
  return data
}

export async function createWaterReminder(input: ReminderInput): Promise<WaterReminder> {
  const { data } = await api.post<WaterReminder>('/water/reminders', input)
  return data
}

export async function updateWaterReminder(id: string, input: Partial<ReminderInput>): Promise<WaterReminder> {
  const { data } = await api.patch<WaterReminder>(`/water/reminders/${id}`, input)
  return data
}

export async function deleteWaterReminder(id: string): Promise<void> {
  await api.delete(`/water/reminders/${id}`)
}
