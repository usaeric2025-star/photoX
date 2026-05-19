import React from 'react';

interface FloatingActionBarProps {
  children: React.ReactNode
  position?: 'bottom-left' | 'bottom-right'
  className?: string
}

export const FloatingActionBar: React.FC<FloatingActionBarProps> = ({ 
  children, 
  position = 'bottom-right',
  className = ''
}) => {
  const positionClass = position === 'bottom-right' 
    ? 'bottom-6 right-6' 
    : 'bottom-6 left-6'
    
  return (
    <div className={`fixed z-50 flex gap-3 p-3 rounded-full shadow-lg border bg-white border-gray-200 ${positionClass} ${className}`}>
      {children}
    </div>
  )
}
