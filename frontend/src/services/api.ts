import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api'

// Guardado só em memória (não em localStorage), para reduzir o risco de roubo via XSS.
// O refresh token fica num cookie httpOnly, inacessível ao JavaScript.
let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

/**
 * Instância única do Axios. A página nunca chama `api.get(...)` direto — sempre por um
 * `services/<dominio>Service.ts`.
 */
export const api = axios.create({ baseURL, withCredentials: true })

// Instância separada, sem interceptors, para não entrar em loop ao renovar a sessão.
const refreshClient = axios.create({ baseURL, withCredentials: true })

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

export interface SessionResponse {
  accessToken: string
}

async function postRefresh(): Promise<SessionResponse> {
  try {
    return (await refreshClient.post<SessionResponse>('/auth/refresh')).data
  } catch (error) {
    // Outra requisição renovou no mesmo instante: o backend recusa só esta e o cookie
    // novo já chegou, então tentar de novo usa ele.
    const message = (error as AxiosError<{ message?: string }>).response?.data?.message
    if (error instanceof AxiosError && error.response?.status === 401 && /há pouco/i.test(String(message))) {
      await new Promise((resolve) => setTimeout(resolve, 300))
      return (await refreshClient.post<SessionResponse>('/auth/refresh')).data
    }
    throw error
  }
}

let refreshPromise: Promise<SessionResponse> | null = null

/**
 * Renova a sessão pelo cookie httpOnly. Uma renovação por vez (promise compartilhada):
 * duas chamadas simultâneas reapresentariam o mesmo token, o que o backend trata como reuso.
 */
export function requestTokenRefresh(): Promise<SessionResponse> {
  if (!refreshPromise) {
    refreshPromise = postRefresh()
      .then((data) => {
        setAccessToken(data.accessToken)
        return data
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

const sessionExpiredListeners = new Set<() => void>()

/** Avisado quando a sessão acaba de vez (renovação recusada): o AuthContext volta ao login. */
export function onSessionExpired(listener: () => void): () => void {
  sessionExpiredListeners.add(listener)
  return () => {
    sessionExpiredListeners.delete(listener)
  }
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined
    const isAuthEndpoint = originalRequest?.url?.startsWith('/auth/')

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true
      try {
        const { accessToken: newToken } = await requestTokenRefresh()
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        // Só encerra a sessão quando o backend recusou a renovação; falha de rede não desloga.
        if (refreshError instanceof AxiosError && refreshError.response?.status === 401) {
          setAccessToken(null)
          sessionExpiredListeners.forEach((listener) => listener())
        }
      }
    }

    return Promise.reject(error)
  },
)
