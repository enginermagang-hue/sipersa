export default defineNuxtRouteMiddleware(async (to) => {
  const { user, loaded, fetchMe } = useAuth()
  if (!loaded.value) await fetchMe()

  const publicPages = ['/login']
  if (!user.value && !publicPages.includes(to.path)) {
    return navigateTo('/login')
  }
  if (user.value && to.path === '/login') {
    return navigateTo('/')
  }
  if (user.value && to.path.startsWith('/admin') && user.value.role !== 'admin') {
    return navigateTo('/')
  }
  if (user.value && to.path.startsWith('/laporan') && !['admin', 'staff_tu'].includes(user.value.role)) {
    return navigateTo('/')
  }
  if (user.value && to.path.startsWith('/surat-keluar/tulis') && user.value.role !== 'staff_tu') {
    return navigateTo('/')
  }
})
