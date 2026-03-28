import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          'inline-flex items-center justify-center font-semibold rounded-xl transition-all',
          'active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed tap-highlight-none',
          {
            'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700': variant === 'primary',
            'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700': variant === 'secondary',
            'text-gray-300 hover:text-white hover:bg-gray-800': variant === 'ghost',
            'bg-red-600 text-white hover:bg-red-700': variant === 'danger',
          },
          {
            'text-sm px-3 py-2 min-h-[36px]': size === 'sm',
            'text-base px-4 py-3 min-h-[48px]': size === 'md',
            'text-lg px-6 py-4 min-h-[56px]': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
