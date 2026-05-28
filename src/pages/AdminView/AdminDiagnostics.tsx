import React, { useState } from 'react';
import { useAuth } from '@/hooks/core/auth/useAuth';
import { diagnosticRegistry, DiagnosticResult } from './diagnostics';

// Load all diagnostic tests
import './diagnostics/emptyData.test.ts';
import './diagnostics/ebIntegrity.test.ts';
import './diagnostics/singleItem.test.ts';
import './diagnostics/longText.test.ts';
import './diagnostics/missingFields.test.ts';
import './diagnostics/filterStorm.test.ts';
import './diagnostics/scrollReset.test.ts';
import './diagnostics/batchSelect.test.ts';
import './diagnostics/lanesFallback.test.ts';
import './diagnostics/lanesResize.test.ts';
import './diagnostics/lanesEmptyState.test.ts';
import './diagnostics/selectBoundary.test.ts';
import './diagnostics/prefetchCache.test.ts';
import './diagnostics/elementSizeSafety.test.ts';
import './diagnostics/validatorParity.test.ts';
import './diagnostics/selectFieldCoverage.test.ts';
import './diagnostics/queryKeyFactoryCoverage.test.ts';
import './diagnostics/schemaStrictness.test.ts';
import './diagnostics/weakSemanticVariables.test.ts';
import './diagnostics/errorSemanticCheck.test.ts';
import './diagnostics/designTokenEnforcement.test.ts';
import './diagnostics/dbSchemaAlignment.test.ts';
import './diagnostics/layoutIntegrity.test.ts';

const AdminDiagnostics: React.FC = () => {
  const { user } = useAuth();
  
  // @ts-ignore
  if (user?.role !== 'admin') {
    return null;
  }

  const [results, setResults] = useState<Record<string, DiagnosticResult>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const runAll = async () => {
    setIsRunning(true);
    const newResults: Record<string, DiagnosticResult> = {};
    for (const test of diagnosticRegistry) {
      newResults[test.id] = await test.run();
      setResults({ ...newResults });
    }
    setIsRunning(false);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 bg-black text-white px-4 py-2 rounded-full shadow-lg font-mono text-xs opacity-50 hover:opacity-100 transition-opacity whitespace-nowrap"
      >
        DIAGNOSTICS
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[80vh] overflow-y-auto bg-white border border-gray-200 shadow-xl rounded-lg z-40 font-mono text-xs text-gray-800 flex flex-col">
      <div className="p-3 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white shadow-sm">
        <h3 className="font-bold flex items-center gap-2">
          Admin Diagnostics <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{diagnosticRegistry.length}</span>
        </h3>
        <div className="flex gap-2">
          <button 
            onClick={runAll}
            disabled={isRunning}
            className="px-3 py-1 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {isRunning ? 'Running...' : 'Run All'}
          </button>
          <button onClick={() => setIsOpen(false)} className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors">
            Close
          </button>
        </div>
      </div>
      <div className="p-2 flex flex-col gap-2">
        {diagnosticRegistry.map(test => {
          const res = results[test.id];
          return (
            <div key={test.id} className="p-2 border border-gray-100 rounded bg-gray-50">
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-gray-700">{test.name}</span>
                {res ? (
                  res.passed ? (
                     <span className="text-green-600 font-bold bg-green-100 px-1 rounded flex items-center gap-1">✅ PASS</span>
                  ) : (
                     <span className="text-red-600 font-bold bg-red-100 px-1 rounded flex items-center gap-1">❌ FAIL</span>
                  )
                ) : (
                  <span className="text-gray-400">PENDING</span>
                )}
              </div>
              <div className="text-gray-500 mb-1">{test.description}</div>
              {res && (
                <div className={`mt-1 p-1 flex flex-col rounded text-[10px] ${res.passed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  <div className="flex justify-between">
                    <span>{res.message}</span>
                    <span className="font-bold opacity-75">{Math.round(res.durationMs)}ms</span>
                  </div>
                  {res.healthReport && (
                    <div className="mt-1 border-t border-current pt-1 grid grid-cols-3 gap-1 italic">
                      <span>C: {res.healthReport.schemaComplexity}</span>
                      <span>TPR: {res.healthReport.probeFalsePositiveRate}</span>
                      <span>AS: {res.healthReport.adapterStaleness}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminDiagnostics;
