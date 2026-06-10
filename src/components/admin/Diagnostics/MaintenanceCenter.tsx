import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ChevronDown, ShieldAlert, Zap } from 'lucide-react';
import { MaintenanceTool } from './MaintenanceTool';

interface MaintenanceCenterProps {
  onSuccess: () => void;
}

export function MaintenanceCenter({ onSuccess }: MaintenanceCenterProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="bg-slate-50 border border-slate-100 rounded-[32px] p-6 lg:p-8 space-y-8">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">系统维护指令中心 / SYSTEM MAINTENANCE CENTER</h3>
      
      {/* 第一组：必要定期检查 (Routine Checks) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1 text-xs font-black text-slate-700">
          <CheckCircle2 size={14} className="text-emerald-500" />
          常规健康与数据同步 (Routine Sync & Health)
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MaintenanceTool 
            issueId="member_count_mismatch"
            title="校对合组成员数" 
            description="合组记录的成员数量与实际照片数量不符时执行此同步，修正计数显示不准的问题。"
            onSuccess={onSuccess}
          />
          <MaintenanceTool 
            issueId="orphan_files"
            title="找回云端孤儿照片" 
            description="扫描 R2 云端存储，如果在云端发现有照片但在数据库中丢失了记录，会尝试补全并恢复。"
            onSuccess={onSuccess}
          />
          <MaintenanceTool 
            issueId="empty_groups"
            title="清理空合组" 
            description="删除由于移除图片等原因不再包含任何照片的空组，保持数据整洁。"
            onSuccess={onSuccess}
          />
        </div>
      </div>

      {/* 高级与一次性操作，默认折叠 */}
      <div className="space-y-4 pt-4 border-t border-slate-200/60">
        <button 
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 w-full px-1 py-2 text-xs font-black text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider"
        >
          <ChevronDown size={14} className={`transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`} />
          高级清理与 AI 实验工具 (Advanced / Experimental)
        </button>
        
        <AnimatePresence>
          {showAdvanced && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden space-y-8 pt-2"
            >
              {/* 第二组：极端情况与系统深度清理 (Advanced Cleanup) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1 text-xs font-bold text-slate-700">
                  <ShieldAlert size={14} className="text-amber-500" />
                  极端恢复与废弃清理
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <MaintenanceTool 
                    issueId="ghost_records"
                    title="清理幽灵数据记录" 
                    description="【危险操作】兜底清理数据库中完全损坏（无头无哈希无URL）的无效记录。通常为一次性操作。"
                    danger
                    onSuccess={onSuccess}
                  />
                </div>
              </div>

              {/* 第三组：AI 大规模重构与未来演进 (AI Orchestration) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1 text-xs font-bold text-slate-700">
                  <Zap size={14} className="text-purple-500" />
                  AI 批处理 (按需执行)
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <MaintenanceTool 
                    issueId="ai_retranslate"
                    title="AI 全量语种校对" 
                    description="利用 AI 引擎对存量照片进行底层语种机翻校对。批量调用消耗大，非必要不执行。"
                    onSuccess={onSuccess}
                  />
                  <MaintenanceTool 
                    issueId="ai_redimension"
                    title="AI 深度尺寸重提" 
                    description="利用 AI 模型更正旧数据库中的遗漏尺寸属性。仅在引入新解析策略时一次性执行。"
                    onSuccess={onSuccess}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
