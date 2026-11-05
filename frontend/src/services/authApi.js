import apiClient from './apiClient'

export async function loginRequest(email, password) {
  const { data } = await apiClient.post('/auth/login', { email, password })
  return data // { token, user }
}

export async function fetchCurrentUser() {
  const { data } = await apiClient.get('/auth/me')
  return data.user
}

export async function changePasswordRequest(currentPassword, newPassword) {
  const { data } = await apiClient.put('/auth/change-password', { currentPassword, newPassword })
  return data
}
