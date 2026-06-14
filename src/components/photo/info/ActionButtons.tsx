import React from 'react';
import { Sparkles, Pencil, Trash2, Info } from 'lucide-react';
import { Button } from '@/components/shared/Button';

interface ActionButtonsProps {
  isGroup: boolean;
  showAi?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  onAiAnalyze?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
  texts: {
    aiAnalyze: string;
    edit: string;
    delete: string;
    close: string;
  };
}

export function ActionButtons({
  isGroup,
  showAi,
  showEdit,
  showDelete,
  onAiAnalyze,
  onEdit,
  onDelete,
  onClose,
  texts
}: ActionButtonsProps) {
  return (
    <div className="flex items-center gap-1">
      {showAi && !isGroup && (
        <Button variant="ghost" size="icon" onClick={onAiAnalyze} title={texts.aiAnalyze} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
          <Sparkles size={16} />
        </Button>
      )}
      {showEdit && (
        <Button variant="ghost" size="icon" onClick={onEdit} title={texts.edit} className="h-8 w-8 text-slate-600">
          <Pencil size={16} />
        </Button>
      )}
      {showDelete && (
        <Button variant="ghost" size="icon" onClick={onDelete} title={texts.delete} className="h-8 w-8 text-red-600 hover:bg-red-50">
          <Trash2 size={16} />
        </Button>
      )}
      {onClose && (
        <Button variant="ghost" size="icon" onClick={onClose} title={texts.close} className="h-8 w-8 text-brand-navy hover:text-brand-navy/80 hover:bg-slate-100 ml-1">
          <Info size={18} />
        </Button>
      )}
    </div>
  );
}
