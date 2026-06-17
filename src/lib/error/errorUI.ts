import { showToast } from '@/lib/ui/toast'
import { toast } from 'sonner'

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
  toast.success(message, { duration: 3000 })
}

export function showInfoToast(message: string): void {
  toast.info(message, { duration: 3000 })
}

export function showWarningToast(message: string): void {
  toast.warning(message, { duration: 4000 })
}
