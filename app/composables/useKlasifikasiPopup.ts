export function useKlasifikasiPopup() {
  const config = useRuntimeConfig()
  const url = (config as any).klasifikasiGoogleUrl || (config.public as any).klasifikasiGoogleUrl || 'https://script.google.com/macros/s/AKfycby4RoU3dPXZWfkofZ5wVkNRKyG_V4x23ypfl-bRyrx7ahZ3i_NvFJ4lBntAANhiXjFyQQ/exec'

  function openPopup() {
    const w = 900, h = 700
    const left = window.screenX + (window.outerWidth - w) / 2
    const top = window.screenY + (window.outerHeight - h) / 2
    window.open(url, 'klasifikasiPopup', `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`)
  }

  return { openPopup, url }
}
