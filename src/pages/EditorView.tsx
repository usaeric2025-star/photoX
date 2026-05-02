import React from 'react';
import PhotoEditor from '../components/PhotoEditor';

export default function EditorView() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Product Ad Editor</h1>
            <p className="text-gray-500">Create beautiful visual ads for your products.</p>
          </div>
        </header>
        <PhotoEditor />
      </div>
    </div>
  );
}
