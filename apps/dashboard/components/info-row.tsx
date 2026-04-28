import styles from './info-row.module.css';

export function InfoRow({
  label,
  value,
  mono = false,
  status,
}: {
  label: string;
  value: string;
  mono?: boolean;
  status?: 'success';
}) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={`${styles.value} ${mono ? styles.mono : ''} ${status ? styles[status] : ''}`}>{value}</span>
    </div>
  );
}
