import { showToast } from '@/lib/ui/toast'

export interface ToastAction {
  label: string
  onClick: () => void
}

export function showErrorToast(message: string, action?: ToastAction): void {
  showToast.error(message, {
    duration: 60000,
    action: action
      ? {
          label: action.label,
          onClick: action.onClick,
        }
      : undefined,
  })
}

export function showSuccessToast(message: string): void {
  showToast.success(message)
}

export function showInfoToast(message: string): void {
  showToast.info(message)
}

export function showWarningToast(message: string): void {
  showToast.warning(message)
}
