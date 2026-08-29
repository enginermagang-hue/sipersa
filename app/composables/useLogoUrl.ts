export function useLogoUrl() {
  const config = useRuntimeConfig()
  const logoSrc = computed(() => config.public.logoPath || '')
  const logoLoading = useState('logo-loading', () => false)
  const logoDataUrl = useState('logo-data-url', () => '')

  function bufToBase64(buf: ArrayBuffer) {
    let bin = ''
    const bytes = new Uint8Array(buf)
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }
    return btoa(bin)
  }

  async function fetchLogo() {
    const src = logoSrc.value
    if (!src || logoDataUrl.value) return
    logoLoading.value = true
    try {
      const res = await $fetch(src, { responseType: 'blob' })
      const buf = await res.arrayBuffer()
      logoDataUrl.value = `data:${res.type || 'image/png'};base64,${bufToBase64(buf)}`
    } catch {
      logoDataUrl.value = ''
    } finally {
      logoLoading.value = false
    }
  }

  if (import.meta.client) fetchLogo()

  const logoHtml = computed(() =>
    logoDataUrl.value
      ? `<img src="${logoDataUrl.value}" width="64" style="object-fit:contain;"/>`
      : logoSrc.value
        ? `<img src="${logoSrc.value}" width="64" style="object-fit:contain;"/>`
        : ''
  )

  return { logoSrc, logoHtml, logoDataUrl, logoLoading, fetchLogo }
}
