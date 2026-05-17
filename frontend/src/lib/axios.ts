import axios from 'axios'

export const axiosInstance = axios.create({
  baseURL: 'http://localhost:8080',
})

export const customInstance = <T>(config: Parameters<typeof axiosInstance>[0]): Promise<T> => {
  return axiosInstance(config).then((res) => res.data)
}