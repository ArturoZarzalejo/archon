import { ReactNode, HTMLAttributes } from 'react';

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'highlight';
  rounded?: 'lg' | 'xl' | '2xl' | '3xl';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variantClasses = {
  default: 'glass',
  highlight: 'glass glass-highlight',
};

const roundedClasses = {
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
};

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function GlassPanel({
  children,
  variant = 'default',
  rounded = '2xl',
  padding = 'none',
  className = '',
  ...props
}: GlassPanelProps) {
  return (
    <div
      className={`${variantClasses[variant]} ${roundedClasses[rounded]} ${paddingClasses[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
