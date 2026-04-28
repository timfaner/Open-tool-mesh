import { ReactNode } from 'react';
import styles from './section-card.module.css';

export function SectionCard({
  title,
  eyebrow,
  children,
  footer,
  accent,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
  footer?: ReactNode;
  accent: 'cyan' | 'teal';
}) {
  return (
    <section className={`${styles.card} ${accent === 'cyan' ? styles.cyan : styles.teal}`}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        {footer}
      </div>
      <div>{children}</div>
    </section>
  );
}
