import React from 'react';
import { Loader } from './Loader';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  loading = false,
  variant = 'primary',
  className,
  disabled,
  ...props
}) => {
  const baseClasses = `
    px-6 py-3 rounded-lg font-semibold transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-900
    flex items-center justify-center
  `;

  const variantClasses = {
    primary: `
      bg-purple-600 text-white hover:bg-purple-700
      focus:ring-purple-500
      disabled:bg-purple-800 disabled:text-purple-400 disabled:cursor-not-allowed
    `,
    secondary: `
      bg-gray-700 text-gray-200 hover:bg-gray-600
      focus:ring-gray-500
      disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed
    `,
    danger: `
      bg-red-600 text-white hover:bg-red-700
      focus:ring-red-500
      disabled:bg-red-800 disabled:text-red-400 disabled:cursor-not-allowed
    `,
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className || ''}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader size="sm" />
      ) : (
        children
      )}
    </button>
  );
};