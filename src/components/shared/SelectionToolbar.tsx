import { useFormStatus } from 'react-dom';
import { Trash2, Sparkles, Edit, X } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';

interface SelectionToolbarProps {
  onAIIdentify?: (ids: string[]) => void;
  onBatchEdit?: (ids: string[]) => void;
  onDelete?: (ids: string[]) => void;
  onHide?: (ids: string[]) => Promise<any>;
  onCopy?: (ids: string[]) => Promise<any>;
}

function DeleteButton({ onDelete }: { onDelete?: (ids: string[]) => void }) {
  const { pending } = useFormStatus();

  if (!onDelete) return null;

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
    >
      <Trash2 size={14} />
      <span>{pending ? '删除中...' : '删除'}</span>
    </button>
  );
}

function AIIdentifyButton({ onAIIdentify }: { onAIIdentify?: (ids: string[]) => void }) {
  const { pending } = useFormStatus();

  if (!onAIIdentify) return null;

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
    >
      <Sparkles size={14} />
      <span>{pending ? '识别中...' : 'AI 识别'}</span>
    </button>
  );
}

function BatchEditButton({ onBatchEdit }: { onBatchEdit?: (ids: string[]) => void }) {
  const { pending } = useFormStatus();

  if (!onBatchEdit) return null;

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
    >
      <Edit size={14} />
      <span>{pending ? '保存中...' : '批量编辑'}</span>
    </button>
  );
}

export function SelectionToolbar({
  onAIIdentify,
  onBatchEdit,
  onDelete,
  onHide,
  onCopy,
}: SelectionToolbarProps) {
  const { selectedIds, update, isMultiSelect } = useUIStore();
  const count = selectedIds.length;
  const ids = selectedIds;

  if (!isMultiSelect || count === 0) return null;

  const handleClear = () => {
    update({ isMultiSelect: false, selectedIds: [] });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg safe-bottom">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="text-sm text-slate-600">
          已选择 <span className="font-bold text-blue-600">{count}</span> 张照片
        </div>

        <div className="flex gap-2">
          <form action={() => onAIIdentify?.(ids)}>
            <AIIdentifyButton onAIIdentify={onAIIdentify} />
          </form>

          <form action={() => onBatchEdit?.(ids)}>
            <BatchEditButton onBatchEdit={onBatchEdit} />
          </form>

          <form action={() => onDelete?.(ids)}>
            <DeleteButton onDelete={onDelete} />
          </form>

          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X size={14} />
            <span>关闭</span>
          </button>
        </div>
      </div>
    </div>
  );
}
