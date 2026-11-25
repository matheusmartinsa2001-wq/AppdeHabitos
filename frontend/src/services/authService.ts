import { api, requestTokenRefresh, setAccessToken, type SessionResponse } from './api'

export async function login(password: string): Promise<void> {
  const { data } = await api.post<SessionResponse>('/auth/login', { password })
  setAccessToken(data.accessToken)
}

/** Restaura a sessão pelo cookie httpOnly (o access token não sobrevive a recarregar o app). */
export async function refreshSession(): Promise<void> {
  await requestTokenRefresh()
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout')
  } finally {
    setAccessToken(null)
  }
}
