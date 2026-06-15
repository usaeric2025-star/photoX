import { Popover } from '@base-ui/react';
import { Info } from 'lucide-react';

export function InfoButton() {
  return (
    <Popover.Root>
      <Popover.Trigger className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 transition cursor-pointer">
        <Info size={16} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8}>
          <Popover.Popup className="bg-white rounded-lg shadow-xl border p-4 w-64 z-50">
            <h4 className="font-semibold mb-2">使用說明</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 點擊照片可放大檢視</li>
              <li>• 滑動切換上一張/下一張</li>
              <li>• 點擊 ℹ️ 可查看詳細資訊</li>
            </ul>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
