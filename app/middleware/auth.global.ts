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
  // Disposisi (inbox) — hanya admin & staff_tu; pimpinan dialihkan ke 403 agar tidak senyap ke dashboard
  if (user.value && to.path.startsWith('/disposisi') && !to.path.startsWith('/disposisi/kelola') && !['admin', 'staff_tu'].includes(user.value.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan mengakses Disposisi — hanya Admin & Staff TU' })
  }
  // Kelola Disposisi — hanya admin
  if (user.value && to.path.startsWith('/disposisi/kelola') && user.value.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan mengakses Kelola Disposisi — hanya Admin' })
  }
   if (user.value && (to.path.startsWith('/surat-keluar/tulis') || /\/surat-keluar\/\d+\/edit/.test(to.path)) && !['staff_tu', 'admin'].includes(user.value.role)) {
    return navigateTo('/')
  }
})
