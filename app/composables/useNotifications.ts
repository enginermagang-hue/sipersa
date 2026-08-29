import { ref } from 'vue'

export const useNotifications = () => {
  const items = useState<any[]>('notif-items', () => [])
  const unread = computed(() => items.value.filter((n) => !n.read).length)
  const loading = ref(false)

  async function load() {
    loading.value = true
    try {
      const data: any = await $fetch('/api/notifications')
      items.value = data
    } catch {
      items.value = []
    } finally {
      loading.value = false
    }
  }

  async function markRead(id?: number) {
    await $fetch('/api/notifications/read', { method: 'POST', body: id ? { id } : { all: true } })
    await load()
  }

  const deleting = ref(false)
  async function removeMany(ids: number[]) {
    deleting.value = true
    try {
      await $fetch('/api/notifications/delete', { method: 'POST', body: { ids } })
      await load()
    } finally {
      deleting.value = false
    }
  }

  return { items, unread, loading, deleting, load, markRead, removeMany }
}

export const notifPoller = ref<ReturnType<typeof setInterval> | null>(null)
