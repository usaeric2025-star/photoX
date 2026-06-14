import { toast } from 'sonner'

export interface ToastAction {
  label: string
  onClick: () => void
}

export function showErrorToast(message: string, action?: ToastAction): void {
  toast.error(message, {
    duration: 5000,
    action: action
      ? {
          label: action.label,
          onClick: action.onClick,
        }
      : undefined,
  })
}

export function showSuccessToast(message: string): void {
  toast.success(message, { duration: 3000 })
}

export function showInfoToast(message: string): void {
  toast.info(message, { duration: 3000 })
}

export function showWarningToast(message: string): void {
  toast.warning(message, { duration: 4000 })
}
