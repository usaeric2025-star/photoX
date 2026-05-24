import React from 'react';
import { useGalleryStore } from '../store';

let globalMigrationLogs = '正在建立迁移连接...\n';
let isReenteringInstance = false; 
let updateTimeout: any = null;

export interface MigrationProgress {
  success: number;
  fail: number;
  skipped: number;
  total: number;
  message: string;
  isDone: boolean;
  logs: string;
}

export async function triggerR2Migration(options?: { 
  onProgress?: (p: MigrationProgress) => void;
  isSilent?: boolean;
}) {
  const setAlertDialog = useGalleryStore.getState().setAlertDialog;
  const onProgress = options?.onProgress;
  const isSilent = options?.isSilent;

  if (!isReenteringInstance) {
    globalMigrationLogs = '🚀 启动全自动云端增量 R2 迁移对账引擎...\n正在建立迁移连接...\n';
  }

  const broadcastProgress = (msg: string, isDone = false, data?: any) => {
    if (onProgress) {
      onProgress({
        success: data?.success || 0,
        fail: data?.fail || 0,
        skipped: data?.skipped || 0,
        total: data?.total || 0,
        message: msg,
        isDone,
        logs: globalMigrationLogs
      });
    }
  };

  const appendToDialog = (msg: string, isImmediate = false, data?: any) => {
    globalMigrationLogs += msg + '\n';
    broadcastProgress(msg, false, data);

    if (isSilent) return; // 静默模式下不弹出也不更新 Dialog

    const renderUpdate = () => {
      const stats = data || {};
      const total = stats.total || 0;
      const pending = stats.pending || 0;
      const success = stats.success || 0;
      const fail = stats.fail || 0;
      const skipped = stats.skipped || 0;
      const migrated = total > 0 ? (total - pending) : 0;
      const progressPercent = total > 0 ? Math.round((migrated / total) * 100) : 0;

      setAlertDialog({
        title: 'R2 迁移实时进度 / R2 Migration Progress',
        message: (
          <div className="space-y-4 mt-2">
            {/* Progress Stats Header */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex flex-col items-center">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">库藏总数</span>
                <span className="text-lg font-black text-brand-navy">{total}</span>
              </div>
              <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100 flex flex-col items-center">
                <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight">已迁移</span>
                <span className="text-lg font-black text-emerald-700">{migrated}</span>
              </div>
              <div className="bg-blue-50 p-2 rounded-xl border border-blue-100 flex flex-col items-center">
                <span className="text-[10px] text-blue-600 font-bold uppercase tracking-tight">待对账</span>
                <span className="text-lg font-black text-blue-700">{pending}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 to-blue-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex justify-between items-center px-1">
              <p className="text-[10px] text-slate-400 font-bold">
                {stats.isDone ? '🎉 迁移全部完成' : `⚡️ 正在分批执行迁移对账... (${progressPercent}%)`}
              </p>
              <div className="flex gap-2 text-[10px] font-mono font-bold">
                <span className="text-emerald-600">Success: {success}</span>
                <span className="text-amber-500">Skip: {skipped}</span>
                <span className="text-red-500">Fail: {fail}</span>
              </div>
            </div>

            <div 
              id="migration-log-container"
              className="h-60 overflow-y-auto bg-[#0a0f1d] text-green-400 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap rounded-xl border border-slate-800 shadow-inner"
            >
              {globalMigrationLogs}
            </div>
          </div>
        ),
        confirmLabel: '关闭窗口',
      });

      setTimeout(() => {
        const container = document.getElementById('migration-log-container');
        if (container) container.scrollTop = container.scrollHeight;
      }, 16);
    };

    if (isImmediate) {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
        updateTimeout = null;
      }
      renderUpdate();
    } else {
      if (!updateTimeout) {
        updateTimeout = setTimeout(() => {
          updateTimeout = null;
          renderUpdate();
        }, 200);
      }
    }
  };

  try {
    const res = await fetch('/api/health');
    const isJson = res.headers.get('content-type')?.includes('application/json');
    const isVercelEnv = typeof process !== 'undefined' && process.env?.VERCEL;
    if (!res.ok && !isJson && !isVercelEnv) throw new Error('Static host bypass');
  } catch (err) { console.warn('[Preflight] 检查略过，尝试连接端点...'); }

  if (!isSilent) {
    setAlertDialog({
      title: 'R2 迁移实时进度 / R2 Migration Progress',
      message: (
        <div className="space-y-2 mt-2">
          <p className="text-xs text-slate-500 font-medium">请保持此窗口打开以同步状态。R2 bucket: photox-storage</p>
          <div 
            id="migration-log-container"
            className="h-80 overflow-y-auto bg-[#0a0f1d] text-green-400 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap rounded-xl border border-slate-800 shadow-inner"
          >
            {globalMigrationLogs}
          </div>
        </div>
      ),
      confirmLabel: '关闭窗口',
    });
  }

  try {
    // 优先尝试探测是否是 Vercel/Serverless 环境，或者是由于流式接口报错
    const isVercel = typeof process !== 'undefined' && process.env?.VERCEL;
    
    if (isVercel || true) { // 默认开启 Serverless 兼容模式，安全性更高
      let accumulatedSuccess = 0;
      let accumulatedFail = 0;
      let accumulatedSkipped = 0;

      const runBatch = async () => {
        try {
          const res = await fetch('/api/migrate-r2-batch');
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();

          accumulatedSuccess += (data.success || 0);
          accumulatedFail += (data.fail || 0);
          accumulatedSkipped += (data.skipped || 0);

          if (data.logs) appendToDialog(data.logs, false, {
            success: accumulatedSuccess,
            fail: accumulatedFail,
            skipped: accumulatedSkipped,
            total: data.total,
            pending: data.pending
          });

          if (data.status === 'continue') {
            // 递归调用下一批
            setTimeout(runBatch, 500);
          } else {
            isReenteringInstance = false;
            appendToDialog(`\n🎉 ========== [Serverless 任务全部完成] ========== \n总计迁移成功: ${accumulatedSuccess}, 失败: ${accumulatedFail}, 跳过: ${accumulatedSkipped}`, true, {
              success: accumulatedSuccess,
              fail: accumulatedFail,
              skipped: accumulatedSkipped,
              total: data.total,
              pending: 0
            });
            broadcastProgress('迁移完成', true, { success: accumulatedSuccess, total: data.total, pending: 0 });
          }
        } catch (err: any) {
          isReenteringInstance = false;
          appendToDialog(`❌ 批次处理中断: ${err.message}`, true);
          broadcastProgress(`错误: ${err.message}`, true);
        }
      };

      appendToDialog('🌐 检测到 Serverless 环境，正在启动“智能分批平滑迁移模式”...');
      await runBatch();
      return;
    }

    // --- 以下是原始流式逻辑 (仅在支持 Streaming 的非 Vercel 环境运行) ---
    const response = await fetch('/api/migrate-r2', { method: 'GET' });
    if (!response.ok) throw new Error(`HTTP 接口异常: ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('流对象读取失败');

    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const rawJson = trimmed.substring(5).trim();
        try {
          const data = JSON.parse(rawJson);
          if (data.type === 'info') appendToDialog(data.message, false, data);
          else if (data.type === 'success') appendToDialog(`✅ ${data.message}`, false, data);
          else if (data.type === 'error') appendToDialog(`❌ ${data.message}`, false, data);
          else if (data.type === 'done') {
            const skippedTxt = data.skipped !== undefined ? `, 自动跳过: ${data.skipped}` : '';
            const totalTxt = data.total !== undefined ? `, 库藏总数: ${data.total}` : '';
            if (data.isPartial) {
              appendToDialog(`\n⏳ ---------- [时限保底安全滑脱] ---------- \n已平滑跑完当前 42 秒安全周期。\n本次成功处理: ${data.success} 张${skippedTxt}${totalTxt}\n⚡️ 智能接力系统：3 秒后将自动无缝启动下一批次，请勿关闭本窗口...`, true, data);
              isReenteringInstance = true;
              setTimeout(() => { triggerR2Migration(options); }, 3000);
            } else {
              isReenteringInstance = false;
              appendToDialog(`\n🎉 ========== 100% 迁移全部大功告成 ========== \n总计新成功: ${data.success}, 失败: ${data.fail}${skippedTxt}${totalTxt}`, true, data);
              broadcastProgress('迁移完成', true, data);
            }
          }
        } catch (e) {}
      }
    }
  } catch (err: any) { 
    isReenteringInstance = false; 
    appendToDialog(`❌ 迁移连接故障: ${err.message}`, true); 
    broadcastProgress(`错误: ${err.message}`, true);
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
    });
  }
}

export async function checkR2Inventory() {
  const setAlertDialog = useGalleryStore.getState().setAlertDialog;
  
  setAlertDialog({
    title: 'R2 存储资产盘点中...',
    message: (
      <div className="flex flex-col items-center justify-center py-8 space-y-3">
        <div className="w-10 h-10 border-4 border-t-blue-500 border-slate-100 rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold">正在深度扫描 R2 存储桶 (prefix: photox/public/)，请稍候...</p>
      </div>
    ),
    confirmLabel: '扫描中...',
  });

  try {
    const res = await fetch('/api/r2-inventory');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    setAlertDialog({
      title: '📦 R2 存储资产清单 (Inventory)',
      message: (
        <div className="space-y-4 py-2">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center gap-2">
            <span className="text-[32px] font-black text-brand-navy">{data.count}</span>
            <span className="text-xs font-bold text-slate-500">云端 R2 物理对象总数</span>
          </div>
          
          <div className="text-[11px] text-slate-500 space-y-1 font-medium bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
            <p>• 扫描路径: <span className="font-mono">{data.prefix}</span></p>
            <p>• 包含介质: 主图原始 WebP + 缩略图 WebP</p>
            <p>• 说明: 如果该数值接近数据库总数 × 2，则说明迁移对账已基本完备。</p>
          </div>
        </div>
      ),
      confirmLabel: '完成盘点',
    });
  } catch (err: any) {
    setAlertDialog({
      title: '❌ 盘点故障',
      message: <p className="text-sm p-4 text-red-600 font-bold">{err.message}</p>,
      confirmLabel: '关闭',
    });
  }
}

export async function checkMigrationStats() {
  const setAlertDialog = useGalleryStore.getState().setAlertDialog;
  
  setAlertDialog({
    title: '深度对账中...',
    message: (
      <div className="flex flex-col items-center justify-center py-8 space-y-3">
        <div className="w-10 h-10 border-4 border-t-emerald-500 border-slate-100 rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold">正在计算 Supabase 与 R2 的分布占比...</p>
      </div>
    ),
    confirmLabel: '计算中...',
  });

  try {
    const res = await fetch('/api/migration-stats');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { stats } = await res.json();

    const supabasePercent = stats.total > 0 ? Math.round((stats.supabase / stats.total) * 100) : 0;
    const r2Percent = stats.total > 0 ? Math.round((stats.r2 / stats.total) * 100) : 0;

    setAlertDialog({
      title: '📊 迁移对账报告 (Database Analysis)',
      message: (
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-red-50 rounded-2xl border border-red-100 flex flex-col items-center">
              <span className="text-2xl font-black text-red-600">{stats.supabase}</span>
              <span className="text-[10px] font-bold text-red-400 uppercase">Supabase 遗留</span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col items-center">
              <span className="text-2xl font-black text-emerald-600">{stats.r2}</span>
              <span className="text-[10px] font-bold text-emerald-400 uppercase">R2 已接管</span>
            </div>
          </div>

          <div className="space-y-2">
             <div className="flex justify-between text-[10px] font-bold px-1">
                <span className="text-slate-400">目前迁移总进度</span>
                <span className={r2Percent === 100 ? "text-emerald-500" : "text-brand-gold"}>{r2Percent}%</span>
             </div>
             <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${r2Percent}%` }} />
             </div>
          </div>
          
          <div className="text-[11px] text-slate-500 space-y-1 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p>• 库藏总记录: <span className="font-bold text-slate-700">{stats.total}</span></p>
            <p>• 其他/未知: <span className="font-bold text-slate-700">{stats.others}</span></p>
            <p className="pt-2 text-[10px] text-slate-400 leading-tight">
              {stats.supabase === 0 
                ? "🎉 恭喜！数据库中所有图片的 URL 已成功指向 Cloudflare R2。" 
                : "⚠️ 注意：仍有部分数据指向 Supabase，请继续运行后台迁移。"}
            </p>
          </div>
        </div>
      ),
      confirmLabel: '关闭报告',
    });
  } catch (err: any) {
    setAlertDialog({
      title: '❌ 对账失败',
      message: <p className="text-sm p-4 text-red-600 font-bold">{err.message}</p>,
      confirmLabel: '关闭',
    });
  }
}
