import type { ReactNode } from 'react';
import { useReveal } from '../hooks/useReveal';

interface FadeInProps {
  children: ReactNode;
  className?: string;
}

export default function FadeIn({ children, className = '' }: FadeInProps) {
  const { ref, className: revealClass } = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={`${revealClass}${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}
