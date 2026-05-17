import React, { useState, useEffect } from 'react';

// Global log storage
(window as any).appLogs = [];

export const SimpleLogger: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => {
      originalLog(...args);
      const log = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      (window as any).appLogs.push(log);
      setLogs([...(window as any).appLogs]);
    };

    console.error = (...args) => {
      originalError(...args);
      const log = 'ERROR: ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      (window as any).appLogs.push(log);
      setLogs([...(window as any).appLogs]);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  if (!visible) return <button className="fixed bottom-4 right-4 bg-black text-white p-2 rounded" onClick={() => setVisible(true)}>Log</button>;

  return (
    <div className="fixed bottom-4 right-4 w-72 h-96 bg-white border border-gray-300 p-2 overflow-y-auto text-xs z-50">
      <button className="bg-red-500 text-white p-1 mb-2" onClick={() => setVisible(false)}>Close</button>
      {logs.map((log, i) => <div key={i} className="mb-1 border-b">{log}</div>)}
    </div>
  );
};
