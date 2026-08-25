export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  return {
    user: {
      id: auth.userId,
      nama: auth.nama,
      username: auth.username,
      email: auth.email,
      role: auth.role,
      status: auth.status,
      no_hp: auth.no_hp,
      unit_kerja: auth.unit_kerja,
      jabatan: auth.jabatan,
      tanggal_bergabung: auth.tanggal_bergabung,
      email_notifikasi: auth.email_notifikasi
    }
  }
})
