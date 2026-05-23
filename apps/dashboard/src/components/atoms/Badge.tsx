import { forwardRef, type HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
}

const variantStyles = {
  primary: 'bg-indigo-100 text-indigo-700 ring-indigo-600/20',
  secondary: 'bg-gray-100 text-gray-600 ring-gray-500/10',
  success: 'bg-green-100 text-green-700 ring-green-600/20',
  warning: 'bg-yellow-100 text-yellow-800 ring-yellow-600/20',
  danger: 'bg-red-100 text-red-700 ring-red-600/10',
  info: 'bg-blue-100 text-blue-700 ring-blue-700/10',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'primary', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
