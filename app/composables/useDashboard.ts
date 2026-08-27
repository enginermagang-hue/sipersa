export function useDashboard() {
  const period = ref<3|6|9|12>(6)
  const klasifikasiId = ref<number | null>(null)
  const query = computed(() => ({ period: period.value, klasifikasi_id: klasifikasiId.value || undefined }))
  const { data, pending, status, refresh } = useFetch('/api/dashboard', { query, headers: useRequestHeaders(['cookie']) as any })
  const isInitialLoading = computed(() => !data.value && pending.value)
  const isRefreshing = computed(() => !!data.value && pending.value)
  let timer: any
  onMounted(() => {
    timer = setInterval(() => refresh(), 30000)
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh() })
  })
  onUnmounted(() => clearInterval(timer))
  return { data, pending, status, isInitialLoading, isRefreshing, refresh, period, klasifikasiId }
}
