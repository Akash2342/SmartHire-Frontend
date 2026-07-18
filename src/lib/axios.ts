import axios from 'axios'

/**
 * Single shared Axios instance used by every API module.
 *
 * baseURL '/api/v1' is proxied to http://localhost:8087/api/v1 by Vite in dev
 * (see vite.config.ts). In production the reverse proxy handles the same mapping.
 */
const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

/**
 * REQUEST interceptor — runs before every outgoing request.
 * Reads the JWT from localStorage and attaches it as a Bearer token.
 * We read from localStorage (not the Zustand store) so this works even before
 * React mounts (e.g. requests made during module initialisation).
 */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * RESPONSE interceptor — runs after every response.
 * On 401 (token expired or invalid) we clear local storage and hard-redirect
 * to /login. A hard redirect (window.location) is intentional — it also resets
 * all in-memory React state so no stale data lingers.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
