export default defineEventHandler(async (event) => {
  const auth = (event.context as any).auth
  return {
    user: {
      id: auth.userId,
      nama: auth.nama,
      username: auth.username,
      email: auth.email,
      role: auth.role,
      status: auth.status
    }
  }
})
