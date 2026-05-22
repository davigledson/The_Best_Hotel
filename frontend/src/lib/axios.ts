import axios, { type AxiosRequestConfig } from 'axios'

export const axiosInstance = axios.create({
  baseURL: 'http://localhost:8080',
})

axiosInstance.interceptors.request.use((config) => {
  const stored = localStorage.getItem('thebesthotel_auth')
  if (stored) {
    try {
      const { token } = JSON.parse(stored)
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch {}
  }
  return config
})

export const customInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
  return axiosInstance(config).then((res) => res.data)
}
