import { ReactNode } from 'react';
import styles from './hash-pill.module.css';

export function HashPill({ children }: { children: ReactNode }) {
  return <span className={styles.pill}>{children}</span>;
}
