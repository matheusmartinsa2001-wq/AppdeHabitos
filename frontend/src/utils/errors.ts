import { AxiosError } from 'axios'

/** Mensagem da API (formato do filtro global) ou uma genérica em português. */
export function extractErrorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (error instanceof AxiosError) {
    if (!error.response) return 'Não foi possível conectar ao servidor.'
    if (error.response.status === 429) return 'Muitas tentativas. Espere um minuto e tente de novo.'
    const message = (error.response.data as { message?: string | string[] } | undefined)?.message
    if (Array.isArray(message)) return message.join('. ')
    if (message) return message
  }
  return fallback
}

/** Falha de rede (servidor fora do ar ou "dormindo"), não uma recusa do servidor. */
export function isNetworkError(error: unknown): boolean {
  return error instanceof AxiosError && !error.response
}
