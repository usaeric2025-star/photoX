import React, { useState, useEffect } from 'react';
import { Activity, Clock, Zap, AlertTriangle, ShieldCheck, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PerfStats {
  lastAction: string;
  duration: number;
  type: 'success' | 'warn' | 'error';
  timestamp: number;
}

/**
 * [V3.0-PERF-INSIGHTS] Performance Monitor
 * Professional-grade feedback loop for tracking mutations and IO delays.
 */
export function PerformanceMonitor() {
  const [stats, setStats] = useState<PerfStats[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [healthScore, setHealthScore] = useState(100);

  useEffect(() => {
    const originalWarn = console.warn;

    // Monitor slow mutations
    console.warn = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('[Slow Mutation]')) {
        const matches = args[0].match(/Slow Mutation\] (.*) took (.*)ms/);
        if (matches) {
          addStat(matches[1], parseFloat(matches[2]), 'warn');
        }
      }
      originalWarn(...args);
    };

    const addStat = (action: string, duration: number, type: 'success' | 'warn' | 'error') => {
      setStats(prev => [{
        lastAction: action,
        duration,
        type,
        timestamp: Date.now()
      }, ...prev].slice(0, 10));
      
      if (duration > 2000) setHealthScore(h => Math.max(h - 5, 40));
    };

    // Recover health over time
    const timer = setInterval(() => setHealthScore(h => Math.min(h + 1, 100)), 10000);

    return () => {
      console.warn = originalWarn;
      clearInterval(timer);
    };
  }, []);

  const avgDuration = stats.length > 0 
    ? stats.reduce((acc, s) => acc + s.duration, 0) / stats.length 
    : 0;

  return (
    <div className="fixed bottom-4 right-4 z-[100] font-mono select-none pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-slate-900/90 text-white rounded-2xl shadow-2xl border border-white/10 p-5 mb-3 w-80 backdrop-blur-2xl pointer-events-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Core Insights</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500">HEALTH</span>
                <span className={cn(
                  "text-[10px] font-black",
                  healthScore > 80 ? "text-emerald-400" : healthScore > 60 ? "text-amber-400" : "text-red-400"
                )}>
                  {healthScore}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Avg Latency</div>
                <div className="text-lg font-black tracking-tighter text-blue-400">{avgDuration.toFixed(0)}<span className="text-[10px] ml-0.5 opacity-50">ms</span></div>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">System Load</div>
                <div className="text-lg font-black tracking-tighter text-slate-300">MODERATE</div>
              </div>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2 px-1 text-left">Recent Sequence</div>
              {stats.length === 0 ? (
                <div className="text-[9px] text-slate-500 text-center py-6 bg-white/5 rounded-xl border border-dashed border-white/10">Observing active streams...</div>
              ) : (
                stats.map((s, i) => (
                  <div key={s.timestamp + i} className="flex flex-col gap-1 p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-colors group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database size={8} className="text-slate-500" />
                        <span className="text-[9px] font-bold truncate text-slate-200 max-w-[120px]">{s.lastAction}</span>
                      </div>
                      <span className={cn(
                        "text-[9px] font-black min-w-[50px] text-right",
                        s.duration > 1500 ? 'text-red-400' : s.duration > 800 ? 'text-amber-400' : 'text-emerald-400'
                      )}>
                        +{s.duration.toFixed(0)}ms
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-500">
                <ShieldCheck size={10} className="text-emerald-500" />
                <span>ALL SYSTEMS STABLE</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-12 px-4 rounded-2xl flex items-center gap-3 transition-all active:scale-90 shadow-2xl pointer-events-auto backdrop-blur-md",
          isOpen 
            ? "bg-slate-900 text-white border border-white/20 ring-4 ring-slate-900/10" 
            : "bg-white/90 text-slate-900 border border-slate-200 hover:border-slate-300 ring-4 ring-slate-100"
        )}
      >
        <div className="relative">
          <Activity size={16} className={cn(
            "transition-colors",
            avgDuration > 1000 ? "text-amber-500" : "text-blue-500"
          )} />
          {avgDuration > 1500 && (
            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
          )}
        </div>
        <div className="flex flex-col items-start leading-tight">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Telemetry</span>
          <span className="text-xs font-black tracking-tight tabular-nums">
            {avgDuration > 0 ? `${avgDuration.toFixed(0)}ms` : 'READY'}
          </span>
        </div>
      </button>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
