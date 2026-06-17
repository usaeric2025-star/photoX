import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { translations } from "@/locales";

interface DeletePhotoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: string;
  onDelete: () => Promise<void>;
}

export function DeletePhotoDialog({ open, onOpenChange, lang, onDelete }: DeletePhotoDialogProps) {
  const t = translations[lang as keyof typeof translations] || translations.en;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.confirmDeleteTitle}
      description={t.confirmDeleteDesc}
      confirmText={t.deleteBtn}
      variant="destructive"
      onConfirm={onDelete}
    />
  );
}
