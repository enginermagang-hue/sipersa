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
  if (user.value && to.path.startsWith('/laporan') && !['admin', 'staff'].includes(user.value.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan mengakses Laporan — hanya Admin & Staff' })
  }
  // Disposisi (inbox) — hanya admin & staff; pimpinan dialihkan ke 403 agar tidak senyap ke dashboard
  // Detail /disposisi/[id] tetap allow pimpinan/admin/penerima (dicek di API), jadi exclude dari guard list
  if (user.value && to.path.startsWith('/disposisi') && !to.path.startsWith('/disposisi/kelola') && !/^\/disposisi\/\d+/.test(to.path) && !['admin', 'staff'].includes(user.value.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan mengakses Disposisi — hanya Admin & Staff' })
  }
  // Kelola Disposisi — pimpinan & admin
  if (user.value && to.path.startsWith('/disposisi/kelola') && !['pimpinan', 'admin'].includes(user.value.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Tidak diizinkan mengakses Kelola Disposisi — hanya Pimpinan & Admin' })
  }
   if (user.value && (to.path.startsWith('/surat-keluar/tulis') || /\/surat-keluar\/\d+\/edit/.test(to.path)) && !['staff', 'admin'].includes(user.value.role)) {
    return navigateTo('/')
  }
})
