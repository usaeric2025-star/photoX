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
              const skippedTxt = data.skipped !== undefined ? `, 自动跳过(已完成): ${data.skipped}` : '';
              const totalTxt = data.total !== undefined ? `, 库藏总数: ${data.total}` : '';
              appendToDialog(`\n🎉 ========== 备份/迁移全部完成 ========== \n本次新成功: ${data.success}, 本次失败: ${data.fail}${skippedTxt}${totalTxt}`);
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
          const skippedTxt = data.skipped !== undefined ? `, 自动跳过(已完成): ${data.skipped}` : '';
          const totalTxt = data.total !== undefined ? `, 库藏总数: ${data.total}` : '';
          appendToDialog(`\n🎉 ========== 备份/迁移全部完成 ========== \n本次新成功: ${data.success}, 本次失败: ${data.fail}${skippedTxt}${totalTxt}`);
        }
      } catch (e) {}
    }

    appendToDialog('✅ R2 迁移流式数据传输已圆满结束。\n');

  } catch (err: any) {
    appendToDialog(`❌ 迁移连接失败: ${err.message || err}`);
  }
}

export async function testR2ConnectionStatus() {
  const setAlertDialog = useGalleryStore.getState().setAlertDialog;

  // 1. Loading Dialog
  setAlertDialog({
    title: 'R2 存储状态诊断中 / Diagnosing R2 Connection...',
    message: (
      <div className="flex flex-col items-center justify-center py-8 space-y-3">
        <div className="w-10 h-10 border-4 border-t-brand-gold border-brand-navy/10 rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold">正在连通物理后端、并发送 R2 协议探测分组请求，请稍候...</p>
      </div>
    ),
    confirmLabel: '请稍候 / Please wait...',
  });

  try {
    const res = await fetch('/api/health-r2');
    if (!res.ok) {
      throw new Error(`服务器响应异常: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();

    const isSuccess = data.status === 'ok';

    setAlertDialog({
      title: isSuccess ? '✅ R2 存储连通性极佳 / R2 Connection Success' : '⚠️ R2 诊断存在异常 / R2 Connection Diagnostic Issue',
      message: (
        <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
          <p className="text-xs text-slate-500 leading-normal">
            以下是全链路物理存储通道自动诊断结果。本检测由后端物理容器实时执行：
          </p>

          {/* Supabase Box */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#1e293b] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                1. Supabase 数据源检测
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                data.supabase.connectionOk ? 'bg-emerald-100/80 text-emerald-800' : 'bg-red-100 text-red-800'
              }`}>
                {data.supabase.connectionOk ? '正常 / Connected' : '故障 / Connection Failed'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 font-mono">
              <div>🔗 URL 配置: {data.supabase.urlConfigured ? '🟢 已配置' : '🔴 缺失'}</div>
              <div>🔑 Service Key: {data.supabase.keyConfigured ? '🟢 已配置' : '🔴 缺失'}</div>
              <div className="col-span-2">📸 待迁移照片总数: <span className="font-bold text-brand-navy">{data.supabase.photoCount} 张</span></div>
            </div>

            {data.supabase.error && (
              <div className="mt-1 p-2 bg-red-50 text-red-700 text-[10px] font-mono leading-relaxed rounded border border-red-100 max-h-20 overflow-y-auto">
                错误根因: {data.supabase.error}
              </div>
            )}
          </div>

          {/* Cloudflare R2 Box */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#1e293b] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                2. Cloudflare R2 存储桶检测
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                data.r2.connectionOk ? 'bg-emerald-100/80 text-emerald-800' : 'bg-red-100 text-red-800'
              }`}>
                {data.r2.connectionOk ? '正常 / Connected' : '拒绝 / Blocked'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-600 font-mono">
              <div className="col-span-2 truncate">🌐 终端节点 (Endpoint): <span className="text-slate-505 text-[10px]">{data.r2.endpoint || '未配置'}</span></div>
              <div>🔑 Access ID: {data.r2.accessKeyConfigured ? `🟢 已确认 (${data.r2.accessKeyLength} 位)` : '🔴 缺失'}</div>
              <div>🔒 Secret Key: {data.r2.secretAccessKeyConfigured ? `🟢 已确认 (${data.r2.secretAccessKeyLength} 位)` : '🔴 缺失'}</div>
              <div className="col-span-2">📥 主存储桶: <span className="font-bold text-brand-navy">{data.r2.bucketName}</span></div>
              {data.r2.keysSwappedBySafeguard && (
                <div className="col-span-2 text-brand-gold font-bold text-[10px] leading-relaxed">
                  ⚠️ 提示：系统已自动检测并为您配对交换了长度错位的 R2 密钥对。
                </div>
              )}
            </div>

            {data.r2.error && (
              <div className="mt-1 p-2 bg-red-50 text-red-700 text-[10px] font-mono leading-relaxed rounded border border-red-100 max-h-24 overflow-y-auto">
                物理错误: {data.r2.error}
              </div>
            )}
          </div>

          {/* Advice Block */}
          {!isSuccess && data.r2.diagnosticAdvice && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-left">
              <h4 className="text-xs font-black text-amber-800 flex items-center gap-1.5 mb-1 text-left">
                💡 存储专家智能诊断建议：
              </h4>
              <p className="text-xs text-amber-900 leading-relaxed font-semibold">
                {data.r2.diagnosticAdvice}
              </p>
            </div>
          )}

          {isSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs text-emerald-800 leading-relaxed font-semibold text-left">
              🎉 链路格外完美，且 R2 配置已完全通过 API 握手和 `ListObjectsV2` 自测试。您的系统处于完全可迁移状态！可以安全执行数据迁移。
            </div>
          )}
        </div>
      ),
      confirmLabel: '我知道了 / Close',
    });

  } catch (err: any) {
    setAlertDialog({
      title: '❌ 诊断接口连接失败',
      message: (
        <div className="space-y-2 mt-2 text-sm text-slate-600 text-left">
          <p className="font-bold text-red-600">请求无法到达后端容器，诊断终止。</p>
          <p className="text-xs">物理错误详情: {err.message || String(err)}</p>
          <p className="text-xs leading-relaxed">
            请确保您的后端进程正处于在线状态（若是 Vercel 这类完全静态托管的前端，将不支持执行 R2 诊断/迁移后台进程）。
          </p>
        </div>
      ),
      confirmLabel: '关闭窗口',
    });
  }
}
