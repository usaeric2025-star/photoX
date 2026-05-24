import React, { Component, ErrorInfo, ReactNode } from 'react';
import { reportError } from '@/lib/errorReporter';
import { Terminal, Copy, Check, LayoutGrid, Info, RefreshCw, FileText, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
  copiedStatus: boolean;
  activeTab: 'summary' | 'stack' | 'component' | 'env' | 'diagnosis';
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: any) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      componentStack: null,
      copiedStatus: false,
      activeTab: 'summary'
    };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      componentStack: errorInfo.componentStack || null
    });

    // Stating globally for console access
    (window as any).__LAST_ERROR__ = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };
    
    // Remote report in production
    reportError(error, 'ErrorBoundary', 'error');
  }

  getErrorDetailsObject = () => {
    return {
      platform: "PhotoX Ultimate Cloud Core",
      errorClass: this.state.error?.name || "Error",
      errorMessage: this.state.error?.message || "Unknown error occurred",
      stack: this.state.error?.stack || "",
      componentStack: this.state.componentStack || "",
      url: window.location.href,
      ua: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      pixelRatio: window.devicePixelRatio,
      onlineStatus: navigator.onLine ? "Online" : "Offline",
      timestamp: new Date().toISOString(),
      localTime: new Date().toLocaleString(),
    };
  };

  handleCopyError = () => {
    const errorDetails = this.getErrorDetailsObject();
    const rawText = JSON.stringify(errorDetails, null, 2);
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(rawText)
        .then(() => {
          this.setState({ copiedStatus: true });
          setTimeout(() => this.setState({ copiedStatus: false }), 3000);
        })
        .catch(() => {
          this.fallbackCopyText(rawText);
        });
    } else {
      this.fallbackCopyText(rawText);
    }
  };

  fallbackCopyText = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        this.setState({ copiedStatus: true });
        setTimeout(() => this.setState({ copiedStatus: false }), 3000);
      } else {
        alert("复制接口受环境安全限制，请在下方【文本详情】中手动双击选中复制。");
      }
    } catch (err) {
      console.error("Fallback copy failed", err);
    }
  };

  getDiagnosticAdvice = (): { title: string; steps: string[] } => {
    const msg = (this.state.error?.message || "").toLowerCase();
    const stack = (this.state.error?.stack || "").toLowerCase();
    
    if (msg.includes("supabase") || stack.includes("supabase") || msg.includes("postgres") || msg.includes("rest_error") || msg.includes("api_key")) {
      return {
        title: "Supabase 数据库/接口服务连接异常 Check List",
        steps: [
          "检查环境变量：确认 Supabase URL 与 API / Service Key 是否在 .env 中配置，且没有被额外的前端编译拦截。",
          "检查网络连接：当前机器可能存在网络跨域拦截，或者 Supabase 云端实例进入了暂停挂起 (Paused) 状态，请登录 Supabase 控制台查看项目是否正常活跃。",
          "数据架构异常：如果近期修改了数据库字段拼写（如 group_id 还是 group_uuid），请核对 services 层与数据库真实 DDL 的列名拼写是否完全一致（例如: snake_case 拼写规范）。"
        ]
      };
    }
    
    if (msg.includes("r2") || msg.includes("aws-sdk") || msg.includes("presign") || msg.includes("bucket") || msg.includes("s3")) {
      return {
        title: "Cloudflare R2 Bucket / S3 存储服务异常 Check List",
        steps: [
          "核对 R2 凭证：检查 `R2_ACCESS_KEY_ID` 和 `R2_SECRET_ACCESS_KEY` 的长度与配对。系统在 server.ts 中内置了长度配对交换算法（64字符与32字符），确保您填写了正确的 Client Token 密钥对。",
          "API 节点环境：确认 R2_ENDPOINT 端点 URL 格式无误（无需带 bucket 名字，通常形如 `https://<account-id>.r2.cloudflarestorage.com`）。",
          "存储桶权限：确保 `photox-storage` 存储桶已在 Cloudflare 后台创建，且对应的 API 令牌拥有 `Object Read/Write` 权限。"
        ]
      };
    }

    if (msg.includes("null") || msg.includes("undefined") || msg.includes("cannot read properties") || msg.includes("is not a function")) {
      return {
        title: "前端运行时空指针安全保障异常 Error Safety Check List",
        steps: [
          "空值访问控制：代码中访问了 `null` / `undefined` 对象的属性。请检查受损组件，增加可选链 `?.` 或首选默认值占位符。",
          "异步加载竞态：可能数据还未完全拉取完毕（或 query 查询还处于 loading），组件就提前尝试渲染该对象的属性，请确保使用 `DataLoadingContainer` 或条件保护。"
        ]
      };
    }

    if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("sse") || msg.includes("eventsource")) {
      return {
        title: "网络连接中断或网络跨域拦截 Network Error Check List",
        steps: [
          "检查 Node 环境：当前可能未启动 Node.js 实机代理容器（例如托管在纯静态前端云服务中），R2 迁移日志和大容量文件上传高度依赖后台物理通道，不支持纯静态前端调用。",
          "跨域与混合协议阻挡：如果您的站点通过 HTTPS 加载，而接口或第三方图片 CDN 使用了 HTTP 协议，浏览器会触发 Mixed Content 异常阻断连接。"
        ]
      };
    }

    return {
      title: "系统通用异常自动化排查 Check List",
      steps: [
        "重载应用缓存：请点击下方的“重新加载”或使用浏览器强制刷新快捷键 (Ctrl+F5 / Cmd+Shift+R) 确认是否有旧版静态资源缓存冲突。",
        "检查 Supabase 连接：在离线状态或本地配置密钥缺失时系统由于无法拉取初始类别、照片数据可能导致应用挂起。",
        "点击右上角复制详细日志，粘贴发送给开发团队或技术专家进行代码级别排错定位。"
      ]
    };
  };

  render() {
    if (this.state.hasError) {
      const diag = this.getDiagnosticAdvice();
      const rawDiagText = JSON.stringify(this.getErrorDetailsObject(), null, 2);

      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-4 md:p-8 text-slate-100 font-sans">
          <div className="w-full max-w-4xl bg-[#131b2e] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Upper Header Block */}
            <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 p-6 text-white">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-white/10 rounded-2xl border border-white/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-7 h-7 text-white animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight leading-snug">应用运行异常崩溃 / Component Crash Detected</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-rose-100 mt-1 flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-red-400 animate-ping" />
                      SYSTEM EMERGENCY REPORT ENGINE — MAXIMUM DETAIL MODE
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={this.handleCopyError}
                    className="h-10 px-4 flex items-center gap-2 bg-slate-900/40 hover:bg-slate-900/60 active:scale-95 transition-all text-white font-black text-xs uppercase cursor-pointer rounded-xl border border-white/15"
                  >
                    {this.state.copiedStatus ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {this.state.copiedStatus ? "已复制 / Copied" : "复制详细日志 / Copy Details"}
                  </button>
                  <button 
                    onClick={() => window.location.reload()}
                    className="h-10 w-10 flex items-center justify-center bg-white/15 hover:bg-white/25 active:scale-95 transition-all rounded-xl border border-white/10"
                    title="Reload"
                  >
                    <RefreshCw className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {/* Instant Highlight Line */}
              <div className="mt-4 p-3 bg-slate-950/40 border border-white/10 rounded-xl">
                <p className="text-[10px] font-black tracking-wider text-rose-300 font-mono uppercase">CRITICAL CLASS MESSAGE:</p>
                <p className="text-xs font-bold font-mono text-white mt-1 select-all break-all leading-relaxed bg-black/20 p-2 rounded-lg">
                  {this.state.error?.name || "Error"}: {this.state.error?.message || "Unknown error occurred during React tree render"}
                </p>
              </div>
            </div>

            {/* Tab Navigation Bars */}
            <div className="bg-[#0b0f1a] px-4 pt-3 border-b border-slate-800/80 flex gap-1 overflow-x-auto scrollbar-none">
              {(['summary', 'stack', 'component', 'env', 'diagnosis'] as const).map((tab) => {
                const isActive = this.state.activeTab === tab;
                const labels: Record<string, string> = {
                  summary: "大纲概要 / Summary",
                  stack: "堆栈轨迹 / Stack",
                  component: "组装树 / Component Tree",
                  env: "环境元数据 / Metadata",
                  diagnosis: "智能诊断 / Diagnosis"
                };
                const TabIcon = {
                  summary: FileText,
                  stack: Terminal,
                  component: LayoutGrid,
                  env: Info,
                  diagnosis: AlertTriangle
                }[tab];

                return (
                  <button
                    key={tab}
                    onClick={() => this.setState({ activeTab: tab })}
                    className={`px-4 py-2 text-xs font-bold whitespace-nowrap rounded-t-xl transition-all flex items-center gap-1.5 border-t border-x cursor-pointer ${
                      isActive 
                        ? 'bg-[#131b2e] text-blue-400 border-slate-800 border-b-[#131b2e]' 
                        : 'bg-transparent text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-850/40'
                    }`}
                  >
                    <TabIcon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            {/* Main Tabs Container */}
            <div className="p-6 flex-1 min-h-[320px] overflow-y-auto max-h-[500px] bg-[#131b2e]">
              
              {/* TAB 1: SUMMARY */}
              {this.state.activeTab === 'summary' && (
                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-2 border-b border-slate-800/60 pb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <h3 className="text-xs font-black uppercase text-slate-350 tracking-widest">系统崩溃快速摘要 / Fast Failure Summary</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#0a0f1d] p-4 rounded-2xl border border-slate-800">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">崩溃时间 / Local Occurrence</p>
                      <p className="text-xs font-bold font-mono text-slate-300">{new Date().toLocaleString()}</p>
                    </div>
                    
                    <div className="bg-[#0a0f1d] p-4 rounded-2xl border border-slate-800">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">文件与物理位置 / Origin Source Location</p>
                      <p className="text-xs font-bold font-mono text-amber-500 truncate" title={this.state.error?.stack?.split('\n')[1] || "Unknown"}>
                        {this.state.error?.stack?.split('\n')[1]?.replace(/^\s*at\s+/, '') || "Dynamic inline script context"}
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#0a0f1d] p-4 rounded-2xl border border-slate-800">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">事件摘要大纲 / Error Synopsis</p>
                    <ul className="text-xs leading-relaxed text-slate-350 space-y-2 list-disc pl-4.5">
                      <li>运行引擎在解析 React DOM 渲染树时接收到意外的中断响应。</li>
                      <li>
                        错误源类名：<code className="px-1.5 py-0.5 bg-slate-900 rounded font-mono text-red-400 font-bold">{this.state.error?.name || "Error"}</code>。 
                      </li>
                      <li>堆栈跟踪深度共 {this.state.error?.stack?.split('\n').length || 0} 层，已全部记录就绪。</li>
                      <li>如处于生产发布流程，此异常已利用 Sentry 引擎模块向服务器安全系统发起诊断通知上报。</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB 2: STACK TRACE */}
              {this.state.activeTab === 'stack' && (
                <div className="space-y-3 text-left">
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                      <h3 className="text-xs font-black uppercase text-slate-350 tracking-widest">完整堆栈轨迹 / Full JS Callstack Details</h3>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">Trace Depth: {this.state.error?.stack?.split('\n').length || 0}</span>
                  </div>
                  <pre 
                    className="bg-[#0a0f1d] border border-slate-850 rounded-2xl p-4 overflow-auto max-h-[300px] font-mono text-[11px] leading-relaxed select-all text-rose-300/90 whitespace-pre-wrap shadow-inner"
                    style={{ wordBreak: 'break-all' }}
                  >
                    {this.state.error?.stack || "No JS stack trace output is supplied by the browser runtime context."}
                  </pre>
                </div>
              )}

              {/* TAB 3: COMPONENT TREE */}
              {this.state.activeTab === 'component' && (
                <div className="space-y-3 text-left">
                  <div className="flex items-center gap-2 border-b border-slate-800/60 pb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <h3 className="text-xs font-black uppercase text-slate-350 tracking-widest">React 渲染组件树层级 / React Fiber Callstack</h3>
                  </div>
                  {this.state.componentStack ? (
                    <pre 
                      className="bg-[#0a0f1d] border border-slate-850 rounded-2xl p-4 overflow-auto max-h-[300px] font-mono text-[11px] leading-relaxed select-all text-emerald-400/95 whitespace-pre-line shadow-inner"
                    >
                      {this.state.componentStack}
                    </pre>
                  ) : (
                    <div className="p-8 bg-[#0a0f1d] rounded-2xl border border-slate-850 text-center text-slate-500 text-xs">
                      ⚠️ React 运行阶段没有为此异常提供独立的 React Fiber 渲染树。
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: METADATA & ENV */}
              {this.state.activeTab === 'env' && (
                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-2 border-b border-slate-800/60 pb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <h3 className="text-xs font-black uppercase text-slate-350 tracking-widest">运行宿主与物理元数据 / Environment Context</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="bg-[#0a0f1d] p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">页面绝对路径 / Page URL</span>
                      <span className="font-mono text-[11px] text-slate-300 select-all break-all">{window.location.href}</span>
                    </div>

                    <div className="bg-[#0a0f1d] p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">浏览器尺寸 / Viewport Size</span>
                      <span className="font-mono text-[11px] text-slate-300">{window.innerWidth} x {window.innerHeight} (DPR {window.devicePixelRatio})</span>
                    </div>

                    <div className="bg-[#0a0f1d] p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">网络连通状态 / Network Connection</span>
                      <span className="font-mono text-[11px] font-bold text-green-400">{navigator.onLine ? "ONLINE (在线)" : "OFFLINE (离线)"}</span>
                    </div>

                    <div className="bg-[#0a0f1d] p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">安全基建芯片 / Engine Version</span>
                      <span className="font-mono text-[11px] text-slate-300">PhotoX Core Engine v1.0.5 - Secure Sandbox</span>
                    </div>
                  </div>

                  <div className="bg-[#0a0f1d] p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-black text-slate-500 uppercase block mb-2">客户端用户代理 / UserAgent Header</span>
                    <span className="font-mono text-[10.5px] text-slate-400 leading-relaxed select-all break-all block">{navigator.userAgent}</span>
                  </div>
                </div>
              )}

              {/* TAB 5: DIAGNOSIS */}
              {this.state.activeTab === 'diagnosis' && (
                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-2 border-b border-slate-800/60 pb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <h3 className="text-xs font-black uppercase text-slate-350 tracking-widest">AI 联机故障自动分析与建议 / Diagnostic Checklist</h3>
                  </div>

                  <div className="bg-blue-950/20 border border-blue-900/60 p-4 rounded-2xl">
                    <h4 className="text-xs font-black text-blue-400 flex items-center gap-2">
                      <span className="w-1.5 h-3 bg-blue-400 block rounded" />
                      {diag.title}
                    </h4>
                    <div className="mt-3 space-y-2.5">
                      {diag.steps.map((step, idx) => (
                        <div key={idx} className="flex gap-2.5 text-xs text-slate-300 leading-relaxed">
                          <span className="text-blue-400 font-black font-mono select-none">[{idx + 1}]</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/45 border border-slate-850 rounded-xl text-[11px] text-slate-500 text-center leading-relaxed font-semibold">
                    💡 提示：本软件包含对空指针及网络失效的防御重试机制。通常情况下刷新页面或稍等片刻即可自动恢复连通。
                  </div>
                </div>
              )}

            </div>

            {/* RAW DIAGNOSTIC TEXTAREA FOR ABSOLUTE SAFETY IN COPIES */}
            <div className="p-4 bg-[#0a0f1d] border-t border-slate-850 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">文本详情（防浏览器复制接口拦截 / Manual Select Text Details）</span>
                <span className="text-[9px] text-slate-650">双击或三击文本框可全选</span>
              </div>
              <textarea
                readOnly
                value={rawDiagText}
                className="w-full h-16 text-[9.5px] font-mono leading-normal bg-slate-900 border border-slate-800/80 rounded-xl p-2 select-all text-slate-500 focus:outline-none"
                onClick={(e) => (e.target as any).select()}
              />
            </div>

            {/* Downward Actions Footer */}
            <div className="p-5 bg-[#0a0f1b] border-t border-slate-850/60 flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => window.location.reload()} 
                className="flex-1 py-3 px-5 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider cursor-pointer rounded-2xl shadow-lg shadow-blue-500/10 transition-all active:scale-[0.98]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                重新加载页面 / Reload Interface
              </button>
              <button 
                onClick={() => { window.location.href = '/' }} 
                className="flex-1 py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase tracking-wider cursor-pointer rounded-2xl transition-all active:scale-[0.98] text-center"
              >
                返回首页 / Go to Home
              </button>
            </div>

          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
