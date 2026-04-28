import styles from './severity-badge.module.css';

export function SeverityBadge({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'high' | 'medium' | 'low';
}) {
  return (
    <div className={`${styles.badge} ${styles[tone]}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
