import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Adds a subtle lift + press feedback; use for tappable cards. */
  interactive?: boolean;
  tone?: 'surface' | 'warm' | 'mint' | 'lilac';
}

export function Card({ children, interactive = false, tone = 'surface', className, ...rest }: CardProps) {
  const classes = [styles.card, styles[tone], interactive ? styles.interactive : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <div {...rest} className={classes}>
      {children}
    </div>
  );
}
