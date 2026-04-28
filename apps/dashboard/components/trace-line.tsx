import styles from './trace-line.module.css';

export function TraceLine({
  label,
  direction = 'forward',
}: {
  label: string;
  direction?: 'forward' | 'bidirectional';
}) {
  return (
    <div className={styles.container}>
      <div className={styles.line} />
      <span className={styles.label}>{label}</span>
      <span className={styles.arrow}>{direction === 'bidirectional' ? '↔' : '→'}</span>
    </div>
  );
}
