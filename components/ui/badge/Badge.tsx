import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  color?: 'success' | 'warning' | 'error' | 'info' | 'default';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const colorClasses = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  default: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
};

export default function Badge({ 
  children, 
  color = 'default', 
  size = 'sm',
  className = '' 
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${colorClasses[color]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
  );
}
