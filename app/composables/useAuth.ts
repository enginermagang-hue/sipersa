export const useAuth = () => {
  const user = useState<any>('auth-user', () => null)
  const loaded = useState('auth-loaded', () => false)

  async function fetchMe() {
    try {
      user.value = await $fetch('/api/auth/me')
    } catch {
      user.value = null
    }
    loaded.value = true
    return user.value
  }

  async function login(username: string, password: string) {
    const res: any = await $fetch('/api/auth/login', { method: 'POST', body: { username, password } })
    user.value = res.user
    return res.user
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    await navigateTo('/login')
  }

  return { user, loaded, fetchMe, login, logout }
}
