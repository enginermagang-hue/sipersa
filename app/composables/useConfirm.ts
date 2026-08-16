import Swal from 'sweetalert2'

const iconMap = {
  error: 'error',
  warning: 'warning',
  success: 'success',
  primary: 'info',
  neutral: 'question'
} as const

const confirmColorMap = {
  error: '#dc2626',
  warning: '#f59e0b',
  success: '#16a34a',
  primary: '#2563eb',
  neutral: '#6b7280'
} as const

export function useConfirm() {
  async function confirm(
    opts: {
      title?: string
      message?: string
      okLabel?: string
      cancelLabel?: string
      loadingTitle?: string
      color?: 'error' | 'primary' | 'success' | 'warning' | 'neutral'
    } = {},
    onConfirm?: () => Promise<void>
  ) {
    const color = opts.color ?? 'error'
    const result = await Swal.fire({
      title: opts.title ?? 'Konfirmasi',
      text: opts.message ?? 'Yakin melanjutkan?',
      icon: iconMap[color],
      showCancelButton: true,
      confirmButtonText: opts.okLabel ?? 'Ya',
      cancelButtonText: opts.cancelLabel ?? 'Batal',
      confirmButtonColor: confirmColorMap[color],
      focusConfirm: false
    })
    if (!result.isConfirmed) return false

    if (onConfirm) {
      Swal.fire({
        title: opts.loadingTitle ?? 'Memproses...',
        didOpen: () => Swal.showLoading(),
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        showCancelButton: false
      })
      try {
        await onConfirm()
      } finally {
        Swal.close()
      }
    }
    return true
  }

  return { confirm }
}
