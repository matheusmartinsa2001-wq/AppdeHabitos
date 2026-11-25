import type { ReminderInput, WaterReminder, WaterSettings, WaterToday } from '@/types/water'
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

export async function getWaterToday(): Promise<WaterToday> {
  const { data } = await api.get<WaterToday>('/water/today')
  return data
}

export async function confirmWaterReminder(id: string): Promise<WaterToday> {
  const { data } = await api.post<WaterToday>(`/water/reminders/${id}/confirm`)
  return data
}

export async function addWaterIntake(amountMl: number): Promise<WaterToday> {
  const { data } = await api.post<WaterToday>('/water/intakes', { amountMl })
  return data
}

export async function deleteWaterIntake(id: string): Promise<WaterToday> {
  const { data } = await api.delete<WaterToday>(`/water/intakes/${id}`)
  return data
}
