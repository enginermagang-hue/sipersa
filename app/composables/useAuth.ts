export const useAuth = () => {
  const user = useState<any>('auth-user', () => null)
  const loaded = useState('auth-loaded', () => false)
  const loggingOut = useState<boolean>('auth-logging-out', () => false)

  async function fetchMe() {
    try {
      const res: any = await $fetch('/api/auth/me', {
        headers: useRequestHeaders(['cookie']) as Record<string, string>
      })
      user.value = res.user
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
    if (loggingOut.value) return
    loggingOut.value = true
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
      user.value = null
      await navigateTo('/login')
    } catch {
      const toast = useToast()
      toast.add({ color: 'error', title: 'Gagal keluar', description: 'Terjadi kesalahan, coba lagi.' })
    } finally {
      loggingOut.value = false
    }
  }

  function googleLogin() {
    if (typeof window === 'undefined') {
      window.location.assign('/api/auth/google')
      return
    }
    const w = 520
    const h = 640
    const left = window.screenX + (window.outerWidth - w) / 2
    const top = window.screenY + (window.outerHeight - h) / 2
    const url = '/api/auth/google?popup=1'
    const popup = window.open(url, 'googleLogin', `width=${w},height=${h},left=${left},top=${top},popup=1`)
    if (!popup) {
      window.location.assign('/api/auth/google')
      return
    }
    popup.focus()
  }

  return { user, loaded, loggingOut, fetchMe, login, logout, googleLogin }
}
