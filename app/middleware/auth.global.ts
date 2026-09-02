export default defineNuxtRouteMiddleware(async (to) => {
  const { user, loaded, fetchMe } = useAuth()
  if (!loaded.value) await fetchMe()

  const publicPages = ['/login']
  const isPublic = publicPages.includes(to.path) || to.path.startsWith('/panduan')
  if (!user.value && !isPublic) {
    return navigateTo('/login')
  }
  if (user.value && to.path === '/login') {
    return navigateTo('/')
  }
  if (user.value && to.path.startsWith('/admin') && user.value.role !== 'admin') {
    return navigateTo('/')
  }
  if (user.value && to.path.startsWith('/laporan') && !['admin', 'staff_tu'].includes(user.value.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan mengakses Laporan — hanya Admin & Staff TU' })
  }
   if (user.value && (to.path.startsWith('/surat-keluar/tulis') || /\/surat-keluar\/\d+\/edit/.test(to.path)) && !['staff_tu', 'admin'].includes(user.value.role)) {
    return navigateTo('/')
  }
})
