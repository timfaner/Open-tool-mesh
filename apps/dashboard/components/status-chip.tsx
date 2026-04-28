import { ReactNode } from 'react';
import styles from './status-chip.module.css';

export function StatusChip({
  children,
  tone,
}: {
  children: ReactNode;
  tone: 'success' | 'info' | 'outline';
}) {
  return <span className={`${styles.chip} ${styles[tone]}`}>{children}</span>;
}
