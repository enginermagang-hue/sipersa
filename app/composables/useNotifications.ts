import { ref } from 'vue'

export const useNotifications = () => {
  const items = useState<any[]>('notif-items', () => [])
  const unread = computed(() => items.value.filter((n) => !n.read).length)

  async function load() {
    try {
      const data: any = await $fetch('/api/notifications')
      items.value = data
    } catch {
      items.value = []
    }
  }

  async function markRead(id?: number) {
    await $fetch('/api/notifications/read', { method: 'POST', body: id ? { id } : { all: true } })
    await load()
  }

  return { items, unread, load, markRead }
}

export const notifPoller = ref<ReturnType<typeof setInterval> | null>(null)
