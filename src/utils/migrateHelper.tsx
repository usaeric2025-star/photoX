import React from 'react';
import { useGalleryStore } from '../store';

export async function triggerR2Migration() {
  let logs = '正在建立迁移连接...\n';

  const setAlertDialog = useGalleryStore.getState().setAlertDialog;

  const appendToDialog = (msg: string) => {
    logs += msg + '\n';
    setAlertDialog({
      title: 'R2 迁移实时进度 / R2 Migration Progress',
      message: (
        <div className="space-y-2 mt-2">
          <p className="text-xs text-slate-500 font-medium">请保持此窗口打开以同步状态。R2 bucket: photox-storage</p>
          <div 
            id="migration-log-container"
            className="h-80 overflow-y-auto bg-[#0a0f1d] text-green-400 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap rounded-xl border border-slate-800 shadow-inner"
          >
            {logs}
          </div>
        </div>
      ),
      confirmLabel: '关闭窗口',
    });

    // Auto scroll to bottom
    setTimeout(() => {
      const container = document.getElementById('migration-log-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 16);
  };

  // 1. Preflight Health-check to verify running Node.js backend container exists
  try {
    const res = await fetch('/api/health');
    const isJson = res.headers.get('content-type')?.includes('application/json');
    if (!res.ok || !isJson) {
      throw new Error('Static host bypass');
    }
  } catch (err) {
    setAlertDialog({
      title: '迁移失败 / Migration Failed',
      message: (
        <div className="space-y-2 mt-2 text-sm text-slate-600">
          <p className="font-semibold text-red-600 flex items-center gap-1">
            ⚠️ 调试提示：无法连通后端容器 / Backend Server Offline
          </p>
          <p className="text-xs leading-relaxed">
            检测到当前处于静态托管前端环境（例如 Vercel）。R2 迁移涉及高吞吐量服务端 I/O 下载，需要实时的 Node.js 后端容器处理。
          </p>
          <p className="text-xs leading-relaxed font-semibold text-brand-navy">
            解决办法：请切换或部署到 AI Studio 预览的云端容器机器 (Cloud Run) 或本地开发者机器上运行迁移操作。
          </p>
        </div>
      ),
      confirmLabel: '我知道了 / Close',
    });
    return;
  }

  // Open initial progress dialog
  setAlertDialog({
    title: 'R2 迁移实时进度 / R2 Migration Progress',
    message: (
      <div className="space-y-2 mt-2">
        <p className="text-xs text-slate-500 font-medium">请保持此窗口打开以同步状态。R2 bucket: photox-storage</p>
        <div 
          id="migration-log-container"
          className="h-80 overflow-y-auto bg-[#0a0f1d] text-green-400 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap rounded-xl border border-slate-800 shadow-inner"
        >
          {logs}
        </div>
      </div>
    ),
    confirmLabel: '关闭窗口',
  });

  try {
    const response = await fetch('/api/migrate-r2', { method: 'GET' });
    if (!response.ok) {
      throw new Error(`HTTP 异常: ${response.status} ${response.statusText}`);
    }
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('当前浏览器环境不支持获取流对象 (ReadableStream unsupported)');
    }

    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep partial line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        // Match SSE style "data: ..." lines
        if (trimmed.startsWith('data:')) {
          const rawJson = trimmed.substring(5).trim();
          try {
            const data = JSON.parse(rawJson);
            if (data.type === 'info') {
              appendToDialog(data.message);
            } else if (data.type === 'success') {
              appendToDialog(`✅ ${data.message}`);
            } else if (data.type === 'error') {
              appendToDialog(`❌ ${data.message}`);
            } else if (data.type === 'done') {
              appendToDialog(`\n🎉 ========== 备份/迁移全部完成 ========== \n成功: ${data.success}, 失败: ${data.fail}`);
            }
          } catch (e) {
            console.warn('[R2 Migrate Stream] JSON Parse error:', rawJson);
          }
        }
      }
    }
    
    // Process final buffer remaining text (if any)
    if (buffer.trim().startsWith('data:')) {
      const trimmed = buffer.trim();
      const rawJson = trimmed.substring(5).trim();
      try {
        const data = JSON.parse(rawJson);
        if (data.type === 'info') {
          appendToDialog(data.message);
        } else if (data.type === 'success') {
          appendToDialog(`✅ ${data.message}`);
        } else if (data.type === 'error') {
          appendToDialog(`❌ ${data.message}`);
        } else if (data.type === 'done') {
          appendToDialog(`\n🎉 ========== 备份/迁移全部完成 ========== \n成功: ${data.success}, 失败: ${data.fail}`);
        }
      } catch (e) {}
    }

    appendToDialog('✅ R2 迁移流式数据传输已圆满结束。\n');

  } catch (err: any) {
    appendToDialog(`❌ 迁移连接失败: ${err.message || err}`);
  }
}
