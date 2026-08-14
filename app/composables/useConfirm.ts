import ConfirmDialog from '~/components/ConfirmDialog.vue'

export function useConfirm() {
  const overlay = useOverlay()
  const dialog = overlay.create(ConfirmDialog)

  function confirm(opts: {
    title?: string
    message?: string
    okLabel?: string
    cancelLabel?: string
    color?: 'error' | 'primary' | 'success' | 'warning' | 'neutral'
  } = {}) {
    return dialog.open(opts).result as Promise<boolean>
  }

  return { confirm }
}
