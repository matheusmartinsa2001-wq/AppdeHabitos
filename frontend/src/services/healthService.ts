import { api } from './api'

export interface HealthStatus {
  status: 'ok'
  database: 'ok'
}

export async function getHealth(): Promise<HealthStatus> {
  const { data } = await api.get<HealthStatus>('/health')
  return data
}
