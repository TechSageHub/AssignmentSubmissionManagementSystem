import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

const cache = new Map<string, { data: unknown; timestamp: number }>()
const cacheTtlMs = 60_000

function cacheKey(url?: string, params?: unknown) {
  if (!url) return ''
  if (!params) return url
  return `${url}?${JSON.stringify(params)}`
}

export function readApiCache<T>(url: string, params?: unknown): T | null {
  const entry = cache.get(cacheKey(url, params))
  if (!entry || Date.now() - entry.timestamp > cacheTtlMs) return null
  return entry.data as T
}

export function writeApiCache<T>(url: string, data: T, params?: unknown) {
  cache.set(cacheKey(url, params), { data, timestamp: Date.now() })
}

export function clearApiCache(match?: string) {
  if (!match) {
    cache.clear()
    return
  }
  for (const key of cache.keys()) {
    if (key.startsWith(match)) cache.delete(key)
  }
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    const method = response.config.method?.toLowerCase()
    const url = response.config.url
    if (method === 'get' && url) {
      writeApiCache(url, response.data, response.config.params)
    } else if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
      clearApiCache()
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/auth/login')
      if (!isLoginRequest) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default api
